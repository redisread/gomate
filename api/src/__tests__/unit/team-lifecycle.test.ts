import { describe, expect, it } from "vitest";

import { getTeamLifecycle, isTeamRecruitable } from "../../lib/team-lifecycle";

const NOW = 2_000;

describe("team lifecycle", () => {
  it.each([
    [{ cancelledAt: 1_900, formedAt: null, startAt: 3_000, endAt: 4_000 }, "cancelled"],
    [{ cancelledAt: null, formedAt: null, startAt: 3_000, endAt: 4_000 }, "pending"],
    [{ cancelledAt: null, formedAt: 1_500, startAt: 3_000, endAt: 4_000 }, "formed"],
    [{ cancelledAt: null, formedAt: 1_500, startAt: 1_500, endAt: 3_000 }, "in_progress"],
    [{ cancelledAt: null, formedAt: 1_500, startAt: 1_500, endAt: 2_000 }, "completed"],
    [{ cancelledAt: null, formedAt: null, startAt: 2_000, endAt: 3_000 }, "expired_unformed"],
  ] as const)("derives %s as %s without writing", (team, expected) => {
    expect(getTeamLifecycle(team, NOW)).toBe(expected);
  });

  it("only reports recruitable when open, future, not cancelled, and below capacity", () => {
    const team = {
      cancelledAt: null,
      formedAt: null,
      startAt: 3_000,
      endAt: 4_000,
      recruitmentStatus: "open" as const,
      maxParticipants: 2,
    };

    expect(isTeamRecruitable(team, 1, NOW)).toBe(true);
    expect(isTeamRecruitable(team, 2, NOW)).toBe(false);
    expect(isTeamRecruitable({ ...team, recruitmentStatus: "closed" }, 0, NOW)).toBe(false);
    expect(isTeamRecruitable({ ...team, cancelledAt: 1_900 }, 0, NOW)).toBe(false);
  });

  it("accepts Date values from the Drizzle timestamp mapping", () => {
    expect(
      getTeamLifecycle(
        {
          cancelledAt: null,
          formedAt: new Date(1_500),
          startAt: new Date(1_500),
          endAt: new Date(3_000),
        },
        new Date(NOW),
      ),
    ).toBe("in_progress");
  });
});
