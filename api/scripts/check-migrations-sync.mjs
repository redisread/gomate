#!/usr/bin/env node

import Database from "better-sqlite3";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { compareSchemaToBaseline } from "./database-schema-parity.mjs";
import {
  apiRoot,
  applyMigrationChain,
  migrationChainSql,
  migrationNames,
  migrationsDir,
} from "./database-v2-test-helpers.mjs";

const metaDir = join(migrationsDir, "meta");
const expectedTables = [
  "accounts",
  "conversations",
  "location_tags",
  "locations",
  "messages",
  "region",
  "sessions",
  "stories",
  "story_likes",
  "story_tags",
  "tags",
  "team_join_requests",
  "team_members",
  "team_tags",
  "teams",
  "user_location_favorites",
  "user_story_favorites",
  "users",
  "verifications",
].sort();
const expectedTriggers = [
  "messages_summary_after_insert",
  "sessions_active_user_insert_guard",
  "story_likes_count_after_delete",
  "story_likes_count_after_insert",
  "team_members_capacity_validate_insert",
  "team_members_capacity_validate_reactivate",
  "team_members_leader_validate_insert",
  "team_members_leader_validate_reactivate",
  "teams_capacity_validate_update",
  "teams_leader_validate_update",
  "users_auth_revoke_after_inactive",
  "users_deleted_state_validate_insert",
  "users_deleted_state_validate_update",
].sort();
const errors = [];

function reportError(message) {
  errors.push(message);
}

if (migrationNames[0] !== "0000_init.sql") {
  reportError("migration chain 必须从不可变的 0000_init.sql 开始");
}
for (const [idx, name] of migrationNames.entries()) {
  const expectedPrefix = String(idx).padStart(4, "0");
  if (!name.startsWith(`${expectedPrefix}_`)) {
    reportError(`migration ${name} 的序号必须为 ${expectedPrefix}`);
  }
}

const snapshotFiles = readdirSync(metaDir)
  .filter((name) => name.endsWith("_snapshot.json"))
  .sort();

try {
  const journal = JSON.parse(
    readFileSync(join(metaDir, "_journal.json"), "utf8"),
  );
  if (journal.dialect !== "sqlite")
    reportError("journal dialect 必须为 sqlite");
  const entries = journal.entries ?? [];
  if (entries.length !== migrationNames.length) {
    reportError(
      `journal entry 数必须与 ${migrationNames.length} 个 migration 一致`,
    );
  }
  for (const [idx, name] of migrationNames.entries()) {
    const entry = entries[idx];
    const tag = name.replace(/\.sql$/u, "");
    if (
      entry?.idx !== idx ||
      entry?.tag !== tag ||
      entry?.breakpoints !== true
    ) {
      reportError(`journal entry ${idx} 必须对应 ${tag}`);
    }
  }

  const expectedSnapshots = entries.map(
    ({ idx }) => `${String(idx).padStart(4, "0")}_snapshot.json`,
  );
  if (JSON.stringify(snapshotFiles) !== JSON.stringify(expectedSnapshots)) {
    reportError(`snapshot 顺序不正确：${snapshotFiles.join(", ") || "none"}`);
  }

  let previousId = "00000000-0000-0000-0000-000000000000";
  for (const name of expectedSnapshots) {
    const snapshot = JSON.parse(readFileSync(join(metaDir, name), "utf8"));
    if (snapshot.prevId !== previousId) {
      reportError(`${name} 的 prevId 未连接前一个 snapshot`);
    }
    previousId = snapshot.id;
  }
  const latest = JSON.parse(
    readFileSync(join(metaDir, expectedSnapshots.at(-1)), "utf8"),
  );
  const snapshotTables = Object.keys(latest.tables ?? {}).sort();
  if (JSON.stringify(snapshotTables) !== JSON.stringify(expectedTables)) {
    reportError(
      `最终 snapshot 表集合不是 19 张业务表：${snapshotTables.join(", ")}`,
    );
  }
  if (latest.tables?.team_members?.columns?.role) {
    reportError("最终 snapshot 仍包含 team_members.role");
  }
} catch (error) {
  reportError(`无法校验 journal/snapshot：${error.message}`);
}

