export interface ServiceRegionSummary {
  id: string;
  name: string;
  nameEn: string | null;
  centerLatitude: number;
  centerLongitude: number;
}

export type RegionResolutionSource = "profile" | "cf" | "fallback";

export interface CurrentRegionResult {
  regionId: string;
  source: RegionResolutionSource;
}

export function normalizeRegionName(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
  return normalized || null;
}

/**
 * Resolves a current service Region without trusting arbitrary profile or edge values.
 * Callers supply only open city Regions queried from D1.
 */
export function resolveCurrentRegion(
  regions: readonly ServiceRegionSummary[],
  cfIpCity: string | null | undefined,
  profileRegionId: string | null | undefined,
  fallbackRegionId: string,
): CurrentRegionResult | null {
  if (profileRegionId && regions.some((region) => region.id === profileRegionId)) {
    return { regionId: profileRegionId, source: "profile" };
  }

  const cfCity = normalizeRegionName(cfIpCity);
  if (cfCity) {
    const matched = regions.find(
      (region) =>
        normalizeRegionName(region.name) === cfCity || normalizeRegionName(region.nameEn) === cfCity,
    );
    if (matched) return { regionId: matched.id, source: "cf" };
  }

  return regions.some((region) => region.id === fallbackRegionId)
    ? { regionId: fallbackRegionId, source: "fallback" }
    : null;
}

export function getRegionCenter(region: ServiceRegionSummary): { lat: number; lng: number } {
  return { lat: region.centerLatitude, lng: region.centerLongitude };
}
