import type { Location } from "@/lib/types";

export function selectGuestFeaturedLocations(
  locations: Location[],
): Location[] {
  return locations.slice(0, 3);
}
