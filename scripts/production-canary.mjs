#!/usr/bin/env node
import { appendFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createEmailVerificationToken } from "better-auth/api";
import { validateProductionOrigin } from "./prepare-production-cutover.mjs";

const REQUEST_ID = /^[a-z0-9-]{36,96}$/iu;
const CANARY_EMAIL = /^stage-c-canary-[0-9]+@example\.invalid$/u;

function requestId(response, label) {
  const value = response.headers.get("x-request-id")?.trim();
  if (!value || !REQUEST_ID.test(value)) {
    throw new Error(`${label} response is missing X-Request-ID`);
  }
  return value;
}

async function jsonRequest(fetchImpl, baseUrl, pathName, body, cookie) {
  const response = await fetchImpl(new URL(`/api${pathName}`, baseUrl), {
    method: body === undefined ? "GET" : "POST",
    headers: {
      accept: "application/json",
      ...(body === undefined ? {} : { "content-type": "application/json" }),
      origin: baseUrl,
      ...(cookie ? { cookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: "manual",
    signal: AbortSignal.timeout(20_000),
  });
  const payload = await response.json().catch(() => null);
  return { response, payload };
}

export async function runProductionCanary({
  baseUrl = process.env.PRODUCTION_APP_URL,
  email = process.env.CANARY_EMAIL,
  authSecret = process.env.BETTER_AUTH_SECRET,
  fetchImpl = fetch,
  createVerificationTokenImpl = createEmailVerificationToken,
} = {}) {
  baseUrl = validateProductionOrigin(baseUrl ?? "");
  if (!CANARY_EMAIL.test(email ?? "")) {
    throw new Error(
      "CANARY_EMAIL does not match the controlled Stage C pattern",
    );
  }
  if (!authSecret || authSecret.length < 32) {
    throw new Error("BETTER_AUTH_SECRET must contain at least 32 characters");
  }
  const password = `Gm-${crypto.randomUUID()}-9a`;
  const signUp = await jsonRequest(fetchImpl, baseUrl, "/auth/sign-up/email", {
    email,
    password,
    name: "Stage C Canary",
  });
  if (!signUp.response.ok || signUp.response.headers.has("set-cookie")) {
    throw new Error(`Canary sign-up failed (${signUp.response.status})`);
  }
  const signUpRequestId = requestId(signUp.response, "Canary sign-up");

  const verificationToken = await createVerificationTokenImpl(
    authSecret,
    email,
    undefined,
    60 * 60,
  );
  const confirmation = await jsonRequest(
    fetchImpl,
    baseUrl,
    "/auth/confirm-email",
    {
      token: verificationToken,
    },
  );
  if (!confirmation.response.ok || confirmation.payload?.success !== true) {
    throw new Error(
      `Canary email confirmation failed (${confirmation.response.status})`,
    );
  }

  const signIn = await jsonRequest(fetchImpl, baseUrl, "/auth/sign-in/email", {
    email,
    password,
  });
  const setCookie = signIn.response.headers.get("set-cookie");
  if (!signIn.response.ok || !setCookie || signIn.payload?.token) {
    throw new Error(`Canary sign-in failed (${signIn.response.status})`);
  }
  const signInRequestId = requestId(signIn.response, "Canary sign-in");
  const cookie = setCookie.split(";", 1)[0];

  const session = await jsonRequest(
    fetchImpl,
    baseUrl,
    "/auth/get-session",
    undefined,
    cookie,
  );
  if (!session.response.ok || !session.payload?.user?.id) {
    throw new Error(`Canary session check failed (${session.response.status})`);
  }

  const profile = await fetchImpl(new URL("/api/users/me", baseUrl), {
    method: "PATCH",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      cookie,
      origin: baseUrl,
    },
    body: JSON.stringify({ nickname: "Stage C Canary Verified" }),
    signal: AbortSignal.timeout(20_000),
  });
  const profilePayload = await profile.json().catch(() => null);
  if (
    !profile.ok ||
    profilePayload?.user?.nickname !== "Stage C Canary Verified"
  ) {
    throw new Error(`Canary profile mutation failed (${profile.status})`);
  }
  const mutationRequestId = requestId(profile, "Canary profile mutation");

  const signOut = await jsonRequest(
    fetchImpl,
    baseUrl,
    "/auth/sign-out",
    {},
    cookie,
  );
  if (!signOut.response.ok) {
    throw new Error(`Canary sign-out failed (${signOut.response.status})`);
  }
  const signedOutSession = await jsonRequest(
    fetchImpl,
    baseUrl,
    "/auth/get-session",
    undefined,
    cookie,
  );
  if (!signedOutSession.response.ok || signedOutSession.payload?.user) {
    throw new Error("Canary session remained active after sign-out");
  }

  return { signUpRequestId, signInRequestId, mutationRequestId };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  runProductionCanary()
    .then((result) => {
      if (process.env.GITHUB_OUTPUT) {
        appendFileSync(
          process.env.GITHUB_OUTPUT,
          `signup_request_id=${result.signUpRequestId}\nsignin_request_id=${result.signInRequestId}\nmutation_request_id=${result.mutationRequestId}\n`,
        );
      }
      console.log(
        "Production auth, session, profile mutation, and sign-out canary passed.",
      );
    })
    .catch((error) => {
      console.error(`[production-canary] ${error.message}`);
      process.exit(1);
    });
}
