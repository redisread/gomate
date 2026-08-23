#!/usr/bin/env node

import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  previewAliasForBranch,
  previewWranglerCommand,
} from "./preview-alias.mjs";
import { assertPreviewDeployEnvironment } from "./production-build-guard.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WRANGLER = process.platform === "win32" ? "wrangler.cmd" : "wrangler";

export function previewDeployCommand(environment = process.env) {
  assertPreviewDeployEnvironment(environment);
  const alias = previewAliasForBranch(environment.WORKERS_CI_BRANCH);
  return { alias, args: previewWranglerCommand(alias) };
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

async function main() {
  const { alias, args } = previewDeployCommand();
  console.log(`Uploading Preview version with alias ${alias}`);
  await runWrangler(args);
}

if (path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`❌ ${error.message}`);
    process.exitCode = 1;
  });
}
