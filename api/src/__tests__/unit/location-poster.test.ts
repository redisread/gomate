import { describe, expect, it, vi } from "vitest";

vi.mock("satori", () => ({
  default: vi.fn(async (tree: unknown, options: unknown) =>
    JSON.stringify({ tree, options }),
  ),
}));

import { renderLocationPoster } from "../../templates/share-image/location-poster";

describe("location poster layout", () => {
  it("keeps the QR footer compact instead of stretching into the poster remainder", async () => {
    const serialized = await renderLocationPoster({
      title: "梧桐山",
      description: "深圳第一高峰，适合周末徒步。",
      tags: [],
      qrCodeDataUrl: "data:image/svg+xml;base64,qr",
      fonts: [],
    });
    const rendered = JSON.parse(serialized) as {
      tree: {
        props: {
          children: Array<{ props?: { style?: Record<string, unknown> } }>;
        };
      };
      options: { height: number };
    };

    const footer = rendered.tree.props.children[2];

    expect(rendered.options.height).toBe(584);
    expect(footer.props?.style?.flex).toBeUndefined();
    expect(footer.props?.style?.minHeight).toBe(112);
  });

  it("localizes season pills for non-Chinese posters", async () => {
    const serialized = await renderLocationPoster({
      title: "Wutong Mountain",
      description: "A short route description.",
      tags: [],
      bestSeason: ["spring", "autumn"],
      locale: "en",
      fonts: [],
    });

    expect(serialized).toContain("Spring · Autumn");
  });
});
