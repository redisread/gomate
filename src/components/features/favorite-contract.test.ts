import { describe, expect, it } from "vitest";

import {
  buildLocationFavoriteDeletePath,
  buildLocationFavoritePayload,
  buildLocationFavoritesPath,
  buildStoryFavoriteDeletePath,
  buildStoryFavoritePayload,
  buildStoryFavoritesPath,
  LOCATION_FAVORITES_PATH,
  mergeFavoriteItems,
  STORY_FAVORITES_PATH,
  type FavoriteLocationsResponse,
} from "./favorite-contract";

describe("Favorites frontend contract", () => {
  it("uses the dedicated location favorites endpoint with opaque cursors", () => {
    expect(LOCATION_FAVORITES_PATH).toBe("/favorites/locations");
    expect(buildLocationFavoritesPath("opaque cursor")).toBe(
      "/favorites/locations?limit=50&cursor=opaque+cursor",
    );
    expect(buildLocationFavoritesPath()).not.toContain("entityType");
  });

  it("builds dedicated create and delete contracts without polymorphic fields", () => {
    expect(buildLocationFavoritePayload("location/1")).toEqual({
      locationId: "location/1",
    });
    expect(buildLocationFavoriteDeletePath("location/1")).toBe(
      "/favorites/locations?locationId=location%2F1",
    );
    expect(buildLocationFavoritePayload("location/1")).not.toHaveProperty(
      "entityId",
    );
    expect(STORY_FAVORITES_PATH).toBe("/favorites/stories");
    expect(buildStoryFavoritesPath("story cursor")).toBe(
      "/favorites/stories?limit=50&cursor=story+cursor",
    );
    expect(buildStoryFavoritePayload("story/1")).toEqual({
      storyId: "story/1",
    });
    expect(buildStoryFavoriteDeletePath("story/1")).toBe(
      "/favorites/stories?storyId=story%2F1",
    );
  });

  it("models the data.items envelope and location media field", () => {
    const response = {
      success: true,
      data: {
        items: [
          {
            createdAt: "2026-08-16T08:00:00.000Z",
            location: {
              id: "location-1",
              name: "梧桐山",
              coverImageUrl:
                "https://gomate.cos.jiahongw.com/locations/wutong.webp",
              address: null,
            },
          },
        ],
        nextCursor: null,
      },
    } satisfies FavoriteLocationsResponse;

    expect(response.data.items[0]?.location.coverImageUrl).toContain(
      "wutong.webp",
    );
    expect(response.data).not.toHaveProperty("favorites");
  });

  it("merges both resource feeds by favorite time", () => {
    const items = mergeFavoriteItems(
      [
        {
          createdAt: "2026-08-16T08:00:00.000Z",
          location: {
            id: "location-1",
            name: "梧桐山",
            coverImageUrl:
              "https://gomate.cos.jiahongw.com/locations/wutong.webp",
            address: null,
          },
        },
      ],
      [
        {
          createdAt: "2026-08-16T09:00:00.000Z",
          story: {
            id: "story-1",
            title: "山间日记",
            summary: null,
            content: "正文",
            images: [],
            createdAt: "2026-08-15T09:00:00.000Z",
          },
        },
      ],
    );

    expect(items.map((item) => item.kind)).toEqual(["story", "location"]);
  });
});
