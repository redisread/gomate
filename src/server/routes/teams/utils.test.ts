import { describe, expect, it } from "vitest";
import type * as schema from "../../db/schema";
import { toTeamResponse } from "./utils";

describe("Team response location projection", () => {
  it("omits retired Location equipment while preserving Team actionbook gear", () => {
    const response = toTeamResponse({
      team: {
        id: "team-1",
        locationId: "location-1",
        leaderId: "leader-1",
        activityType: "hiking",
        title: "周末徒步",
        description: null,
        startAt: new Date("2030-01-01T08:00:00.000Z"),
        endAt: new Date("2030-01-01T12:00:00.000Z"),
        maxParticipants: 6,
        requirements: [],
        recruitmentStatus: "open",
        formedAt: null,
        cancelledAt: null,
        checklist: {
          gear: {
            essential: ["队伍急救包"],
            optional: ["队旗"],
          },
        },
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      } as unknown as schema.Team,
      activeParticipantCount: 1,
      checklistVisible: true,
      now: new Date("2026-01-01T00:00:00.000Z"),
      location: {
        id: "location-1",
        regionId: "region-1",
        name: "梧桐山",
        slug: "wutong-mountain",
        supportedActivityTypes: ["hiking"],
        status: "published",
        subtitle: null,
        description: "深圳第一高峰",
        address: "深圳市罗湖区",
        latitude: 22.58,
        longitude: 114.2,
        coverImageUrl: null,
        images: [],
        extra: {
          hiking: {
            difficulty: "moderate",
            gear_essential: ["地点登山鞋"],
            gear_optional: ["地点登山杖"],
            warnings: ["雨天路滑"],
          },
        },
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      } as unknown as schema.Location,
    });

    expect(response.location?.extra.hiking).toMatchObject({
      difficulty: "moderate",
      warnings: ["雨天路滑"],
    });
    expect(response.location?.extra.hiking).not.toHaveProperty("gearEssential");
    expect(response.location?.extra.hiking).not.toHaveProperty("gearOptional");
    expect(response.checklist?.gear).toEqual({
      essential: ["队伍急救包"],
      optional: ["队旗"],
    });
  });
});
