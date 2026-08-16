import { describe, expect, it, vi } from "vitest";
import {
  cachedPosterRender,
  generateQrDataUrl,
} from "../../services/share-image/poster-cache";
import { lookupPosterStrings } from "../../services/share-image/poster-i18n";

vi.mock("satori", () => ({
  default: vi.fn(async (tree: unknown, options: unknown) =>
    JSON.stringify({ tree, options }),
  ),
}));

import { renderLocationPoster } from "../../templates/share-image/location-poster";
import { renderTeamPoster } from "../../templates/share-image/team-poster";

describe("share image primitives", () => {
  it("generates a worker-compatible SVG QR data URL without a canvas", async () => {
    const dataUrl = await generateQrDataUrl("https://gomate.live/teams/example");

    expect(dataUrl).toMatch(/^data:image\/svg\+xml;base64,/);

    const encodedSvg = dataUrl.split(",", 2)[1];
    const svg = atob(encodedSvg);
    expect(svg).toContain("<svg");
    expect(svg).toContain("<path");
  });

  it("provides localized copy for team posters", () => {
    const strings = lookupPosterStrings("en");

    expect(strings.teamStatusNeed(2)).toBe("2 more people to go");
    expect(strings.teamMemberCount(2, 5)).toBe("2/5 members");
    expect(strings.teamLocationPending).toBe("Destination to be confirmed");
    expect(strings.teamDepartureLabel).toBe("Departure");
    expect(strings.teamScanJoin).toBe("Scan to join");
  });

  it("renders the V2 region name in location poster metadata", async () => {
    const serialized = await renderLocationPoster({
      title: "Wutong Mountain",
      description: "A short route description.",
      tags: [],
      regionName: "Shenzhen",
      type: "hiking",
      fonts: [],
    });

    expect(serialized).toContain("Shenzhen · hiking");
  });

  it("renders V2 active and maximum participant counts in team posters", async () => {
    const serialized = await renderTeamPoster({
      title: "Weekend Hike",
      date: "Aug 22",
      activeParticipantCount: 2,
      maxParticipants: 5,
      fonts: [],
    });

    expect(serialized).toContain("2/5 人");
  });

  it("stores and reads generated SVG posters from CACHE_KV", async () => {
    const values = new Map<string, string>();
    const cache = {
        get: vi.fn(async (key: string) => values.get(key) ?? null),
        put: vi.fn(async (key: string, value: string) => {
          values.set(key, value);
        }),
        delete: vi.fn(async (key: string) => {
          values.delete(key);
        }),
    };
    const env = { CACHE_KV: cache } as never;
    const render = vi.fn(async () => "<svg>poster</svg>");

    const first = await cachedPosterRender({
      env,
      cacheKey: "poster:v3:team:team-1:hash",
      refresh: false,
      render,
    });
    const second = await cachedPosterRender({
      env,
      cacheKey: "poster:v3:team:team-1:hash",
      refresh: false,
      render,
    });

    expect(first.cached).toBe(false);
    expect(second).toEqual({
      svg: "<svg>poster</svg>",
      cacheKey: "poster:v3:team:team-1:hash",
      cached: true,
    });
    expect(render).toHaveBeenCalledTimes(1);
    expect(cache.put).toHaveBeenCalledWith(
      "poster:v3:team:team-1:hash",
      "<svg>poster</svg>",
      { expirationTtl: 86400 },
    );
  });
});
