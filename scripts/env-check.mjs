#!/usr/bin/env node
/**
 * 启动前环境变量 / 本地开发健康检查
 *
 * 用法：
 *   pnpm env:check              # 本地完整检查（端口、wrangler 登录等）
 *   pnpm env:check --ci         # CI 模式：只检查 secrets / 环境变量
 *   pnpm env:check --env production
 *
 * 统一读取来源：
 *   - api/.dev.vars（wrangler dev 本地 secret）
 *   - frontend/.env.local（frontend dev server 本地变量）
 *   - process.env（CI 注入或 shell 导出）
 */

import { execSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import net from "node:net";
import os from "node:os";

const ROOT = process.cwd();
const IS_CI = process.argv.includes("--ci");
const ENV_ARG = process.argv.includes("--env")
  ? process.argv[process.argv.indexOf("--env") + 1]
  : process.env.GOMATE_ENV || "local";
const IS_PRODUCTION = ENV_ARG === "production";

const CHECKS = [];

function log(message) {
  console.log(`[env-check] ${message}`);
}

function error(message) {
  console.error(`[env-check] ❌ ${message}`);
}

function ok(message) {
  console.log(`[env-check] ✅ ${message}`);
}

function warn(message) {
  console.warn(`[env-check] ⚠️  ${message}`);
}

function run(command, options = {}) {
  return execSync(command, {
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "pipe"],
    cwd: ROOT,
    ...options,
  });
}

function runNoThrow(command, options = {}) {
  try {
    return run(command, options);
  } catch {
    return "";
  }
}

function parseDotenv(filePath) {
  if (!existsSync(filePath)) return {};
  const content = readFileSync(filePath, "utf8");
  const vars = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    vars[key] = value;
  }
  return vars;
}

function loadApiSecrets() {
  const devVars = parseDotenv(path.join(ROOT, "api", ".dev.vars"));
  return {
    BETTER_AUTH_SECRET:
      devVars.BETTER_AUTH_SECRET || process.env.BETTER_AUTH_SECRET,
    AUTH_SECRET_V2: devVars.AUTH_SECRET_V2 || process.env.AUTH_SECRET_V2,
  };
}

function loadFrontendEnv() {
  const localVars = parseDotenv(path.join(ROOT, "frontend", ".env.local"));
  return {
    PUBLIC_API_URL: localVars.PUBLIC_API_URL || process.env.PUBLIC_API_URL,
  };
}

function checkNodeAndPnpm() {
  const pkg = JSON.parse(
    readFileSync(path.join(ROOT, "package.json"), "utf-8"),
  );
  const engines = pkg.engines || {};

  const nodeVersion = process.version;
  const nodeReq = engines.node;
  if (nodeReq) {
    const minNode = nodeReq.replace(">=", "").trim();
    if (
      nodeVersion.localeCompare(minNode, undefined, {
        numeric: true,
        sensitivity: "base",
      }) < 0
    ) {
      error(`Node.js 版本过低：当前 ${nodeVersion}，要求 >= ${minNode}`);
      return false;
    }
  }

  let pnpmVersion = "";
  try {
    pnpmVersion = run("pnpm --version").trim();
  } catch {
    error("无法获取 pnpm 版本，请确认 pnpm 已安装");
    return false;
  }
  const pnpmReq = engines.pnpm;
  if (pnpmReq) {
    const minPnpm = pnpmReq.replace(">=", "").trim();
    if (
      pnpmVersion.localeCompare(minPnpm, undefined, {
        numeric: true,
        sensitivity: "base",
      }) < 0
    ) {
      error(`pnpm 版本过低：当前 ${pnpmVersion}，要求 >= ${minPnpm}`);
      return false;
    }
  }

  ok(`Node.js ${nodeVersion} / pnpm ${pnpmVersion} 符合 engines 要求`);
  return true;
}

function checkSecrets() {
  const apiSecrets = loadApiSecrets();
  const frontendEnv = loadFrontendEnv();
  const errors = [];

  if (IS_PRODUCTION) {
    if (!apiSecrets.AUTH_SECRET_V2) {
      errors.push(
        "生产环境缺少 AUTH_SECRET_V2（应通过 wrangler secret put 设置）",
      );
    }
  } else {
    if (!apiSecrets.BETTER_AUTH_SECRET && !apiSecrets.AUTH_SECRET_V2) {
      errors.push(
        "本地开发 / CI 缺少 BETTER_AUTH_SECRET 或 AUTH_SECRET_V2（应写入 api/.dev.vars 或导出为环境变量）",
      );
    }
  }

  if (!frontendEnv.PUBLIC_API_URL) {
    errors.push(
      "frontend 缺少 PUBLIC_API_URL（应写入 frontend/.env.local 或导出为环境变量）",
    );
  }

  if (errors.length > 0) {
    for (const err of errors) {
      error(err);
    }
    error("参考：api/.dev.vars → BETTER_AUTH_SECRET=...；frontend/.env.local → PUBLIC_API_URL=http://localhost:8799");
    return false;
  }

  ok(
    `必要 secrets / 环境变量已配置（env=${IS_PRODUCTION ? "production" : "local"}）`,
  );
  return true;
}

