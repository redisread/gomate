#!/usr/bin/env node
/**
 * check-migrations-sync.mjs
 *
 * D1 迁移规约规则 3 的 CI 门禁：
 *   - db/migrations/*.sql 文件集与 meta/_journal.json entries 必须一一对应（双向）
 *   - journal idx 必须连续（0..n-1）且无重复
 *
 * 背景：#202/#451 两次手工补录事故（journal 与文件漂移）导致流水线重放迁移即炸。
 *
 * 用法：node scripts/check-migrations-sync.mjs   （在 api/ 包根目录下运行）
 * 退出码：0 = 一致；1 = 漂移（stderr 输出差异明细）
 */

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

const apiRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const migrationsDir = join(apiRoot, "db", "migrations");
const journalPath = join(migrationsDir, "meta", "_journal.json");

const errors = [];

// 1. 读取 journal entries
let journal;
try {
  journal = JSON.parse(readFileSync(journalPath, "utf8"));
} catch (err) {
  console.error(`✗ 无法读取 ${journalPath}: ${err.message}`);
  process.exit(1);
}
const entries = journal.entries ?? [];
const journalTags = entries.map((e) => e.tag);

// 2. 读取 .sql 文件集
const sqlTags = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .map((f) => f.replace(/\.sql$/, ""));

// 3. 双向比对：journal 有 entry 但缺 .sql 文件
for (const tag of journalTags) {
  if (!sqlTags.includes(tag)) {
    errors.push(`journal entry "${tag}" 没有对应的 .sql 迁移文件`);
  }
}

// 4. 双向比对：.sql 有文件但 journal 缺 entry
for (const tag of sqlTags) {
  if (!journalTags.includes(tag)) {
    errors.push(`迁移文件 "${tag}.sql" 未登记到 meta/_journal.json（疑似手工补录遗漏）`);
  }
}

// 5. journal idx 连续且无重复
const idxes = entries.map((e) => e.idx).sort((a, b) => a - b);
for (let i = 0; i < idxes.length; i++) {
  if (idxes[i] !== i) {
    errors.push(`journal idx 不连续或重复：期望位置 ${i} 实际 idx=${idxes[i]}`);
    break;
  }
}

