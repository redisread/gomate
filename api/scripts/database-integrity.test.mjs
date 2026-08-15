import { afterEach, beforeEach, describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const apiRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const migrationsDir = join(apiRoot, "db", "migrations");

function applyMigrations(db, files) {
  for (const file of files) {
    db.exec(readFileSync(join(migrationsDir, file), "utf8").replaceAll("--> statement-breakpoint", ""));
  }
}

function createMigratedDatabase(files = readdirSync(migrationsDir).filter((name) => name.endsWith(".sql")).sort()) {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  applyMigrations(db, files);
  return db;
}

function seedCore(db) {
  const now = Date.now();
  db.prepare(`
    INSERT INTO cities (id, adcode, name, is_hot, created_at, updated_at)
    VALUES ('city-1', '440300', '深圳', 1, ?, ?)
  `).run(now, now);
  db.prepare(`
    INSERT INTO users (id, name, email, email_verified, level, role, status, created_at, updated_at)
    VALUES (?, ?, ?, 0, 'beginner', 'user', 'active', ?, ?)
  `).run("leader", "Leader", "leader@example.com", now, now);
  db.prepare(`
    INSERT INTO users (id, name, email, email_verified, level, role, status, created_at, updated_at)
    VALUES (?, ?, ?, 0, 'beginner', 'user', 'active', ?, ?)
  `).run("member", "Member", "member@example.com", now, now);
  db.prepare(`
    INSERT INTO users (id, name, email, email_verified, level, role, status, created_at, updated_at)
    VALUES (?, ?, ?, 0, 'beginner', 'user', 'active', ?, ?)
  `).run("waiting", "Waiting", "waiting@example.com", now, now);
  db.prepare(`
    INSERT INTO locations (
      id, name, slug, description, city_id, city_name, best_season,
      cover_image, images, coordinates, created_at, updated_at
    ) VALUES ('location-1', '南山', 'nanshan', 'test', 'city-1', '错误名', '[]', 'cover', '[]', '{}', ?, ?)
  `).run(now, now);
  return now;
}

function seedTeam(db, now, maxMembers = 2) {
  db.prepare(`
    INSERT INTO teams (
      id, location_id, leader_id, title, start_time, end_time,
      duration_min, max_members, icon, status, created_at, updated_at
    ) VALUES ('team-1', 'location-1', 'leader', '测试队伍', ?, ?, 60, ?, '⛰️', 'recruiting', ?, ?)
  `).run(now + 60_000, now + 120_000, maxMembers, now, now);
}

describe("replayed migration database integrity", () => {
  let db;

  beforeEach(() => {
    db = createMigratedDatabase();
  });

  afterEach(() => {
    db.close();
  });

  it("restores teams foreign keys and uses restrictive parent deletion", () => {
    const now = seedCore(db);
    seedTeam(db, now);

    const foreignKeys = db.prepare("PRAGMA foreign_key_list('teams')").all();
    expect(foreignKeys).toEqual(expect.arrayContaining([
      expect.objectContaining({ from: "location_id", table: "locations", on_delete: "RESTRICT" }),
      expect.objectContaining({ from: "leader_id", table: "users", on_delete: "RESTRICT" }),
    ]));
    expect(() => db.prepare("DELETE FROM locations WHERE id = 'location-1'").run())
      .toThrow(/FOREIGN KEY constraint failed/u);
  });

  it("keeps city references and denormalized city names canonical", () => {
    seedCore(db);

    expect(db.prepare("SELECT city_name FROM locations WHERE id = 'location-1'").get().city_name)
      .toBe("深圳");
    db.prepare("UPDATE cities SET name = '深圳市' WHERE id = 'city-1'").run();
    expect(db.prepare("SELECT city_name FROM locations WHERE id = 'location-1'").get().city_name)
      .toBe("深圳市");

    expect(() => db.prepare("UPDATE users SET city = 'missing-city' WHERE id = 'member'").run())
      .toThrow(/users\.city must reference cities\.id/u);
  });

  it("normalizes legacy city names and removes pre-existing polymorphic orphans", () => {
    db.close();
    const allFiles = readdirSync(migrationsDir).filter((name) => name.endsWith(".sql")).sort();
    const integrityFile = allFiles.at(-1);
    expect(integrityFile).toBe("0019_database_integrity.sql");
    db = createMigratedDatabase(allFiles.slice(0, -1));
    const now = Date.now();
    db.prepare(`
      INSERT INTO cities (id, adcode, name, is_hot, created_at, updated_at)
      VALUES ('city-legacy', '440300', '深圳', 1, ?, ?)
    `).run(now, now);
    db.prepare(`
      INSERT INTO users (id, name, email, email_verified, level, role, status, city, created_at, updated_at)
      VALUES ('legacy-user', 'Legacy', 'legacy@example.com', 0, 'beginner', 'user', 'active', '深圳', ?, ?)
    `).run(now, now);
    db.prepare("INSERT INTO tags (id, name, type, created_at) VALUES ('tag-1', '徒步', 'activity', ?)")
      .run(now);
    db.prepare(`
      INSERT INTO entity_to_tags (id, entity_id, entity_type, tag_id, created_at)
      VALUES ('relation-1', 'missing-story', 'story', 'tag-1', ?)
    `).run(now);
    db.prepare(`
      INSERT INTO user_favorites (id, user_id, entity_type, entity_id, created_at)
      VALUES ('favorite-1', 'legacy-user', 'story', 'missing-story', ?)
    `).run(now);

    applyMigrations(db, [integrityFile]);

    expect(db.prepare("SELECT city FROM users WHERE id = 'legacy-user'").get().city).toBe("city-legacy");
    expect(db.prepare("SELECT COUNT(*) AS count FROM entity_to_tags").get().count).toBe(0);
    expect(db.prepare("SELECT COUNT(*) AS count FROM user_favorites").get().count).toBe(0);
  });

  it("derives story like_count from unique like rows", () => {
    const now = seedCore(db);
    db.prepare(`
      INSERT INTO stories (
        id, author_id, title, summary, content, status, view_count, like_count, created_at, updated_at
      ) VALUES ('story-1', 'leader', '标题', '摘要', '内容', 'published', 0, 0, ?, ?)
    `).run(now, now);

    db.prepare("INSERT INTO user_story_likes (user_id, story_id) VALUES ('member', 'story-1')").run();
    expect(db.prepare("SELECT like_count FROM stories WHERE id = 'story-1'").get().like_count).toBe(1);
    db.prepare("DELETE FROM user_story_likes WHERE user_id = 'member' AND story_id = 'story-1'").run();
    expect(db.prepare("SELECT like_count FROM stories WHERE id = 'story-1'").get().like_count).toBe(0);
  });

  it("enforces member capacity and synchronizes recruiting/full status", () => {
    const now = seedCore(db);
    seedTeam(db, now, 2);
    const insertMember = db.prepare(`
      INSERT INTO team_members (id, team_id, user_id, status, joined_at, created_at)
      VALUES (?, 'team-1', ?, ?, ?, ?)
    `);
    insertMember.run("membership-leader", "leader", "approved", now, now);
    insertMember.run("membership-member", "member", "approved", now, now);
    insertMember.run("membership-waiting", "waiting", "pending", null, now);

    expect(db.prepare("SELECT status FROM teams WHERE id = 'team-1'").get().status).toBe("full");
    expect(() => db.prepare("UPDATE team_members SET status = 'approved' WHERE id = 'membership-waiting'").run())
      .toThrow(/team capacity exceeded/u);
    expect(() => db.prepare("UPDATE teams SET max_members = 1 WHERE id = 'team-1'").run())
      .toThrow(/max_members cannot be below current members/u);

    db.prepare("DELETE FROM team_members WHERE id = 'membership-member'").run();
    expect(db.prepare("SELECT status FROM teams WHERE id = 'team-1'").get().status).toBe("recruiting");
  });

  it("updates conversation summaries in the same database write as messages", () => {
    const now = seedCore(db);
    seedTeam(db, now);
    db.prepare(`
      INSERT INTO conversations (id, team_id, user_id, leader_id, initiator_id, created_at, updated_at)
      VALUES ('conversation-1', 'team-1', 'member', 'leader', 'member', ?, ?)
    `).run(now, now);
    db.prepare(`
      INSERT INTO messages (id, conversation_id, sender_id, content, is_read, created_at)
      VALUES ('message-1', 'conversation-1', 'member', '第一条消息', 0, ?)
    `).run(now + 1);

    expect(db.prepare(`
      SELECT last_message_content, last_message_at FROM conversations WHERE id = 'conversation-1'
    `).get()).toMatchObject({
      last_message_content: "第一条消息",
      last_message_at: now + 1,
    });
  });
});
