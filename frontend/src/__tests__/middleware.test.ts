import { describe, expect, it, vi } from "vitest";

import { onRequest } from "../middleware";

function contextFor(request: Request) {
  return {
    request,
    locals: {},
    cookies: { set: vi.fn() },
    redirect: vi.fn((location: string, status: number) =>
      new Response(null, { status, headers: { location } })
    ),
    rewrite: vi.fn((_target: URL) => new Response("rewritten")),
  };
}

describe("i18n middleware query preservation", () => {
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
