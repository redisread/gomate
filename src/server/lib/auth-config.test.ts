import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  betterAuth: vi.fn((options: unknown) => ({ options })),
  sendEmailVerificationEmail: vi.fn(async (
    _email: string,
    _url: string,
    _name: string,
    _env: unknown,
  ) => ({ success: true })),
  sendWelcomeEmail: vi.fn(async (
    _email: string,
    _name: string,
    _env: unknown,
  ) => ({ success: true })),
}));

vi.mock("better-auth", () => ({ betterAuth: mocks.betterAuth }));
vi.mock("better-auth/adapters/drizzle", () => ({
  drizzleAdapter: vi.fn(() => ({ adapter: "test" })),
}));
vi.mock("../db", () => ({ createDb: vi.fn(() => ({})) }));
vi.mock("./email", () => ({
  sendEmailVerificationEmail: mocks.sendEmailVerificationEmail,
  sendWelcomeEmail: mocks.sendWelcomeEmail,
}));

const { createAuth } = await import("./auth");

describe("createAuth security configuration", () => {
  beforeEach(() => {
    mocks.betterAuth.mockClear();
    mocks.sendEmailVerificationEmail.mockClear();
    mocks.sendWelcomeEmail.mockClear();
  });

  it("puts email ownership tokens only in client-side URL fragments", async () => {
    createAuth({
      DB: {} as D1Database,
      BETTER_AUTH_SECRET: "test-secret-key-for-testing-32chars",
      APP_URL: "https://gomate.test",
    } as never);
    const options = mocks.betterAuth.mock.calls[0]?.[0] as {
      emailAndPassword: {
        sendResetPassword?: unknown;
        password: unknown;
      };
      emailVerification: {
        sendVerificationEmail(input: {
          user: { email: string; name: string };
          url: string;
          token: string;
        }): Promise<void>;
      };
    };

    await options.emailVerification.sendVerificationEmail({
      user: { email: "member@example.test", name: "Member" },
      url: "https://gomate.test/api/auth/verify-email?token=leaky-token",
      token: "verification-secret",
    });

    const verificationUrl = new URL(
      mocks.sendEmailVerificationEmail.mock.calls[0]?.[1] as string,
    );
    expect(verificationUrl.pathname).toBe("/verify-email");
    expect(verificationUrl.search).toBe("");
    expect(verificationUrl.hash).toBe("#token=verification-secret");
    expect(JSON.stringify(mocks.sendEmailVerificationEmail.mock.calls)).not.toContain(
      "leaky-token",
    );
    expect(options.emailAndPassword.sendResetPassword).toBeUndefined();
    expect(options.emailAndPassword.password).toBeTruthy();
  });

  it("schedules verification delivery without exposing provider latency", async () => {
    let release!: (value: { success: true }) => void;
    mocks.sendEmailVerificationEmail.mockReturnValueOnce(
      new Promise((resolve) => {
        release = resolve;
      }),
    );
    const backgroundTasks: Promise<unknown>[] = [];
    createAuth({
      DB: {} as D1Database,
      BETTER_AUTH_SECRET: "test-secret-key-for-testing-32chars",
      APP_URL: "https://gomate.test",
    } as never, {
      waitUntil(promise) {
        backgroundTasks.push(promise);
      },
    });
    const options = mocks.betterAuth.mock.calls[0]?.[0] as {
      emailVerification: {
        sendVerificationEmail(input: {
          user: { email: string; name: string };
          url: string;
          token: string;
        }): Promise<void>;
      };
    };

    await expect(options.emailVerification.sendVerificationEmail({
      user: { email: "member@example.test", name: "Member" },
      url: "https://gomate.test/ignored",
      token: "verification-secret",
    })).resolves.toBeUndefined();
    expect(backgroundTasks).toHaveLength(1);

    release({ success: true });
    await Promise.all(backgroundTasks);
  });

  it("keeps authorization and profile fields server-owned", () => {
    createAuth({
      DB: {} as D1Database,
      BETTER_AUTH_SECRET: "test-secret-key-for-testing-32chars",
      APP_URL: "https://gomate.test",
    } as never);

    const options = mocks.betterAuth.mock.calls[0]?.[0] as {
      emailAndPassword: {
        autoSignIn: boolean;
        minPasswordLength: number;
        requireEmailVerification: boolean;
        password: { hash: unknown; verify: unknown };
      };
      emailVerification: {
        sendOnSignUp: boolean;
        sendOnSignIn: boolean;
        autoSignInAfterVerification: boolean;
        sendVerificationEmail: unknown;
      };
      databaseHooks: {
        session: { create: { before: unknown } };
      };
      user: { additionalFields: Record<string, { input?: boolean }> };
      rateLimit: {
        enabled: boolean;
        customRules: Record<string, { window: number; max: number }>;
      };
      advanced: { ipAddress: { ipAddressHeaders: string[] } };
      logger: { disabled: boolean };
      onAPIError: { throw: boolean };
    };

    expect(options.emailAndPassword.minPasswordLength).toBe(8);
    expect(options.emailAndPassword.autoSignIn).toBe(false);
    expect(options.emailAndPassword.requireEmailVerification).toBe(true);
    expect(options.emailAndPassword.password).toMatchObject({
      hash: expect.any(Function),
      verify: expect.any(Function),
    });
    expect(options.emailVerification).toMatchObject({
      sendOnSignUp: true,
      sendOnSignIn: true,
      autoSignInAfterVerification: false,
      sendVerificationEmail: expect.any(Function),
    });
    expect(options.databaseHooks.session.create.before).toEqual(
      expect.any(Function),
    );
    expect(Object.values(options.user.additionalFields)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ input: false }),
      ]),
    );
    expect(
      Object.values(options.user.additionalFields).every((field) => field.input === false),
    ).toBe(true);
    expect(options.rateLimit).toMatchObject({
      enabled: true,
      customRules: {
        "/sign-in/email": { window: 60, max: 5 },
        "/sign-up/email": { window: 60, max: 3 },
      },
    });
    expect(options.advanced.ipAddress.ipAddressHeaders).toEqual([
      "cf-connecting-ip",
    ]);
    expect(options.logger).toEqual({ disabled: true });
    expect(options.onAPIError).toEqual({ throw: true });
  });

});
