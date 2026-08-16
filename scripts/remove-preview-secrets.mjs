#!/usr/bin/env node
/** Remove only the preview secrets file created inside the GitHub runner temp. */

import { rmSync } from "node:fs";
import path from "node:path";

const runnerTemp = process.env.RUNNER_TEMP?.trim();
const secretsFile = process.env.SECRETS_FILE?.trim();
if (!runnerTemp || !secretsFile) {
  throw new Error("RUNNER_TEMP and SECRETS_FILE are required");
}

const expected = path.join(path.resolve(runnerTemp), "gomate-worker-secrets.json");
if (path.resolve(secretsFile) !== expected) {
  throw new Error("Refusing to remove a secrets file outside the exact runner temp target");
}

rmSync(expected, { force: true });
console.log("Removed the ephemeral Wrangler secrets file.");
