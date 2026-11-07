import { env } from "cloudflare:workers";
import { applyD1Migrations, reset } from "cloudflare:test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAuth } from "../../src/server/lib/auth";
import { apiApp } from "../../src/server/app";
import { pkceChallenge } from "../../src/server/lib/native-auth";

const origin = "https://gomate.live";
let verified = true;
let sequence = 0;
const userEmail = "google-member@example.test";
function configuredEnv() {
  return {
    ...env,
    APP_URL: origin,
    BETTER_AUTH_SECRET: "test-google-secret-key-at-least-32-characters",
    GOOGLE_CLIENT_ID: "test-google-client",
    GOOGLE_CLIENT_SECRET: "test-google-secret",
  } as typeof env;
}
function auth() {
  return createAuth(configuredEnv());
}
function cookieHeader(response: Response) {
  return response.headers
    .getSetCookie()
    .map((value) => value.split(";", 1)[0])
    .join("; ");
}
async function startLogin() {
  const ip = `198.51.100.${++sequence}`;
  const response = await auth().handler(
    new Request(`${origin}/api/auth/sign-in/social`, {
      method: "POST",
      headers: {
        origin,
        "content-type": "application/json",
        "cf-connecting-ip": ip,
      },
      body: JSON.stringify({
        provider: "google",
        callbackURL: `${origin}/teams/team-1`,
        errorCallbackURL: `${origin}/login?oauthError=1`,
      }),
    }),
  );
  expect(response.status).toBe(200);
  const { url } = (await response.json()) as { url: string };
  expect(new URL(url).searchParams.get("scope")?.split(" ").sort()).toEqual([
    "email",
    "openid",
    "profile",
  ]);
  return {
    state: new URL(url).searchParams.get("state"),
    cookie: cookieHeader(response),
    ip,
  };
}
async function completeLogin(login: Awaited<ReturnType<typeof startLogin>>) {
  return auth().handler(
    new Request(
      `${origin}/api/auth/callback/google?code=test-code&state=${login.state}`,
      { headers: { cookie: login.cookie, "cf-connecting-ip": login.ip } },
    ),
  );
}
beforeEach(async () => {
  verified = true;
  const migrations = JSON.parse(
    (env as unknown as { TEST_MIGRATIONS: string }).TEST_MIGRATIONS,
  );
  await applyD1Migrations(env.DB, migrations);
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    if (url !== "https://oauth2.googleapis.com/token")
      throw new Error("Unexpected external request");
    const claims = {
      sub: "google-subject-1",
      email: userEmail,
      email_verified: verified,
      name: "Google Member",
      picture: "https://lh3.googleusercontent.com/avatar",
    };
    const jwt = `${btoa(JSON.stringify({ alg: "none" }))}.${btoa(JSON.stringify(claims))}.test-signature`;
    return Response.json({
      access_token: "test-access-token",
      token_type: "Bearer",
      expires_in: 3600,
      id_token: jwt,
    });
  });
});
afterEach(async () => {
  vi.restoreAllMocks();
  await reset();
});
describe("Google OAuth with real Better Auth and D1", () => {
  it("creates one verified user, encrypts tokens and returns an authenticated session", async () => {
    const response = await completeLogin(await startLogin());
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(`${origin}/teams/team-1`);
    const user = await env.DB.prepare(
      "SELECT id, email_verified, image, role FROM users WHERE email = ?",
    )
      .bind(userEmail)
      .first<{
        id: string;
        email_verified: number;
        image: string | null;
        role: string;
      }>();
    expect(user).toMatchObject({
      email_verified: 1,
      image: null,
      role: "user",
    });
    const account = await env.DB.prepare(
      "SELECT access_token, provider_id, issuer FROM accounts WHERE user_id = ?",
    )
      .bind(user!.id)
      .first<{ access_token: string; provider_id: string; issuer: string }>();
    expect(account?.provider_id).toBe("google");
    expect(account?.issuer).toBe("https://accounts.google.com");
    expect(account?.access_token).not.toBe("test-access-token");
    const session = await auth().handler(
      new Request(`${origin}/api/auth/get-session`, {
        headers: { cookie: cookieHeader(response) },
      }),
    );
    expect(((await session.json()) as { user: { id: string } }).user.id).toBe(
      user!.id,
    );
    const returning = await completeLogin(await startLogin());
    expect(returning.headers.get("location")).toBe(`${origin}/teams/team-1`);
    expect(
      await env.DB.prepare("SELECT count(*) AS count FROM users").first(),
    ).toEqual({ count: 1 });
  });
  it.each([true, false])(
    "links only an existing locally verified email (verified=%s)",
    async (emailVerified) => {
      await env.DB.prepare(
        "INSERT INTO users (id, name, email, email_verified) VALUES (?, ?, ?, ?)",
      )
        .bind(
          "local-member",
          "Existing Member",
          userEmail,
          Number(emailVerified),
        )
        .run();
      const response = await completeLogin(await startLogin());
      const linked = await env.DB.prepare(
        "SELECT user_id FROM accounts WHERE provider_id = 'google'",
      ).first();
      if (emailVerified) {
        expect(response.headers.get("location")).toBe(`${origin}/teams/team-1`);
        expect(linked).toEqual({ user_id: "local-member" });
        expect(
          await env.DB.prepare(
            "SELECT name FROM users WHERE id = 'local-member'",
          ).first(),
        ).toEqual({ name: "Existing Member" });
      } else {
        expect(response.headers.get("location")).toContain("oauthError=1");
        expect(linked).toBeNull();
        expect(
          await env.DB.prepare(
            "SELECT count(*) AS count FROM sessions",
          ).first(),
        ).toEqual({ count: 0 });
      }
    },
  );
  it("rejects unverified Google emails before creating a user", async () => {
    verified = false;
    const response = await completeLogin(await startLogin());
    expect(response.headers.get("location")).toContain("oauthError=1");
    expect(
      await env.DB.prepare("SELECT count(*) AS count FROM users").first(),
    ).toEqual({ count: 0 });
  });
  it("rejects a missing state and prevents callback replay", async () => {
    const missing = await auth().handler(
      new Request(`${origin}/api/auth/callback/google?code=test-code`),
    );
    expect(missing.status).toBe(302);
    expect(globalThis.fetch).not.toHaveBeenCalled();
    const login = await startLogin();
    await completeLogin(login);
    const replay = await completeLogin(login);
    expect(replay.headers.get("location")).toContain("oauthError=1");
    expect(
      await env.DB.prepare("SELECT count(*) AS count FROM sessions").first(),
    ).toEqual({ count: 1 });
  });
  it("does not create a session for a disabled account", async () => {
    await env.DB.prepare(
      "INSERT INTO users (id, name, email, email_verified, status) VALUES (?, ?, ?, 1, 'banned')",
    )
      .bind("disabled-member", "Disabled", userEmail)
      .run();
    await completeLogin(await startLogin());
    expect(
      await env.DB.prepare("SELECT count(*) AS count FROM sessions").first(),
    ).toEqual({ count: 0 });
  });
});

