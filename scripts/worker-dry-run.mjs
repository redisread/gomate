#!/usr/bin/env node

import { rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = path.join(root, "dist-worker");

await rm(outputDirectory, { recursive: true, force: true });

const child = spawn(
  "pnpm",
  ["exec", "wrangler", "deploy", "--dry-run", "--outdir", "dist-worker"],
  { cwd: root, stdio: "inherit", shell: process.platform === "win32" },
);

child.on("error", (error) => {
  console.error(error);
  process.exitCode = 1;
});

child.on("exit", (code, signal) => {
  if (signal) {
    console.error(`wrangler dry-run stopped by ${signal}`);
    process.exitCode = 1;
  } else {
    process.exitCode = code ?? 1;
  }
});
