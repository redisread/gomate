#!/usr/bin/env node
import { chmodSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { validateProductionOrigin } from "./validate-production-release.mjs";

function required(name) {
  const value = process.env[name];
  if (!value?.trim()) throw new Error(`${name} is required`);
  return value;
}

export function writeProductionSecrets(outputPath = required("SECRETS_FILE")) {
  const secrets = {
    APP_URL: validateProductionOrigin(required("PRODUCTION_APP_URL")),
    BETTER_AUTH_SECRET: required("BETTER_AUTH_SECRET"),
    RESEND_API_KEY: required("RESEND_API_KEY"),
  };
  writeFileSync(outputPath, `${JSON.stringify(secrets)}\n`, {
    encoding: "utf8",
    flag: "wx",
    mode: 0o600,
  });
  chmodSync(outputPath, 0o600);
  console.log(
    `Created production Wrangler secrets file at ${path.basename(outputPath)}.`,
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  try {
    writeProductionSecrets();
  } catch (error) {
    console.error(`[production-secrets] ${error.message}`);
    process.exit(1);
  }
}
