#!/usr/bin/env node
/** Write Wrangler's ephemeral secrets file without printing secret values. */

import { chmodSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

function requiredEnv(name) {
  const value = process.env[name];
  if (!value?.trim()) throw new Error(`${name} is required`);
  return value;
}

export function writePreviewSecrets(outputPath = requiredEnv("SECRETS_FILE")) {
  const secrets = {
    APP_URL: requiredEnv("PREVIEW_APP_URL").trim(),
    BETTER_AUTH_SECRET: requiredEnv("BETTER_AUTH_SECRET"),
    RESEND_API_KEY: requiredEnv("RESEND_API_KEY"),
  };

  writeFileSync(outputPath, `${JSON.stringify(secrets)}\n`, {
    encoding: "utf8",
    flag: "wx",
    mode: 0o600,
  });
  chmodSync(outputPath, 0o600);
  console.log(`Created ephemeral Wrangler secrets file at ${path.basename(outputPath)}.`);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  try {
    writePreviewSecrets();
  } catch (error) {
    console.error(`[preview-secrets] ${error.message}`);
    process.exit(1);
  }
}
