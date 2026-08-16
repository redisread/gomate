#!/usr/bin/env node
/** Reset only the unified Worker's DB binding and apply the V2 seed. */

import { execFileSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FRONTEND_DIR = path.join(ROOT, "frontend");
const WRANGLER = path.join(FRONTEND_DIR, "node_modules", ".bin", "wrangler");
const DEFAULT_STATE = path.join(os.homedir(), ".gomate", "wrangler-state");
const LOCAL_STATE = path.resolve(process.env.GOMATE_LOCAL_STATE ?? DEFAULT_STATE);
function log(message) {
  console.log(`[db:reset] ${message}`);
}

function run(args) {
  log(`wrangler ${args.join(" ")}`);
  execFileSync(WRANGLER, args, { cwd: FRONTEND_DIR, stdio: "inherit" });
}

function query(command) {
  const output = execFileSync(
    WRANGLER,
    ["d1", "execute", ...sharedArgs, "--json", "--command", command],
    { cwd: FRONTEND_DIR, encoding: "utf8" },
  );
  return JSON.parse(output).flatMap((result) => result.results ?? []);
}

function childFirstTableOrder(tableNames, foreignKeys) {
  const tableSet = new Set(tableNames);
  const childrenByParent = new Map(tableNames.map((name) => [name, []]));
  for (const { child, parent } of foreignKeys) {
    if (
      child !== parent &&
      tableSet.has(child) &&
      tableSet.has(parent)
    ) {
      childrenByParent.get(parent).push(child);
    }
  }

  const state = new Map();
  const ordered = [];
  const visit = (table) => {
    if (state.get(table) === "done") return;
    if (state.get(table) === "visiting") {
      throw new Error(`D1 表外键存在循环，无法安全重置：${table}`);
    }
    state.set(table, "visiting");
    for (const child of childrenByParent.get(table)) visit(child);
    state.set(table, "done");
    ordered.push(table);
  };
  for (const table of tableNames) visit(table);
  return ordered;
}

function foreignKeysFromSchema(tableRows) {
  const referencePattern =
    /\bREFERENCES\s+(?:"([^"]+)"|`([^`]+)`|\[([^\]]+)\]|([A-Za-z_][\w$]*))/giu;
  return tableRows.flatMap(({ name: child, sql }) =>
    [...String(sql ?? "").matchAll(referencePattern)].map((match) => ({
      child,
      parent: match[1] ?? match[2] ?? match[3] ?? match[4],
    })),
  );
}

const sharedArgs = [
  "DB",
  "--local",
  "--persist-to",
  LOCAL_STATE,
  "--config",
  "wrangler.jsonc",
];

const tableRows = query(
  "SELECT name, sql FROM sqlite_schema WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' ORDER BY name;",
);
const tableNames = tableRows.map((row) => row.name);
const foreignKeys = foreignKeysFromSchema(tableRows);
const dropOrder = childFirstTableOrder(tableNames, foreignKeys);
const dropSql = [
  "PRAGMA defer_foreign_keys = ON;",
  ...dropOrder.map(
    (name) => `DROP TABLE IF EXISTS "${String(name).replaceAll('"', '""')}";`,
  ),
].join(" ");

run([
  "d1",
  "execute",
  ...sharedArgs,
  "--command",
  dropSql,
]);
log(`已通过 DB binding 删除 ${dropOrder.length} 个用户表与 migration ledger`);

run([
  "d1",
  "migrations",
  "apply",
  ...sharedArgs,
]);
run([
  "d1",
  "execute",
  ...sharedArgs,
  "--file",
  "../api/db/seed.sql",
]);

log("✅ 本地 V2 数据库已重置；运行 pnpm dev 启动统一 Worker。");
