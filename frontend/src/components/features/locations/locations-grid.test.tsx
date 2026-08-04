import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Location } from "@/lib/types";
import { LocationsGrid } from "./locations-grid";

vi.mock("@/hooks/useI18n", () => ({
  useI18n: () => ({
    t: (key: string, vars?: Record<string, string | number>) => {
      if (!vars) return key;
      return `${key}[${Object.entries(vars).map(([name, value]) => `${name}=${value}`).join(",")}]`;
    },
    locale: "zh-CN",
    loading: false,
    getNsData: () => null,
  }),
}));

const location = {
  id: "wutong-mountain",
  name: "梧桐山",
  description: "深圳第一高峰",
  cityName: "深圳",
  address: "深圳市罗湖区",
  coverImage: "https://cos.gomate.live/wutong.jpg",
  tags: [],
} as unknown as Location;

describe("LocationsGrid", () => {
  it("将搜索词传入无结果空态文案", () => {
    render(
      <LocationsGrid
        locations={[]}
        isLoading={false}
        isRefreshing={false}
        pagination={{ total: 0, totalPages: 0 }}
        onClear={vi.fn()}
        emptyVariant="noSearch"
        query="咖啡馆"
        currentPage={1}
        onPageChange={vi.fn()}
        getPageNumbers={() => []}
      />,
    );

    expect(screen.getByText("locations.empty.noSearch.title[query=咖啡馆]")).toBeInTheDocument();
  });

  it("刷新列表时保留现有卡片，只显示忙碌状态", () => {
    render(
      <LocationsGrid
        locations={[location]}
        isLoading={false}
        isRefreshing
        pagination={{ total: 1, totalPages: 1 }}
        onClear={vi.fn()}
        currentPage={1}
        onPageChange={vi.fn()}
        getPageNumbers={() => [1]}
      />,
    );

    expect(screen.getByRole("link", { name: /梧桐山/ })).toBeInTheDocument();
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByRole("status").parentElement).toHaveAttribute("aria-busy", "true");
    expect(screen.queryByText("地点加载中")).not.toBeInTheDocument();
  });
});
