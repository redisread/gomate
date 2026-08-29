import type { Region } from "@/lib/types";

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

  if (
    !selectedRegion
    || quickRegions.some((region) => region.id === selectedRegion.id)
    || quickRegions.length === 0
  ) {
    return quickRegions;
  }

  return [...quickRegions.slice(0, -1), selectedRegion];
}
