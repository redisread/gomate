import { env } from "cloudflare:workers";
import { applyD1Migrations, reset } from "cloudflare:test";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { apiApp } from "../../src/server/app";
import { createAuth } from "../../src/server/lib/auth";
import { getActiveSession } from "../../src/server/lib/active-session";
import {
  createNativeRequest,
  completeNativeRequest,
  consumeNativeRequest,
  pkceChallenge,
} from "../../src/server/lib/native-auth";

const origin = "https://gomate.live";
const verifier = "a".repeat(64);
const userId = "native-test-user";
function bindings() {
  return {
    ...env,
    APP_URL: origin,
    WRITE_MODE: "open",
    BETTER_AUTH_SECRET: "native-test-secret-at-least-32-characters",
  } as typeof env;
}

beforeEach(async () => {
  await applyD1Migrations(
    env.DB,
    JSON.parse((env as unknown as { TEST_MIGRATIONS: string }).TEST_MIGRATIONS),
  );
  await env.DB.prepare(
    "INSERT INTO users(id,name,email,email_verified) VALUES (?,?,?,1)",
  )
    .bind(userId, "Native User", "native-user@example.test")
    .run();
});
afterEach(async () => {
  await reset();
});

describe("native authentication with real D1", () => {
  it("revokes a bearer session through the resource-relative sign-out route", async () => {
    const context = await createAuth(bindings()).$context;
    const session = await context.internalAdapter.createSession(userId);
    const headers = new Headers({ authorization: `Bearer ${session!.token}`, origin, "content-type": "application/json" });
    const response = await apiApp.fetch(new Request(`${origin}/auth/sign-out`, { method: "POST", headers, body: "{}" }), bindings());
    expect(response.status).toBe(200);
    expect(await getActiveSession(bindings(), headers)).toBeNull();
  });
  it("requires the verifier and consumes exactly once under concurrency", async () => {
    const id = await createNativeRequest(
      bindings(),
      await pkceChallenge(verifier),
    );
    expect(
      await consumeNativeRequest(bindings(), id, verifier, "unknown"),
    ).toBeNull();
    const code = await completeNativeRequest(bindings(), id, userId);
    expect(code).toBeTruthy();
    expect(
      await consumeNativeRequest(bindings(), id, verifier, "guessed-code"),
    ).toBeNull();
    expect(await completeNativeRequest(bindings(), id, userId)).toBeNull();
    expect(
      await consumeNativeRequest(bindings(), id, "b".repeat(64), code!),
    ).toBeNull();
    const results = await Promise.all([
      consumeNativeRequest(bindings(), id, verifier, code ?? "unknown"),
      consumeNativeRequest(bindings(), id, verifier, code ?? "unknown"),
    ]);
    expect(results.filter(Boolean)).toEqual([userId]);
  });

  it("rejects expired requests and deleted accounts", async () => {
    const id = await createNativeRequest(
      bindings(),
      await pkceChallenge(verifier),
    );
    await env.DB.prepare(
      "UPDATE verifications SET expires_at=0 WHERE identifier=?",
    )
      .bind(`native:${id}`)
      .run();
    expect(await completeNativeRequest(bindings(), id, userId)).toBeNull();
    expect(
      await consumeNativeRequest(bindings(), id, verifier, "unknown"),
    ).toBeNull();
    const other = await createNativeRequest(
      bindings(),
      await pkceChallenge(verifier),
    );
    await env.DB.prepare(
      "UPDATE users SET status='deleted',deleted_at=? WHERE id=?",
    )
      .bind(Date.now(), userId)
      .run();
    expect(await completeNativeRequest(bindings(), other, userId)).toBeNull();
  });

  it("uses bearer sessions through the existing active-account boundary", async () => {
    const context = await createAuth(bindings()).$context;
    const session = await context.internalAdapter.createSession(userId);
    expect(session).toBeTruthy();
    const headers = new Headers({ authorization: `Bearer ${session!.token}` });
    expect((await getActiveSession(bindings(), headers))?.user.id).toBe(userId);
    await env.DB.prepare("UPDATE users SET status='suspended' WHERE id=?")
      .bind(userId)
      .run();
    expect(await getActiveSession(bindings(), headers)).toBeNull();
  });

  it("cannot bind an existing victim cookie by visiting a completion URL", async () => {
    const id = await createNativeRequest(
      bindings(),
      await pkceChallenge(verifier),
    );
    const context = await createAuth(bindings()).$context;
    const session = await context.internalAdapter.createSession(userId);
    const { makeSignature } = await import("better-auth/crypto");
    const signature = await makeSignature(
      session!.token,
      bindings().BETTER_AUTH_SECRET,
    );
    const cookie = `__Secure-better-auth.session_token=${encodeURIComponent(`${session!.token}.${signature}`)}`;
    const response = await apiApp.fetch(
      new Request(`${origin}/auth/native/google/complete?request=${id}`, {
        headers: { cookie },
      }),
      bindings(),
    );
    expect(response.status).toBe(404);
    const record = await env.DB.prepare(
      "SELECT value FROM verifications WHERE identifier=?",
    )
      .bind(`native:${id}`)
      .first<{ value: string }>();
    expect(JSON.parse(record!.value).userId).toBeNull();
    expect(await consumeNativeRequest(bindings(), id, verifier, id)).toBeNull();
  });

  it("denies native requests on protected and preview origins", async () => {
    for (const url of [
      origin,
      "https://branch-gomate.wujiahong2013.workers.dev",
    ]) {
      const response = await apiApp.fetch(
        new Request(`${url}/auth/native/providers`),
        { ...bindings(), WRITE_MODE: "protected" } as typeof env,
      );
      expect(response.status).toBe(503);
    }
  });

  it("returns a bearer credential only after a valid exchange", async () => {
    const id = await createNativeRequest(
      bindings(),
      await pkceChallenge(verifier),
    );
    const code = await completeNativeRequest(bindings(), id, userId);
    const request = () =>
      new Request(`${origin}/auth/native/exchange`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "cf-connecting-ip": "198.51.100.212",
        },
        body: JSON.stringify({ requestId: id, verifier, code }),
      });
    const response = await apiApp.fetch(request(), bindings());
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("set-cookie")).toBeNull();
    const { token } = (await response.json()) as { token: string };
    expect(
      (
        await getActiveSession(
          bindings(),
          new Headers({ authorization: `Bearer ${token}` }),
        )
      )?.user.id,
    ).toBe(userId);
    expect((await apiApp.fetch(request(), bindings())).status).toBe(401);
  });
});
