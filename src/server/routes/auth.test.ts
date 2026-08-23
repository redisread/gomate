import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createAuth: vi.fn(),
  createDb: vi.fn(),
  enforceActiveSession: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  issuePasswordResetChallenge: vi.fn(),
  resetPasswordWithChallenge: vi.fn(),
}));

vi.mock("../lib/auth", () => ({
  createAuth: mocks.createAuth,
}));
vi.mock("../db", () => ({
  createDb: mocks.createDb,
}));
vi.mock("../lib/session-policy", () => ({
  enforceActiveSession: mocks.enforceActiveSession,
}));
vi.mock("../lib/email", () => ({
  sendPasswordResetEmail: mocks.sendPasswordResetEmail,
}));
vi.mock("../lib/password-reset", () => ({
  InvalidPasswordResetTokenError: class InvalidPasswordResetTokenError extends Error {},
  issuePasswordResetChallenge: mocks.issuePasswordResetChallenge,
  passwordResetClientUrl: vi.fn(),
  resetPasswordWithChallenge: mocks.resetPasswordWithChallenge,
}));

const { authRoute } = await import("./auth");

const env = {
  APP_URL: "http://localhost:5432",
  BETTER_AUTH_SECRET: "test-secret-key-for-testing-32chars",
  AUTH_SIGN_UP_RATE_LIMITER: {
    limit: vi.fn().mockResolvedValue({ success: true }),
  },
} as never;

function responseForUser(userId: string, email: string) {
  return new Response(JSON.stringify({
    token: null,
    user: { id: userId, email, name: "Test User" },
  }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

function dbRows(...rows: unknown[][]) {
  let index = 0;
  mocks.createDb.mockReturnValue({
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue(rows[index++] ?? []),
        })),
      })),
    })),
  });
}

async function signUp(email = "new@example.com") {
  return authRoute.fetch(
    new Request("http://localhost:5432/sign-up/email", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:5432",
      },
      body: JSON.stringify({
        email,
        password: "password123",
        name: "Test User",
      }),
    }),
    env,
  );
}

describe("email sign-up persistence boundary", () => {
  it("fails instead of acknowledging a Better Auth success with no persisted user", async () => {
    mocks.createAuth.mockReturnValue({
      handler: vi.fn().mockResolvedValue(responseForUser("user-1", "new@example.com")),
    });
    dbRows([]);

    const response = await signUp();

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: { code: "INTERNAL_ERROR" },
    });
  });

  it("fails when a newly-created user has no credential account", async () => {
    mocks.createAuth.mockReturnValue({
      handler: vi.fn().mockResolvedValue(responseForUser("user-1", "new@example.com")),
    });
    dbRows([{ id: "user-1" }], []);

    const response = await signUp();

    expect(response.status).toBe(500);
  });

  it("keeps duplicate registration responses generic", async () => {
    mocks.createAuth.mockReturnValue({
      handler: vi.fn().mockResolvedValue(responseForUser("synthetic-id", "new@example.com")),
    });
    dbRows([{ id: "existing-user" }]);

    const response = await signUp();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
  });

  it("does not convert Better Auth client failures into success", async () => {
    mocks.createAuth.mockReturnValue({
      handler: vi.fn().mockResolvedValue(new Response(JSON.stringify({
        code: "FAILED_TO_CREATE_USER",
      }), { status: 422 })),
    });

    const response = await signUp();

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: { code: "INTERNAL_ERROR" },
    });
  });

  it("acknowledges a new registration only after user and credential account persist", async () => {
    mocks.createAuth.mockReturnValue({
      handler: vi.fn().mockResolvedValue(responseForUser("user-1", "new@example.com")),
    });
    dbRows([{ id: "user-1" }], [{ id: "account-1" }]);

    const response = await signUp();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
  });
});
