import { describe, expect, it } from "vitest";
import type { Team } from "@/contracts";
import {
  formatTeamStart,
  getTeamDisplayStatus,
  getTeamDurationMinutes,
  isTeamJoinable,
} from "./team-display";

const BASE_TEAM = {
  id: "team-1",
  locationId: "location-1",
  leaderId: "leader-1",
  activityType: "hiking",
  title: "周末徒步",
  description: null,
  startAt: "2026-08-22T00:30:00.000Z",
  endAt: "2026-08-22T04:30:00.000Z",
  maxParticipants: 6,
  activeParticipantCount: 2,
  requirements: [],
  recruitmentStatus: "open",
  formedAt: null,
  cancelledAt: null,
  lifecycle: "pending",
  isFull: false,
  checklist: null,
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
} satisfies Team;

describe("team-display", () => {
  it("derives display values exclusively from Team timestamps and capacity", () => {
    expect(getTeamDurationMinutes(BASE_TEAM)).toBe(240);
    expect(formatTeamStart(BASE_TEAM, "zh-CN", "Asia/Shanghai")).toEqual({
      date: "2026/08/22",
      time: "08:30",
    });
    expect(getTeamDisplayStatus(BASE_TEAM)).toBe("recruiting");
    expect(isTeamJoinable(BASE_TEAM)).toBe(true);
  });

  it("uses lifecycle and recruitment status instead of a legacy status field", () => {
    expect(getTeamDisplayStatus({ lifecycle: "pending", recruitmentStatus: "open", isFull: true })).toBe("full");
    expect(getTeamDisplayStatus({ lifecycle: "pending", recruitmentStatus: "closed", isFull: false })).toBe("closed");
    expect(getTeamDisplayStatus({ lifecycle: "in_progress", recruitmentStatus: "closed", isFull: false })).toBe("ongoing");
    expect(getTeamDisplayStatus({ lifecycle: "expired_unformed", recruitmentStatus: "closed", isFull: false })).toBe("expired_unformed");
    expect(isTeamJoinable({ lifecycle: "pending", recruitmentStatus: "closed", isFull: false })).toBe(false);
  });
});
