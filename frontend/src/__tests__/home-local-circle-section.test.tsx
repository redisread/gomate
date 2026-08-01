import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HomeLocalCircleSection } from "../components/features/home/local-circle/home-local-circle-section";
import type { LocalCircleState } from "../components/features/home/local-circle/use-local-circle";
import type { LocalCircle } from "../components/features/home/local-circle/types";

/**
 * P0 UX 审计：本地圈子「0 人在行动」负向文案
 * - activePeopleCount=0 不渲染「{city} · {n} 人在行动」
 * - activePeopleCount>0 正常渲染
 */

let mockState: LocalCircleState;

vi.mock("@/hooks/useI18n", () => ({
  useI18n: () => ({
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

vi.mock("../components/features/home/local-circle/use-local-circle", () => ({
  useLocalCircle: () => mockState,
}));

const baseData: LocalCircle = {
  cityId: "sz",
  cityName: "深圳",
  activePeopleCount: 0,
  topLocations: [],
  neighborTeams: [],
};

describe("HomeLocalCircleSection", () => {
  it("activePeopleCount=0：不渲染「{city} · {n} 人在行动」，引导卡仍渲染", () => {
    mockState = { status: "ready", data: baseData, loggedIn: true, userCity: null };
    render(<HomeLocalCircleSection />);
    expect(screen.queryByText(/inAction/)).toBeNull();
    // #185 引导卡保留（登录未设城市）
    expect(screen.getByText("home.localCircle.setCityCta.title")).toBeTruthy();
  });

  it("activePeopleCount>0：渲染「{city} · {n} 人在行动」", () => {
    mockState = {
      status: "ready",
      data: {
        ...baseData,
        activePeopleCount: 3,
        topLocations: [
          {
            locationId: "loc-1",
            locationName: "梧桐山",
            locationCoverImage: "",
            visitScore: 2,
            uniqueVisitors: 3,
            avatarStack: [],
          },
        ],
      },
      loggedIn: true,
      userCity: "sz",
    };
    render(<HomeLocalCircleSection />);
    // inAction 出现于城市前缀行 + LocalCircleCard 的 uniqueVisitors 徽章，至少一处
    expect(screen.getAllByText(/inAction\[n=3\]/).length).toBeGreaterThanOrEqual(1);
  });

  it("loading 状态渲染 skeleton（不渲染 inAction）", () => {
    mockState = { status: "loading" };
    render(<HomeLocalCircleSection />);
    expect(screen.queryByText(/inAction/)).toBeNull();
    expect(screen.getByTestId("home-local-circle-loading")).toBeTruthy();
  });
});
