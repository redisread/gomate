import { env } from "cloudflare:workers";
import { reset } from "cloudflare:test";
import { afterEach, describe, expect, it } from "vitest";
import { createDb } from "../../src/server/db";
import { decodeContentCursor } from "../../src/server/lib/content-cursor";
import {
  buildCreatedTeamsPageQuery,
  buildJoinedTeamsPageQuery,
  toTimelinePage,
} from "../../src/server/routes/users/timeline-query";

afterEach(() => reset());

async function seedTimeline() {
  await env.DB.batch([
    env.DB.prepare(
      `CREATE TABLE locations (id TEXT PRIMARY KEY, name TEXT, cover_image_url TEXT)`,
    ),
    env.DB.prepare(`CREATE TABLE teams (
      id TEXT PRIMARY KEY, location_id TEXT, leader_id TEXT, activity_type TEXT,
      title TEXT, description TEXT, start_at INTEGER, end_at INTEGER,
      max_participants INTEGER, requirements TEXT, recruitment_status TEXT,
      formed_at INTEGER, cancelled_at INTEGER, meeting_point TEXT,
      created_at INTEGER, updated_at INTEGER
    )`),
    env.DB.prepare(
      `CREATE TABLE team_members (team_id TEXT, user_id TEXT, left_at INTEGER)`,
    ),
    env.DB.prepare(
      `INSERT INTO locations VALUES ('location-1', 'Trail', NULL)`,
    ),
  ]);
  for (const [id, leader, createdAt] of [
    ["a", "owner", 1000],
    ["b", "owner", 2000],
    ["c", "owner", 2000],
    ["d", "other", 3000],
  ] as const) {
    await env.DB.prepare(
      `INSERT INTO teams VALUES (?, 'location-1', ?, 'hiking', ?, NULL,
      4000000000000, 4000003600000, 2, '["water"]', 'open', NULL, NULL, 'Gate', ?, ?)`,
    )
      .bind(id, leader, id, createdAt, createdAt)
      .run();
  }
  await env.DB.prepare(
    `INSERT INTO team_members VALUES
    ('a', 'member', NULL), ('b', 'member', NULL), ('c', 'member', 3000),
    ('d', 'someone-else', NULL)`,
  ).run();
}

describe("user timelines on real D1", () => {
  it("paginates created teams with a stable id tie-break and no foreign teams", async () => {
    await seedTimeline();
    const db = createDb(env.DB);
    const first = toTimelinePage(
      await buildCreatedTeamsPageQuery(db, "owner", null, 3),
      2,
    );
    expect(first.teams.map((team) => team.id)).toEqual(["c", "b"]);
    expect(first.teams[0]).toMatchObject({
      activeParticipantCount: 1,
      isFull: false,
      requirements: ["water"],
      meetingPoint: "Gate",
      location: { id: "location-1", name: "Trail", coverImageUrl: null },
      createdAt: new Date(2000).toISOString(),
    });
    expect(first.teams[1]).toMatchObject({
      activeParticipantCount: 2,
      isFull: true,
    });
    const cursor = decodeContentCursor(first.nextCursor!);
    expect(cursor).toEqual({ t: 2000, id: "b" });
    const last = toTimelinePage(
      await buildCreatedTeamsPageQuery(db, "owner", cursor, 3),
      2,
    );
    expect(last.teams.map((team) => team.id)).toEqual(["a"]);
    expect(last.nextCursor).toBeNull();
  });

  it("paginates only the caller's active memberships and ends on an exact full page", async () => {
    await seedTimeline();
    const db = createDb(env.DB);
    const first = toTimelinePage(
      await buildJoinedTeamsPageQuery(db, "member", null, 2),
      1,
    );
    expect(first.teams.map((team) => team.id)).toEqual(["b"]);
    const last = toTimelinePage(
      await buildJoinedTeamsPageQuery(
        db,
        "member",
        decodeContentCursor(first.nextCursor!),
        2,
      ),
      1,
    );
    expect(last.teams.map((team) => team.id)).toEqual(["a"]);
    expect(last.nextCursor).toBeNull();
    expect(
      toTimelinePage(
        await buildJoinedTeamsPageQuery(db, "unknown", null, 11),
        10,
      ),
    ).toEqual({ success: true, teams: [], nextCursor: null });
  });
});
