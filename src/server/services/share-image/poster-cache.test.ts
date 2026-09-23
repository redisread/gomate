import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cachedPosterRender,
  loadImageAsBase64,
  MAX_EMBEDDED_IMAGE_BYTES,
} from "./poster-cache";

const env = {
  APP_URL: "https://gomate.live",
  R2_PUBLIC_URL: "https://gomate.cos.jiahongw.com",
  R2: { get: vi.fn() },
} as never;

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("poster image loading", () => {
  it("caps streamed remote images even without a content-length header", async () => {
    const oversized = new Uint8Array(MAX_EMBEDDED_IMAGE_BYTES + 1);
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(oversized, { headers: { "content-type": "image/png" } }),
        ),
    );

    await expect(
      loadImageAsBase64("https://cdn.discordapp.com/avatar.png", env),
    ).resolves.toBeNull();
  });

  it("accepts an allowed image and returns a data URL", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(new Uint8Array([0, 1, 2]), {
          headers: { "content-type": "image/png" },
        }),
      ),
    );

    await expect(
      loadImageAsBase64("https://cdn.discordapp.com/avatar.png", env),
    ).resolves.toBe("data:image/png;base64,AAEC");
  });

  it("converts WebP to JPEG before passing it to Satori", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(new Uint8Array([82, 73, 70, 70]), {
          headers: { "content-type": "image/webp" },
        }),
      ),
    );
    const output = vi.fn().mockResolvedValue({
      response: () =>
        new Response(new Uint8Array([255, 216, 255]), {
          headers: { "content-type": "image/jpeg" },
        }),
    });
    const input = vi.fn().mockReturnValue({ output });
    const conversionEnv = {
      APP_URL: "https://gomate.live",
      R2_PUBLIC_URL: "https://gomate.cos.jiahongw.com",
      R2: { get: vi.fn() },
      IMAGES: { input },
    } as never;

    await expect(
      loadImageAsBase64(
        "https://cdn.discordapp.com/avatar.webp",
        conversionEnv,
      ),
    ).resolves.toBe("data:image/jpeg;base64,/9j/");
    expect(output).toHaveBeenCalledWith({ format: "image/jpeg", quality: 85 });
  });

  it("drops an unsupported cover when image conversion fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(new Uint8Array([82, 73, 70, 70]), {
          headers: { "content-type": "image/webp" },
        }),
      ),
    );
    const input = vi.fn().mockImplementation(() => {
      throw new Error("conversion failed");
    });

    await expect(
      loadImageAsBase64(
        "https://cdn.discordapp.com/avatar.webp",
        {
          APP_URL: "https://gomate.live",
          R2_PUBLIC_URL: "https://gomate.cos.jiahongw.com",
          R2: { get: vi.fn() },
          IMAGES: { input },
        } as never,
      ),
    ).resolves.toBeNull();
  });

  it("reuses a cached SVG before invoking the renderer", async () => {
    const match = vi.fn().mockResolvedValue(new Response("<svg>cached</svg>"));
    const put = vi.fn();
    vi.stubGlobal("caches", { default: { match, put } });
    const render = vi.fn().mockResolvedValue("<svg>fresh</svg>");

    await expect(
      cachedPosterRender({
        env,
        cacheKey: "poster:v3:team:team-1:hash",
        render,
      }),
    ).resolves.toMatchObject({ svg: "<svg>cached</svg>", cached: true });
    expect(render).not.toHaveBeenCalled();
    expect(put).not.toHaveBeenCalled();
  });
});
