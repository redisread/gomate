#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const D1_ID = "befa3d89-6551-4a25-8a1c-670efe62a315";
const KV_ID = "f9904d1fa72140c18067e07d541ca92b";

export function validateProductionOrigin(value) {
  const url = new URL(value);
  if (
    url.href !== "https://gomate.live/" ||
    url.username ||
    url.password ||
    url.port ||
    url.search ||
    url.hash
  ) {
    throw new Error("Production origin must be exactly https://gomate.live");
  }
  return "https://gomate.live";
}

export function prepareProductionCutover({ configPath, mode }) {
  if (mode !== "protected" && mode !== "open") {
    throw new Error("Cutover mode must be protected or open");
  }
  const config = JSON.parse(readFileSync(configPath, "utf8"));
  const database = config.d1_databases?.find((item) => item.binding === "DB");
  const cache = config.kv_namespaces?.find(
    (item) => item.binding === "CACHE_KV",
  );
  const bucket = config.r2_buckets?.find((item) => item.binding === "R2");
  if (
    config.targetEnvironment !== "production" ||
    config.name !== "gomate-production-preview" ||
    config.main !== "entry.mjs" ||
    config.no_bundle !== true ||
    config.vars?.WRITE_MODE !== "protected" ||
    database?.database_name !== "gomate-db-v2" ||
    database?.database_id !== D1_ID ||
    cache?.id !== KV_ID ||
    bucket?.bucket_name !== "gomate"
  ) {
    throw new Error(
      "Built Worker does not match the reviewed production bindings",
    );
  }
  if ("route" in config || "routes" in config) {
    throw new Error(
      "Built Worker must be route-free before the protected cutover step",
    );
  }
  if (Object.hasOwn(config.vars ?? {}, "APP_URL")) {
    throw new Error("APP_URL must remain an ephemeral Wrangler secret");
  }
  validateProductionOrigin(
    process.env.PRODUCTION_APP_URL ?? "https://gomate.live",
  );
  config.vars.WRITE_MODE = mode;
  config.routes = [{ pattern: "gomate.live", custom_domain: true }];
  writeFileSync(configPath, `${JSON.stringify(config)}\n`, { mode: 0o600 });
  console.log(`Prepared production Worker in ${mode} mode for gomate.live.`);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  const modeFlag = process.argv.indexOf("--mode");
  const mode = modeFlag >= 0 ? process.argv[modeFlag + 1] : undefined;
  const configPath = path.resolve(
    process.env.BUILT_WRANGLER_CONFIG ?? "frontend/dist/server/wrangler.json",
  );
  try {
    prepareProductionCutover({ configPath, mode });
  } catch (error) {
    console.error(`[production-cutover-config] ${error.message}`);
    process.exit(1);
  }
}
