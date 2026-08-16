import { afterEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  apiRoot,
  baselineSql,
  createV2Database,
  explainDetails,
  seedV2Core,
} from "./database-v2-test-helpers.mjs";

function expectConstraint(db, sql, params = []) {
  expect(() => db.prepare(sql).run(...params)).toThrow();
}

describe("database design v2 runtime integrity", () => {
  let db;

  afterEach(() => db?.close());

  it("applies the idempotent seed twice with the required minimum graph", () => {
    db = createV2Database();
    const seedSql = readFileSync(join(apiRoot, "db", "seed.sql"), "utf8");
    db.exec(seedSql);
    db.exec(seedSql);

    expect(db.prepare("SELECT COUNT(*) AS count FROM region").get().count).toBe(
      3,
    );
    expect(
      db.prepare("SELECT COUNT(*) AS count FROM locations").get().count,
    ).toBe(1);
    expect(db.prepare("SELECT COUNT(*) AS count FROM tags").get().count).toBe(
      3,
    );
    expect(
      db.prepare("SELECT COUNT(*) AS count FROM location_tags").get().count,
    ).toBe(3);
    expect(
      db.prepare("SELECT * FROM region WHERE id = 'region-cn-shenzhen'").get(),
    ).toEqual(
      expect.objectContaining({
        parent_id: "region-cn-guangdong",
        level: "city",
        timezone: "Asia/Shanghai",
        service_enabled: 1,
      }),
    );
    expect(db.pragma("foreign_key_check")).toEqual([]);
  });

  it("uses integer millisecond defaults for raw SQL inserts", () => {
    db = createV2Database();
    const before = Math.floor(Date.now() / 1000) * 1000;
    db.prepare(
      "INSERT INTO users (id, name, email) VALUES ('raw-user', 'Raw', 'raw@example.com')",
    ).run();
    db.prepare(
      "INSERT INTO tags (id, name, slug) VALUES ('raw-tag', 'Raw', 'raw')",
    ).run();
    const after = Math.floor(Date.now() / 1000) * 1000;

    const user = db
      .prepare(
        `
      SELECT email_verified, role, status, extra, created_at, updated_at
      FROM users WHERE id = 'raw-user'
    `,
      )
      .get();
    expect(user).toEqual(
      expect.objectContaining({
        email_verified: 0,
        role: "user",
        status: "active",
        extra: "{}",
      }),
    );
    for (const value of [user.created_at, user.updated_at]) {
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(before);
      expect(value).toBeLessThanOrEqual(after);
      expect(value % 1000).toBe(0);
    }
    expect(
      db.prepare("SELECT created_at FROM tags WHERE id = 'raw-tag'").get()
        .created_at % 1000,
    ).toBe(0);
  });

  it("revokes sessions on inactive or soft-deleted user transitions without resurrecting them", () => {
    db = createV2Database();
    db.exec(`
      INSERT INTO users (id, name, email) VALUES
        ('status-user', 'Status User', 'status-user@example.com'),
        ('deleted-user', 'Deleted User', 'deleted-user@example.com');
      INSERT INTO sessions (id, user_id, token, expires_at) VALUES
        ('status-session-a', 'status-user', 'status-token-a', 4102444800000),
        ('status-session-b', 'status-user', 'status-token-b', 4102444800000),
        ('deleted-session-a', 'deleted-user', 'deleted-token-a', 4102444800000),
        ('deleted-session-b', 'deleted-user', 'deleted-token-b', 4102444800000);
      INSERT INTO verifications (id, identifier, value, expires_at) VALUES
        ('status-reset', 'password-reset:status-user', 'status-digest', 4102444800000),
        ('deleted-reset', 'password-reset:deleted-user', 'deleted-digest', 4102444800000);
    `);

    db.prepare(
      "UPDATE users SET status = 'suspended' WHERE id = 'status-user'",
    ).run();
    expect(
      db
        .prepare(
          "SELECT COUNT(*) AS count FROM sessions WHERE user_id = 'status-user'",
        )
        .get().count,
    ).toBe(0);
    expect(
      db.prepare(
        "SELECT COUNT(*) AS count FROM verifications WHERE identifier = 'password-reset:status-user'",
      ).get().count,
    ).toBe(0);
    expect(() => db.prepare(`
      INSERT INTO sessions (id, user_id, token, expires_at)
      VALUES ('status-race-session', 'status-user', 'status-race-token', 4102444800000)
    `).run()).toThrow(/SESSION_USER_INACTIVE/u);
    db.prepare(
      "UPDATE users SET status = 'active' WHERE id = 'status-user'",
    ).run();
    expect(
      db
        .prepare(
          "SELECT COUNT(*) AS count FROM sessions WHERE user_id = 'status-user'",
        )
        .get().count,
    ).toBe(0);
    db.prepare(
      "UPDATE users SET deleted_at = 2000000000000 WHERE id = 'deleted-user'",
    ).run();
    expect(
      db
        .prepare(
          "SELECT COUNT(*) AS count FROM sessions WHERE user_id = 'deleted-user'",
        )
        .get().count,
    ).toBe(0);
    expect(
      db.prepare(
        "SELECT COUNT(*) AS count FROM verifications WHERE identifier = 'password-reset:deleted-user'",
      ).get().count,
    ).toBe(0);
    expect(() => db.prepare(`
      INSERT INTO sessions (id, user_id, token, expires_at)
      VALUES ('deleted-race-session', 'deleted-user', 'deleted-race-token', 4102444800000)
    `).run()).toThrow(/SESSION_USER_INACTIVE/u);
    db.prepare(
      "UPDATE users SET deleted_at = NULL WHERE id = 'deleted-user'",
    ).run();
    expect(
      db
        .prepare(
          "SELECT COUNT(*) AS count FROM sessions WHERE user_id = 'deleted-user'",
        )
        .get().count,
    ).toBe(0);
  });

  it("rejects invalid booleans, enum values, JSON shapes, coordinates, and state shapes", () => {
    db = createV2Database();

    expectConstraint(
      db,
      `INSERT INTO users (id, name, email, email_verified) VALUES ('u1', 'U1', 'u1@example.com', 2)`,
    );
    expectConstraint(
      db,
      `INSERT INTO users (id, name, email, extra) VALUES ('u2', 'U2', 'u2@example.com', '[]')`,
    );
    expectConstraint(
      db,
      `INSERT INTO users (id, name, email, extra) VALUES ('u3', 'U3', 'u3@example.com', '{')`,
    );
    expectConstraint(
      db,
      `INSERT INTO region (id, country_code, name, slug, level) VALUES ('r1', 'cn', 'R1', 'r1', 'other')`,
    );
    expectConstraint(
      db,
      `INSERT INTO region (id, country_code, parent_id, name, slug, level) VALUES ('r2', 'CN', 'r2', 'R2', 'r2', 'city')`,
    );
    expectConstraint(
      db,
      `INSERT INTO region (id, country_code, name, slug, level, service_enabled) VALUES ('r3', 'CN', 'R3', 'r3', 'province', 1)`,
    );

    seedV2Core(db);
    expectConstraint(
      db,
      `INSERT INTO locations (id, region_id, name, slug, supported_activity_types, description, latitude, longitude, cover_image_url) VALUES ('bad-loc-1', 'region-sz', 'Bad', 'bad-1', '{}', 'bad', 0, 0, 'https://example.com')`,
    );
    expectConstraint(
      db,
      `INSERT INTO locations (id, region_id, name, slug, supported_activity_types, description, latitude, longitude, cover_image_url, images) VALUES ('bad-loc-2', 'region-sz', 'Bad', 'bad-2', '["hiking"]', 'bad', 91, 0, 'https://example.com', '{}')`,
    );
    expectConstraint(
      db,
      `INSERT INTO locations (id, region_id, name, slug, description, latitude, longitude, cover_image_url) VALUES ('bad-loc-3', 'region-sz', 'Bad', 'bad-3', 'bad', 0, 0, 'https://example.com')`,
    );
    expectConstraint(
      db,
      `INSERT INTO teams (id, location_id, leader_id, activity_type, title, start_at, end_at) VALUES ('bad-team-1', 'location-1', 'leader', 'skiing', 'Bad', 2, 1)`,
    );
    expectConstraint(
      db,
      `INSERT INTO teams (id, location_id, leader_id, activity_type, title, start_at, end_at, requirements) VALUES ('bad-team-2', 'location-1', 'leader', 'hiking', 'Bad', 1, 2, '{}')`,
    );
    expectConstraint(
      db,
      `INSERT INTO teams (id, location_id, leader_id, activity_type, title, start_at, end_at, checklist) VALUES ('bad-team-3', 'location-1', 'leader', 'hiking', 'Bad', 1, 2, '[]')`,
    );
    expectConstraint(
      db,
      `INSERT INTO team_join_requests (id, team_id, user_id, status) VALUES ('bad-request-1', 'team-1', 'member-1', 'approved')`,
    );
    expectConstraint(
      db,
      `INSERT INTO team_join_requests (id, team_id, user_id, status, decided_at) VALUES ('bad-request-2', 'team-1', 'member-1', 'pending', 1)`,
    );
    expectConstraint(
      db,
      `INSERT INTO stories (id, author_id, content) VALUES ('bad-story-1', 'member-1', '   ')`,
    );
    expectConstraint(
      db,
      `INSERT INTO stories (id, author_id, content) VALUES ('bad-story-2', 'member-1', 'content')`,
    );
    expectConstraint(
      db,
      `INSERT INTO stories (id, author_id, title, content, images) VALUES ('bad-story-3', 'member-1', 'Title', 'content', '{}')`,
    );
  });

  it("enforces one pending application and one conversation per team/member", () => {
    db = createV2Database();
    const now = seedV2Core(db);
    db.prepare(
      `
      INSERT INTO team_join_requests (id, team_id, user_id)
      VALUES ('request-1', 'team-1', 'member-1')
    `,
    ).run();
    expectConstraint(
      db,
      `
      INSERT INTO team_join_requests (id, team_id, user_id)
      VALUES ('request-2', 'team-1', 'member-1')
    `,
    );
    db.prepare(
      `
      UPDATE team_join_requests
      SET status = 'cancelled', decided_at = ?, updated_at = ?
      WHERE id = 'request-1'
    `,
    ).run(now, now);
    db.prepare(
      `
      INSERT INTO team_join_requests (id, team_id, user_id)
      VALUES ('request-2', 'team-1', 'member-1')
    `,
    ).run();

    db.prepare(
      `
      INSERT INTO conversations (id, team_id, member_user_id, initiated_by_user_id)
      VALUES ('conversation-1', 'team-1', 'member-1', 'member-1')
    `,
    ).run();
    expectConstraint(
      db,
      `
      INSERT INTO conversations (id, team_id, member_user_id, initiated_by_user_id)
      VALUES ('conversation-2', 'team-1', 'member-1', 'leader')
    `,
    );
  });

  it("enforces participant capacity on insert, reactivation, and capacity reduction", () => {
    db = createV2Database();
    const now = seedV2Core(db, { maxParticipants: 2 });
    db.prepare(
      `INSERT INTO team_members (team_id, user_id) VALUES ('team-1', 'member-1')`,
    ).run();
    db.prepare(
      `INSERT INTO team_members (team_id, user_id) VALUES ('team-1', 'member-2')`,
    ).run();

    expectConstraint(
      db,
      `INSERT INTO team_members (team_id, user_id) VALUES ('team-1', 'member-3')`,
    );
    expect(() =>
      db
        .prepare(
          `INSERT INTO team_members (team_id, user_id) VALUES ('team-1', 'member-3')`,
        )
        .run(),
    ).toThrow(/TEAM_CAPACITY_EXCEEDED/u);
    expect(() =>
      db
        .prepare(`UPDATE teams SET max_participants = 1 WHERE id = 'team-1'`)
        .run(),
    ).toThrow(/TEAM_CAPACITY_EXCEEDED/u);

    db.prepare(
      `UPDATE team_members SET left_at = ? WHERE team_id = 'team-1' AND user_id = 'member-2'`,
    ).run(now);
    db.prepare(
      `INSERT INTO team_members (team_id, user_id) VALUES ('team-1', 'member-3')`,
    ).run();
    expect(() =>
      db
        .prepare(
          `UPDATE team_members SET left_at = NULL, joined_at = ? WHERE team_id = 'team-1' AND user_id = 'member-2'`,
        )
        .run(now + 1),
    ).toThrow(/TEAM_CAPACITY_EXCEEDED/u);
    expect(
      db
        .prepare(
          `SELECT COUNT(*) AS count FROM team_members WHERE team_id = 'team-1' AND left_at IS NULL`,
        )
        .get().count,
    ).toBe(2);
  });

  it("keeps story like counts and conversation summaries atomic", () => {
    db = createV2Database();
    const now = seedV2Core(db);
    db.prepare(
      `
      INSERT INTO stories (id, author_id, title, content)
      VALUES ('story-1', 'member-1', '标题', '正文')
    `,
    ).run();
    db.prepare(
      `INSERT INTO story_likes (user_id, story_id) VALUES ('member-1', 'story-1')`,
    ).run();
    db.prepare(
      `INSERT INTO story_likes (user_id, story_id) VALUES ('member-2', 'story-1')`,
    ).run();
    expect(
      db.prepare(`SELECT like_count FROM stories WHERE id = 'story-1'`).get()
        .like_count,
    ).toBe(2);
    db.prepare(
      `DELETE FROM story_likes WHERE user_id = 'member-1' AND story_id = 'story-1'`,
    ).run();
    expect(
      db.prepare(`SELECT like_count FROM stories WHERE id = 'story-1'`).get()
        .like_count,
    ).toBe(1);

    db.prepare(
      `
      INSERT INTO conversations (id, team_id, member_user_id, initiated_by_user_id)
      VALUES ('conversation-1', 'team-1', 'member-1', 'member-1')
    `,
    ).run();
    const content = "这是一条超过一百个字符的消息".repeat(12);
    db.prepare(
      `
      INSERT INTO messages (id, conversation_id, sender_id, content, created_at)
      VALUES ('message-1', 'conversation-1', 'member-1', ?, ?)
    `,
    ).run(content, now);
    const conversation = db
      .prepare(`SELECT * FROM conversations WHERE id = 'conversation-1'`)
      .get();
    expect(conversation.last_message_preview).toBe(content.slice(0, 100));
    expect(conversation.last_message_at).toBe(now);
    expect(conversation.updated_at).toBe(now);
  });

  it("raises stable codes when a derived-row update cannot match its parent", () => {
    db = createV2Database();
    seedV2Core(db);

    expect(() =>
      db
        .prepare(
          `INSERT INTO story_likes (user_id, story_id) VALUES ('member-1', 'missing-story')`,
        )
        .run(),
    ).toThrow(/STORY_LIKE_COUNT_FAILED/u);
    expect(
      db.prepare(`SELECT COUNT(*) AS count FROM story_likes`).get().count,
    ).toBe(0);

    expect(() =>
      db
        .prepare(
          `INSERT INTO messages (id, conversation_id, sender_id, content) VALUES ('orphan-message', 'missing-conversation', 'member-1', 'hello')`,
        )
        .run(),
    ).toThrow(/MESSAGE_SUMMARY_FAILED/u);
    expect(
      db.prepare(`SELECT COUNT(*) AS count FROM messages`).get().count,
    ).toBe(0);
  });

  it("applies CASCADE, SET NULL, and RESTRICT without leaving orphans", () => {
    db = createV2Database();
    const now = seedV2Core(db);
    db.prepare(
      `INSERT INTO tags (id, name, slug) VALUES ('tag-1', '标签', 'tag-1')`,
    ).run();
    db.prepare(
      `INSERT INTO location_tags (location_id, tag_id) VALUES ('location-1', 'tag-1')`,
    ).run();
    db.prepare(
      `INSERT INTO team_tags (team_id, tag_id) VALUES ('team-1', 'tag-1')`,
    ).run();
    db.prepare(
      `INSERT INTO team_members (team_id, user_id) VALUES ('team-1', 'member-1')`,
    ).run();
    db.prepare(
      `INSERT INTO team_join_requests (id, team_id, user_id) VALUES ('request-1', 'team-1', 'member-2')`,
    ).run();
    db.prepare(
      `
      INSERT INTO stories (id, author_id, location_id, title, content)
      VALUES ('story-1', 'member-1', 'location-1', '标题', '正文')
    `,
    ).run();
    db.prepare(
      `INSERT INTO story_tags (story_id, tag_id) VALUES ('story-1', 'tag-1')`,
    ).run();
    db.prepare(
      `INSERT INTO story_likes (user_id, story_id) VALUES ('member-2', 'story-1')`,
    ).run();
    db.prepare(
      `INSERT INTO user_story_favorites (user_id, story_id) VALUES ('member-2', 'story-1')`,
    ).run();
    db.prepare(
      `INSERT INTO user_location_favorites (user_id, location_id) VALUES ('member-2', 'location-1')`,
    ).run();
    db.prepare(
      `
      INSERT INTO conversations (id, team_id, member_user_id, initiated_by_user_id)
      VALUES ('conversation-1', 'team-1', 'member-1', 'member-1')
    `,
    ).run();
    db.prepare(
      `
      INSERT INTO messages (id, conversation_id, sender_id, content, created_at)
      VALUES ('message-1', 'conversation-1', 'member-1', '消息', ?)
    `,
    ).run(now);

    expectConstraint(db, `DELETE FROM users WHERE id = 'leader'`);
    expectConstraint(db, `DELETE FROM locations WHERE id = 'location-1'`);

    db.prepare(`DELETE FROM tags WHERE id = 'tag-1'`).run();
    expect(
      db.prepare(`SELECT COUNT(*) AS count FROM location_tags`).get().count,
    ).toBe(0);
    expect(
      db.prepare(`SELECT COUNT(*) AS count FROM team_tags`).get().count,
    ).toBe(0);
    expect(
      db.prepare(`SELECT COUNT(*) AS count FROM story_tags`).get().count,
    ).toBe(0);

    db.prepare(`DELETE FROM teams WHERE id = 'team-1'`).run();
    expect(
      db.prepare(`SELECT COUNT(*) AS count FROM team_members`).get().count,
    ).toBe(0);
    expect(
      db.prepare(`SELECT COUNT(*) AS count FROM team_join_requests`).get()
        .count,
    ).toBe(0);
    expect(
      db.prepare(`SELECT COUNT(*) AS count FROM conversations`).get().count,
    ).toBe(0);
    expect(
      db.prepare(`SELECT COUNT(*) AS count FROM messages`).get().count,
    ).toBe(0);

    db.prepare(`DELETE FROM locations WHERE id = 'location-1'`).run();
    expect(
      db.prepare(`SELECT location_id FROM stories WHERE id = 'story-1'`).get()
        .location_id,
    ).toBeNull();
    expect(
      db.prepare(`SELECT COUNT(*) AS count FROM user_location_favorites`).get()
        .count,
    ).toBe(0);

    db.prepare(`DELETE FROM stories WHERE id = 'story-1'`).run();
    expect(
      db.prepare(`SELECT COUNT(*) AS count FROM story_likes`).get().count,
    ).toBe(0);
    expect(
      db.prepare(`SELECT COUNT(*) AS count FROM user_story_favorites`).get()
        .count,
    ).toBe(0);
    expect(db.pragma("foreign_key_check")).toEqual([]);
  });

  it("uses the intended indexes for every keyset feed and inbox query", () => {
    db = createV2Database();
    const now = 1_800_000_000_000;
    const plans = {
      location: explainDetails(
        db,
        `SELECT id FROM locations WHERE region_id = ? AND status = ? AND created_at < ? ORDER BY created_at DESC, id DESC LIMIT 20`,
        "region-sz",
        "published",
        now,
      ),
      team: explainDetails(
        db,
        `SELECT id FROM teams WHERE location_id = ? AND activity_type = ? AND recruitment_status = ? AND start_at > ? ORDER BY start_at, id LIMIT 20`,
        "location-1",
        "hiking",
        "open",
        now,
      ),
      storyGlobal: explainDetails(
        db,
        `SELECT id FROM stories WHERE status = ? AND created_at < ? ORDER BY created_at DESC, id DESC LIMIT 20`,
        "published",
        now,
      ),
      storyLocation: explainDetails(
        db,
        `SELECT id FROM stories WHERE location_id = ? AND status = ? AND created_at < ? ORDER BY created_at DESC, id DESC LIMIT 20`,
        "location-1",
        "published",
        now,
      ),
      storyTeam: explainDetails(
        db,
        `SELECT id FROM stories WHERE team_id = ? AND status = ? AND created_at < ? ORDER BY created_at DESC, id DESC LIMIT 20`,
        "team-1",
        "published",
        now,
      ),
      locationFavorites: explainDetails(
        db,
        `SELECT location_id FROM user_location_favorites WHERE user_id = ? AND created_at < ? ORDER BY created_at DESC, location_id DESC LIMIT 20`,
        "member-1",
        now,
      ),
      storyFavorites: explainDetails(
        db,
        `SELECT story_id FROM user_story_favorites WHERE user_id = ? AND created_at < ? ORDER BY created_at DESC, story_id DESC LIMIT 20`,
        "member-1",
        now,
      ),
      conversationInbox: explainDetails(
        db,
        `SELECT id FROM conversations WHERE member_user_id = ? AND last_message_at < ? ORDER BY last_message_at DESC, id DESC LIMIT 20`,
        "member-1",
        now,
      ),
      messages: explainDetails(
        db,
        `SELECT id FROM messages WHERE conversation_id = ? AND created_at < ? ORDER BY created_at DESC, id DESC LIMIT 50`,
        "conversation-1",
        now,
      ),
    };

    expect(plans.location).toContain("locations_region_feed_idx");
    expect(plans.team).toContain("teams_location_activity_feed_idx");
    expect(plans.storyGlobal).toContain("stories_feed_idx");
    expect(plans.storyLocation).toContain("stories_location_feed_idx");
    expect(plans.storyTeam).toContain("stories_team_feed_idx");
    expect(plans.locationFavorites).toContain(
      "user_location_favorites_user_idx",
    );
    expect(plans.storyFavorites).toContain("user_story_favorites_user_idx");
    expect(plans.conversationInbox).toContain("conversations_member_inbox_idx");
    expect(plans.messages).toContain("messages_conversation_cursor_idx");
  });

  it("replays cleanly through isolated Wrangler and Drizzle ledger shapes", () => {
    for (const ledger of ["wrangler", "drizzle"]) {
      db = createV2Database();
      if (ledger === "wrangler") {
        db.exec(
          `CREATE TABLE d1_migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
        );
        db.prepare(
          `INSERT INTO d1_migrations (name) VALUES ('0000_init.sql')`,
        ).run();
        db.exec(baselineSql);
        expect(db.prepare(`SELECT name FROM d1_migrations`).all()).toEqual([
          { name: "0000_init.sql" },
        ]);
      } else {
        db.exec(
          `CREATE TABLE __drizzle_migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, hash TEXT NOT NULL, created_at INTEGER)`,
        );
        db.prepare(
          `INSERT INTO __drizzle_migrations (hash, created_at) VALUES ('0000_init', 1786867200000)`,
        ).run();
        db.exec(baselineSql);
        expect(
          db.prepare(`SELECT hash FROM __drizzle_migrations`).all(),
        ).toEqual([{ hash: "0000_init" }]);
      }
      const businessTables = db
        .prepare(
          `
        SELECT COUNT(*) AS count FROM sqlite_master
        WHERE type = 'table'
          AND name NOT LIKE 'sqlite_%'
          AND name NOT IN ('d1_migrations', '__drizzle_migrations')
      `,
        )
        .get().count;
      expect(businessTables).toBe(19);
      expect(db.pragma("foreign_key_check")).toEqual([]);
      db.close();
      db = undefined;
    }
  });
});
