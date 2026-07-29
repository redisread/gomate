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

if (errors.length > 0) {
  console.error("✗ 迁移一致性校验失败：");
  for (const e of errors) console.error(`  - ${e}`);
  console.error("\n修复：补齐缺失的 .sql / journal entry / schema.ts 表定义（参见 docs/prod-change-policy.md）");
  process.exit(1);
}

console.log(`✓ 迁移同步校验通过：${sqlTags.length} 个 .sql 文件 ↔ ${journalTags.length} 条 journal entry；${liveTables.length} 张 live 表在 schema.ts 均有定义`);
