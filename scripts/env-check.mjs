#!/usr/bin/env node
/** Validate prerequisites for the unified local Worker. */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import net from "node:net";
import path from "node:path";

const ROOT = process.cwd();
const FRONTEND_DIR = path.join(ROOT, "frontend");
const DEV_VARS_PATH = path.join(FRONTEND_DIR, ".dev.vars");
const IS_CI = process.argv.includes("--ci");
const ENV_INDEX = process.argv.indexOf("--env");
const TARGET_ENV =
  (ENV_INDEX >= 0 ? process.argv[ENV_INDEX + 1] : undefined) ??
  process.env.GOMATE_ENV ??
  "local";

function ok(message) {
  console.log(`[env-check] ✅ ${message}`);
}
function fail(message) {
  console.error(`[env-check] ❌ ${message}`);
  return false;
}
function warn(message) {
  console.warn(`[env-check] ⚠️  ${message}`);
}

function parseDotenv(filePath) {
  if (!existsSync(filePath)) return {};
  const values = {};
  for (const line of readFileSync(filePath, "utf8").split(/\r?\n/u)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator < 0) continue;
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

function checkRuntime() {
  const pkg = JSON.parse(readFileSync(path.join(ROOT, "package.json"), "utf8"));
  let pnpmVersion;
  try {
    const pnpmPath = process.env.npm_execpath;
    pnpmVersion = execFileSync(pnpmPath ? process.execPath : "pnpm", [
      ...(pnpmPath ? [pnpmPath] : []),
      "--version",
    ], {
      encoding: "utf8",
    }).trim();
  } catch {
    return fail("pnpm 不可用");
  }
  const nodeMajor = Number(process.versions.node.split(".")[0]);
  const pnpmMajor = Number(pnpmVersion.split(".")[0]);
  const expectedPnpmMajor = Number(
    String(pkg.packageManager ?? "pnpm@9").match(/^pnpm@(\d+)/u)?.[1] ?? 9,
  );
  if (nodeMajor < 22 || pnpmMajor !== expectedPnpmMajor) {
    return fail(
      `运行时版本不满足 ${pkg.engines.node} / ${pkg.packageManager}：Node ${process.version}, pnpm ${pnpmVersion}`,
    );
  }
  ok(`Node ${process.version} / pnpm ${pnpmVersion}`);
  return true;
}

function checkSecrets() {
  const local = parseDotenv(DEV_VARS_PATH);
  const authSecret = process.env.BETTER_AUTH_SECRET ?? local.BETTER_AUTH_SECRET;
  if (!authSecret || authSecret.length < 32) {
    return fail(
      `${IS_CI ? "CI 环境" : "frontend/.dev.vars"} 缺少至少 32 字符的 BETTER_AUTH_SECRET`,
    );
  }
  if (!IS_CI && !existsSync(DEV_VARS_PATH)) {
    return fail("frontend/.dev.vars 不存在；请复制 frontend/.dev.vars.example");
  }
  if (TARGET_ENV === "production" && !process.env.CLOUDFLARE_API_TOKEN) {
    return fail("production 检查缺少 CLOUDFLARE_API_TOKEN");
  }
  if (!local.RESEND_API_KEY && !process.env.RESEND_API_KEY) {
    warn("RESEND_API_KEY 未设置，邮件发送在本地将不可用");
  }
  ok(`统一 Worker secrets 已配置（env=${TARGET_ENV}）`);
  return true;
}

async function checkPort(port) {
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    return fail(`GOMATE_WEB_PORT 无效：${port}`);
  }
  const probe = (address) =>
    new Promise((resolve) => {
      const server = net.createServer();
      server.once("error", (error) =>
        resolve(
          error.code === "EADDRNOTAVAIL" || error.code === "EAFNOSUPPORT",
        ),
      );
      server.once("listening", () => server.close(() => resolve(true)));
      server.listen(port, address);
    });
  const results = await Promise.all([probe("127.0.0.1"), probe("::1")]);
  if (!results.every(Boolean)) return fail(`统一 Worker 端口 ${port} 已被占用`);
  ok(`统一 Worker 端口 ${port} 可用`);
  return true;
}

function checkWrangler() {
  const wrangler = path.join(
    FRONTEND_DIR,
    "node_modules",
    ".bin",
    "wrangler",
  );
  if (!existsSync(wrangler)) {
    return fail("Wrangler CLI 不可用；请先安装 workspace 依赖");
  }
  try {
    execFileSync(wrangler, ["--version"], {
      cwd: FRONTEND_DIR,
      stdio: "ignore",
    });
    ok("Wrangler CLI 可用");
    return true;
  } catch {
    return fail("Wrangler CLI 不可用；请先安装 workspace 依赖");
  }
}

async function main() {
  console.log(
    `\nGoMate 单 Worker 环境检查（mode=${IS_CI ? "ci" : "local"}, env=${TARGET_ENV}）\n`,
  );
  const checks = [checkRuntime(), checkSecrets(), checkWrangler()];
  if (!IS_CI) {
    checks.push(await checkPort(Number(process.env.GOMATE_WEB_PORT ?? "5432")));
  }
  if (!checks.every(Boolean)) process.exit(1);
  console.log("\n[env-check] 🎉 检查通过");
}

main().catch((error) => {
  console.error(`[env-check] ❌ ${error.message}`);
  process.exit(1);
});