describe("native Google callback binding", () => {
  it("only releases a fresh callback code after validated OAuth, then requires code and verifier", async () => {
    const verifier = "native-google-verifier".repeat(3);
    const nativeEnv = configuredEnv();
    const start = await apiApp.fetch(
      new Request(`${origin}/auth/native/google/start`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "cf-connecting-ip": "198.51.100.241",
        },
        body: JSON.stringify({ challenge: await pkceChallenge(verifier) }),
      }),
      nativeEnv,
    );
    expect(start.status).toBe(200);
    const { requestId, url } = (await start.json()) as {
      requestId: string;
      url: string;
    };
    const authorize = await apiApp.fetch(
      new Request(url.replace("/api/auth/", "/auth/")),
      nativeEnv,
    );
    expect(authorize.status).toBe(302);
    const state = new URL(authorize.headers.get("location")!).searchParams.get(
      "state",
    );
    const response = await apiApp.fetch(
      new Request(
        `${origin}/auth/callback/google?code=test-code&state=${state}`,
        {
          headers: {
            cookie: cookieHeader(authorize),
            "cf-connecting-ip": "198.51.100.241",
          },
        },
      ),
      nativeEnv,
    );
    expect(response.status).toBe(302);
    const callback = new URL(response.headers.get("location")!);
    expect(callback.protocol).toBe("gomate:");
    const fragment = new URLSearchParams(callback.hash.slice(1));
    expect(fragment.get("request")).toBe(requestId);
    const code = fragment.get("code");
    expect(code).toHaveLength(72);
    const exchange = (candidate: string) =>
      apiApp.fetch(
        new Request(`${origin}/auth/native/exchange`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "cf-connecting-ip": "198.51.100.241",
          },
          body: JSON.stringify({ requestId, verifier, code: candidate }),
        }),
        nativeEnv,
      );
    expect((await exchange("x".repeat(72))).status).toBe(401);
    expect((await exchange(code!)).status).toBe(200);
    expect((await exchange(code!)).status).toBe(401);
    const replay = await apiApp.fetch(
      new Request(
        `${origin}/auth/callback/google?code=test-code&state=${state}`,
        {
          headers: {
            cookie: cookieHeader(authorize),
            "cf-connecting-ip": "198.51.100.241",
          },
        },
      ),
      nativeEnv,
    );
    expect(replay.headers.get("location")).not.toContain("#request=");
  });
});
