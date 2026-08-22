export interface FavoriteLocationSummary {
  id: string;
  name: string;
  coverImageUrl: string;
  address: string | null;
}

export interface FavoriteLocationItem {
  createdAt: string;
  location: FavoriteLocationSummary;
}

export interface FavoriteLocationsResponse {
  success: boolean;
  data: {
    items: FavoriteLocationItem[];
    nextCursor: string | null;
  };
}

export const LOCATION_FAVORITES_PATH = "/favorites/locations";
export const STORY_FAVORITES_PATH = "/favorites/stories";

export interface FavoriteStorySummary {
  id: string;
  title: string | null;
  summary: string | null;
  content: string;
  images: string[];
  createdAt: string;
}

export interface FavoriteStoryItem {
  createdAt: string;
  story: FavoriteStorySummary;
}

export interface FavoriteStoriesResponse {
  success: boolean;
  data: {
    items: FavoriteStoryItem[];
    nextCursor: string | null;
  };
}

export type FavoriteItem =
  | (FavoriteLocationItem & { kind: "location" })
  | (FavoriteStoryItem & { kind: "story" });

export function buildLocationFavoritesPath(cursor?: string | null): string {
  const query = new URLSearchParams({ limit: "50" });
  if (cursor) query.set("cursor", cursor);
  return `${LOCATION_FAVORITES_PATH}?${query.toString()}`;
}

export function buildLocationFavoriteDeletePath(locationId: string): string {
  const query = new URLSearchParams({ locationId });
  return `${LOCATION_FAVORITES_PATH}?${query.toString()}`;
}

export function buildLocationFavoritePayload(locationId: string) {
  return { locationId };
}

export function buildStoryFavoritesPath(cursor?: string | null): string {
  const query = new URLSearchParams({ limit: "50" });
  if (cursor) query.set("cursor", cursor);
  return `${STORY_FAVORITES_PATH}?${query.toString()}`;
}

export function buildStoryFavoriteDeletePath(storyId: string): string {
  const query = new URLSearchParams({ storyId });
  return `${STORY_FAVORITES_PATH}?${query.toString()}`;
}

export function buildStoryFavoritePayload(storyId: string) {
  return { storyId };
}

export function mergeFavoriteItems(
  locations: FavoriteLocationItem[],
  stories: FavoriteStoryItem[],
): FavoriteItem[] {
  return [
    ...locations.map((item) => ({ ...item, kind: "location" as const })),
    ...stories.map((item) => ({ ...item, kind: "story" as const })),
  ].sort((left, right) => {
    const dateOrder = Date.parse(right.createdAt) - Date.parse(left.createdAt);
    if (dateOrder !== 0) return dateOrder;
    const leftId = left.kind === "location" ? left.location.id : left.story.id;
    const rightId =
      right.kind === "location" ? right.location.id : right.story.id;
    return leftId.localeCompare(rightId);
  });
}
