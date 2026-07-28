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

if (errors.length > 0) {
  console.error("✗ 迁移文件与 journal 不一致：");
  for (const e of errors) console.error(`  - ${e}`);
  console.error("\n修复：补齐缺失的 .sql 或 journal entry（参见 docs/d1-migrations.md 规则 4 急救 SOP）");
  process.exit(1);
}

console.log(`✓ 迁移同步校验通过：${sqlTags.length} 个 .sql 文件 ↔ ${journalTags.length} 条 journal entry`);
