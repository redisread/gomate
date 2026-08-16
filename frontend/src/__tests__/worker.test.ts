import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  astroHandle: vi.fn(),
}));

vi.mock("@astrojs/cloudflare/handler", () => ({
  handle: mocks.astroHandle,
}));

vi.mock("@gomate/api/app", async () => {
  const { Hono } = await import("hono");
  const apiApp = new Hono();
  apiApp.get("/health", (c) => c.json({ status: "ok" }));
  return { apiApp };
});

const { default: worker } = await import("../worker");

const executionContext = {
  passThroughOnException: vi.fn(),
  waitUntil: vi.fn(),
} as unknown as ExecutionContext;

async function dispatch(path: string, init?: RequestInit) {
  return worker.fetch(
    new Request(`https://gomate.live${path}`, init),
    {} as never,
    executionContext
  );
}

describe("single Worker request routing", () => {
  beforeEach(() => {
    mocks.astroHandle.mockReset();
    mocks.astroHandle.mockResolvedValue(
      new Response("astro", { headers: { "Content-Type": "text/html" } })
    );
  });

  it("mounts the route-relative API app at /api", async () => {
    const response = await dispatch("/api/health");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: "ok" });
    expect(mocks.astroHandle).not.toHaveBeenCalled();
  });

  it.each(["/api", "/api/", "/api/does-not-exist"])(
    "isolates unknown API requests as JSON: %s",
    async (path) => {
      const response = await dispatch(path);

      expect(response.status).toBe(404);
      expect(response.headers.get("content-type")).toContain("application/json");
      await expect(response.json()).resolves.toEqual({
        success: false,
        error: { code: "NOT_FOUND", message: "Not found" },
      });
      expect(mocks.astroHandle).not.toHaveBeenCalled();
    }
  );

  it("delegates every non-API request to the official Astro handler", async () => {
    const response = await dispatch("/teams");

    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toBe("astro");
    expect(mocks.astroHandle).toHaveBeenCalledOnce();

    const [request, env, context] = mocks.astroHandle.mock.calls[0]!;
    expect(request).toBeInstanceOf(Request);
    expect(request.url).toBe("https://gomate.live/teams");
    expect(env).toEqual({});
    expect(context).toBe(executionContext);
  });
});
