#!/usr/bin/env node
/**
 * Initialize a checkout for the unified Worker development flow.
 *
 * Git worktrees do not copy ignored secrets or local D1 state. This script
 * restores the one Worker secret file, generates i18n data, and idempotently
 * applies the V2 baseline plus seed to the shared local D1 state.
 */

import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = process.cwd();
const FRONTEND_DIR = path.join(ROOT, "frontend");
const WRANGLER = path.join(FRONTEND_DIR, "node_modules", ".bin", "wrangler");
const TSX = path.join(ROOT, "node_modules", ".bin", "tsx");
const DEV_VARS = path.join(FRONTEND_DIR, ".dev.vars");
const LOCAL_STATE = path.resolve(
  process.env.GOMATE_LOCAL_STATE ??
    path.join(os.homedir(), ".gomate", "wrangler-state"),
);

const sourceIndex = process.argv.indexOf("--dev-vars-from");
const devVarsSource =
  (sourceIndex >= 0 ? process.argv[sourceIndex + 1] : undefined) ??
  process.env.GOMATE_DEV_VARS_SOURCE;

function log(message) {
  console.log(`[init:worktree] ${message}`);
}

function run(executable, args, cwd = ROOT) {
  log(`${path.basename(executable)} ${args.join(" ")}`);
  execFileSync(executable, args, { cwd, stdio: "inherit" });
}

let failed = false;
if (existsSync(DEV_VARS)) {
  log("✅ frontend/.dev.vars 已存在");
} else if (devVarsSource && existsSync(devVarsSource)) {
  copyFileSync(devVarsSource, DEV_VARS);
  log(`✅ 已从 ${devVarsSource} 复制 frontend/.dev.vars`);
} else {
  failed = true;
  console.error(
    "[init:worktree] ❌ frontend/.dev.vars 缺失。请复制 " +
      "frontend/.dev.vars.example，或使用 --dev-vars-from <path>。",
  );
}

if (failed) process.exit(1);

try {
  run(TSX, ["scripts/build-locales.ts"]);
  log("✅ i18n locale 数据已生成");

  run(
    WRANGLER,
    [
      "d1",
      "migrations",
      "apply",
      "DB",
      "--local",
      "--persist-to",
      LOCAL_STATE,
      "--config",
      "wrangler.jsonc",
    ],
    FRONTEND_DIR,
  );
  run(
    WRANGLER,
    [
      "d1",
      "execute",
      "DB",
      "--local",
      "--persist-to",
      LOCAL_STATE,
      "--config",
      "wrangler.jsonc",
      "--file",
      "../api/db/seed.sql",
    ],
    FRONTEND_DIR,
  );
  log(`✅ V2 D1 已就绪：${LOCAL_STATE}`);
} catch (error) {
  failed = true;
  console.error(`[init:worktree] ❌ 初始化失败：${error.message}`);
}

if (failed) process.exit(1);

console.log("\n[init:worktree] 环境就绪，可运行 pnpm dev:wt 或 pnpm dev。");
