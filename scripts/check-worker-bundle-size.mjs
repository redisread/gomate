#!/usr/bin/env node
/** Enforce the compressed unified Worker bundle budget after Wrangler dry-run. */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BUNDLE_DIR = path.join(ROOT, "dist-worker");
const TARGET_BYTES = 2_400_000;
const HARD_LIMIT_BYTES = 3_000_000;

function listBundleFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return listBundleFiles(absolutePath);
    if (!entry.isFile() || entry.name.endsWith(".map")) return [];
    return [absolutePath];
  });
}

function formatMiB(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MiB`;
}

if (!existsSync(BUNDLE_DIR) || !statSync(BUNDLE_DIR).isDirectory()) {
  console.error(
    "Worker dry-run output is missing. Run pnpm worker:dry-run first.",
  );
  process.exit(1);
}

const files = listBundleFiles(BUNDLE_DIR);
if (files.length === 0) {
  console.error("Worker dry-run output contains no deployable modules.");
  process.exit(1);
}

const gzipBytes = files.reduce(
  (total, file) => total + gzipSync(readFileSync(file), { level: 9 }).byteLength,
  0,
);

console.log(
  `Unified Worker gzip size: ${formatMiB(gzipBytes)} across ${files.length} module(s).`,
);

if (gzipBytes > HARD_LIMIT_BYTES) {
  console.error(
    `Worker exceeds the ${formatMiB(HARD_LIMIT_BYTES)} hard limit.`,
  );
  process.exit(1);
}

if (gzipBytes > TARGET_BYTES) {
  console.warn(
    `Worker is below the hard limit but exceeds the ${formatMiB(TARGET_BYTES)} target.`,
  );
}
