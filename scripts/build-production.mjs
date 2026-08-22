#!/usr/bin/env node

import { cp } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertProductionBuildEnvironment,
  PRODUCTION_ENVIRONMENT,
} from "./production-build-guard.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PNPM = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

function runAstroBuild() {
  return new Promise((resolve, reject) => {
    const child = spawn(PNPM, ["exec", "astro", "build"], {
      cwd: ROOT,
      env: { ...process.env, CLOUDFLARE_ENV: PRODUCTION_ENVIRONMENT },
      stdio: "inherit",
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`Astro build stopped by ${signal}`));
      } else if (code !== 0) {
        reject(new Error(`Astro build exited with code ${code ?? 1}`));
      } else {
        resolve();
      }
    });
  });
}

async function main() {
  assertProductionBuildEnvironment();
  await runAstroBuild();
  await cp(
    path.join(ROOT, ".assetsignore"),
    path.join(ROOT, "dist", ".assetsignore"),
  );
}

main().catch((error) => {
  console.error(`❌ ${error.message}`);
  process.exitCode = 1;
});
