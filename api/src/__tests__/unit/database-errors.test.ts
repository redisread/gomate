import { describe, expect, it } from "vitest";

import { mapDatabaseError } from "../../lib/database-errors";

describe("database error mapping", () => {
  it.each([
    ["D1_ERROR: TEAM_CAPACITY_EXCEEDED", 409, "TEAM_CAPACITY_EXCEEDED"],
    ["D1_ERROR: TEAM_LEADER_MEMBER_CONFLICT", 409, "TEAM_LEADER_MEMBER_CONFLICT"],
    ["STORY_LIKE_COUNT_FAILED", 409, "STORY_LIKE_COUNT_FAILED"],
    ["MESSAGE_SUMMARY_FAILED", 409, "MESSAGE_SUMMARY_FAILED"],
  ])("maps stable trigger code %s", (message, status, code) => {
    expect(mapDatabaseError(new Error(message))).toEqual({
      status,
      body: {
        success: false,
        error: { code, message: expect.any(String) },
      },
    });
  });

  it("never sends raw SQL or SQLite diagnostics to the client", () => {
    const mapped = mapDatabaseError(
      new Error("D1_ERROR: UNIQUE constraint failed: users.email; SQL: insert into users ..."),
    );

    expect(mapped.status).toBe(422);
    expect(mapped.body.error.code).toBe("DATABASE_CONSTRAINT_FAILED");
    expect(JSON.stringify(mapped.body)).not.toMatch(/UNIQUE|users\.email|insert into/u);
  });
});
