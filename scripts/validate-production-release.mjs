#!/usr/bin/env node
/** Validate the live single-Worker release before any Cloudflare mutation. */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONFIG_PATH = path.join(ROOT, "frontend", "wrangler.jsonc");
const BUILT_CONFIG_PATH = path.join(
  ROOT,
  "frontend",
  "dist",
  "server",
  "wrangler.json",
);
const WORKER_NAME = "gomate";
const COMPATIBILITY_DATE = "2026-06-18";
const D1_ID = "befa3d89-6551-4a25-8a1c-670efe62a315";
const KV_ID = "f9904d1fa72140c18067e07d541ca92b";
const CLOUDFLARE_ID_PATTERN = /^[0-9a-f]{32}$/iu;
const REQUIRED_FLAGS = ["global_fetch_strictly_public", "nodejs_compat"];
const REQUIRED_ROUTE = [{ pattern: "gomate.live", custom_domain: true }];
const API_ASSET_PATTERNS = ["/api", "/api/*"];
const AUTH_RATE_LIMITS = [
  ["AUTH_SIGN_IN_RATE_LIMITER", "26081", 5],
  ["AUTH_SIGN_UP_RATE_LIMITER", "26082", 3],
  ["AUTH_EMAIL_RATE_LIMITER", "26083", 5],
];

