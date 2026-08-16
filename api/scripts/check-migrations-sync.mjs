#!/usr/bin/env node

import Database from "better-sqlite3";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { compareSchemaToBaseline } from "./database-schema-parity.mjs";

const apiRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const migrationsDir = join(apiRoot, "db", "migrations");
const metaDir = join(migrationsDir, "meta");
const baselineName = "0000_init.sql";
const snapshotName = "0000_snapshot.json";
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
  "teams_capacity_validate_update",
  "users_auth_revoke_after_inactive",
].sort();
const errors = [];

function reportError(message) {
  errors.push(message);
}

const sqlFiles = readdirSync(migrationsDir)
  .filter((name) => name.endsWith(".sql"))
  .sort();
if (JSON.stringify(sqlFiles) !== JSON.stringify([baselineName])) {
  reportError(
    `migration 必须只保留 ${baselineName}，实际为 ${sqlFiles.join(", ") || "none"}`,
  );
}

const snapshotFiles = readdirSync(metaDir)
  .filter((name) => name.endsWith("_snapshot.json"))
  .sort();
if (JSON.stringify(snapshotFiles) !== JSON.stringify([snapshotName])) {
  reportError(
    `snapshot 必须只保留 ${snapshotName}，实际为 ${snapshotFiles.join(", ") || "none"}`,
  );
}

let journal;
try {
  journal = JSON.parse(readFileSync(join(metaDir, "_journal.json"), "utf8"));
  if (journal.dialect !== "sqlite")
    reportError(`journal dialect 必须为 sqlite`);
  if (journal.entries?.length !== 1) {
    reportError(`journal 必须只有一个 entry`);
  } else {
    const entry = journal.entries[0];
    if (entry.idx !== 0 || entry.tag !== "0000_init") {
      reportError(`journal 唯一 entry 必须为 idx=0/tag=0000_init`);
    }
  }
} catch (error) {
  reportError(`无法读取 journal: ${error.message}`);
}

let snapshot;
try {
  snapshot = JSON.parse(readFileSync(join(metaDir, snapshotName), "utf8"));
  const snapshotTables = Object.keys(snapshot.tables ?? {}).sort();
  if (JSON.stringify(snapshotTables) !== JSON.stringify(expectedTables)) {
    reportError(
      `snapshot 表集合不是 V2 的 19 张表：${snapshotTables.join(", ")}`,
    );
  }
} catch (error) {
  reportError(`无法读取 snapshot: ${error.message}`);
}

const schemaSource = readFileSync(
  join(apiRoot, "src", "db", "schema.ts"),
  "utf8",
);
const baselineSource = readFileSync(join(migrationsDir, baselineName), "utf8");
for (const mismatch of compareSchemaToBaseline(baselineSource)) {
  reportError(`Drizzle/baseline 语义漂移：${mismatch}`);
}
const schemaTables = [
  ...schemaSource.matchAll(/sqliteTable\(\s*["'`]([^"'`]+)["'`]/gs),
]
  .map((match) => match[1])
  .sort();
if (JSON.stringify(schemaTables) !== JSON.stringify(expectedTables)) {
  reportError(`schema.ts 表集合不是 V2 的 19 张表：${schemaTables.join(", ")}`);
}

const forbiddenLegacyTables = [
  "apikey",
  "cities",
  "entity_to_tags",
  "user_favorites",
  "password_resets",
  "activity_posts",
  "image_caches",
  "share_events",
];
for (const table of forbiddenLegacyTables) {
  if (
    new RegExp(`sqliteTable\\(\\s*["'\`]${table}["'\`]`, "u").test(schemaSource)
  ) {
    reportError(`schema.ts 仍声明已删除旧表 ${table}`);
  }
}

const db = new Database(":memory:");
db.pragma("foreign_keys = ON");
try {
  const baseline = baselineSource.replaceAll("--> statement-breakpoint", "");
  db.exec(baseline);
  db.exec(baseline);

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
    reportError(
      `baseline 表集合不是 V2 的 19 张表：${actualTables.join(", ")}`,
    );
  }

  const actualTriggers = db
    .prepare(
      `
    SELECT name FROM sqlite_master WHERE type = 'trigger' ORDER BY name
  `,
    )
    .all()
    .map((row) => row.name);
  if (JSON.stringify(actualTriggers) !== JSON.stringify(expectedTriggers)) {
    reportError(
      `baseline trigger 集合不等于约定的 8 个：${actualTriggers.join(", ")}`,
    );
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
      `schema.ts 与 baseline 索引名不一致\nschema=${declaredIndexes.join(", ")}\nbaseline=${actualIndexes.join(", ")}`,
    );
  }

  const foreignKeyProblems = db.pragma("foreign_key_check");
  if (foreignKeyProblems.length > 0) {
    reportError(
      `baseline foreign_key_check 失败：${JSON.stringify(foreignKeyProblems)}`,
    );
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
  if (db.pragma("foreign_key_check").length > 0) {
    reportError(`seed 后 foreign_key_check 失败`);
  }
} catch (error) {
  reportError(`baseline 无法从空库幂等重放：${error.message}`);
} finally {
  db.close();
}

if (errors.length > 0) {
  for (const error of errors) console.error(`✗ ${error}`);
  process.exit(1);
}

console.log(
  `✓ V2 migration 同步：1 baseline, 1 journal entry, 1 snapshot, ${expectedTables.length} tables, ${expectedTriggers.length} triggers`,
);
