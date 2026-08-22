#!/usr/bin/env node
/** Serve the built local Worker with the same persistent bindings as db:reset. */

import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WRANGLER = path.join(ROOT, "node_modules", ".bin", "wrangler");
const LOCAL_STATE = path.resolve(
  process.env.GOMATE_LOCAL_STATE ??
    path.join(os.homedir(), ".gomate", "wrangler-state"),
);

const child = spawn(
  WRANGLER,
  [
    "dev",
    "--config",
    "dist/server/wrangler.json",
    "--persist-to",
    LOCAL_STATE,
    "--port",
    "5432",
  ],
  { cwd: ROOT, env: process.env, stdio: "inherit" },
);

child.on("error", (error) => {
  console.error(`[e2e] Worker 启动失败：${error.message}`);
  process.exit(1);
});
child.on("exit", (code, signal) => {
  process.exitCode = signal ? 1 : (code ?? 0);
});

const stop = (signal) => {
  if (child.exitCode === null && child.signalCode === null) child.kill(signal);
};
process.on("SIGINT", () => stop("SIGINT"));
process.on("SIGTERM", () => stop("SIGTERM"));
process.on("SIGHUP", () => stop("SIGHUP"));
