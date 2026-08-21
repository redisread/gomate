import Database from "better-sqlite3";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const apiRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
export const migrationsDir = join(apiRoot, "db", "migrations");
export const baselinePath = join(migrationsDir, "0000_init.sql");
export const baselineSql = readFileSync(baselinePath, "utf8").replaceAll(
  "--> statement-breakpoint",
  "",
);
export const migrationNames = readdirSync(migrationsDir)
  .filter((name) => /^\d{4}_.+\.sql$/u.test(name))
  .sort();
export const migrationSql = migrationNames.map((name) =>
  readFileSync(join(migrationsDir, name), "utf8").replaceAll(
    "--> statement-breakpoint",
    "",
  ),
);
export const migrationChainSql = migrationSql.join("\n");

export function applyMigrationChain(db) {
  for (const sql of migrationSql) db.transaction(() => db.exec(sql))();
}

export function createV2Database() {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  applyMigrationChain(db);
  return db;
}

export function seedV2Core(db, { maxParticipants = 2 } = {}) {
  const now = 1_800_000_000_000;
  const insertUser = db.prepare(
    "INSERT INTO users (id, name, email) VALUES (?, ?, ?)",
  );

  db.prepare(
    `
    INSERT INTO region (id, country_code, name, slug, code, level)
    VALUES ('region-cn', 'CN', '中国', 'china', 'CN', 'other')
  `,
  ).run();
  db.prepare(
    `
    INSERT INTO region (id, country_code, parent_id, name, slug, code, level)
    VALUES ('region-gd', 'CN', 'region-cn', '广东省', 'guangdong', '440000', 'province')
  `,
  ).run();
  db.prepare(
    `
    INSERT INTO region (
      id, country_code, parent_id, name, slug, code, level, timezone,
      center_latitude, center_longitude, service_enabled, is_hot
    ) VALUES (
      'region-sz', 'CN', 'region-gd', '深圳市', 'shenzhen', '440300', 'city',
      'Asia/Shanghai', 22.5431, 114.0579, 1, 1
    )
  `,
  ).run();

  insertUser.run("leader", "Leader", "leader@example.com");
  insertUser.run("member-1", "Member One", "member-1@example.com");
  insertUser.run("member-2", "Member Two", "member-2@example.com");
  insertUser.run("member-3", "Member Three", "member-3@example.com");

  db.prepare(
    `
    INSERT INTO locations (
      id, region_id, name, slug, supported_activity_types, description,
      latitude, longitude, cover_image_url
    ) VALUES (
      'location-1', 'region-sz', '梧桐山', 'wutongshan', '["hiking","explore"]',
      '测试地点', 22.58, 114.21, 'https://gomate.example/location.jpg'
    )
  `,
  ).run();

  db.prepare(
    `
    INSERT INTO teams (
      id, location_id, leader_id, activity_type, title, start_at, end_at,
      max_participants
    ) VALUES ('team-1', 'location-1', 'leader', 'hiking', '测试队伍', ?, ?, ?)
  `,
  ).run(now + 60_000, now + 120_000, maxParticipants);

  return now;
}

export function explainDetails(db, sql, ...params) {
  return db
    .prepare(`EXPLAIN QUERY PLAN ${sql}`)
    .all(...params)
    .map((row) => String(row.detail))
    .join("\n");
}
