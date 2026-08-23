import { describe, expect, it } from "vitest";

import { createTeamSchema, updateTeamSchema } from "./mutations";

const future = new Date(Date.now() + 86_400_000);
const later = new Date(future.getTime() + 7_200_000);

describe("team activity type input", () => {
  it("accepts a code enum value when creating a team", () => {
    expect(createTeamSchema.parse({
      locationId: "location-1",
      activityType: "explore",
      title: "周末探索",
      startAt: future.toISOString(),
      endAt: later.toISOString(),
      maxParticipants: 6,
    }).activityType).toBe("explore");
  });

  it("keeps activity type optional on partial updates", () => {
    expect(updateTeamSchema.parse({ title: "新标题" })).toEqual({ title: "新标题" });
    expect(updateTeamSchema.parse({ activityType: "travel" }).activityType)
      .toBe("travel");
  });

  it("rejects values outside the code enum", () => {
    expect(createTeamSchema.safeParse({
      locationId: "location-1",
      activityType: "paddling",
      title: "周末桨板",
      startAt: future.toISOString(),
      endAt: later.toISOString(),
      maxParticipants: 6,
    }).success).toBe(false);
    expect(updateTeamSchema.safeParse({ activityType: "paddling" }).success)
      .toBe(false);
  });
});
