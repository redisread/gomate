import { exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

describe("production Worker boundary", () => {
  it("serves health through the real workerd pipeline", async () => {
    const response = await exports.default.fetch(
      new Request("https://gomate.test/health"),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-request-id")).toBeTruthy();
    await expect(response.json()).resolves.toMatchObject({ status: "ok" });
  });

  it("keeps unknown API paths as JSON instead of falling through to Astro", async () => {
    const response = await exports.default.fetch(
      new Request("https://gomate.test/unknown"),
    );

    expect(response.status).toBe(404);
    expect(response.headers.get("content-type")).toContain("application/json");
  });
});
