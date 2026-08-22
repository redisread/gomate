import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Region } from "../lib/types";
import { RegionSelect } from "../components/ui/region-select";

vi.mock("@/hooks/useI18n", () => ({
  useI18n: () => ({
    t: (key: string) => key,
    locale: "zh-CN",
    loading: false,
    getNsData: () => null,
  }),
}));

const regions: Region[] = Array.from({ length: 25 }, (_, index) => ({
  id: `region-${index + 1}`,
  countryCode: "CN",
  parentId: "province-test",
  name: `城市 ${index + 1}`,
  nameEn: `City ${index + 1}`,
  slug: `city-${index + 1}`,
  code: `${440300 + index}`,
  level: "city",
  timezone: "Asia/Shanghai",
  centerLatitude: null,
  centerLongitude: null,
  serviceEnabled: true,
  isHot: index === 0,
  sortOrder: index,
}));

describe("RegionSelect", () => {
  it("在没有搜索词时也能浏览完整地区列表", () => {
    render(<RegionSelect value="" onChange={vi.fn()} regions={regions} />);

    fireEvent.click(screen.getByRole("button", { name: "common.selectRegion" }));

    expect(screen.getByText("城市 25")).toBeInTheDocument();
  });

  it("按 Region 的英文名和 code 搜索", () => {
    render(<RegionSelect value="" onChange={vi.fn()} regions={regions} />);

    fireEvent.click(screen.getByRole("button", { name: "common.selectRegion" }));
    const search = screen.getByPlaceholderText("common.search");

    fireEvent.change(search, { target: { value: "city 12" } });
    expect(screen.getByText("城市 12")).toBeInTheDocument();
    expect(screen.queryByText("城市 11")).not.toBeInTheDocument();

    fireEvent.change(search, { target: { value: regions[19].code } });
    expect(screen.getByText("城市 20")).toBeInTheDocument();
  });
});
