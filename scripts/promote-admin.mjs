#!/usr/bin/env node
/** Promote one user in the unified Worker's local D1 binding. */

import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import os from "node:os";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FRONTEND_DIR = path.join(ROOT, "frontend");
const WRANGLER = path.join(FRONTEND_DIR, "node_modules", ".bin", "wrangler");
const LOCAL_STATE = path.resolve(
  process.env.GOMATE_LOCAL_STATE ??
    path.join(os.homedir(), ".gomate", "wrangler-state"),
);

function parseArgs() {
  const result = {};
  const args = process.argv.slice(2);
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--email" || arg === "-e") result.email = args[++index];
    else if (arg === "--user-id" || arg === "-u") result.userId = args[++index];
    else if (arg === "--env" || arg === "--yes" || arg === "-y") {
      throw new Error(
        "该脚本仅允许本地 D1；生产权限变更必须走受保护的审批流程",
      );
    }
    else if (arg === "--help" || arg === "-h") result.help = true;
  }
  return result;
}

function usage() {
  console.log(
    "Usage: node scripts/promote-admin.mjs (--email <email> | --user-id <id>)",
  );
}

function validate(value, kind) {
  if (!value || typeof value !== "string" || /['";\\]/u.test(value)) {
    throw new Error(`${kind} 无效`);
  }
  if (kind === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value)) {
    throw new Error("邮箱格式不正确");
  }
  if (kind === "userId" && value.length < 8) throw new Error("user id 长度不足");
}

function sqlWhere({ email, userId }) {
  return email ? `email = '${email}'` : `id = '${userId}'`;
}

function execWrangler(args) {
  return new Promise((resolve, reject) => {
    const child = execFile(
      WRANGLER,
      ["d1", "execute", "DB", ...args],
      { cwd: FRONTEND_DIR },
      (error, stdout, stderr) =>
        error ? reject(new Error(stderr || error.message)) : resolve(stdout),
    );
    child.stdout.pipe(process.stdout);
    child.stderr.pipe(process.stderr);
  });
}

async function main() {
  const args = parseArgs();
  if (args.help) return usage();
  if (Boolean(args.email) === Boolean(args.userId)) {
    usage();
    throw new Error("--email 与 --user-id 必须且只能提供一个");
  }
  validate(args.email ?? args.userId, args.email ? "email" : "userId");

  console.log("目标数据库：gomate-db-v2 (local)");
  const targetArgs = [
    "--local",
    "--persist-to",
    LOCAL_STATE,
    "--config",
    "wrangler.jsonc",
  ];
  const where = sqlWhere(args);
  await execWrangler([
    ...targetArgs,
    "--command",
    `UPDATE users SET role = 'admin', updated_at = (unixepoch() * 1000) WHERE ${where};`,
  ]);
  await execWrangler([
    ...targetArgs,
    "--command",
    `SELECT id, email, name, role FROM users WHERE ${where};`,
  ]);
  console.log("✅ 完成");
}

main().catch((error) => {
  console.error(`❌ ${error.message}`);
  process.exit(1);
});
