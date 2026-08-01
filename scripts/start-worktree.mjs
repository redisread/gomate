#!/usr/bin/env node
/**
 * 多 worktree 并行启动：自动分配空闲端口并同时启动 API + 前端
 *
 * 背景：api / 前端端口硬编码（8799 / 5432），多 worktree 同时 dev 必然冲突。
 * 本脚本在未显式指定端口时，从默认端口起递增寻找空闲端口，并把端口
 * （GOMATE_API_PORT / GOMATE_WEB_PORT）注入子进程：
 *   - API: wrangler dev --port 读取 GOMATE_API_PORT
 *   - 前端: astro dev --port 读取 GOMATE_WEB_PORT
 *   - 前端 PUBLIC_API_URL 指向当前 API 端口
 * 显式设置 GOMATE_API_PORT / GOMATE_WEB_PORT 时跳过自动分配。
 */

import { spawn } from "node:child_process";
import net from "node:net";

const DEFAULT_API_PORT = 8799;
const DEFAULT_WEB_PORT = 5432;
const MAX_TRIES = 200;

function isPortFree(port) {
  // 同时探测 IPv4 / IPv6：只查一个地址族会漏掉另一族的占用
  // （例如 astro dev 默认绑 [::1]，仅查 0.0.0.0 会误判为空闲）
  const check = (address) =>
    new Promise((resolve) => {
      const server = net.createServer();
      server.once("error", (err) => {
        if (err.code === "EADDRNOTAVAIL" || err.code === "EAFNOSUPPORT") {
          // 当前平台不支持该地址族，视为该族无占用
          resolve(true);
        } else {
          resolve(false);
        }
      });
      server.once("listening", () => server.close(() => resolve(true)));
      server.listen(port, address);
    });
  return Promise.all([check("0.0.0.0"), check("::1")]).then((okList) =>
    okList.every(Boolean),
  );
}

async function nextFreePort(start) {
  for (let port = start; port < start + MAX_TRIES; port++) {
    if (await isPortFree(port)) return port;
  }
  throw new Error(`未找到空闲端口（从 ${start} 起尝试 ${MAX_TRIES} 个）`);
}

async function main() {
  const apiPort = Number(process.env.GOMATE_API_PORT) || (await nextFreePort(DEFAULT_API_PORT));
  const webPort = Number(process.env.GOMATE_WEB_PORT) || (await nextFreePort(DEFAULT_WEB_PORT));

  const env = {
    ...process.env,
    GOMATE_API_PORT: String(apiPort),
    GOMATE_WEB_PORT: String(webPort),
    PUBLIC_API_URL: `http://localhost:${apiPort}`,
  };

  console.log(`\n[dev:wt] API:    http://localhost:${apiPort}`);
  console.log(`[dev:wt] 前端:    http://localhost:${webPort}`);
  console.log(`[dev:wt] 数据库:  共享本地 D1（${process.env.GOMATE_LOCAL_STATE || "~/.gomate/wrangler-state"}）\n`);

  const children = [
    spawn("pnpm", ["api:dev"], { env, stdio: "inherit" }),
    spawn("pnpm", ["web:dev"], { env, stdio: "inherit" }),
  ];

  let shuttingDown = false;
  function shutdown(code) {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log("\n[dev:wt] 正在停止子进程...");
    // 先 SIGTERM（wrangler 交互模式可能吞掉 SIGINT），2 秒后未退出则 SIGKILL 兜底
    for (const child of children) child.kill("SIGTERM");
    setTimeout(() => {
      for (const child of children) {
        try {
          child.kill("SIGKILL");
        } catch {
          // 进程已退出
        }
      }
      process.exit(code);
    }, 2000);
  }

  process.on("SIGINT", () => shutdown(130));
  process.on("SIGTERM", () => shutdown(143));
  process.on("SIGHUP", () => shutdown(129));

  children.forEach((child) => {
    child.on("error", (err) => {
      console.error(`[dev:wt] 启动子进程失败: ${err.message}`);
      shutdown(1);
    });
    child.on("exit", (code) => {
      // 任一子进程退出（无论 code）都收掉另一个并退出，避免脚本挂住
      if (!shuttingDown) shutdown(code ?? 0);
    });
  });
}

main().catch((err) => {
  console.error(`[dev:wt] ❌ ${err.message}`);
  process.exit(1);
});
