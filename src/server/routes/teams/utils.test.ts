import { describe, expect, it } from "vitest";

import type * as schema from "../../db/schema";
import { toTeamResponse } from "./utils";

describe("team response projection", () => {
  it("does not expose retired location gear keys while preserving the actionbook", () => {
    const now = new Date("2026-08-24T00:00:00.000Z");
    const response = toTeamResponse({
      activeParticipantCount: 0,
      checklistVisible: true,
      now,
      team: {
        id: "team-1",
        locationId: "location-1",
        leaderId: "user-1",
        activityType: "hiking",
        title: "周末徒步",
        description: null,
        startAt: new Date("2026-08-25T00:00:00.000Z"),
        endAt: new Date("2026-08-25T08:00:00.000Z"),
        maxParticipants: 5,
        requirements: [],
        recruitmentStatus: "open",
        formedAt: null,
        cancelledAt: null,
        checklist: {
          v: 1,
          gear: { essential: ["队伍急救包"], optional: [] },
        },
        createdAt: now,
        updatedAt: now,
      } as schema.Team,
      location: {
        id: "location-1",
        regionId: "region-1",
        name: "梧桐山",
        slug: "wutong-mountain",
        supportedActivityTypes: ["hiking"],
        status: "published",
        subtitle: null,
        description: "地点介绍",
        address: null,
        latitude: 22.5,
        longitude: 114.1,
        coverImageUrl: null,
        images: [],
        extra: {
          hiking: {
            warnings: ["雨天路滑"],
            gear_essential: ["登山鞋"],
            gear_optional: ["登山杖"],
          },
        },
        createdAt: now,
        updatedAt: now,
      } as unknown as schema.Location,
    });

    expect(response.location?.extra.hiking).toMatchObject({
      warnings: ["雨天路滑"],
    });
    expect(response.location?.extra.hiking).not.toHaveProperty("gearEssential");
    expect(response.location?.extra.hiking).not.toHaveProperty("gearOptional");
    expect(response.checklist?.gear?.essential).toEqual(["队伍急救包"]);
  });
});
