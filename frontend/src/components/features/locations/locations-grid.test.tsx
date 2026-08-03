import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Location } from "@/lib/types";
import { LocationsGrid } from "./locations-grid";

vi.mock("@/hooks/useI18n", () => ({
  useI18n: () => ({
    t: (key: string) => key,
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
