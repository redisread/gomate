import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import type { Region } from "@/lib/types";
import { LocationsHero } from "./locations-hero";

vi.mock("@/hooks/useI18n", () => ({
  useI18n: () => ({
    t: (key: string) => key,
    locale: "zh-CN",
    loading: false,
    getNsData: () => null,
  }),
}));

function region(id: string, name: string, isHot: boolean, sortOrder: number): Region {
  return {
    id,
    countryCode: "CN",
    parentId: null,
    name,
    nameEn: null,
    slug: id,
    code: null,
    level: "city",
    timezone: "Asia/Shanghai",
    centerLatitude: null,
    centerLongitude: null,
    serviceEnabled: true,
    isHot,
    sortOrder,
  };
}

function renderHero(overrides: Partial<ComponentProps<typeof LocationsHero>> = {}) {
  return render(
    <LocationsHero
      activeRole=""
      searchQuery=""
      selectedRegionId=""
      selectedTags={[]}
      regions={[
        region("sz", "深圳", true, 10),
        region("gz", "广州", true, 20),
        region("hz", "惠州", false, 30),
      ]}
      popularTags={[]}
      showRegionDropdown={false}
      regionDropdownPos={{ top: 0, left: 0 }}
      hasActiveFilters={false}
      isLoading={false}
      pagination={{ total: 0 }}
      onRoleSelect={vi.fn()}
      onSearchChange={vi.fn()}
      onTagToggle={vi.fn()}
      onRegionSelect={vi.fn()}
      onClearAll={vi.fn()}
      onToggleRegionDropdown={vi.fn()}
      setRegionDropdownPos={vi.fn()}
      {...overrides}
    />,
  );
}

describe("LocationsHero", () => {
  it("按热门城市分组展示快捷筛选，并保持兴趣标签独立", () => {
    renderHero({
      regions: [
        region("sz", "深圳", true, 10),
        region("region-cn-hong-kong", "香港特别行政区", true, 20),
      ],
      popularTags: [{ id: "hiking", name: "徒步" }],
    });

    expect(screen.getByRole("group", { name: "locations.hotCities" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "深圳" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "香港" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("group", { name: "locations.tagsLabel" })).toBeInTheDocument();
    expect(screen.getByTestId("locations-tag-options")).toHaveClass("flex-wrap");
    expect(screen.getByTestId("locations-tag-options")).not.toHaveClass("overflow-x-auto");
    expect(screen.getByRole("button", { name: "徒步" })).toBeInTheDocument();
  });

  it("选中非热门城市时将其放入快捷项并通知地区筛选", () => {
    const onRegionSelect = vi.fn();
    renderHero({ selectedRegionId: "hz", onRegionSelect });

    expect(screen.getByRole("button", { name: "惠州" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "惠州" }));

    expect(onRegionSelect).toHaveBeenCalledWith("hz");
  });
});
