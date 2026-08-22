import { fetchPublicAPI } from "./api";
import type { Region } from "./types";

interface RegionsResponse {
  success?: boolean;
  regions?: Region[];
}

/** Load every selectable service-enabled city-level Region. */
export async function fetchSelectableRegions(
  options: { signal?: AbortSignal } = {},
): Promise<Region[]> {
  const response = await fetchPublicAPI(
    "/regions?countryCode=CN&level=city&serviceEnabled=true",
    { signal: options.signal },
  );
  if (!response.ok) throw new Error("Failed to load Regions");

  const data = (await response.json()) as RegionsResponse;
  if (!data.success) throw new Error("Failed to load Regions");
  return data.regions ?? [];
}
