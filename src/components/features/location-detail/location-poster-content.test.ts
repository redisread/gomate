import { describe, expect, it } from "vitest";
import type { Location } from "@/contracts";
import { createLocationPosterContent } from "./location-poster-content";

const location = {
  id: "place/id",
  name: "山间湖泊",
  subtitle: "短介绍",
  description: "完整正文",
  coverImageUrl: "/cover.png",
  images: ["/album.png"],
  supportedActivityTypes: ["hiking"],
  extra: { hiking: { bestSeasons: ["春季", "winter", "雨后"] } },
  region: { name: "深圳" },
  address: "OMITTED_ADDRESS",
} as Location;
const t = (key: string) => key;
const content = (overrides = {}) =>
  createLocationPosterContent(
    { ...location, ...overrides },
    "zh-CN",
    "https://gomate.live",
    t,
  );

describe("location poster public content", () => {
  it("selects the cover, subtitle and localized season labels", () => {
    expect(content()).toMatchObject({
      title: "山间湖泊",
      coverUrl: "/cover.png",
      introduction: "短介绍",
      region: "深圳",
      activity: "enums.locationType.hiking",
      seasons: "enums.season.spring · enums.season.winter · 雨后",
    });
    expect(JSON.stringify(content())).not.toContain("OMITTED_ADDRESS");
  });
  it("uses the album and description when optional fields are blank", () => {
    expect(content({ coverImageUrl: " ", subtitle: " \n " })).toMatchObject({
      coverUrl: "/album.png",
      introduction: "完整正文",
    });
  });
  it("omits absent optional information", () => {
    expect(
      content({
        coverImageUrl: null,
        images: [],
        region: undefined,
        subtitle: null,
        description: "",
        supportedActivityTypes: [],
        extra: {},
      }),
    ).toMatchObject({
      coverUrl: null,
      introduction: "",
      region: "",
      seasons: "",
      activity: "",
    });
  });
  it("encodes the detail id and preserves the English route", () => {
    expect(
      createLocationPosterContent(location, "en", "https://gomate.live", t).url,
    ).toBe("https://gomate.live/en/locations/place%2Fid");
  });
});
