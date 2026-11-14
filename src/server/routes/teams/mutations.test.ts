import { describe, expect, it } from "vitest";

import { createTeamSchema, updateTeamSchema } from "./mutations";

const future = new Date(Date.now() + 86_400_000);
const later = new Date(future.getTime() + 7_200_000);

describe("team activity type input", () => {
  it("accepts a code enum value when creating a team", () => {
    expect(createTeamSchema.parse({ requestId: crypto.randomUUID(),
      locationId: "location-1",
      activityType: "explore",
      title: "周末探索",
      startAt: future.toISOString(),
      endAt: later.toISOString(),
      maxParticipants: 6,
    }).activityType).toBe("explore");
  });

  it("keeps activity type optional on partial updates", () => {
    expect(updateTeamSchema.parse({ expectedVersion: 1, title: "新标题" })).toEqual({ expectedVersion: 1, title: "新标题" });
    expect(updateTeamSchema.parse({ expectedVersion: 1, activityType: "travel" }).activityType)
      .toBe("travel");
  });

  it("rejects values outside the code enum", () => {
    expect(createTeamSchema.safeParse({ requestId: crypto.randomUUID(),
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

describe("team input contract boundaries", () => {
  const input = () => ({ requestId: crypto.randomUUID(),
    locationId: " location-1 ", activityType: "explore", title: " 周末探索 ",
    startAt: future.toISOString(), endAt: later.toISOString(), maxParticipants: 6,
  });

  it("normalizes create defaults without introducing update defaults", () => {
    expect(createTeamSchema.parse(input())).toMatchObject({
      locationId: "location-1", title: "周末探索", requirements: [],
      recruitmentStatus: "open", tagIds: [],
    });
    expect(updateTeamSchema.parse({ expectedVersion: 1, title: " 新标题 " })).toEqual({ expectedVersion: 1, title: "新标题" });
  });

  it("keeps explicit clearing distinct from an omitted field", () => {
    expect(updateTeamSchema.parse({ expectedVersion: 1, description: null, meetingPoint: null, tagIds: [] }))
      .toEqual({ expectedVersion: 1, description: null, meetingPoint: null, tagIds: [] });
    expect(updateTeamSchema.parse({ expectedVersion: 1,})).toEqual({ expectedVersion: 1,});
  });

  it.each([
    { title: "" }, { title: "x".repeat(101) }, { maxParticipants: 0 },
    { maxParticipants: 50 }, { maxParticipants: 1.5 },
    { description: "x".repeat(2001) }, { meetingPoint: "x".repeat(1001) },
    { requirements: ["x".repeat(201)] }, { requirements: Array(21).fill("x") },
    { tagIds: Array(21).fill("tag") },
  ])("shares limits between creation and editing: %j", (invalid) => {
    expect(createTeamSchema.safeParse({ ...input(), ...invalid }).success).toBe(false);
    expect(updateTeamSchema.safeParse({ ...invalid, expectedVersion: 1 }).success).toBe(false);
  });

  it("trims and deduplicates tags without accepting unknown update fields", () => {
    expect(updateTeamSchema.parse({ expectedVersion: 1, tagIds: [" tag ", "tag"] })).toEqual({ expectedVersion: 1, tagIds: ["tag"] });
    expect(updateTeamSchema.safeParse({ ignored: true }).success).toBe(false);
  });
});
