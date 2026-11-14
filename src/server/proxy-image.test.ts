import { afterEach, describe, expect, it, vi } from "vitest";
import { apiApp, type ApiBindings } from "./app";

const cover = "https://cos.gomate.live/locations/hiking/maluan-mountain/maluanshan_01.jpg";
const env = { APP_URL: "http://localhost:5432", WRITE_MODE: "protected" } as unknown as ApiBindings;
const request = (url: string) => apiApp.request(`/proxy-image?url=${encodeURIComponent(url)}`, {}, env);

afterEach(() => vi.unstubAllGlobals());

describe("poster image proxy", () => {
  it.each([cover, "https://gomate.cos.jiahongw.com/locations/cover.jpg"])("returns the public photo from %s", async (url) => {
    const bytes = new Uint8Array([255, 216, 255, 217]);
    const upstream = vi.fn().mockResolvedValue(new Response(bytes, { headers: { "content-type": "image/jpeg" } }));
    vi.stubGlobal("fetch", upstream);
    const response = await request(url);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/jpeg");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(bytes);
    expect(upstream).toHaveBeenCalledWith(url, { redirect: "manual", signal: expect.any(AbortSignal) });
  });

  it.each([
    "https://cos.gomate.live.evil.example/photo.jpg",
    "https://evil.cos.gomate.live/photo.jpg",
    "http://cos.gomate.live/photo.jpg",
    "https://127.0.0.1/photo.jpg",
  ])("rejects untrusted targets without fetching: %s", async (url) => {
    const upstream = vi.fn();
    vi.stubGlobal("fetch", upstream);
    expect((await request(url)).status).toBe(403);
    expect(upstream).not.toHaveBeenCalled();
  });

  it.each([
    new Response(null, { status: 302, headers: { location: "https://evil.example/photo.jpg" } }),
    new Response("<svg/>", { headers: { "content-type": "image/svg+xml" } }),
  ])("rejects redirects and unsafe content", async (upstreamResponse) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(upstreamResponse));
    expect((await request(cover)).status).toBe(502);
  });
});
