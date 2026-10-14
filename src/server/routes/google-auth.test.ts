import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ handler: vi.fn() }));
vi.mock("../lib/auth", () => ({
  createAuth: () => ({ handler: mocks.handler }),
}));
const { authRoute } = await import("./auth");
const origin = "https://gomate.live";
const bindings = {
  APP_URL: origin,
  WRITE_MODE: "open",
  GOOGLE_CLIENT_ID: "test-google-client",
  GOOGLE_CLIENT_SECRET: "test-google-secret",
  AUTH_SIGN_IN_RATE_LIMITER: { limit: async () => ({ success: true }) },
};
function request(path: string, body?: unknown, overrides = {}) {
  return authRoute.fetch(
    new Request(
      `${origin}${path}`,
      body === undefined
        ? undefined
        : {
            method: "POST",
            headers: { origin, "content-type": "application/json" },
            body: JSON.stringify(body),
          },
    ),
    { ...bindings, ...overrides } as never,
  );
}
describe("Google OAuth public boundary", () => {
  beforeEach(() => {
    mocks.handler.mockReset();
    mocks.handler.mockResolvedValue(
      new Response(
        JSON.stringify({
          url: "https://accounts.google.com/o/oauth2/v2/auth",
          redirect: true,
        }),
        {
          headers: {
            "content-type": "application/json",
            "set-cookie": "state=test; HttpOnly",
          },
        },
      ),
    );
  });
  it("reports availability without exposing credentials", async () => {
    const res = await request("/providers");
    expect(await res.json()).toEqual({ google: true });
    expect(res.headers.get("cache-control")).toBe("no-store");
  });
  it("starts only the configured Google redirect flow", async () => {
    const res = await request("/sign-in/social", {
      provider: "google",
      callbackURL: "/teams/team-1?source=share",
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("set-cookie")).toContain("state=test");
    const input = mocks.handler.mock.calls[0][0] as Request;
    expect(await input.json()).toMatchObject({
      provider: "google",
      callbackURL: `${origin}/teams/team-1?source=share`,
    });
  });
  it.each([
    { provider: "github" },
    { provider: "google", idToken: { token: "untrusted" } },
    { provider: "google", scopes: ["https://www.googleapis.com/auth/drive"] },
    { provider: "google", callbackURL: "https://evil.test/" },
    { provider: "google", callbackURL: "//evil.test" },
  ])(
    "rejects unexposed provider capabilities and unsafe redirects: %j",
    async (body) => {
      expect((await request("/sign-in/social", body)).status).toBe(400);
      expect(mocks.handler).not.toHaveBeenCalled();
    },
  );
  it("requires a same-origin initiation even without a cookie", async () => {
    const res = await authRoute.fetch(
      new Request(`${origin}/sign-in/social`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://evil.test",
        },
        body: '{"provider":"google"}',
      }),
      bindings as never,
    );
    expect(res.status).toBe(403);
    expect(mocks.handler).not.toHaveBeenCalled();
  });
  it("rate limits authorization initiation", async () => {
    const res = await request(
      "/sign-in/social",
      { provider: "google" },
      {
        AUTH_SIGN_IN_RATE_LIMITER: { limit: async () => ({ success: false }) },
      },
    );
    expect(res.status).toBe(429);
    expect(mocks.handler).not.toHaveBeenCalled();
  });
  it.each([{ WRITE_MODE: "protected" }, { GOOGLE_CLIENT_SECRET: "" }])(
    "does not invoke OAuth while unavailable: %j",
    async (overrides) => {
      expect(
        (
          await request(
            "/callback/google?code=secret&state=state",
            undefined,
            overrides,
          )
        ).status,
      ).toBe(302);
      expect(mocks.handler).not.toHaveBeenCalled();
    },
  );
  it("does not allow Google to create users on shared Preview data", async () => {
    const res = await authRoute.fetch(
      new Request(
        "https://b-google-gomate.account.workers.dev/callback/google?code=secret&state=state",
      ),
      {
        ...bindings,
        PREVIEW_HOST_SUFFIX: "account.workers.dev",
      } as never,
    );
    expect(res.status).toBe(302);
    expect(mocks.handler).not.toHaveBeenCalled();
  });
  it("delegates state and code verification on the canonical callback", async () => {
    mocks.handler.mockResolvedValueOnce(
      new Response(null, {
        status: 302,
        headers: {
          location: "/teams/team-1",
          "set-cookie": "session=signed; HttpOnly",
        },
      }),
    );
    const res = await request("/callback/google?code=test&state=test");
    expect(res.status).toBe(302);
    expect(res.headers.get("set-cookie")).toContain("session=signed");
    expect((mocks.handler.mock.calls[0][0] as Request).url).toBe(
      `${origin}/api/auth/callback/google?code=test&state=test`,
    );
  });
});