function checkEnvFilesExistence() {
  const devVars = path.join(ROOT, "api", ".dev.vars");
  const frontendEnv = path.join(ROOT, "frontend", ".env.local");
  let allOk = true;

  if (!existsSync(devVars)) {
    error(
      `api/.dev.vars 不存在。请复制 api/.dev.vars.example 为 api/.dev.vars 并填入本地 secrets`,
    );
    allOk = false;
  } else {
    ok("api/.dev.vars 已存在");
  }

  if (!existsSync(frontendEnv)) {
    warn(
      `frontend/.env.local 不存在。请复制 frontend/.env.local.example 为 frontend/.env.local（或保持默认本地 API）`,
    );
  } else {
    ok("frontend/.env.local 已存在");
  }

  return allOk;
}

async function checkPort(port, name) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", (err) => {
      if (err.code === "EADDRINUSE") {
        error(`端口 ${port} 已被占用（${name}），请先关闭占用该端口的进程`);
        resolve(false);
      } else {
        error(`检查端口 ${port} 时出错：${err.message}`);
        resolve(false);
      }
    });
    server.once("listening", () => {
      server.close(() => {
        ok(`端口 ${port} 可用（${name}）`);
        resolve(true);
      });
    });
    server.listen(port, "127.0.0.1");
  });
}

function checkPlaywrightBrowsers() {
  try {
    const result = run("pnpm exec playwright install --help");
    if (!result.includes("install")) {
      throw new Error("Playwright CLI 不可用");
    }
  } catch {
    error("Playwright CLI 不可用，请运行 pnpm install");
    return false;
  }

  const homeDir = os.homedir();
  const platform = process.platform;
  let cacheDir;
  if (platform === "darwin") {
    cacheDir = path.join(homeDir, "Library", "Caches", "ms-playwright");
  } else if (platform === "win32") {
    cacheDir = path.join(homeDir, "AppData", "Local", "ms-playwright");
  } else {
    cacheDir = path.join(homeDir, ".cache", "ms-playwright");
  }

  if (existsSync(cacheDir)) {
    const entries = readdirSync(cacheDir);
    const hasChromium = entries.some((entry) => entry.startsWith("chromium-"));
    if (hasChromium) {
      ok("Playwright Chromium 已安装");
      return true;
    }
  }

  warn(
    "未检测到 Playwright Chromium，建议运行：pnpm exec playwright install chromium",
  );
  return true;
}

function checkWranglerLogin() {
  try {
    const result = run("pnpm exec wrangler whoami", {
      cwd: path.join(ROOT, "api"),
    });
    if (
      result.includes("not authenticated") ||
      result.includes("You are not") ||
      result.includes("Not authenticated")
    ) {
      error("wrangler 未登录。请运行 pnpm exec wrangler login");
      return false;
    }
    ok("wrangler 已登录");
    return true;
  } catch (err) {
    const message = err.stderr || err.message || "";
    if (
      message.includes("connectivity") ||
      message.includes("fetch failed") ||
      message.includes("internet")
    ) {
      warn("wrangler 登录检查因网络问题失败，请确认网络连接后重试");
      return true;
    }
    error("wrangler 登录检查失败，请运行 pnpm exec wrangler login 确认状态");
    return false;
  }
}

function checkGitHooks() {
  const hookDir = path.join(ROOT, ".git", "hooks");
  const preCommit = path.join(hookDir, "pre-commit");
  if (!existsSync(preCommit)) {
    warn(
      "git pre-commit hook 不存在。请运行 pnpm install 重新生成 husky hooks",
    );
    return true;
  }
  ok("git pre-commit hook 已存在");
  return true;
}

async function main() {
  console.log(`\n🔍 GoMate 环境检查（mode=${IS_CI ? "ci" : "local"}, env=${ENV_ARG}）\n`);

  log("检查 Node.js / pnpm 版本...");
  CHECKS.push(checkNodeAndPnpm());

  log("检查必要 secrets / 环境变量...");
  CHECKS.push(checkSecrets());

  if (!IS_CI) {
    log("检查环境文件...");
    CHECKS.push(checkEnvFilesExistence());

    log("检查 Playwright Chromium...");
    CHECKS.push(checkPlaywrightBrowsers());

    log("检查端口占用...");
    CHECKS.push(await checkPort(5432, "frontend dev"));
    CHECKS.push(await checkPort(8799, "api dev"));

    log("检查 wrangler 登录状态...");
    CHECKS.push(checkWranglerLogin());

    log("检查 git hooks...");
    CHECKS.push(checkGitHooks());
  }

  const passed = CHECKS.every(Boolean);

  console.log("\n" + "=".repeat(50));
  if (passed) {
    console.log(
      IS_CI
        ? "🎉 环境变量校验通过"
        : "🎉 环境检查全部通过，可以运行 pnpm dev:fresh 启动本地环境",
    );
    process.exit(0);
  } else {
    console.log(
      IS_CI
        ? "❌ CI 环境变量校验未通过"
        : "❌ 环境检查未通过，请按上方提示修复后再试",
    );
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("\n[env-check] 检查过程发生错误:", err.message);
  process.exit(1);
});
