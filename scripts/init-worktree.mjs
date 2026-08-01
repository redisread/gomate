#!/usr/bin/env node
/**
 * 多 worktree 本地开发环境一键初始化
 *
 * 背景：git worktree 是独立 checkout，gitignored 文件不跟随
 * （api/.dev.vars、frontend/.env.local、本地 D1 状态），导致新 worktree
 * 缺少 secrets / env / 数据。本脚本补齐这三样，使任意 worktree 可直接开发。
 *
 * 用法：
 *   node scripts/init-worktree.mjs                          # 检查并补齐
 *   node scripts/init-worktree.mjs --dev-vars-from <path>   # 从指定路径复制 api/.dev.vars
 *
 * 环境变量：
 *   GOMATE_DEV_VARS_SOURCE  api/.dev.vars 来源路径（未指定且缺失时仅打印指引）
 *   GOMATE_API_PORT         写入 frontend/.env.local 的 API 地址端口（默认 8799）
 *   GOMATE_LOCAL_STATE      本地 D1 持久化目录（默认 ~/.gomate/wrangler-state，多 worktree 共享）
 *   GOMATE_SKIP_SYNC        =1 时跳过 prod 地点数据同步（离线调试用）
 */

import { execSync } from "node:child_process";
import { existsSync, copyFileSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = process.cwd();
const API_DIR = path.join(ROOT, "api");
const FRONTEND_DIR = path.join(ROOT, "frontend");
const API_DEV_VARS = path.join(API_DIR, ".dev.vars");
const FRONTEND_ENV_LOCAL = path.join(FRONTEND_DIR, ".env.local");
const LOCAL_STATE = path.resolve(
  process.env.GOMATE_LOCAL_STATE ||
    path.join(os.homedir(), ".gomate", "wrangler-state"),
);
const D1_STATE_DIR = path.join(LOCAL_STATE, "v3", "d1", "miniflare-D1DatabaseObject");
const API_PORT = process.env.GOMATE_API_PORT || "8799";

const devVarsSource =
  (() => {
    const idx = process.argv.indexOf("--dev-vars-from");
    if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1];
    return process.env.GOMATE_DEV_VARS_SOURCE || "";
  })();

function log(message) {
  console.log(`[init:worktree] ${message}`);
}
function ok(message) {
  console.log(`[init:worktree] ✅ ${message}`);
}
function warn(message) {
  console.warn(`[init:worktree] ⚠️  ${message}`);
}
function fail(message) {
  console.error(`[init:worktree] ❌ ${message}`);
  process.exitCode = 1;
}

function hasD1Data() {
  if (!existsSync(D1_STATE_DIR)) return false;
  return readdirSync(D1_STATE_DIR).some(
    (f) => f.endsWith(".sqlite") && f !== "metadata.sqlite",
  );
}

function run(command, cwd = ROOT) {
  log(`执行: ${command}`);
  execSync(command, { stdio: "inherit", cwd });
}

// 1. api/.dev.vars（auth secret 必需，dev 时 better-auth 会抛错）
if (existsSync(API_DEV_VARS)) {
  ok("api/.dev.vars 已存在");
} else if (devVarsSource && existsSync(devVarsSource)) {
  copyFileSync(devVarsSource, API_DEV_VARS);
  ok(`已从 ${devVarsSource} 复制 api/.dev.vars`);
} else {
  fail(
    "api/.dev.vars 缺失。多 worktree 不跟随 gitignored 文件，请手动补齐：\n" +
      `  从主 checkout 复制：cp <主checkout>/api/.dev.vars ${API_DEV_VARS}\n` +
      "  或指定来源：pnpm init:worktree --dev-vars-from <path>\n" +
      "  （BETTER_AUTH_SECRET 不进入 git，见 api/.dev.vars.example）",
  );
}

// 2. frontend/.env.local（PUBLIC_API_URL）
if (existsSync(FRONTEND_ENV_LOCAL)) {
  ok("frontend/.env.local 已存在");
} else {
  const content = `# 由 scripts/init-worktree.mjs 自动生成
PUBLIC_API_URL=http://localhost:${API_PORT}
`;
  mkdirSync(FRONTEND_DIR, { recursive: true });
  writeFileSync(FRONTEND_ENV_LOCAL, content, "utf8");
  ok(`已生成 frontend/.env.local（PUBLIC_API_URL=http://localhost:${API_PORT}）`);
}

// 3. i18n 生成文件（frontend/src/i18n/locales-data.ts 是 gitignored 构建产物，新 worktree 缺失会 500）
const LOCALES_DATA = path.join(FRONTEND_DIR, "src", "i18n", "locales-data.ts");
if (existsSync(LOCALES_DATA)) {
  ok("i18n locales-data.ts 已存在");
} else {
  log("生成 i18n locale 数据（pnpm i18n:build）...");
  try {
    run("pnpm i18n:build");
    ok("i18n locale 数据已生成");
  } catch {
    fail("i18n locale 数据生成失败");
  }
}

// 4. 共享本地 D1（多 worktree 共用一份，初始化一次即可）
log(`本地 D1 状态目录：${LOCAL_STATE}`);
if (!hasD1Data()) {
  // 旧工作流（wrangler 默认 .wrangler/state）的本地数据不跟随 worktree，也不在共享目录
  const LEGACY_STATE_DIR = path.join(ROOT, "api", ".wrangler", "state", "v3", "d1", "miniflare-D1DatabaseObject");
  if (existsSync(LEGACY_STATE_DIR) && readdirSync(LEGACY_STATE_DIR).some((f) => f.endsWith(".sqlite") && f !== "metadata.sqlite")) {
    warn(
      "检测到旧本地 D1 数据（api/.wrangler/state）。如需迁移到共享目录：\n" +
        `  mkdir -p ${D1_STATE_DIR} && cp -R ${LEGACY_STATE_DIR}/* ${D1_STATE_DIR}/`,
    );
  }
}
if (hasD1Data()) {
  ok("共享本地 D1 已有数据，跳过初始化");
} else if (process.exitCode) {
  warn("api/.dev.vars 缺失，先补齐 secrets 后再初始化共享 D1");
} else {
  log("共享本地 D1 为空，开始初始化（migrations + 地点数据同步）...");
  try {
    run(
      `pnpm exec wrangler d1 migrations apply gomate-db --local --persist-to "${LOCAL_STATE}"`,
      API_DIR,
    );
    ok("migrations 已应用");
  } catch {
    fail("migrations 应用失败，请检查 wrangler 登录状态（AGENTS.md 已知坑点）");
  }

  if (process.env.GOMATE_SKIP_SYNC === "1") {
    warn("GOMATE_SKIP_SYNC=1，跳过 prod 地点数据同步");
  } else {
    try {
      run("pnpm exec tsx db/sync-locations.ts", API_DIR);
      ok("prod 地点数据已同步到本地 D1");
    } catch {
      warn("prod 地点数据同步失败（网络或远端 API 问题），可稍后运行 pnpm db:sync 重试");
    }
  }
}

// 5. QA 用户指引
log(
  "如需 Wen 验收数据：在 http://localhost:" +
    API_PORT +
    " 注册 QA 用户，并用 PATCH /api/users/me 补 wechat 字段（见 AGENTS.md「本地全栈测试环境」）",
  );

if (process.exitCode) {
  console.error("\n[init:worktree] 初始化未完成，请按上方提示修复后重试。");
} else {
  console.log("\n[init:worktree] 环境就绪，可运行 pnpm dev:wt 或 pnpm dev 启动。");
}
