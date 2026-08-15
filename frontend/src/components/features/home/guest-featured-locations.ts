import type { Location } from "@/lib/types";

export const GUEST_FEATURED_LOCATION_NAMES = ["牛奶排", "大理", "香港"] as const;

export function selectGuestFeaturedLocations(locations: Location[]): Location[] {
  const featured = GUEST_FEATURED_LOCATION_NAMES.flatMap((name) => {
    const location = locations.find((candidate) => candidate.name === name);
    return location ? [location] : [];
  });
  const featuredIds = new Set(featured.map((location) => location.id));
  const fallback = locations.filter((location) => !featuredIds.has(location.id));

  return [...featured, ...fallback].slice(0, GUEST_FEATURED_LOCATION_NAMES.length);
}
