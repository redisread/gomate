#!/usr/bin/env node

/**
 * 将指定用户提升为 admin 角色
 *
 * 用法：
 *   node scripts/promote-admin.mjs --email victor@example.com --env production
 *   node scripts/promote-admin.mjs --user-id <id> --env staging --yes
 *
 * 环境：
 *   - local：使用本地 wrangler D1 模拟数据库
 *   - staging：使用 Cloudflare staging D1（需已登录 wrangler）
 *   - production：使用 Cloudflare 生产 D1（需已登录 wrangler，默认会二次确认）
 */

import { execFile } from "node:child_process";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API_DIR = path.resolve(__dirname, "..", "api");

const ENV_CONFIG = {
  local: { dbName: "gomate-db", remote: false, envArg: null },
  staging: { dbName: "gomate-db-staging", remote: true, envArg: "staging" },
  production: { dbName: "gomate-db", remote: true, envArg: "production" },
};

function parseArgs() {
  const args = process.argv.slice(2);
  const result = { env: "local", yes: false };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--email" || arg === "-e") {
      result.email = args[++i];
    } else if (arg === "--user-id" || arg === "-u") {
      result.userId = args[++i];
    } else if (arg === "--env") {
      result.env = args[++i];
    } else if (arg === "--yes" || arg === "-y") {
      result.yes = true;
    } else if (arg === "--help" || arg === "-h") {
      result.help = true;
    }
  }
  return result;
}

function printUsage() {
  console.log(`
Usage: node scripts/promote-admin.mjs [options]

Options:
  -e, --email <email>      通过邮箱定位用户
  -u, --user-id <id>       通过 user id 定位用户
      --env <env>          目标环境：local | staging | production（默认 local）
  -y, --yes                跳过二次确认（仅 remote 环境有效）
  -h, --help               显示帮助

Examples:
  node scripts/promote-admin.mjs --email victor@example.com --env production
  node scripts/promote-admin.mjs --user-id abc123 --env staging --yes
`);
}

function validate(value, type) {
  if (!value || typeof value !== "string") {
    throw new Error(`${type} 必须是非空字符串`);
  }
  // 禁止 SQL 注入特殊字符
  if (/['";\\]/.test(value)) {
    throw new Error(`${type} 包含非法字符`);
  }
  if (type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    throw new Error("邮箱格式不正确");
  }
  if (type === "userId" && value.length < 8) {
    throw new Error("user id 长度不足");
  }
}

function escapeSQL(value) {
  return value.replace(/'/g, "''");
}

function buildUpdateSQL({ email, userId }) {
  const where = email
    ? `email = '${escapeSQL(email)}'`
    : `id = '${escapeSQL(userId)}'`;
  return `UPDATE users SET role = 'admin', updated_at = (strftime('%s', 'now') * 1000) WHERE ${where};`;
}

function buildSelectSQL({ email, userId }) {
  const where = email
    ? `email = '${escapeSQL(email)}'`
    : `id = '${escapeSQL(userId)}'`;
  return `SELECT id, email, name, role FROM users WHERE ${where};`;
}

function execWrangler(extraArgs) {
  return new Promise((resolve, reject) => {
    const child = execFile(
      "pnpm",
      ["exec", "wrangler", "d1", "execute", ...extraArgs],
      { cwd: API_DIR },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(stderr || error.message));
        } else {
          resolve(stdout);
        }
      }
    );
    child.stdout.pipe(process.stdout);
    child.stderr.pipe(process.stderr);
  });
}

async function confirm(question) {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      const trimmed = answer.trim().toLowerCase();
      resolve(trimmed === "y" || trimmed === "yes");
    });
  });
}

async function main() {
  const args = parseArgs();

  if (args.help) {
    printUsage();
    return;
  }

  const { email, userId, env, yes } = args;

  if (!email && !userId) {
    console.error("错误：必须提供 --email 或 --user-id");
    printUsage();
    process.exit(1);
  }

  if (email && userId) {
    console.error("错误：--email 和 --user-id 只能二选一");
    process.exit(1);
  }

  const cfg = ENV_CONFIG[env];
  if (!cfg) {
    console.error(`错误：未知环境 ${env}，可选 local/staging/production`);
    process.exit(1);
  }

  if (email) validate(email, "email");
  if (userId) validate(userId, "userId");

  const identifier = email || userId;
  console.log(`\n准备提升用户为 admin：`);
  console.log(`  标识：${identifier}`);
  console.log(`  环境：${env}`);
  console.log(`  数据库：${cfg.dbName} (${cfg.remote ? "remote" : "local"})`);

  if (!yes && cfg.remote) {
    const ok = await confirm("\n⚠️  即将修改远程数据库，确认继续？ [y/N] ");
    if (!ok) {
      console.log("已取消");
      process.exit(0);
    }
  }

  const updateSQL = buildUpdateSQL({ email, userId });
  const selectSQL = buildSelectSQL({ email, userId });

  const commonArgs = [cfg.dbName];
  if (cfg.remote) {
    commonArgs.push("--remote");
  } else {
    commonArgs.push("--local");
  }
  if (cfg.envArg) {
    commonArgs.push("--env", cfg.envArg);
  }

  console.log("\n执行更新...");
  await execWrangler([...commonArgs, "--command", updateSQL]);

  console.log("\n查询更新结果...");
  await execWrangler([...commonArgs, "--command", selectSQL]);

  console.log("\n✅ 完成");
}

main().catch((error) => {
  console.error(`\n❌ 失败：${error.message}`);
  process.exit(1);
});