const schemaSource = readFileSync(
  join(apiRoot, "src", "db", "schema.ts"),
  "utf8",
);
for (const mismatch of compareSchemaToBaseline(migrationChainSql)) {
  reportError(`Drizzle/migration chain 语义漂移：${mismatch}`);
}
const schemaTables = [
  ...schemaSource.matchAll(/sqliteTable\(\s*["'`]([^"'`]+)["'`]/gs),
]
  .map((match) => match[1])
  .sort();
if (JSON.stringify(schemaTables) !== JSON.stringify(expectedTables)) {
  reportError(`schema.ts 表集合不是 19 张业务表：${schemaTables.join(", ")}`);
}

for (const table of [
  "apikey",
  "cities",
  "entity_to_tags",
  "user_favorites",
  "password_resets",
  "activity_posts",
  "image_caches",
  "share_events",
]) {
  if (
    new RegExp(`sqliteTable\\(\\s*["'\`]${table}["'\`]`, "u").test(schemaSource)
  ) {
    reportError(`schema.ts 仍声明已删除旧表 ${table}`);
  }
}

const db = new Database(":memory:");
db.pragma("foreign_keys = ON");
try {
  applyMigrationChain(db);
  const actualTables = db
    .prepare(
      `
    SELECT name FROM sqlite_master
    WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `,
    )
    .all()
    .map((row) => row.name);
  if (JSON.stringify(actualTables) !== JSON.stringify(expectedTables)) {
    reportError(`最终表集合不正确：${actualTables.join(", ")}`);
  }

  const actualTriggers = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type = 'trigger' ORDER BY name",
    )
    .all()
    .map((row) => row.name);
  if (JSON.stringify(actualTriggers) !== JSON.stringify(expectedTriggers)) {
    reportError(`最终 trigger 集合不正确：${actualTriggers.join(", ")}`);
  }

  const declaredIndexes = [
    ...schemaSource.matchAll(/(?:uniqueIndex|index)\(["'`]([^"'`]+)["'`]\)/g),
  ]
    .map((match) => match[1])
    .sort();
  const actualIndexes = db
    .prepare(
      `
    SELECT name FROM sqlite_master
    WHERE type = 'index' AND sql IS NOT NULL
    ORDER BY name
  `,
    )
    .all()
    .map((row) => row.name);
  if (JSON.stringify(actualIndexes) !== JSON.stringify(declaredIndexes)) {
    reportError(
      `schema.ts 与最终索引不一致\nschema=${declaredIndexes.join(", ")}\ndatabase=${actualIndexes.join(", ")}`,
    );
  }

  if (db.pragma("foreign_key_check").length > 0) {
    reportError("migration chain foreign_key_check 失败");
  }

  const seed = readFileSync(join(apiRoot, "db", "seed.sql"), "utf8");
  db.exec(seed);
  db.exec(seed);
  const seedCounts = {
    region: db.prepare("SELECT COUNT(*) AS count FROM region").get().count,
    locations: db.prepare("SELECT COUNT(*) AS count FROM locations").get()
      .count,
    tags: db.prepare("SELECT COUNT(*) AS count FROM tags").get().count,
  };
  if (
    seedCounts.region !== 3 ||
    seedCounts.locations !== 1 ||
    seedCounts.tags < 3
  ) {
    reportError(`最小 seed 不完整或不可幂等：${JSON.stringify(seedCounts)}`);
  }
} catch (error) {
  reportError(`migration chain 无法从空库重放：${error.message}`);
} finally {
  db.close();
}

if (errors.length > 0) {
  for (const error of errors) console.error(`✗ ${error}`);
  process.exit(1);
}

console.log(
  `✓ V2 migration chain 同步：${migrationNames.length} migrations, ${snapshotFiles.length} snapshots, ${expectedTables.length} tables, ${expectedTriggers.length} triggers`,
);
