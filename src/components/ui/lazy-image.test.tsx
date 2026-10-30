import { render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LocationCoverImage } from "./lazy-image";

describe("LocationCoverImage", () => {
  it("非首屏图片也输出原生 lazy 图片，不等待 hydration 才发现资源", () => {
    const html = renderToString(<LocationCoverImage src="/cover.jpg" alt="山" />);
    expect(html).toContain('src="/cover.jpg"');
    expect(html).toContain('loading="lazy"');
    expect(html).not.toContain('opacity-0');
  });

  it("首屏图片使用 eager 加载和异步解码，避免同步解码阻塞主线程", () => {
    render(
      <LocationCoverImage
        src="https://cos.gomate.live/example.jpg"
        alt="梧桐山"
        priority
      />,
    );

    const image = screen.getByRole("img", { name: "梧桐山" });
    expect(image).toHaveAttribute("loading", "eager");
    expect(image).toHaveAttribute("decoding", "async");
    expect(image).toHaveAttribute("fetchpriority", "high");
  });
});
