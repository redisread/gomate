import { describe, expect, it } from "vitest";

import { mergeUserExtra, parseUserExtra, serializeUserExtra } from "../../lib/user-extra";

describe("UserExtra", () => {
  it("fills V2 defaults from an empty database object", () => {
    expect(parseUserExtra("{}")).toEqual({
      level: "beginner",
      completedHikes: 0,
      wechat: null,
      city: null,
    });
  });

  it("maps snake_case storage to the camelCase API contract", () => {
    expect(
      parseUserExtra(
        JSON.stringify({
          level: "advanced",
          completed_hikes: 4,
          wechat: "gomate-user",
          city: "region-shenzhen",
        }),
      ),
    ).toEqual({
      level: "advanced",
      completedHikes: 4,
      wechat: "gomate-user",
      city: "region-shenzhen",
    });
  });

  it("merges one field without erasing the other profile fields", () => {
    const current = parseUserExtra(
      '{"level":"intermediate","completed_hikes":2,"wechat":"wx","city":"sz"}',
    );

    expect(mergeUserExtra(current, { city: "gz" })).toEqual({
      level: "intermediate",
      completedHikes: 2,
      wechat: "wx",
      city: "gz",
    });
  });

  it("rejects malformed or out-of-range stored values", () => {
    expect(() => parseUserExtra("not-json")).toThrow();
    expect(() => parseUserExtra('{"completed_hikes":-1}')).toThrow();
    expect(() => mergeUserExtra(parseUserExtra("{}"), { level: "novice" as never })).toThrow();
  });

  it("serializes exactly the V2 database shape", () => {
    expect(
      JSON.parse(
        serializeUserExtra({
          level: "expert",
          completedHikes: 9,
          wechat: null,
          city: "region-shenzhen",
        }),
      ),
    ).toEqual({
      level: "expert",
      completed_hikes: 9,
      wechat: null,
      city: "region-shenzhen",
    });
  });
});
