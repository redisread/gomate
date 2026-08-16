import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Env } from "../../lib/auth";
import { createTestDb } from "../helpers/db";
import { ContentD1Database } from "../helpers/content-db";
import * as schema from "../../db/schema";
import { seedUser } from "../helpers/seed";
import { authPassword } from "../../lib/auth-password";
import { issuePasswordResetChallenge } from "../../lib/password-reset";

let testDb: ReturnType<typeof createTestDb>["db"];
let testD1: D1Database;
let testSqlite: ReturnType<typeof createTestDb>["sqlite"];
const emailMocks = vi.hoisted(() => ({
  sendPasswordResetEmail: vi.fn(async (
    _email: string,
    _resetUrl: string,
    _name: string | undefined,
    _env: { RESEND_API_KEY?: string; RESEND_FROM_EMAIL?: string },
  ) => ({ success: true as const })),
}));
const betterAuthHandler = vi.fn(async (_request: Request) =>
  Response.json(
    { token: "raw-session-token", user: { id: "signed-in-user" } },
    { headers: { "set-cookie": "better-auth.session_token=cookie-token; HttpOnly" } },
  )
);
const getSession = vi.fn(async ({ asResponse }: { asResponse?: boolean }) =>
  asResponse
    ? Response.json(null)
    : null
);

vi.mock("../../db", () => ({
  createDb: () => testDb,
}));

vi.mock("../../lib/auth", () => ({
  createAuth: () => ({
    api: { getSession },
    handler: betterAuthHandler,
  }),
}));
vi.mock("../../lib/email", () => ({
  sendPasswordResetEmail: emailMocks.sendPasswordResetEmail,
}));

const { authRoute } = await import("../../routes/auth");

class FakeKv {
  readonly values = new Map<string, string>();
  readonly puts: Array<{ key: string; expirationTtl?: number }> = [];

  async get(key: string) {
    return this.values.get(key) ?? null;
  }

  async put(key: string, value: string, options?: { expirationTtl?: number }) {
    this.values.set(key, value);
    this.puts.push({ key, expirationTtl: options?.expirationTtl });
  }
}

class FakeRateLimiter {
  readonly counts = new Map<string, number>();

  constructor(private readonly max: number) {}

  async limit({ key }: { key: string }) {
    const count = (this.counts.get(key) ?? 0) + 1;
    this.counts.set(key, count);
    return { success: count <= this.max };
  }
}

let backgroundTasks: Promise<unknown>[] = [];
const executionContext = {
  waitUntil(promise: Promise<unknown>) {
    backgroundTasks.push(Promise.resolve(promise));
  },
  passThroughOnException() {},
  props: {},
} as unknown as ExecutionContext;

function createApp() {
  const app = new Hono<{ Bindings: Env }>();
  app.route("/api/auth", authRoute);
  return app;
}

function createEnv(
  kv = new FakeKv(),
  limits = {
    signIn: new FakeRateLimiter(5),
    signUp: new FakeRateLimiter(3),
    email: new FakeRateLimiter(5),
  },
) {
  return {
    DB: testD1,
    CACHE_KV: kv as unknown as KVNamespace,
    BETTER_AUTH_SECRET: "test-secret-key-for-testing-32chars",
    APP_URL: "https://gomate.test",
    AUTH_SIGN_IN_RATE_LIMITER: limits.signIn,
    AUTH_SIGN_UP_RATE_LIMITER: limits.signUp,
    AUTH_EMAIL_RATE_LIMITER: limits.email,
  } as unknown as Env;
}

function fetchAuth(app: ReturnType<typeof createApp>, request: Request, env = createEnv()) {
  return app.fetch(request, env, executionContext);
}

function forgotRequest(email: string, ip = "203.0.113.10") {
  return new Request("https://gomate.test/api/auth/forgot-password", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "CF-Connecting-IP": ip,
    },
    body: JSON.stringify({ email }),
  });
}