function requiredEnv(env, name) {
  const value = env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

export function validateProductionOrigin(value) {
  const url = new URL(value);
  if (url.href !== "https://gomate.live/") {
    throw new Error("Production origin must be exactly https://gomate.live");
  }
  return "https://gomate.live";
}

function findBinding(bindings, binding) {
  return bindings?.find((candidate) => candidate?.binding === binding);
}

function validateBindings(config, label) {
  const database = findBinding(config.d1_databases, "DB");
  const cache = findBinding(config.kv_namespaces, "CACHE_KV");
  const bucket = findBinding(config.r2_buckets, "R2");
  if (
    config.d1_databases?.length !== 1 ||
    database?.database_name !== "gomate-db-v2" ||
    database?.database_id !== D1_ID
  ) {
    throw new Error(`${label} DB binding does not match gomate-db-v2`);
  }
  if (config.kv_namespaces?.length !== 1 || cache?.id !== KV_ID) {
    throw new Error(`${label} CACHE_KV binding does not match production`);
  }
  if (config.r2_buckets?.length !== 1 || bucket?.bucket_name !== "gomate") {
    throw new Error(`${label} R2 binding does not match production`);
  }

  const requiredSecrets = new Set(config.secrets?.required ?? []);
  for (const name of ["BETTER_AUTH_SECRET", "RESEND_API_KEY", "APP_URL"]) {
    if (!requiredSecrets.has(name)) {
      throw new Error(`${label} secrets.required is missing ${name}`);
    }
  }
}

function validateObservability(config, label) {
  const logs = config.observability?.logs;
  const traces = config.observability?.traces;
  if (
    config.observability?.enabled !== true ||
    logs?.enabled !== true ||
    logs?.head_sampling_rate !== 1 ||
    logs?.invocation_logs !== true ||
    logs?.persist !== true ||
    traces?.enabled !== true ||
    traces?.head_sampling_rate !== 0.1 ||
    traces?.persist !== true
  ) {
    throw new Error(`${label} observability configuration is incomplete`);
  }
}

function validateRateLimits(config, label) {
  if (config.ratelimits?.length !== AUTH_RATE_LIMITS.length) {
    throw new Error(`${label} must contain exactly three auth rate limits`);
  }
  for (const [name, namespaceId, limit] of AUTH_RATE_LIMITS) {
    const binding = config.ratelimits.find((item) => item?.name === name);
    if (
      binding?.namespace_id !== namespaceId ||
      binding?.simple?.limit !== limit ||
      binding?.simple?.period !== 60
    ) {
      throw new Error(`${label} ${name} does not match production`);
    }
  }
}

function validateRuntime(config, label, assetsDirectory, allowPlainAppUrl) {
  if (config.compatibility_date !== COMPATIBILITY_DATE) {
    throw new Error(
      `${label} compatibility_date must be ${COMPATIBILITY_DATE}`,
    );
  }
  const flags = [...(config.compatibility_flags ?? [])].sort();
  if (JSON.stringify(flags) !== JSON.stringify(REQUIRED_FLAGS)) {
    throw new Error(`${label} compatibility flags do not match production`);
  }
  if (
    config.assets?.directory !== assetsDirectory ||
    config.assets?.binding !== "ASSETS" ||
    JSON.stringify(config.assets?.run_worker_first) !==
      JSON.stringify(API_ASSET_PATTERNS)
  ) {
    throw new Error(`${label} assets must dispatch /api through the Worker`);
  }
  if (!allowPlainAppUrl && Object.hasOwn(config.vars ?? {}, "APP_URL")) {
    throw new Error(`${label} APP_URL must remain a secret`);
  }
  if (config.version_metadata?.binding !== "CF_VERSION_METADATA") {
    throw new Error(`${label} must expose CF_VERSION_METADATA`);
  }
  validateObservability(config, label);
  validateRateLimits(config, label);
}

function validateProductionState(config, label) {
  if (config.name !== WORKER_NAME) {
    throw new Error(`${label} Worker name must be ${WORKER_NAME}`);
  }
  if (JSON.stringify(config.routes) !== JSON.stringify(REQUIRED_ROUTE)) {
    throw new Error(`${label} must declare only the gomate.live custom domain`);
  }
  if (config.vars?.WRITE_MODE !== "open") {
    throw new Error(`${label} WRITE_MODE must be open`);
  }
  if (config.workers_dev !== true || config.preview_urls !== false) {
    throw new Error(`${label} must keep workers.dev and disable preview URLs`);
  }
}

export function validateProductionRelease({
  configPath = CONFIG_PATH,
  env = process.env,
} = {}) {
  if (env.CLOUDFLARE_ENV !== "production") {
    throw new Error("CLOUDFLARE_ENV must be production");
  }
  if (env.GITHUB_REF && env.GITHUB_REF !== "refs/heads/main") {
    throw new Error("Production release must run from refs/heads/main");
  }
  validateProductionOrigin(requiredEnv(env, "PRODUCTION_APP_URL"));
  if (requiredEnv(env, "BETTER_AUTH_SECRET").length < 32) {
    throw new Error("BETTER_AUTH_SECRET must contain at least 32 characters");
  }
  requiredEnv(env, "RESEND_API_KEY");
  requiredEnv(env, "CLOUDFLARE_API_TOKEN");
  for (const name of ["CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_ZONE_ID"]) {
    if (!CLOUDFLARE_ID_PATTERN.test(requiredEnv(env, name))) {
      throw new Error(`${name} must be a 32-character Cloudflare ID`);
    }
  }

  const config = JSON.parse(readFileSync(configPath, "utf8"));
  const production = config.env?.production;
  if (config.name !== "gomate" || config.main !== "./src/worker.ts") {
    throw new Error("Source must keep the unified local Worker entrypoint");
  }
  validateRuntime(config, "Source", "./dist", true);
  const resolvedProduction = {
    ...config,
    ...production,
    compatibility_date:
      production?.compatibility_date ?? config.compatibility_date,
    compatibility_flags:
      production?.compatibility_flags ?? config.compatibility_flags,
  };
  validateProductionState(resolvedProduction, "Production");
  validateRuntime(resolvedProduction, "Production", "./dist", false);
  validateBindings(production, "Production");
  console.log("Production release inputs are valid.");
}

export function validateBuiltProductionRelease({
  configPath = BUILT_CONFIG_PATH,
} = {}) {
  const config = JSON.parse(readFileSync(configPath, "utf8"));
  if (config.targetEnvironment !== "production") {
    throw new Error("Built Worker must resolve the production environment");
  }
  if (config.main !== "entry.mjs" || config.no_bundle !== true) {
    throw new Error("Built Worker must use Astro's no-bundle entry.mjs output");
  }
  validateProductionState(config, "Built production");
  validateRuntime(config, "Built production", "../client", false);
  validateBindings(config, "Built production");
  console.log("Built Astro Worker matches the live production release.");
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  try {
    validateProductionRelease();
    validateBuiltProductionRelease();
  } catch (error) {
    console.error(`[production-release-validation] ${error.message}`);
    process.exit(1);
  }
}
