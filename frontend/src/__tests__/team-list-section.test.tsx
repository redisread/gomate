import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TeamListSection } from "../components/features/location-detail/team-list-section";
import type { Team } from "@/lib/types";

/**
 * P0 UX 审计：地点详情页空态 CTA 收敛
 * - 空态：header 右上角「召集伙伴出发」不渲染，保留 EmptyTeamsState「我来召集伙伴」唯一 CTA
 * - 非空：header 保留「召集伙伴出发」快捷入口
 */

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

// TeamCard 依赖多个 shared 组件（时间/头像），本测试只关心 TeamListSection 的 CTA 逻辑
vi.mock("../components/features/location-detail/team-card", () => ({
  TeamCard: ({ team }: { team: Team }) => <div data-testid="team-card">{team.title}</div>,
}));

function makeTeam(overrides: Partial<Team> = {}): Team {
  return {
    id: "team-1",
    title: "梧桐山日出",
    date: "2026-08-08",
    time: "05:00",
    status: "recruiting",
    maxMembers: 8,
    currentMembers: 2,
    locationId: "loc-1",
    locationName: "梧桐山",
    cityName: "深圳",
    ...overrides,
  } as Team;
}

describe("TeamListSection", () => {
  it("空态：header 不渲染「召集伙伴出发」链接，但保留 EmptyTeamsState「我来召集伙伴」CTA", () => {
    render(<TeamListSection teams={[]} locationId="loc-1" />);
    // header 右上角链接（detailCreateTeam）不出现
    const createLinks = screen.queryAllByText("locations.detailCreateTeam");
    expect(createLinks).toHaveLength(0);
    // EmptyTeamsState 的唯一 CTA 保留（detailNoTeamsDesc 在 header 副标题与空态各出现一次，均为既有行为）
    expect(screen.getByText("locations.detailNoTeamsBtn")).toBeTruthy();
    expect(screen.getAllByText("locations.detailNoTeamsDesc")).toHaveLength(2);
  });

  it("非空：header 保留「召集伙伴出发」快捷入口 + 渲染队伍卡", () => {
    render(<TeamListSection teams={[makeTeam()]} locationId="loc-1" />);
    expect(screen.getByText("locations.detailCreateTeam")).toBeTruthy();
    expect(screen.getByTestId("team-card")).toBeTruthy();
    // 非空不渲染空态 CTA
    expect(screen.queryByText("locations.detailNoTeamsBtn")).toBeNull();
  });
});
