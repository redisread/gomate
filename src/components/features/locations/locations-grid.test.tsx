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
  id: "location-wutong",
  regionId: "region-sz",
  name: "梧桐山",
  slug: "wutong-mountain",
  supportedActivityTypes: ["hiking"],
  status: "published",
  subtitle: "鹏城第一峰",
  description: "深圳第一高峰",
  address: "深圳市罗湖区",
  latitude: 22.58,
  longitude: 114.2,
  coverImageUrl: "https://gomate.cos.jiahongw.com/locations/wutong.jpg",
  images: [],
  extra: {
    hiking: { durationMin: 120, durationMax: 180, distanceKm: 5.5 },
  },
  createdByUserId: null,
  createdAt: "2026-08-16T00:00:00.000Z",
  updatedAt: "2026-08-16T00:00:00.000Z",
  region: {
    id: "region-sz",
    countryCode: "CN",
    parentId: "province-gd",
    name: "深圳",
    nameEn: "Shenzhen",
    slug: "shenzhen",
    code: "440300",
    level: "city",
    timezone: "Asia/Shanghai",
    centerLatitude: 22.54,
    centerLongitude: 114.05,
    serviceEnabled: true,
    isHot: true,
    sortOrder: 1,
  },
  tags: [],
} satisfies Location;

describe("LocationsGrid", () => {
  it("将搜索词传入无结果空态文案", () => {
    render(
      <LocationsGrid
        locations={[]}
        isLoading={false}
        isRefreshing={false}
        pagination={{ total: 0, nextCursor: null }}
        onClear={vi.fn()}
        emptyVariant="noSearch"
        query="咖啡馆"
        currentPage={1}
        onPageChange={vi.fn()}
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
        pagination={{ total: 1, nextCursor: null }}
        onClear={vi.fn()}
        currentPage={1}
        onPageChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("link", { name: /梧桐山/ })).toHaveAttribute(
      "href",
      "/locations/location-wutong",
    );
    expect(screen.getByText("深圳")).toBeInTheDocument();
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByRole("status").parentElement).toHaveAttribute("aria-busy", "true");
    expect(screen.queryByText("地点加载中")).not.toBeInTheDocument();
  });
});
