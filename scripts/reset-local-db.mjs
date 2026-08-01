#!/usr/bin/env node

/**
 * 重置本地 D1 数据库并重新 seed 测试数据
 *
 * 用法：
 *   pnpm db:reset
 *
 * 功能：
 * 1. 删除本地 wrangler D1 模拟数据库文件
 * 2. 应用 migrations
 * 3. 运行 seed-mobile-test.ts 填充测试数据
 */

import { execSync } from "node:child_process";
import { existsSync, rmSync, readdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = process.cwd();
// 多 worktree 共享同一份本地 D1 状态（GOMATE_LOCAL_STATE，默认 ~/.gomate/wrangler-state）
const LOCAL_STATE = path.resolve(
  process.env.GOMATE_LOCAL_STATE ||
    path.join(os.homedir(), ".gomate", "wrangler-state"),
);
const D1_STATE_DIR = path.join(LOCAL_STATE, "v3", "d1", "miniflare-D1DatabaseObject");

function log(message) {
  console.log(`[db:reset] ${message}`);
}

function run(command, options = {}) {
  log(`Running: ${command}`);
  execSync(command, {
    stdio: "inherit",
    cwd: ROOT,
    ...options,
  });
}

async function main() {
  log("Starting local D1 database reset...");

  // 1. 删除本地 D1 状态文件
  if (existsSync(D1_STATE_DIR)) {
    const files = readdirSync(D1_STATE_DIR).filter((f) => f.endsWith(".sqlite"));
    log(`Found ${files.length} local D1 SQLite file(s)`);
    rmSync(D1_STATE_DIR, { recursive: true, force: true });
    log("Deleted local D1 state directory");
  } else {
    log("No local D1 state directory found, skipping cleanup");
  }

  // 2. 应用 migrations
  run(`pnpm exec wrangler d1 migrations apply gomate-db --local --persist-to "${LOCAL_STATE}"`, {
    cwd: path.join(ROOT, "api"),
  });

  // 3. 运行 seed 脚本
  run("pnpm exec tsx db/seed-mobile-test.ts", {
    cwd: path.join(ROOT, "api"),
  });

  log("Local database reset and seeded successfully!");
  log("You can now run `pnpm api:dev` or `pnpm dev:fresh` to start the dev server.");
}

main().catch((error) => {
  console.error("[db:reset] Failed:", error.message);
  process.exit(1);
});
