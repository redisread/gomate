import type { Region } from "@/lib/types";

const QUICK_REGION_LABELS: Record<string, string> = {
  "region-cn-hong-kong": "香港",
};

export function getRegionDisplayName(region: Pick<Region, "id" | "name">): string {
  return QUICK_REGION_LABELS[region.id] ?? region.name;
}

export function getQuickRegions(regions: Region[], limit: number): Region[] {
  const safeLimit = Math.max(0, Math.floor(limit));

  return regions
    .filter((region) => region.isHot)
    .toSorted((left, right) => {
      return left.sortOrder - right.sortOrder
        || left.name.localeCompare(right.name, "zh-CN");
    })
    .slice(0, safeLimit);
}

export function getDisplayedQuickRegions(
  regions: Region[],
  selectedRegionId: string,
  limit: number,
): Region[] {
  const quickRegions = getQuickRegions(regions, limit);
  const selectedRegion = regions.find((region) => region.id === selectedRegionId);
  const safeLimit = Math.max(0, Math.floor(limit));

  if (
    !selectedRegion
    || quickRegions.some((region) => region.id === selectedRegion.id)
    || quickRegions.length === 0
  ) {
    return quickRegions;
  }

  if (quickRegions.length < safeLimit) {
    return [...quickRegions, selectedRegion];
  }

  return [...quickRegions.slice(0, -1), selectedRegion];
}
