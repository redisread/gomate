import { resolveLoginReturnPath } from "../../../lib/login-return-path";
import { isGoogleAuthAvailable } from "../../lib/google-auth";
import { APIErrors } from "../../lib/api-errors";
import { logger } from "../../lib/logger";
import { createAuth } from "../../lib/auth";
import { googleSignInSchema } from "./schemas";
import {
  type AuthContext,
  getExecutionContext,
  readBoundedJson,
  enforceNativeRateLimit,
  normalizedJsonRequest,
  normalizeBetterAuthUrl,
  noStoreResponse,
} from "./request";

export async function handleGoogleSignIn(c: AuthContext) {
  if (!isGoogleAuthAvailable(c.req.raw, c.env)) {
    return c.json(APIErrors.notFound("Google sign-in unavailable"), 404);
  }
  const origin = new URL(c.env.APP_URL).origin;
  if (
    c.req.header("origin") !== origin ||
    (c.req.header("sec-fetch-site") &&
      c.req.header("sec-fetch-site") !== "same-origin")
  ) {
    return c.json(APIErrors.forbidden("Cross-origin sign-in rejected"), 403);
  }
  const parsed = await readBoundedJson(c, googleSignInSchema);
  if ("response" in parsed) return parsed.response;
  let destination = parsed.data.callbackURL ?? "/";
  if (destination.startsWith(`${origin}/`))
    destination = destination.slice(origin.length);
  const returnPath = resolveLoginReturnPath(destination);
  if (returnPath !== destination) {
    return c.json(APIErrors.validationError("Invalid login return path"), 400);
  }
  const limited = await enforceNativeRateLimit(
    c,
    c.env.AUTH_SIGN_IN_RATE_LIMITER,
    "google_sign_in",
  );
  if (limited) return limited;
  const errorUrl = new URL("/login", origin);
  errorUrl.searchParams.set("oauthError", "1");
  errorUrl.searchParams.set("redirect", returnPath);
  const response = await createAuth(c.env, getExecutionContext(c)).handler(
    normalizedJsonRequest(c, {
      provider: "google",
      callbackURL: `${origin}${returnPath}`,
      errorCallbackURL: errorUrl.href,
    }),
  );
  return noStoreResponse(response);
}

export async function handleGoogleCallback(c: AuthContext) {
  const failed = () => noStoreResponse(c.redirect("/login?oauthError=1"));
  if (!isGoogleAuthAvailable(c.req.raw, c.env)) return failed();
  try {
    const response = await createAuth(c.env, getExecutionContext(c)).handler(
      new Request(normalizeBetterAuthUrl(c.req.raw.url), c.req.raw),
    );
    return noStoreResponse(response);
  } catch {
    logger.error("google_oauth_callback_failed");
    return failed();
  }
}
