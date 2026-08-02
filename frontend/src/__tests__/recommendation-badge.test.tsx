import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RecommendationBadge } from "../components/features/home/recommendations/recommendation-badge";

/**
 * P0-C T2 (task #173) — 推荐卡类别徽章视觉测试
 */

vi.mock("@/hooks/useI18n", () => ({
  useI18n: () => ({
    t: (key: string) => key, // 回显 key 即可断言映射正确
    locale: "zh-CN",
    loading: false,
    getNsData: () => null,
  }),
}));

describe("RecommendationBadge", () => {
  it("steady kind → 渲染 steady i18n key + emerald 色板", () => {
    render(<RecommendationBadge kind="steady" />);
    const badge = screen.getByTestId("recommendation-badge-steady");
    expect(badge).toBeTruthy();
    expect(badge.textContent).toContain("home.recommendations.kind.steady");
    // emerald bg：rgba(5, 150, 105, 0.10) → 浏览器归一化后可能有空格差异，只断层色调
    expect(badge.getAttribute("style") || "").toMatch(/rgba\(5,\s*150,\s*105/);
  });

  it("worthy kind → amber 色板", () => {
    render(<RecommendationBadge kind="worthy" />);
    const badge = screen.getByTestId("recommendation-badge-worthy");
    expect(badge.textContent).toContain("home.recommendations.kind.worthy");
    expect(badge.getAttribute("style") || "").toMatch(/rgba\(217,\s*119,\s*6/);
  });

  it("fresh kind → sky 色板", () => {
    render(<RecommendationBadge kind="fresh" />);
    const badge = screen.getByTestId("recommendation-badge-fresh");
    expect(badge.textContent).toContain("home.recommendations.kind.fresh");
    expect(badge.getAttribute("style") || "").toMatch(/rgba\(2,\s*132,\s*199/);
  });

  it("size=sm 用较小 padding", () => {
    render(<RecommendationBadge kind="steady" size="sm" />);
    const badge = screen.getByTestId("recommendation-badge-steady");
    expect(badge.className).toMatch(/px-2\b/);
    expect(badge.className).toMatch(/text-2xs/);
  });
});
