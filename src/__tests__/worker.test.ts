import { describe, expect, it, vi } from "vitest";

const pagesHandler = vi.hoisted(() => vi.fn());

vi.mock("@astrojs/cloudflare/hono", () => ({
  cf: () => async (_context: unknown, next: () => Promise<void>) => next(),
}));

vi.mock("astro/hono", () => ({
  middleware: () => async (_context: unknown, next: () => Promise<void>) => next(),
  pages: () => async (context: { res: Response }, _next: () => Promise<void>) => {
    context.res = pagesHandler();
  },
}));

vi.mock("../server/app", async () => {
  const { Hono } = await import("hono");
  const apiApp = new Hono();
  apiApp.get("/health", (c) => c.json({ status: "ok" }));
  return { apiApp };
});

const { default: worker } = await import("../worker");

async function dispatch(
  path: string,
  env: Record<string, unknown> = {},
) {
  return worker.fetch(
    new Request(`https://gomate.live${path}`),
    env as never,
    {
      passThroughOnException: vi.fn(),
      waitUntil: vi.fn(),
    } as unknown as ExecutionContext,
  );
}

describe("single Worker request routing", () => {
  it("mounts the route-relative API app at /api", async () => {
    const response = await dispatch("/api/health");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: "ok" });
    expect(pagesHandler).not.toHaveBeenCalled();
  });

  it.each(["/api", "/api/", "/api/does-not-exist"])(
    "isolates unknown API requests as JSON: %s",
    async (path) => {
      const response = await dispatch(path);

      expect(response.status).toBe(404);
      expect(response.headers.get("content-type")).toContain("application/json");
      await expect(response.json()).resolves.toMatchObject({
        success: false,
        error: { code: "NOT_FOUND" },
      });
      expect(pagesHandler).not.toHaveBeenCalled();
    },
  );

  it("delegates non-API requests to Astro's pages middleware", async () => {
    pagesHandler.mockReturnValueOnce(new Response("astro"));
    const response = await dispatch("/teams");

    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toBe("astro");
    expect(pagesHandler).toHaveBeenCalledOnce();
  });

  it("adds the deployed Worker version to responses", async () => {
    pagesHandler.mockReturnValueOnce(new Response("astro"));
    const response = await dispatch("/teams", {
      CF_VERSION_METADATA: { id: "11111111-2222-4333-8444-555555555555" },
    });

    expect(response.headers.get("x-worker-version-id")).toBe(
      "11111111-2222-4333-8444-555555555555",
    );
  });
});
