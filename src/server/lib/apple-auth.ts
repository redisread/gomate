import type { WorkerEnv } from "../env";
import { fetchWithTimeout } from "./timeout";

export function isAppleConfigured(env: WorkerEnv): boolean {
  return Boolean(
    env.APPLE_CLIENT_ID &&
    env.APPLE_TEAM_ID &&
    env.APPLE_KEY_ID &&
    env.APPLE_PRIVATE_KEY,
  );
}

function base64url(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
}

export async function appleClientSecret(env: WorkerEnv): Promise<string> {
  if (!isAppleConfigured(env))
    throw new Error("Apple configuration unavailable");
  const keyData = env.APPLE_PRIVATE_KEY!.replace(/-----[^-]+-----|\s/gu, "");
  const key = await crypto.subtle.importKey(
    "pkcs8",
    Uint8Array.from(atob(keyData), (v) => v.charCodeAt(0)),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  const now = Math.floor(Date.now() / 1000);
  const encode = (value: unknown) =>
    base64url(new TextEncoder().encode(JSON.stringify(value)));
  const unsigned = `${encode({ alg: "ES256", kid: env.APPLE_KEY_ID })}.${encode(
    {
      iss: env.APPLE_TEAM_ID,
      sub: env.APPLE_CLIENT_ID,
      aud: "https://appleid.apple.com",
      iat: now,
      exp: now + 300,
    },
  )}`;
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(unsigned),
  );
  return `${unsigned}.${base64url(new Uint8Array(signature))}`;
}

export async function exchangeAppleCode(env: WorkerEnv, code: string) {
  const response = await fetchWithTimeout(
    "https://appleid.apple.com/auth/token",
    {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: env.APPLE_CLIENT_ID!,
        client_secret: await appleClientSecret(env),
        grant_type: "authorization_code",
        code,
      }),
    },
    10_000,
  );
  const result = (await response.json()) as {
    id_token?: string;
    access_token?: string;
    refresh_token?: string;
  };
  if (!response.ok || !result.id_token || !result.refresh_token)
    throw new Error("Apple exchange failed");
  return {
    idToken: result.id_token,
    accessToken: result.access_token,
    refreshToken: result.refresh_token,
  };
}

export async function revokeAppleToken(
  env: WorkerEnv,
  token: string,
): Promise<void> {
  const response = await fetchWithTimeout(
    "https://appleid.apple.com/auth/revoke",
    {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: env.APPLE_CLIENT_ID!,
        client_secret: await appleClientSecret(env),
        token,
        token_type_hint: "refresh_token",
      }),
    },
    10_000,
  );
  if (!response.ok) throw new Error("Apple revocation failed");
}
