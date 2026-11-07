import { env } from "cloudflare:workers";
import { applyD1Migrations, reset } from "cloudflare:test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { symmetricDecrypt } from "better-auth/crypto";
import { apiApp } from "../../src/server/app";
import type { WorkerEnv } from "../../src/server/env";

const origin = "https://gomate.live";
const nonce = "test-apple-nonce".repeat(3);
const refreshToken = "test-private-apple-refresh";
let appleEnv: WorkerEnv;
let idToken: string;
let wrongAudience = false;
let omitEmail = false;
let revoked = false;
let jwtKey: CryptoKeyPair;
let publicJWK: JsonWebKey;
function encode(data: Uint8Array) {
  return btoa(String.fromCharCode(...data))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
}
async function signToken() {
  const json = (value: unknown) =>
    encode(new TextEncoder().encode(JSON.stringify(value)));
  const payload = `${json({ alg: "RS256", kid: "apple-test-key" })}.${json({
    iss: "https://appleid.apple.com",
    sub: "apple-native-user",
    aud: wrongAudience ? "untrusted.app" : "live.gomate.app",
    ...(omitEmail
      ? {}
      : { email: "apple-native@example.test", email_verified: true }),
    nonce,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 600,
  })}`;
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    jwtKey.privateKey,
    new TextEncoder().encode(payload),
  );
  return `${payload}.${encode(new Uint8Array(signature))}`;
}
beforeEach(async () => {
  wrongAudience = false;
  omitEmail = false;
  revoked = false;
  await applyD1Migrations(
    env.DB,
    JSON.parse((env as unknown as { TEST_MIGRATIONS: string }).TEST_MIGRATIONS),
  );
  const clientKey = (await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"],
  )) as CryptoKeyPair;
  const privateKey = btoa(
    String.fromCharCode(
      ...new Uint8Array(
        await crypto.subtle.exportKey("pkcs8", clientKey.privateKey),
      ),
    ),
  );
  jwtKey = (await crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"],
  )) as CryptoKeyPair;
  publicJWK = await crypto.subtle.exportKey("jwk", jwtKey.publicKey);
  appleEnv = {
    ...env,
    APP_URL: origin,
    WRITE_MODE: "open",
    BETTER_AUTH_SECRET: "native-apple-test-secret-at-least-32-characters",
    APPLE_CLIENT_ID: "live.gomate.app",
    APPLE_TEAM_ID: "TESTTEAM01",
    APPLE_KEY_ID: "TESTKEY001",
    APPLE_PRIVATE_KEY: `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----`,
  } as WorkerEnv;
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    if (url === "https://appleid.apple.com/auth/token") {
      idToken = await signToken();
      return Response.json({
        id_token: idToken,
        access_token: "test-access",
        refresh_token: refreshToken,
      });
    }
    if (url === "https://appleid.apple.com/auth/keys")
      return Response.json({
        keys: [
          { ...publicJWK, kid: "apple-test-key", alg: "RS256", use: "sig" },
        ],
      });
    if (url === "https://appleid.apple.com/auth/revoke") {
      const body = new URLSearchParams(String(init?.body));
      expect(body.get("token")).toBe(refreshToken);
      revoked = true;
      return new Response(null, { status: 200 });
    }
    throw new Error("Unexpected external request");
  });
});
afterEach(async () => {
  vi.restoreAllMocks();
  await reset();
});

async function login(value = nonce) {
  return apiApp.fetch(
    new Request(`${origin}/auth/native/sign-in/apple`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "cf-connecting-ip": "198.51.100.213",
      },
      body: JSON.stringify({
        code: "test-one-use-code",
        nonce: value,
        firstName: "Apple",
      }),
    }),
    appleEnv,
  );
}

describe("Apple native login", () => {
  it("verifies the signed identity and stores a revocable encrypted grant with the account", async () => {
    const response = await login();
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toBeNull();
    const { token } = (await response.json()) as { token: string };
    const account = await env.DB.prepare(
      "SELECT refresh_token FROM accounts WHERE provider_id='apple'",
    ).first<{ refresh_token: string }>();
    expect(account?.refresh_token).toBeTruthy();
    expect(account!.refresh_token).not.toContain(refreshToken);
    expect(
      await symmetricDecrypt({
        key: appleEnv.BETTER_AUTH_SECRET,
        data: account!.refresh_token,
      }),
    ).toBe(refreshToken);
    const deleted = await apiApp.fetch(
      new Request(`${origin}/users/me`, {
        method: "DELETE",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ confirmation: "DELETE" }),
      }),
      appleEnv,
    );
    expect(deleted.status).toBe(200);
    expect(revoked).toBe(true);
    expect(
      await env.DB.prepare(
        "SELECT id FROM accounts WHERE provider_id='apple'",
      ).first(),
    ).toBeNull();
  });
  it("signs in an existing Apple subject when later identity tokens omit email", async () => {
    expect((await login()).status).toBe(200);
    omitEmail = true;
    expect((await login()).status).toBe(200);
    const count = await env.DB.prepare(
      "SELECT COUNT(*) AS total FROM accounts WHERE provider_id='apple'",
    ).first<{ total: number }>();
    expect(count?.total).toBe(1);
  });
  it("rejects mismatched nonce and audience without creating credentials", async () => {
    expect((await login("x".repeat(43))).status).toBe(401);
    wrongAudience = true;
    expect((await login()).status).toBe(401);
    expect(
      await env.DB.prepare(
        "SELECT id FROM accounts WHERE provider_id='apple'",
      ).first(),
    ).toBeNull();
    expect(await env.DB.prepare("SELECT id FROM sessions").first()).toBeNull();
  });
  it("does not persist an Apple binding when its refresh credential cannot be written", async () => {
    await env.DB.prepare(
      "CREATE TRIGGER reject_apple_refresh BEFORE INSERT ON accounts WHEN NEW.provider_id='apple' AND NEW.refresh_token IS NOT NULL BEGIN SELECT RAISE(ABORT,'test write fault'); END",
    ).run();
    expect((await login()).status).toBe(401);
    expect(
      await env.DB.prepare(
        "SELECT id FROM accounts WHERE provider_id='apple'",
      ).first(),
    ).toBeNull();
    expect(await env.DB.prepare("SELECT id FROM sessions").first()).toBeNull();
  });
});
