import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  renderPoster: vi.fn(),
}));

vi.mock("../../services/share-image/poster", () => ({
  PosterNotFoundError: class PosterNotFoundError extends Error {},
  renderPoster: mocks.renderPoster,
}));
vi.mock("../../lib/logger", () => ({
  logger: { error: vi.fn() },
}));

const { shareImageRoute } = await import("../../routes/share-image");

describe("share image route", () => {
  beforeEach(() => mocks.renderPoster.mockReset());

  it("does not expose renderer diagnostics in a 500 response", async () => {
    mocks.renderPoster.mockRejectedValueOnce(
      new Error("SQLITE_ERROR: no such table secret_internal_table"),
    );
    const app = new Hono();
    app.route("/share-image", shareImageRoute);

    const response = await app.fetch(
      new Request("https://gomate.test/share-image/story/story-1"),
      {} as never,
    );
    const payload = await response.json() as {
      error: { code: string; message: string; details?: unknown };
    };

    expect(response.status).toBe(500);
    expect(payload.error).toEqual({
      code: "INTERNAL_ERROR",
      message: "Failed to generate story image",
    });
    expect(JSON.stringify(payload)).not.toContain("SQLITE_ERROR");
    expect(JSON.stringify(payload)).not.toContain("secret_internal_table");
  });
});
