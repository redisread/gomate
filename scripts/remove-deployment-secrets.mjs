#!/usr/bin/env node
/** Remove only the production secrets file created in the GitHub runner temp. */

import { rmSync } from "node:fs";
import path from "node:path";

const runnerTemp = process.env.RUNNER_TEMP?.trim();
const secretsFile = process.env.SECRETS_FILE?.trim();
if (!runnerTemp || !secretsFile) {
  console.error("RUNNER_TEMP and SECRETS_FILE are required");
  process.exit(1);
}

const expectedPath = path.resolve(runnerTemp, "gomate-production-secrets.json");
const resolvedPath = path.resolve(secretsFile);
if (resolvedPath !== expectedPath) {
  console.error(
    "Refusing to remove a secrets file outside the exact runner temp target",
  );
  process.exit(1);
}

rmSync(resolvedPath, { force: true });
console.log("Removed the ephemeral production secrets file.");