// 6. schema.ts ↔ migration 一致性（规则 3 扩展，2026-07-29）
// 背景：0017 在 D1 建了 apikey 表但 schema.ts 无定义，adapter 运行时 500。
// drizzle-kit check 只抓「schema 超前 migration」，抓不到反向，故自研：
// 按迁移文件顺序依次应用 CREATE/DROP/RENAME 事件算出 live 表集合，
// 校验每张 live 表在 schema.ts 均有 sqliteTable 定义。
const schemaPath = join(apiRoot, "src", "db", "schema.ts");
const schemaSrc = readFileSync(schemaPath, "utf8");
const schemaTables = new Set(
  [...schemaSrc.matchAll(/sqliteTable\(\s*["'`]([^"'`]+)["'`]/gs)].map((m) => m[1])
);

const SYSTEM_TABLES = new Set(["d1_migrations", "sqlite_sequence"]);
const live = new Set();
const EVENT_RE = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["'`]?([\w]+)["'`]?|DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?["'`]?([\w]+)["'`]?|ALTER\s+TABLE\s+["'`]?([\w]+)["'`]?\s+RENAME\s+TO\s+["'`]?([\w]+)["'`]?/gis;
for (const f of readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort()) {
  const sql = readFileSync(join(migrationsDir, f), "utf8");
  for (const m of sql.matchAll(EVENT_RE)) {
    if (m[1]) live.add(m[1]);                       // CREATE TABLE
    else if (m[2]) live.delete(m[2]);               // DROP TABLE
    else { live.delete(m[3]); live.add(m[4]); }     // RENAME old -> new
  }
}
const liveTables = [...live].filter((t) => !SYSTEM_TABLES.has(t));

for (const t of liveTables) {
  if (!schemaTables.has(t)) {
    errors.push(`迁移创建的表 "${t}" 在 api/src/db/schema.ts 中无 sqliteTable 定义（schema 落后于 migration，运行时 adapter 会 500）`);
  }
}

// 7. 在内存 SQLite 中完整重放 migration，核对 schema.ts 声明的外键与索引。
// 仅比较表名无法发现「重建表时漏写 FOREIGN KEY」或「手工 migration 索引未回写 schema」；
// 这两类漂移都会让 Drizzle 类型与生产 D1 的真实约束不一致。
const sqlite = new Database(":memory:");
sqlite.pragma("foreign_keys = ON");

try {
  for (const f of readdirSync(migrationsDir).filter((name) => name.endsWith(".sql")).sort()) {
    const migrationSql = readFileSync(join(migrationsDir, f), "utf8")
      .replaceAll("--> statement-breakpoint", "");
    sqlite.exec(migrationSql);
  }
} catch (err) {
  errors.push(`migration 无法从空库完整重放：${err.message}`);
}

const tableDefinitions = [...schemaSrc.matchAll(
  /export const (\w+) = sqliteTable\(\s*["'`]([^"'`]+)["'`]([\s\S]*?)(?=export const \w+ = sqliteTable\(|$)/g,
)];
const variableToTable = new Map(tableDefinitions.map((match) => [match[1], match[2]]));
const propertyToColumn = new Map();

for (const match of tableDefinitions) {
  const [, variableName, , definition] = match;
  const fields = new Map(
    [...definition.matchAll(/(\w+):\s*(?:text|integer|real)\(["'`]([^"'`]+)["'`]/g)]
      .map((field) => [field[1], field[2]]),
  );
  propertyToColumn.set(variableName, fields);
}

for (const match of tableDefinitions) {
  const [, , tableName, definition] = match;
  const expectedForeignKeys = [...definition.matchAll(
    /(\w+):\s*(?:text|integer|real)\(["'`]([^"'`]+)["'`][^\n]*?\.references\(\(\) => (\w+)\.(\w+)(?:,\s*\{\s*onDelete:\s*["'`]([^"'`]+)["'`]\s*\})?/g,
  )].map((foreignKey) => ({
    from: foreignKey[2],
    table: variableToTable.get(foreignKey[3]),
    to: propertyToColumn.get(foreignKey[3])?.get(foreignKey[4]),
    onDelete: (foreignKey[5] ?? "no action").toUpperCase(),
  }));
  const actualForeignKeys = sqlite.prepare(`PRAGMA foreign_key_list('${tableName}')`).all();

  for (const expected of expectedForeignKeys) {
    const exists = actualForeignKeys.some((actual) =>
      actual.from === expected.from &&
      actual.table === expected.table &&
      actual.to === expected.to &&
      String(actual.on_delete).toUpperCase() === expected.onDelete
    );
    if (!exists) {
      errors.push(
        `表 "${tableName}" 缺少 schema.ts 声明的外键：${expected.from} -> ${expected.table}.${expected.to} ON DELETE ${expected.onDelete}`,
      );
    }
  }
}

const declaredIndexes = new Set(
  [...schemaSrc.matchAll(/(?:uniqueIndex|index)\(["'`]([^"'`]+)["'`]\)/g)].map((match) => match[1]),
);
const implicitUniqueIndexes = new Set();
for (const match of tableDefinitions) {
  const [, , tableName, definition] = match;
  for (const field of definition.matchAll(/\w+:\s*(?:text|integer|real)\(["'`]([^"'`]+)["'`][^\n]*?\.unique\(\)/g)) {
    implicitUniqueIndexes.add(`${tableName}_${field[1]}_unique`);
  }
}

const actualIndexes = sqlite.prepare(
  "SELECT name, tbl_name FROM sqlite_master WHERE type = 'index' AND sql IS NOT NULL",
).all();
for (const indexRow of actualIndexes) {
  if (!declaredIndexes.has(indexRow.name) && !implicitUniqueIndexes.has(indexRow.name)) {
    errors.push(`数据库索引 "${indexRow.name}" 未声明在 schema.ts 中`);
  }
}

for (const tableName of liveTables) {
  const indexRows = sqlite.prepare(`PRAGMA index_list('${tableName}')`).all();
  const columnsToIndexes = new Map();
  for (const indexRow of indexRows) {
    if (indexRow.origin === "pk") continue;
    const columns = sqlite.prepare(`PRAGMA index_info('${indexRow.name}')`).all()
      .map((column) => column.name)
      .join(",");
    const names = columnsToIndexes.get(columns) ?? [];
    names.push(indexRow.name);
    columnsToIndexes.set(columns, names);
  }
  for (const [columns, names] of columnsToIndexes) {
    if (names.length > 1) {
      errors.push(`表 "${tableName}" 的列 (${columns}) 存在重复索引：${names.sort().join(", ")}`);
    }
  }
}

sqlite.close();

if (errors.length > 0) {
  console.error("✗ 迁移一致性校验失败：");
  for (const e of errors) console.error(`  - ${e}`);
  console.error("\n修复：补齐缺失的 .sql / journal entry / schema.ts 表定义（参见 docs/prod-change-policy.md）");
  process.exit(1);
}

console.log(`✓ 迁移同步校验通过：${sqlTags.length} 个 .sql 文件 ↔ ${journalTags.length} 条 journal entry；${liveTables.length} 张 live 表在 schema.ts 均有定义`);
