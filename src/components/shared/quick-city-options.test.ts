import { describe, expect, it } from "vitest";
import type { Region } from "@/lib/types";
import { getDisplayedQuickRegions, getQuickRegions } from "./quick-city-options";

function region(
  id: string,
  name: string,
  options: Partial<Pick<Region, "isHot" | "sortOrder">> = {},
): Region {
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
    isHot: options.isHot ?? false,
    sortOrder: options.sortOrder ?? 0,
  };
}

describe("quick city options", () => {
  it("只展示热门城市，并按 sortOrder 和名称稳定排序", () => {
    const regions = [
      region("chengdu", "成都", { isHot: true, sortOrder: 30 }),
      region("shenzhen", "深圳", { isHot: true, sortOrder: 10 }),
      region("guangzhou", "广州", { isHot: true, sortOrder: 20 }),
      region("huizhou", "惠州", { isHot: false, sortOrder: 1 }),
      region("beijing", "北京", { isHot: true, sortOrder: 20 }),
    ];

    expect(getQuickRegions(regions, 4).map((item) => item.name)).toEqual([
      "深圳",
      "北京",
      "广州",
      "成都",
    ]);
  });

  it("限制快捷城市数量，并在选中城市不热门时替换最后一项", () => {
    const regions = [
      region("shenzhen", "深圳", { isHot: true, sortOrder: 10 }),
      region("guangzhou", "广州", { isHot: true, sortOrder: 20 }),
      region("chengdu", "成都", { isHot: true, sortOrder: 30 }),
      region("huizhou", "惠州"),
    ];

    expect(getDisplayedQuickRegions(regions, "huizhou", 3).map((item) => item.name)).toEqual([
      "深圳",
      "广州",
      "惠州",
    ]);
  });

  it("热门城市不足上限时保留全部热门城市", () => {
    const regions = [region("shenzhen", "深圳", { isHot: true, sortOrder: 10 })];

    expect(getDisplayedQuickRegions(regions, "", 6)).toEqual(regions);
  });

  it("选中城市不存在时不制造快捷项", () => {
    const regions = [region("shenzhen", "深圳", { isHot: true, sortOrder: 10 })];

    expect(getDisplayedQuickRegions(regions, "missing", 6)).toEqual(regions);
  });

  it("热门城市未达到上限时追加选中城市，不隐藏已有热门城市", () => {
    const regions = [
      region("shenzhen", "深圳", { isHot: true, sortOrder: 10 }),
      region("huizhou", "惠州"),
    ];

    expect(getDisplayedQuickRegions(regions, "huizhou", 6).map((item) => item.name)).toEqual([
      "深圳",
      "惠州",
    ]);
  });
});
