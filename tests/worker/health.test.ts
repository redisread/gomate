import { env, exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

describe("production Worker boundary", () => {
  it("detects raster image content through the configured Images binding", async () => {
    const bytes = Uint8Array.from(
      atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="),
      (character) => character.charCodeAt(0),
    );
    const body = new Response(bytes).body;

    expect(body).not.toBeNull();
    await expect(env.IMAGES.info(body!)).resolves.toMatchObject({
      format: "image/png",
      width: 1,
      height: 1,
    });
  });

  it("serves health through the real workerd pipeline", async () => {
    const response = await exports.default.fetch(
      new Request("https://gomate.test/api/health"),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-request-id")).toBeTruthy();
    await expect(response.json()).resolves.toMatchObject({ status: "ok" });
  });

  it("keeps unknown API paths as JSON instead of falling through to Astro", async () => {
    const response = await exports.default.fetch(
      new Request("https://gomate.test/api/unknown"),
    );

    expect(response.status).toBe(404);
    expect(response.headers.get("content-type")).toContain("application/json");
  });

  it("serves an SSR page outside the API boundary", async () => {
    const response = await exports.default.fetch(
      new Request("https://gomate.test/login"),
    );

    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toContain("GoMate");
  });
});
