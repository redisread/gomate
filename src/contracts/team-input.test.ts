import { describe, expect, it } from "vitest";
import { createTeamSchemaWithClock, teamCreateInputSchema } from "./team-input";

describe("team input time boundary", () => {
  const start = Date.parse("2026-11-14T09:00:00+08:00");
  const input = { requestId: crypto.randomUUID(),
    locationId: "location", activityType: "hiking", title: "出发",
    startAt: "2026-11-14T09:00:00+08:00",
    endAt: "2026-11-14T10:00:00+08:00", maxParticipants: 6,
  };

  it("evaluates the injected clock at parsing time and rejects the exact start boundary", () => {
    let now = start - 1;
    const schema = createTeamSchemaWithClock(() => now);
    expect(schema.safeParse(input).success).toBe(true);
    now = start;
    const result = schema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].path).toEqual(["startAt"]);
  });

  it("accepts an equal end and rejects an end before start", () => {
    const schema = createTeamSchemaWithClock(() => start - 1);
    expect(schema.safeParse({ ...input, endAt: input.startAt }).success).toBe(true);
    const result = schema.safeParse({ ...input, endAt: "2026-11-14T08:59:59+08:00" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].path).toEqual(["endAt"]);
  });

  it("can normalize stored operation input without consulting the current clock", () => {
    expect(teamCreateInputSchema.parse(input)).toMatchObject({
      requirements: [], tagIds: [], recruitmentStatus: "open",
    });
  });
});
