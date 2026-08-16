import { afterEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";
import { apiApp } from "../../app";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("API runtime contract", () => {
  it("keeps read endpoints available while writes are protected", async () => {
    const response = await apiApp.request(
      "/health",
      { method: "GET" },
      { WRITE_MODE: "protected" } as never
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    await expect(response.json()).resolves.toMatchObject({ status: "ok" });
  });

  it.each(["GET", "HEAD", "OPTIONS"])(
    "does not block the safe %s method",
    async (method) => {
      const response = await apiApp.request(
        "/health",
        { method },
        { WRITE_MODE: "protected" } as never
      );

      expect(response.status).not.toBe(503);
      expect(response.headers.get("retry-after")).toBeNull();
    }
  );

  it.each(["POST", "PUT", "PATCH", "DELETE"])(
    "rejects the unsafe %s method before business routes run",
    async (method) => {
      const response = await apiApp.request(
        "/contact",
        {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        },
        { WRITE_MODE: "protected" } as never
      );

      expect(response.status).toBe(503);
      expect(response.headers.get("retry-after")).toBe("60");
      await expect(response.json()).resolves.toEqual({
        success: false,
        error: {
          code: "WRITE_PROTECTED",
          message: "Writes are temporarily protected",
        },
      });
    }
  );

  it("allows writes when WRITE_MODE is open", async () => {
    const response = await apiApp.request(
      "/does-not-exist",
      { method: "POST" },
      { WRITE_MODE: "open" } as never
    );

    expect(response.status).toBe(404);
    expect(response.headers.get("retry-after")).toBeNull();
  });

  it("rejects cookie-authenticated writes without an exact same-origin proof", async () => {
    const requests: Array<Record<string, string>> = [
      { Cookie: "better-auth.session_token=secret" },
      {
        Cookie: "better-auth.session_token=secret",
        Origin: "https://api.gomate.test",
        "Sec-Fetch-Site": "same-site",
      },
      {
        Cookie: "better-auth.session_token=secret",
        Origin: "https://gomate.test",
        "Sec-Fetch-Site": "same-site",
      },
    ];
    for (const headers of requests) {
      const response = await apiApp.request(
        "https://gomate.test/does-not-exist",
        { method: "POST", headers },
        { WRITE_MODE: "open", APP_URL: "https://gomate.test" } as never,
      );
      expect(response.status).toBe(403);
      await expect(response.json()).resolves.toMatchObject({
        error: { code: "FORBIDDEN" },
      });
    }
  });

  it("allows a cookie-authenticated same-origin write to reach routing", async () => {
    const response = await apiApp.request(
      "https://gomate.test/does-not-exist",
      {
        method: "POST",
        headers: {
          Cookie: "better-auth.session_token=secret",
          Origin: "https://gomate.test",
          "Sec-Fetch-Site": "same-origin",
        },
      },
      { WRITE_MODE: "open", APP_URL: "https://gomate.test" } as never,
    );

    expect(response.status).toBe(404);
  });

  it("protects Better Auth write endpoints without an auth bypass", async () => {
    const response = await apiApp.request(
      "/auth/sign-in/email",
      { method: "POST" },
      { WRITE_MODE: "protected" } as never
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "WRITE_PROTECTED" },
    });
  });

  it("returns a stable JSON envelope for unknown API routes", async () => {
    const response = await apiApp.request("/does-not-exist");

    expect(response.status).toBe(404);
    expect(response.headers.get("content-type")).toContain("application/json");
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: {
        code: "NOT_FOUND",
        message: "Not found",
      },
    });
  });

  it("never exposes the local R2 development proxy on a production host", async () => {
    const get = async () => ({ body: "secret" });
    const response = await apiApp.request(
      "https://gomate.live/r2/temp/stories/user/secret.webp",
      undefined,
      { R2: { get } } as never,
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "NOT_FOUND" },
    });
  });

  it("proxies only allowlisted raster media with nosniff", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(new Uint8Array([0x89, 0x50, 0x4e, 0x47]), {
        headers: { "content-type": "image/png; charset=binary" },
      }),
    );

    const response = await apiApp.request(
      `/proxy-image?url=${encodeURIComponent("https://raw.githubusercontent.com/example/repo/main/image.png")}`,
      { method: "GET" },
      { WRITE_MODE: "open" } as never,
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it.each(["image/svg+xml", "image/svg+xml; charset=utf-8", "text/html"])(
    "rejects executable or non-raster upstream media %s",
    async (contentType) => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response("<svg><script>alert(1)</script></svg>", {
          headers: { "content-type": contentType },
        }),
      );

      const response = await apiApp.request(
        `/proxy-image?url=${encodeURIComponent("https://raw.githubusercontent.com/example/repo/main/image.svg")}`,
        { method: "GET" },
        { WRITE_MODE: "open" } as never,
      );

      expect(response.status).toBe(502);
    },
  );

  it("correlates a request and emits a structured completion event", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);

    const response = await apiApp.request("http://localhost/health", {
      headers: {
        "CF-Ray": "95ABCDEF01234567-HKG",
        "X-Request-ID": "untrusted-person@example.com",
      },
    });

    const requestId = response.headers.get("x-request-id");
    expect(requestId).toMatch(
      /^95abcdef01234567-hkg-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u,
    );
    expect(requestId).not.toContain("untrusted-person");
    expect(info).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "api_request_completed",
        level: "info",
        requestId,
        method: "GET",
        route: "/health",
        status: 200,
        durationMs: expect.any(Number),
      }),
    );
  });

  it("correlates unhandled failures without logging raw error details", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const get = async () => {
      throw new Error("secret-token person@example.com");
    };

    const response = await apiApp.request(
      "http://localhost/r2/example.webp",
      undefined,
      { R2: { get } } as never,
    );

    const requestId = response.headers.get("x-request-id");
    expect(response.status).toBe(500);
    expect(requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u,
    );
    const entries = error.mock.calls.map(([entry]) => entry);
    expect(entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          event: "api_unhandled_error",
          level: "error",
          requestId,
          error: { type: "Error" },
        }),
        expect.objectContaining({
          event: "api_request_completed",
          level: "error",
          requestId,
          method: "GET",
          route: "/r2/*",
          status: 500,
        }),
      ]),
    );
    expect(JSON.stringify(entries)).not.toContain("secret-token");
    expect(JSON.stringify(entries)).not.toContain("person@example.com");
  });

  it("contains password-reset database failures inside the sanitized Hono logger", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const makeStatement = () => ({
      bind(..._args: unknown[]) {
        return this;
      },
      async all() {
        throw new Error("simulated D1 outage with raw query params");
      },
      async run() {
        throw new Error("simulated D1 outage with raw query params");
      },
      async raw() {
        throw new Error("simulated D1 outage with raw query params");
      },
      async first() {
        throw new Error("simulated D1 outage with raw query params");
      },
    });
    const worker = new Hono<{ Bindings: Record<string, unknown> }>();
    worker.route("/api", apiApp as never);
    const canaryToken = "v1.user_12345678.CANARY_RESET_TOKEN_DO_NOT_LOG123";
    const canaryEmail = "canary-auth@example.invalid";
    const allow = { limit: vi.fn(async () => ({ success: true })) };

    const response = await worker.fetch(
      new Request("https://gomate.test/api/auth/reset-password", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "cf-connecting-ip": "203.0.113.1",
        },
        body: JSON.stringify({
          newPassword: `${canaryEmail}-new-password`,
          token: canaryToken,
        }),
      }),
      {
        WRITE_MODE: "open",
        APP_URL: "https://gomate.test",
        BETTER_AUTH_SECRET: "test-secret-key-for-testing-at-least-32-chars",
        DB: { prepare: vi.fn(() => makeStatement()) },
        CACHE_KV: {
          get: vi.fn(async () => null),
          put: vi.fn(async () => undefined),
        },
        AUTH_EMAIL_RATE_LIMITER: allow,
      },
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "INTERNAL_ERROR" },
    });
    const calls = error.mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    expect(calls.every((args) => args.length === 1 && typeof args[0] === "object"))
      .toBe(true);
    const rendered = JSON.stringify(calls);
    expect(rendered).not.toContain(canaryToken);
    expect(rendered).not.toContain(canaryEmail);
    expect(rendered).not.toContain("simulated D1 outage");
    expect(rendered).not.toContain("params:");
  });
});
