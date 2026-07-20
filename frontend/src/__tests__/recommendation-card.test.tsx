import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RecommendationCard } from "../components/features/home/recommendations/recommendation-card";
import type { Recommendation } from "../components/features/home/recommendations/types";

/**
 * P0-C T2 (task #173) — RecommendationCard reason 插值 + kind 二级数据规则
 */

vi.mock("@/hooks/useI18n", () => ({
  useI18n: () => ({
    // 回显 key + vars 用于断言 params 是否传对
    t: (key: string, vars?: Record<string, string | number>) => {
      if (!vars || Object.keys(vars).length === 0) return key;
      const varsStr = Object.entries(vars)
        .map(([k, v]) => `${k}=${v}`)
        .join(",");
      return `${key}[${varsStr}]`;
    },
    locale: "zh-CN",
    loading: false,
    getNsData: () => null,
  }),
}));

function makeReco(overrides: Partial<Recommendation> = {}): Recommendation {
  return {
    kind: "steady",
    locationId: "loc-1",
    reason: { key: "steady.season_close", params: { km: 12 } },
    location: {
      name: "梧桐山",
      coverImage: "https://cdn.example.com/wutong.jpg",
      difficulty: "easy",
      durationMin: 180,
      distanceKm: 12,
      favCount: 3,
      storyCount: 2,
      ageDays: 100,
      futureTeams: 2,
    },
    ...overrides,
  };
}

describe("RecommendationCard", () => {
  it("渲染 location.name 作为跳转链接 href=/locations/:id", () => {
    render(<RecommendationCard reco={makeReco()} />);
    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe("/locations/loc-1");
    expect(link.textContent).toContain("梧桐山");
  });

  it("reason.key `steady.season_close` → 拼接 i18n key `steady_season_close` + km 插值", () => {
    render(<RecommendationCard reco={makeReco()} />);
    // t() mock 回显 key + vars → 断言 params.km 被传进去
    expect(document.body.textContent).toContain("home.recommendations.reason.steady_season_close");
    expect(document.body.textContent).toContain("km=12");
  });

  it("reason.key `worthy.favorites_stories` → 用 `_` flatten 后拼接", () => {
    render(
      <RecommendationCard
        reco={makeReco({
          kind: "worthy",
          reason: { key: "worthy.favorites_stories", params: { n: 15 } },
          location: {
            name: "梧桐山",
            coverImage: null,
            difficulty: null,
            durationMin: null,
            distanceKm: null,
            favCount: 10,
            storyCount: 5,
            ageDays: 50,
            futureTeams: 0,
          },
        })}
      />,
    );
    expect(document.body.textContent).toContain(
      "home.recommendations.reason.worthy_favorites_stories",
    );
    expect(document.body.textContent).toContain("n=15");
  });

  it("steady kind → 二级数据展示距离 + 未来队伍数", () => {
    render(<RecommendationCard reco={makeReco()} />);
    expect(document.body.textContent).toContain("home.recommendations.meta.distance");
    expect(document.body.textContent).toContain("km=12");
    expect(document.body.textContent).toContain("home.recommendations.meta.futureTeams");
    expect(document.body.textContent).toContain("n=2");
    // 不应展示 worthy/fresh 的字段
    expect(document.body.textContent).not.toContain("meta.favorites");
    expect(document.body.textContent).not.toContain("meta.ageDays");
  });

  it("worthy kind → 二级数据展示 favorites + stories", () => {
    render(
      <RecommendationCard
        reco={makeReco({
          kind: "worthy",
          reason: { key: "worthy.favorites", params: { n: 8 } },
          location: {
            name: "东西冲",
            coverImage: null,
            difficulty: null,
            durationMin: null,
            distanceKm: null,
            favCount: 8,
            storyCount: 4,
            ageDays: 200,
            futureTeams: 0,
          },
        })}
      />,
    );
    expect(document.body.textContent).toContain("home.recommendations.meta.favorites");
    expect(document.body.textContent).toContain("n=8");
    expect(document.body.textContent).toContain("home.recommendations.meta.stories");
    expect(document.body.textContent).toContain("n=4");
    // 不应展示 steady/fresh 的字段
    expect(document.body.textContent).not.toContain("meta.distance");
    expect(document.body.textContent).not.toContain("meta.ageDays");
  });

  it("fresh kind → 二级数据展示 ageDays + futureTeams", () => {
    render(
      <RecommendationCard
        reco={makeReco({
          kind: "fresh",
          reason: { key: "fresh.new_location", params: { days: 3 } },
          location: {
            name: "七娘山",
            coverImage: null,
            difficulty: "moderate",
            durationMin: 240,
            distanceKm: 30,
            favCount: 0,
            storyCount: 0,
            ageDays: 3,
            futureTeams: 1,
          },
        })}
      />,
    );
    expect(document.body.textContent).toContain("home.recommendations.meta.ageDays");
    expect(document.body.textContent).toContain("n=3");
    expect(document.body.textContent).toContain("home.recommendations.meta.futureTeams");
  });

  it("difficulty=null / durationMin=null 时上方 meta 行不渲染", () => {
    render(
      <RecommendationCard
        reco={makeReco({
          reason: { key: "steady.fallback", params: { km: 5 } },
          location: {
            name: "深圳湾",
            coverImage: null,
            difficulty: null,
            durationMin: null,
            distanceKm: 5,
            favCount: 0,
            storyCount: 0,
            ageDays: 50,
            futureTeams: 0,
          },
        })}
      />,
    );
    // 不该出现 enums.difficulty.* 或 meta.duration
    expect(document.body.textContent).not.toContain("enums.difficulty");
    expect(document.body.textContent).not.toContain("meta.duration");
  });
});
