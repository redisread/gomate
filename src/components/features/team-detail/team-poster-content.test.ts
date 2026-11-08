import { describe, expect, it } from "vitest";
import type { Team } from "@/contracts";
import { createPosterContent } from "./team-poster-content";

const team = {
  id: "team-1",
  title: "一起出发",
  activityType: "hiking",
  startAt: "2027-04-17T16:30:00Z",
  endAt: "2027-04-18T03:30:00Z",
  lifecycle: "pending",
  recruitmentStatus: "open",
  isFull: false,
  maxParticipants: 12,
  meetingPoint: "private meeting point",
  leader: { name: "private leader", extra: { wechat: "private-wechat" } },
  location: {
    name: "梧桐山",
    coverImageUrl: "/photo.png",
    region: { timezone: "Asia/Shanghai" },
  },
} as Team;
const t = (key: string) => key;

describe("team poster content", () => {
  it("projects only selected public fields and destination-local times", () => {
    const content = createPosterContent(
      team,
      "zh-CN",
      "https://gomate.live",
      t,
    );
    expect(content.date).toBe("2027/04/18");
    expect(content.startTime).toBe("00:30");
    expect(content.endTime).toBe("11:30");
    expect(content.url).toBe("https://gomate.live/teams/team-1");
    expect(Object.keys(content).sort()).toEqual(
      [
        "activity",
        "capacity",
        "coverUrl",
        "date",
        "endLabel",
        "endTime",
        "location",
        "note",
        "scanLabel",
        "startTime",
        "status",
        "timeZone",
        "title",
        "url",
        "weekday",
      ].sort(),
    );
    expect(JSON.stringify(content)).not.toContain("private");
  });

  it.each([
    ["pending", false, "open", "recruiting"],
    ["pending", true, "open", "full"],
    ["pending", false, "closed", "closed"],
    ["formed", false, "closed", "formed"],
    ["in_progress", false, "closed", "ongoing"],
    ["completed", false, "closed", "completed"],
    ["cancelled", false, "closed", "cancelled"],
    ["expired_unformed", false, "closed", "expired_unformed"],
  ] as const)(
    "labels %s/%s/%s accurately",
    (lifecycle, isFull, recruitmentStatus, status) => {
      expect(
        createPosterContent(
          { ...team, lifecycle, isFull, recruitmentStatus },
          "en",
          "https://gomate.live",
          t,
        ).status,
      ).toBe(`teams.poster.status.${status}`);
    },
  );

  it("preserves cross-day end dates and locale in the destination link", () => {
    const content = createPosterContent(
      { ...team, endAt: "2027-04-19T03:30:00Z" },
      "en",
      "https://gomate.live",
      t,
    );
    expect(content.endTime).toBe("2027/04/19 11:30");
    expect(content.url).toBe("https://gomate.live/en/teams/team-1");
  });
});
