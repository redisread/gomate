#!/usr/bin/env node
/**
 * check-migrations-drift.mjs
 *
 * v1.1 规约第 4 条：远端 D1 d1_migrations 表与本仓 _journal.json 条目数对比。
 * deploy 前置 check（drift >0 则 abort）+ 每日定时兜底。
 *
 * 用法：node scripts/check-migrations-drift.mjs [--env <envName>] [--quiet]
 *   --env    目标环境，默认 staging（唯一支持 prod，需显式传）
 *   --quiet  无漂移仅退出 0，不打印 detail（cron 模式）
 * 退出码：0 正常 / 1 漂移 / 2 连接失败（静默 skip，不告警）
 *
 * 与 #452/#456 职责边界：
 *   - check-migrations-sync.mjs = PR 阶段本地文件同步门禁
 *   - 本脚本 = deploy 阶段 + 定时远端漂移告警
 *   两者独立，不重叠。
 *
 * 任务边界：不动 v1.0 三条款、不改 #456、不动 D1 schema。
 */

import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const apiRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const journalPath = join(apiRoot, "db", "migrations", "meta", "_journal.json");

const args = process.argv.slice(2);
const envIndex = args.indexOf("--env");
const env = envIndex >= 0 ? args[envIndex + 1] : "staging";
const quiet = args.includes("--quiet");

// 1. 读取本地 journal entries 数
let journalCount;
try {
  const journal = JSON.parse(readFileSync(journalPath, "utf8"));
  journalCount = (journal.entries ?? []).length;
} catch (err) {
  if (!quiet) console.error(`⚠ 无法读取 _journal.json: ${err.message}`);
  process.exit(2);
}

// 2. 收集凭据
const apiToken = process.env.CLOUDFLARE_API_TOKEN;
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const hasToken = Boolean(apiToken);

// 3. 查询远端 D1 账本行数
let remoteCount;
try {
  const dbName = env === "production" ? "gomate-db" : "gomate-db-staging";

  // 优先走 OAuth（wrangler d1）与 v1.0 手动 d1 操作一致
  // GitHub Actions 里 fallback 到 service token
  const envVars = { ...process.env };
  if (apiToken && accountId) {
    envVars.CLOUDFLARE_API_TOKEN = apiToken;
    envVars.CLOUDFLARE_ACCOUNT_ID = accountId;
  }

  const result = execSync(
    `npx wrangler d1 execute "${dbName}" --command "SELECT COUNT(*) AS cnt FROM d1_migrations" --json --remote${env === "staging" ? " --env staging" : ""}`,
    {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 30_000,
      env: envVars,
    }
  );

  // wrangler d1 execute --json 返回数组 [{results:[{cnt:N}]}]
  const parsed = JSON.parse(result);
  const rows = parsed[0]?.results ?? [];
  remoteCount = Number(rows[0]?.cnt ?? 0);
} catch (err) {
  // 远端不可达：静默 skip，下次重试
  if (!quiet) console.error(`⚠ 远端 D1 不可达 (${env}): ${err.message}`);
  process.exit(2);
}

// 4. 漂移判定
const diff = remoteCount - journalCount;

if (diff === 0) {
  if (!quiet) console.log(`✓ 无漂移 (${env}): journal=${journalCount}, d1_migrations=${remoteCount}`);
  process.exit(0);
}

if (diff > 0) {
  const msg = `[${env.toUpperCase()} 漂移告警] ${new Date().toISOString()}
  journal=${journalCount}, d1_migrations=${remoteCount}, diff=+${diff}
  status: stale — 远端 migration 数超过本仓 _journal.json
  action: 补齐 migration 文件 + journal entry（按 v1.0 规则 5 急救 SOP）
  inspect: https://dash.cloudflare.com/${accountId ? accountId : "<account_id>"}/workers/d1/${env === "production" ? "gomate-db" : "gomate-db-staging"}`;
  console.error(msg);
  process.exit(1);
}

// diff < 0
const msg = `[${env.toUpperCase()} 漂移告警] ${new Date().toISOString()}
journal=${journalCount}, d1_migrations=${remoteCount}, diff=${diff}
status: future — 本仓 migration 文件超前远端
action: 检查 pipeline 是否应用所有迁移 / deploy 是否失败
inspect: https://dash.cloudflare.com/${accountId ? accountId : "<account_id>"}/workers/d1/${env === "production" ? "gomate-db" : "gomate-db-staging"}`;
console.error(msg);
process.exit(1);
