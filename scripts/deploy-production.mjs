#!/usr/bin/env node

import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertProductionDeployEnvironment,
  assertProductionWriteMode,
  parseJsonc,
} from "./production-build-guard.mjs";

import { stageProductionMigrations } from "./production-migrations.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WRANGLER = process.platform === "win32" ? "wrangler.cmd" : "wrangler";

export function productionWranglerCommands(migrationConfigPath) {
  if (!migrationConfigPath) throw new Error("Approved migration config required");
  return [
    ["d1", "migrations", "apply", "DB", "--remote", "--env", "production", "--config", migrationConfigPath],
    ["deploy", "--env", "production"],
  ];
}

function runWrangler(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(WRANGLER, args, {
      cwd: ROOT,
      env: { ...process.env, CLOUDFLARE_ENV: "production" },
      stdio: "inherit",
      shell: process.platform === "win32",
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`wrangler stopped by ${signal}`));
      } else if (code !== 0) {
        reject(new Error(`wrangler exited with code ${code ?? 1}`));
      } else {
        resolve();
      }
    });
  });
}

function runNodeScript(scriptPath) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath], {
      cwd: ROOT,
      env: process.env,
      stdio: "inherit",
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`node script stopped by ${signal}`));
      } else if (code !== 0) {
        reject(new Error(`node script exited with code ${code ?? 1}`));
      } else {
        resolve();
      }
    });
  });
}

async function main() {
  assertProductionDeployEnvironment();
  const config = parseJsonc(await readFile(path.join(ROOT, "wrangler.jsonc"), "utf8"));
  assertProductionWriteMode({
    WRITE_MODE: config.env?.production?.vars?.WRITE_MODE,
  });
  const staged = await stageProductionMigrations(ROOT, config);
  try {
    console.log(`Production migrations: ${staged.enabled.length} enabled; ${staged.held.length} held`);
    for (const args of productionWranglerCommands(staged.configPath)) await runWrangler(args);
  } finally {
    await staged.cleanup();
  }
  await runNodeScript(path.join(ROOT, "scripts/smoke-production-write-boundary.mjs"));
  await runNodeScript(path.join(ROOT, "scripts/cleanup-retired-r2.mjs"));
}

if (path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`❌ ${error.message}`);
    process.exitCode = 1;
  });
}
