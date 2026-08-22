#!/usr/bin/env node
/** Start one unified Astro + API Worker on the next available web port. */

import { spawn } from "node:child_process";
import { readFileSync, unlinkSync, writeFileSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_WEB_PORT = 5432;
const MAX_TRIES = 200;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WRANGLER_CONFIG = path.join(ROOT, "wrangler.jsonc");

function isPortFree(port) {
  const check = (address) =>
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
  return Promise.all([check("0.0.0.0"), check("::1")]).then((results) =>
    results.every(Boolean),
  );
}

async function nextFreePort(start) {
  for (let port = start; port < start + MAX_TRIES; port += 1) {
    if (await isPortFree(port)) return port;
  }
  throw new Error(`未找到空闲端口（从 ${start} 起尝试 ${MAX_TRIES} 个）`);
}

async function main() {
  const explicitPort = process.env.GOMATE_WEB_PORT;
  const webPort = explicitPort
    ? Number(explicitPort)
    : await nextFreePort(DEFAULT_WEB_PORT);
  if (!Number.isInteger(webPort) || webPort < 1 || webPort > 65_535) {
    throw new Error(`GOMATE_WEB_PORT 无效：${explicitPort}`);
  }

  const configName = `.wrangler.dev.${process.pid}.${webPort}.jsonc`;
  const configPath = path.join(ROOT, configName);
  const config = JSON.parse(readFileSync(WRANGLER_CONFIG, "utf8"));
  config.dev = { ...config.dev, port: webPort };
  config.vars = {
    ...config.vars,
    APP_URL: `http://localhost:${webPort}`,
  };
  writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx",
    mode: 0o600,
  });

  const cleanupConfig = () => {
    try {
      unlinkSync(configPath);
    } catch (error) {
      if (error.code !== "ENOENT") {
        console.error(`[dev:wt] 临时 Wrangler 配置清理失败：${error.message}`);
      }
    }
  };
  const env = {
    ...process.env,
    GOMATE_WEB_PORT: String(webPort),
    GOMATE_WRANGLER_CONFIG: `./${configName}`,
  };
  console.log(`\n[dev:wt] Worker:   http://localhost:${webPort}`);
  console.log(`[dev:wt] API:      http://localhost:${webPort}/api`);
  console.log(
    `[dev:wt] 数据库:  ${process.env.GOMATE_LOCAL_STATE ?? "~/.gomate/wrangler-state"}\n`,
  );

  const pnpmPath = process.env.npm_execpath;
  const executable = pnpmPath ? process.execPath : "pnpm";
  const args = pnpmPath ? [pnpmPath, "dev"] : ["dev"];
  const child = spawn(executable, args, {
    cwd: ROOT,
    env,
    stdio: "inherit",
  });
  child.on("error", (error) => {
    cleanupConfig();
    console.error(`[dev:wt] 启动失败：${error.message}`);
    process.exit(1);
  });
  child.on("exit", (code, signal) => {
    cleanupConfig();
    process.exitCode = signal ? 1 : (code ?? 0);
  });

  const stop = (signal) => {
    if (child.exitCode === null && child.signalCode === null) child.kill(signal);
  };
  process.on("SIGINT", () => stop("SIGINT"));
  process.on("SIGTERM", () => stop("SIGTERM"));
  process.on("SIGHUP", () => stop("SIGHUP"));
  process.on("exit", cleanupConfig);
}

main().catch((error) => {
  console.error(`[dev:wt] ❌ ${error.message}`);
  process.exit(1);
});