describe("production authRoute", () => {
  beforeEach(() => {
    const fresh = createTestDb();
    testDb = fresh.db;
    testSqlite = fresh.sqlite;
    testD1 = new ContentD1Database(fresh.sqlite) as unknown as D1Database;
    emailMocks.sendPasswordResetEmail.mockReset();
    emailMocks.sendPasswordResetEmail.mockResolvedValue({ success: true });
    betterAuthHandler.mockClear();
    getSession.mockReset();
    getSession.mockResolvedValue(null);
    backgroundTasks = [];
  });

  it("keeps the sign-in cookie while removing the browser-visible session token", async () => {
    const request = new Request("https://gomate.test/api/auth/sign-in/email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "member@example.test",
        password: "correct-horse-battery-staple",
      }),
    });

    const response = await fetchAuth(createApp(), request);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      user: { id: "signed-in-user" },
    });
    expect(response.headers.get("set-cookie")).toContain(
      "better-auth.session_token=cookie-token",
    );
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("pragma")).toBe("no-cache");
    expect(betterAuthHandler).toHaveBeenCalledOnce();
  });

  it("does not distinguish an unverified account from invalid credentials", async () => {
    betterAuthHandler
      .mockResolvedValueOnce(Response.json({
        code: "INVALID_EMAIL_OR_PASSWORD",
        message: "Invalid email or password",
      }, { status: 401 }))
      .mockResolvedValueOnce(Response.json({
        code: "EMAIL_NOT_VERIFIED",
        message: "Email not verified",
      }, {
        status: 403,
        headers: { "set-cookie": "must-not-escape=1" },
      }));
    const app = createApp();
    const env = createEnv();
    const requestFor = (email: string) => new Request(
      "https://gomate.test/api/auth/sign-in/email",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          password: "attacker-controlled-password",
        }),
      },
    );

    const existing = await fetchAuth(app, requestFor("existing@example.test"), env);
    const newlyCreated = await fetchAuth(app, requestFor("new@example.test"), env);

    expect(existing.status).toBe(401);
    expect(newlyCreated.status).toBe(401);
    expect(await existing.text()).toBe(await newlyCreated.text());
    expect(existing.headers.get("cache-control")).toBe("no-store");
    expect(newlyCreated.headers.get("cache-control")).toBe("no-store");
    expect(existing.headers.get("set-cookie")).toBeNull();
    expect(newlyCreated.headers.get("set-cookie")).toBeNull();
  });

  it("delegates a minimal email sign-up payload", async () => {
    betterAuthHandler.mockResolvedValueOnce(Response.json({
      token: null,
      user: { id: "real-or-synthetic-user-id", email: "new@example.test" },
    }, {
      headers: { "set-cookie": "better-auth.session_token=must-not-escape" },
    }));
    const request = new Request("https://gomate.test/api/auth/sign-up/email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "  NEW@EXAMPLE.TEST  ",
        password: "correct-horse-battery-staple",
        name: "  New user  ",
      }),
    });

    const response = await fetchAuth(createApp(), request);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(betterAuthHandler).toHaveBeenCalledOnce();
    const forwarded = betterAuthHandler.mock.calls[0]?.[0] as Request;
    await expect(forwarded.json()).resolves.toEqual({
      email: "new@example.test",
      password: "correct-horse-battery-staple",
      name: "New user",
    });
  });

  it("never exposes a real or synthetic user ID from sign-up", async () => {
    betterAuthHandler
      .mockResolvedValueOnce(Response.json({ token: null, user: { id: "real-id" } }))
      .mockResolvedValueOnce(Response.json({ token: null, user: { id: "synthetic-id" } }));
    const payload = JSON.stringify({
      email: "private@example.test",
      password: "correct-horse-battery-staple",
      name: "Private",
    });

    const first = await fetchAuth(createApp(), new Request(
      "https://gomate.test/api/auth/sign-up/email",
      { method: "POST", headers: { "content-type": "application/json" }, body: payload },
    ));
    const duplicate = await fetchAuth(createApp(), new Request(
      "https://gomate.test/api/auth/sign-up/email",
      { method: "POST", headers: { "content-type": "application/json" }, body: payload },
    ));

    expect(first.status).toBe(200);
    expect(duplicate.status).toBe(200);
    const firstBody = await first.text();
    const duplicateBody = await duplicate.text();
    expect(firstBody).toBe(duplicateBody);
    expect(firstBody).not.toMatch(/real-id|synthetic-id/u);
  });

  it("does not reveal a concurrent first-registration unique race", async () => {
    betterAuthHandler
      .mockResolvedValueOnce(Response.json({
        token: null,
        user: { id: "created-user-id" },
      }, {
        headers: { "set-cookie": "better-auth.session_token=must-not-escape" },
      }))
      .mockResolvedValueOnce(Response.json({
        code: "USER_ALREADY_EXISTS",
        message: "User already exists",
      }, {
        status: 422,
        headers: { "set-cookie": "must-not-escape=1" },
      }));
    const app = createApp();
    const env = createEnv();
    const request = () => new Request(
      "https://gomate.test/api/auth/sign-up/email",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "race@example.test",
          password: "correct-horse-battery-staple",
          name: "Race",
        }),
      },
    );

    const created = await fetchAuth(app, request(), env);
    const uniqueRace = await fetchAuth(app, request(), env);

    expect(created.status).toBe(200);
    expect(uniqueRace.status).toBe(200);
    expect(await created.text()).toBe(await uniqueRace.text());
    expect(created.headers.get("cache-control")).toBe("no-store");
    expect(uniqueRace.headers.get("cache-control")).toBe("no-store");
    expect(created.headers.get("set-cookie")).toBeNull();
    expect(uniqueRace.headers.get("set-cookie")).toBeNull();
  });

  it("rejects an oversized sign-up body without trusting Content-Length", async () => {
    const request = new Request("https://gomate.test/api/auth/sign-up/email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "large@example.test",
        password: "correct-horse-battery-staple",
        name: "x".repeat(17 * 1024),
      }),
    });
    expect(request.headers.get("content-length")).toBeNull();

    const response = await fetchAuth(createApp(), request);

    expect(response.status).toBe(413);
    expect(betterAuthHandler).not.toHaveBeenCalled();
  });

  it.each(["role", "status", "image", "bio", "nickname", "gender", "birthday"])(
    "rejects the server-owned %s field during sign-up",
    async (field) => {
      const request = new Request("https://gomate.test/api/auth/sign-up/email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "attacker@example.test",
          password: "correct-horse-battery-staple",
          name: "Attacker",
          [field]: field === "image" ? "https://example.test/foreign.png" : "admin",
        }),
      });

      const response = await fetchAuth(createApp(), request);

      expect(response.status).toBe(400);
      expect(betterAuthHandler).not.toHaveBeenCalled();
    },
  );

  it("rejects form-encoded sign-up payloads instead of bypassing the JSON allowlist", async () => {
    const request = new Request("https://gomate.test/api/auth/sign-up/email", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        email: "attacker@example.test",
        password: "correct-horse-battery-staple",
        name: "Attacker",
        image: "https://example.test/foreign.png",
      }),
    });

    const response = await fetchAuth(createApp(), request);

    expect(response.status).toBe(415);
    expect(betterAuthHandler).not.toHaveBeenCalled();
  });

  it("applies the sign-up guard to a trailing-slash path", async () => {
    const request = new Request("https://gomate.test/api/auth/sign-up/email/", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "attacker@example.test",
        password: "correct-horse-battery-staple",
        name: "Attacker",
        role: "admin",
      }),
    });

    const response = await fetchAuth(createApp(), request);

    expect(response.status).toBe(400);
    expect(betterAuthHandler).not.toHaveBeenCalled();
  });

  it("applies the sign-up guard after safe URL path decoding", async () => {
    const request = new Request(
      "https://gomate.test/api/auth//sign-up/%65mail%2F",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "attacker@example.test",
          password: "correct-horse-battery-staple",
          name: "Attacker",
          image: "https://example.test/foreign.png",
        }),
      },
    );

    const response = await fetchAuth(createApp(), request);

    expect(response.status).toBe(400);
    expect(betterAuthHandler).not.toHaveBeenCalled();
  });

  it("does not expose Better Auth's generic profile update endpoint", async () => {
    const request = new Request("https://gomate.test/api/auth/update-user", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ image: "https://example.test/foreign.png" }),
    });

    const response = await fetchAuth(createApp(), request);

    expect(response.status).toBe(404);
    expect(betterAuthHandler).not.toHaveBeenCalled();
  });

  it("allowlists only the product-owned password and session endpoints", async () => {
    const resetUser = await seedUser(testDb, { email: "reset@example.test" });
    const passwordHash = await authPassword.hash("old-password-123");
    testSqlite.prepare(`
      INSERT INTO accounts (
        id, user_id, account_id, provider_id, password, created_at, updated_at
      ) VALUES (?, ?, ?, 'credential', ?, ?, ?)
    `).run(
      `account-${resetUser.id}`,
      resetUser.id,
      resetUser.id,
      passwordHash,
      1,
      1,
    );
    const issued = await issuePasswordResetChallenge(
      testD1,
      resetUser.email,
    );
    const reset = await fetchAuth(
      createApp(),
      new Request("https://gomate.test/api/auth/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          token: issued!.token,
          newPassword: "new-correct-horse-battery-staple",
        }),
      }),
      createEnv(),
    );
    expect(reset.status).toBe(200);
    await expect(reset.json()).resolves.toEqual({ success: true });
    expect(reset.headers.get("cache-control")).toBe("no-store");
    expect(reset.headers.get("set-cookie")).toBeNull();
    expect(betterAuthHandler).not.toHaveBeenCalled();

    const inactiveCapability = await fetchAuth(
      createApp(),
      new Request("https://gomate.test/api/auth/change-password", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: "better-auth.session_token=stale-token",
        },
        body: JSON.stringify({
          currentPassword: "old-password",
          newPassword: "new-password",
        }),
      }),
      createEnv(),
    );
    expect(inactiveCapability.status).toBe(404);
    expect(betterAuthHandler).not.toHaveBeenCalled();
  });

  it("does not expose Better Auth's unthrottled password reset request endpoint", async () => {
    const request = new Request(
      "https://gomate.test/api/auth/request-password-reset/",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "known@example.test" }),
      },
    );

    const response = await fetchAuth(createApp(), request);

    expect(response.status).toBe(404);
    expect(betterAuthHandler).not.toHaveBeenCalled();
  });

  it("marks sign-out responses as private while preserving cookie deletion", async () => {
    betterAuthHandler.mockResolvedValueOnce(Response.json(
      { success: true },
      { headers: { "set-cookie": "better-auth.session_token=; Max-Age=0; HttpOnly" } },
    ));

    const response = await fetchAuth(
      createApp(),
      new Request("https://gomate.test/api/auth/sign-out", {
        method: "POST",
      }),
      createEnv(),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("pragma")).toBe("no-cache");
  });

  it("confirms email through a body-only token and blocks tokenized public URLs", async () => {
    betterAuthHandler.mockResolvedValueOnce(Response.json({ status: true }));
    const response = await fetchAuth(
      createApp(),
      new Request("https://gomate.test/api/auth/confirm-email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: "private-verification-token" }),
      }),
      createEnv(),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
    const forwarded = betterAuthHandler.mock.calls[0]?.[0] as Request;
    expect(forwarded.method).toBe("GET");
    expect(new URL(forwarded.url).pathname).toBe("/api/auth/verify-email");
    expect(new URL(forwarded.url).searchParams.get("token")).toBe(
      "private-verification-token",
    );
    expect(forwarded.headers.get("cookie")).toBeNull();

    betterAuthHandler.mockClear();
    const raw = await fetchAuth(
      createApp(),
      new Request(
        "https://gomate.test/api/auth/verify-email?token=must-not-reach-handler",
      ),
      createEnv(),
    );
    expect(raw.status).toBe(404);
    expect(betterAuthHandler).not.toHaveBeenCalled();
  });

  it("returns the same generic 200 payload for known and unknown normalized emails", async () => {
    await seedUser(testDb, { email: "known@example.test" });
    const env = createEnv();

    const known = await fetchAuth(
      createApp(),
      forgotRequest("  KNOWN@EXAMPLE.TEST  ", "203.0.113.11"),
      env,
    );
    const unknown = await fetchAuth(
      createApp(),
      forgotRequest("unknown@example.test", "203.0.113.12"),
      env,
    );

    expect(known.status).toBe(200);
    expect(unknown.status).toBe(200);
    expect(await known.json()).toEqual(await unknown.json());
    expect(known.headers.get("cache-control")).toBe("no-store");
    expect(unknown.headers.get("cache-control")).toBe("no-store");
    expect(known.headers.get("set-cookie")).toBeNull();
    expect(unknown.headers.get("set-cookie")).toBeNull();
    await Promise.all(backgroundTasks);
    expect(emailMocks.sendPasswordResetEmail).toHaveBeenCalledOnce();
    expect(emailMocks.sendPasswordResetEmail.mock.calls[0]?.[0]).toBe(
      "known@example.test",
    );
    const resetUrl = new URL(
      emailMocks.sendPasswordResetEmail.mock.calls[0]?.[1] as string,
    );
    expect(resetUrl.pathname).toBe("/reset-password");
    expect(resetUrl.search).toBe("");
    expect(resetUrl.hash).toMatch(/^#token=v1\./u);
  });

  it("returns before a reset delivery task settles", async () => {
    let release!: () => void;
    await seedUser(testDb, { email: "timing@example.test" });
    emailMocks.sendPasswordResetEmail.mockReturnValueOnce(
      new Promise<{ success: true }>((resolve) => {
        release = () => resolve({ success: true });
      }),
    );

    const response = await fetchAuth(
      createApp(),
      forgotRequest("timing@example.test"),
      createEnv(),
    );

    expect(response.status).toBe(200);
    expect(backgroundTasks).toHaveLength(1);
    release();
    await Promise.all(backgroundTasks);
  });

  it("returns before the existence-dependent D1 challenge work settles", async () => {
    let release!: (value: null) => void;
    const pendingFirst = new Promise<null>((resolve) => {
      release = resolve;
    });
    const pendingDatabase = {
      prepare: vi.fn(() => ({
        bind(..._values: unknown[]) {
          return this;
        },
        first: vi.fn(() => pendingFirst),
      })),
    } as unknown as D1Database;
    const env = { ...createEnv(), DB: pendingDatabase } as Env;

    const response = await fetchAuth(
      createApp(),
      forgotRequest("timing@example.test"),
      env,
    );

    expect(response.status).toBe(200);
    expect(backgroundTasks).toHaveLength(1);
    expect(emailMocks.sendPasswordResetEmail).not.toHaveBeenCalled();
    release(null);
    await Promise.all(backgroundTasks);
  });

  it("rejects email addresses longer than 254 characters", async () => {
    const local = "a".repeat(243);
    const response = await fetchAuth(
      createApp(),
      forgotRequest(`${local}@example.test`),
      createEnv(),
    );

    expect(response.status).toBe(400);
    expect(emailMocks.sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it("does not reveal a known email when reset delivery fails", async () => {
    await seedUser(testDb, { email: "delivery-failure@example.test" });
    emailMocks.sendPasswordResetEmail.mockRejectedValueOnce(
      new Error("provider unavailable"),
    );

    const response = await fetchAuth(
      createApp(),
      forgotRequest("delivery-failure@example.test"),
      createEnv(),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      message: "如果该邮箱已注册，重置密码邮件已发送",
    });
    await Promise.all(backgroundTasks);
  });

  it("rate limits both email spray and distributed attacks using private keys", async () => {
    const kv = new FakeKv();
    const limits = {
      signIn: new FakeRateLimiter(5),
      signUp: new FakeRateLimiter(3),
      email: new FakeRateLimiter(5),
    };
    const env = createEnv(kv, limits);
    const app = createApp();
    await seedUser(testDb, { email: "rate@example.test" });

    for (let index = 0; index < 5; index += 1) {
      const response = await fetchAuth(
        app,
        forgotRequest(index % 2 === 0 ? "RATE@EXAMPLE.TEST" : "rate@example.test"),
        env,
      );
      expect(response.status).toBe(200);
    }

    const limited = await fetchAuth(app, forgotRequest("rate@example.test"), env);
    const otherIp = await fetchAuth(
      app,
      forgotRequest("rate@example.test", "203.0.113.99"),
      env,
    );

    expect(limited.status).toBe(429);
    expect(limited.headers.get("Retry-After")).toBeTruthy();
    expect(otherIp.status).toBe(429);
    await Promise.all(backgroundTasks);
    expect(emailMocks.sendPasswordResetEmail).toHaveBeenCalledTimes(5);
    expect([...limits.email.counts.keys()].every((key) => /^[0-9a-f]{64}$/u.test(key))).toBe(true);
    expect([...limits.email.counts.keys()].join("\n")).not.toContain("rate@example.test");
    expect([...limits.email.counts.keys()].join("\n")).not.toContain("203.0.113");

    const sprayLimits = {
      signIn: new FakeRateLimiter(5),
      signUp: new FakeRateLimiter(3),
      email: new FakeRateLimiter(5),
    };
    const sprayEnv = createEnv(new FakeKv(), sprayLimits);
    for (let index = 0; index < 5; index += 1) {
      const response = await fetchAuth(
        app,
        forgotRequest(`target-${index}@example.test`, "198.51.100.8"),
        sprayEnv,
      );
      expect(response.status).toBe(200);
    }
    expect(
      (await fetchAuth(
        app,
        forgotRequest("target-6@example.test", "198.51.100.8"),
        sprayEnv,
      )).status,
    ).toBe(429);
  });

  it("revokes an inactive session returned by Better Auth", async () => {
    const user = await seedUser(testDb, { id: "inactive-auth-user", status: "suspended" });
    // Model a stale session restored from a pre-trigger database; the current
    // baseline correctly rejects this INSERT before the route can observe it.
    testSqlite.exec("DROP TRIGGER sessions_active_user_insert_guard");
    await testDb.insert(schema.sessions).values({
      id: "inactive-session",
      userId: user.id,
      token: "inactive-token",
      expiresAt: new Date(Date.now() + 60_000),
    });
    getSession.mockResolvedValueOnce(Response.json({
      session: { id: "inactive-session", userId: user.id },
      user: { id: user.id },
    }));

    const response = await fetchAuth(
      createApp(),
      new Request("https://gomate.test/api/auth/get-session"),
      createEnv(),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("pragma")).toBe("no-cache");
    await expect(response.json()).resolves.toBeNull();
    await expect(testDb.select().from(schema.sessions)).resolves.toEqual([]);
  });

  it("keeps active session metadata private while preserving refresh cookies", async () => {
    const user = await seedUser(testDb, { id: "active-auth-user" });
    getSession.mockResolvedValueOnce(Response.json({
      session: {
        id: "active-session",
        userId: user.id,
        token: "raw-session-token",
        ipAddress: "203.0.113.44",
        userAgent: "private-user-agent",
        expiresAt: "2026-08-23T00:00:00.000Z",
      },
      user: { id: user.id, email: user.email },
    }, {
      headers: { "set-cookie": "better-auth.session_token=refreshed; HttpOnly" },
    }));

    const response = await fetchAuth(
      createApp(),
      new Request("https://gomate.test/api/auth/get-session"),
      createEnv(),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("refreshed");
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      session: {
        id: "active-session",
        userId: user.id,
        expiresAt: "2026-08-23T00:00:00.000Z",
      },
      user: { id: user.id, email: user.email },
    });
  });
});
