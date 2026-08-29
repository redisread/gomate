import { readFile } from "node:fs/promises";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearFontCache,
  isSupportedSatoriFontData,
  loadFonts,
} from "./load-fonts";

function bytes(...values: number[]): ArrayBuffer {
  return new Uint8Array(values).buffer;
}

describe("isSupportedSatoriFontData", () => {
  it.each([
    ["TrueType", bytes(0x00, 0x01, 0x00, 0x00)],
    ["OpenType", bytes(0x4f, 0x54, 0x54, 0x4f)],
    ["WOFF", bytes(0x77, 0x4f, 0x46, 0x46)],
  ])("accepts %s font data", (_format, data) => {
    expect(isSupportedSatoriFontData(data)).toBe(true);
  });

  it("rejects WOFF2 font data", () => {
    expect(isSupportedSatoriFontData(bytes(0x77, 0x4f, 0x46, 0x32))).toBe(
      false,
    );
  });

  it("rejects truncated or unknown font data", () => {
    expect(isSupportedSatoriFontData(bytes(0x00, 0x01))).toBe(false);
    expect(isSupportedSatoriFontData(bytes(0x50, 0x4e, 0x47, 0x00))).toBe(
      false,
    );
  });
});

describe("loadFonts", () => {
  beforeEach(() => clearFontCache());
  afterEach(() => {
    clearFontCache();
    vi.restoreAllMocks();
  });

  it("uses the Worker static fallback before any external font request", async () => {
    const staticFont = new Uint8Array([0x77, 0x4f, 0x46, 0x46]);
    const assets = {
      fetch: vi.fn().mockResolvedValue(
        new Response(staticFont, {
          headers: { "content-type": "font/woff" },
        }),
      ),
    };
    const r2 = { get: vi.fn().mockResolvedValue(null) };
    const externalFetch = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("external font requests must not be used"));

    const fonts = await loadFonts({
      APP_URL: "https://gomate.live",
      ASSETS: assets,
      R2: r2,
    } as never);

    expect(fonts).toHaveLength(1);
    expect(fonts[0]?.name).toBe("Noto Sans SC");
    expect(assets.fetch).toHaveBeenCalledTimes(1);
    expect(externalFetch).not.toHaveBeenCalled();
  });

  it("ships a Satori-compatible static fallback font", async () => {
    const data = await readFile(
      new URL(
        "../../../../public/fonts/noto-sans-sc-chinese-simplified-400-normal.woff",
        import.meta.url,
      ),
    );

    expect(
      isSupportedSatoriFontData(
        data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength),
      ),
    ).toBe(true);
    expect(data.byteLength).toBeGreaterThan(1_000_000);
  });
});
