#!/usr/bin/env node

import { runWrangler } from "./run-wrangler.mjs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  previewAliasForBranch,
  previewWranglerCommand,
} from "./preview-alias.mjs";
import { assertPreviewDeployEnvironment } from "./production-build-guard.mjs";


export function previewDeployCommand(environment = process.env) {
  assertPreviewDeployEnvironment(environment);
  const alias = previewAliasForBranch(environment.WORKERS_CI_BRANCH);
  return { alias, args: previewWranglerCommand(alias) };
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
