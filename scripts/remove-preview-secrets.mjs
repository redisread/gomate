#!/usr/bin/env node
/** Remove only an approved ephemeral Wrangler secrets file in the runner temp. */

import { rmSync } from "node:fs";
import path from "node:path";

const runnerTemp = process.env.RUNNER_TEMP?.trim();
const secretsFile = process.env.SECRETS_FILE?.trim();
if (!runnerTemp || !secretsFile) {
  throw new Error("RUNNER_TEMP and SECRETS_FILE are required");
}

const allowedNames = new Set([
  "gomate-worker-secrets.json",
  "gomate-production-secrets.json",
]);
const resolvedRunnerTemp = path.resolve(runnerTemp);
const resolvedSecretsFile = path.resolve(secretsFile);
if (
  path.dirname(resolvedSecretsFile) !== resolvedRunnerTemp ||
  !allowedNames.has(path.basename(resolvedSecretsFile))
) {
  throw new Error(
    "Refusing to remove a secrets file outside the exact runner temp target",
  );
}

rmSync(resolvedSecretsFile, { force: true });
console.log("Removed the ephemeral Wrangler secrets file.");
