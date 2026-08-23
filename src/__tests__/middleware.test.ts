import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ resolveAdminAccess: vi.fn() }));

vi.mock("@/server/lib/admin-access", () => ({
  resolveAdminAccess: mocks.resolveAdminAccess,
}));

const { onRequest } = await import("../middleware");

function contextFor(request: Request) {
  return {
    request,
    locals: {},
    cookies: { set: vi.fn() },
    redirect: vi.fn((location: string, status: number) =>
      new Response(null, { status, headers: { location } })
    ),
    rewrite: vi.fn((target: URL) =>
      new Response(target.pathname === "/403" ? "forbidden" : "rewritten", {
        status: target.pathname === "/403" ? 403 : 200,
      }),
    ),
  };
}

function assertResponse(value: void | Response): asserts value is Response {
  if (!(value instanceof Response)) throw new Error("Expected response");
}

describe("i18n middleware query preservation", () => {
  it("dispatches API requests through the route-relative Hono app", async () => {
    const context = contextFor(new Request("https://gomate.test/api/health"));

    const response = await onRequest(context as never, vi.fn() as never);

    if (!(response instanceof Response)) throw new Error("Expected API response");
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ status: "ok" });
  });

  it("strips legacy bearer-token queries before locale routing", async () => {
    const context = contextFor(
      new Request(
        "https://gomate.test/reset-password?source=email&token=legacy-secret",
        { headers: { "Accept-Language": "en" } },
      ),
    );

    const response = await onRequest(context as never, vi.fn() as never);

    expect(context.redirect).toHaveBeenCalledWith(
      "https://gomate.test/reset-password?source=email",
      302,
    );
    if (!(response instanceof Response)) throw new Error("Expected redirect response");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
  });

  it("preserves ordinary query state during the first locale redirect", async () => {
    const context = contextFor(
      new Request("https://gomate.test/reset-password?source=email", {
        headers: { "Accept-Language": "en" },
      }),
    );

    await onRequest(context as never, vi.fn() as never);

    expect(context.redirect).toHaveBeenCalledWith(
      "https://gomate.test/en/reset-password?source=email",
      302,
    );
  });

  it("preserves ordinary query state while rewriting a locale-prefixed route", async () => {
    const context = contextFor(
      new Request("https://gomate.test/ja/reset-password?source=email"),
    );

    await onRequest(context as never, vi.fn() as never);

    const [target] = context.rewrite.mock.calls[0] ?? [];
    expect(target).toBeInstanceOf(URL);
    expect((target as URL).toString()).toBe(
      "https://gomate.test/reset-password?source=email",
    );
  });
});

describe("administrator page middleware", () => {
  it("redirects an unauthenticated administrator request to login safely", async () => {
    mocks.resolveAdminAccess.mockResolvedValueOnce({ kind: "unauthenticated" });
    const context = contextFor(
      new Request("https://gomate.test/admin/locations/new?source=navbar"),
    );
    const next = vi.fn(() => new Response("private admin content"));

    const response = await onRequest(context as never, next as never);

    assertResponse(response);
    expect(context.redirect).toHaveBeenCalledWith(
      "https://gomate.test/login?returnTo=%2Fadmin%2Flocations%2Fnew%3Fsource%3Dnavbar",
      302,
    );
    expect(next).not.toHaveBeenCalled();
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it.each(["zh-CN", "en", "ja"])(
    "guards the %s locale-prefixed administrator path",
    async (locale) => {
      mocks.resolveAdminAccess.mockResolvedValueOnce({
        kind: "unauthenticated",
      });
      const context = contextFor(
        new Request(`https://gomate.test/${locale}/admin/locations/new`),
      );

      await onRequest(context as never, vi.fn() as never);

      expect(context.cookies.set).toHaveBeenCalledWith(
        "gomate_locale",
        locale,
        expect.objectContaining({ path: "/" }),
      );
      expect(context.redirect).toHaveBeenCalledWith(
        "https://gomate.test/login?returnTo=%2Fadmin%2Flocations%2Fnew",
        302,
      );
    },
  );

  it("returns a real 403 without rendering administrator content", async () => {
    mocks.resolveAdminAccess.mockResolvedValueOnce({ kind: "forbidden" });
    const context = contextFor(new Request("https://gomate.test/admin"));
    const next = vi.fn(() => new Response("private admin content"));

    const response = await onRequest(context as never, next as never);

    assertResponse(response);
    expect(response.status).toBe(403);
    expect(await response.text()).toBe("forbidden");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(context.rewrite).toHaveBeenCalledWith(
      new URL("https://gomate.test/403"),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("exposes only the minimal administrator identity to the page", async () => {
    const admin = {
      id: "admin-1",
      displayName: "Visible Admin",
      image: null,
    };
    mocks.resolveAdminAccess.mockResolvedValueOnce({
      kind: "authorized",
      admin,
    });
    const context = contextFor(new Request("https://gomate.test/admin"));
    const next = vi.fn(() => new Response("admin home"));

    const response = await onRequest(context as never, next as never);

    assertResponse(response);
    expect(next).toHaveBeenCalledOnce();
    expect(context.locals).toMatchObject({ admin });
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("keeps authorization through a locale rewrite", async () => {
    const admin = { id: "admin-1", displayName: "Admin", image: null };
    mocks.resolveAdminAccess.mockResolvedValueOnce({
      kind: "authorized",
      admin,
    });
    const context = contextFor(
      new Request("https://gomate.test/en/admin/locations/new"),
    );

    const response = await onRequest(context as never, vi.fn() as never);

    assertResponse(response);
    expect(context.locals).toMatchObject({ locale: "en", admin });
    expect(context.rewrite).toHaveBeenCalledWith(
      new URL("https://gomate.test/admin/locations/new"),
    );
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
});
