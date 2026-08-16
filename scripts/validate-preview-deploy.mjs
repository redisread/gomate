#!/usr/bin/env node
/** Validate protected preview inputs before any Cloudflare write occurs. */

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
const PREVIEW_WORKER_NAME = "gomate-production-preview";
const COMPATIBILITY_DATE = "2026-06-18";
const REQUIRED_COMPATIBILITY_FLAGS = [
  "global_fetch_strictly_public",
  "nodejs_compat",
];
const API_ASSET_PATTERNS = ["/api", "/api/*"];
const LOG_SAMPLING_RATE = 1;
const TRACE_SAMPLING_RATE = 0.1;
const D1_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const KV_ID_PATTERN = /^[0-9a-f]{32}$/iu;
const AUTH_RATE_LIMITS = [
  ["AUTH_SIGN_IN_RATE_LIMITER", "26081", 5],
  ["AUTH_SIGN_UP_RATE_LIMITER", "26082", 3],
  ["AUTH_EMAIL_RATE_LIMITER", "26083", 5],
];

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function findBinding(bindings, name) {
  return bindings?.find((binding) => binding?.binding === name);
}

function validateResolvedBindings(config, label) {
  if (
    config.d1_databases?.length !== 1 ||
    config.kv_namespaces?.length !== 1 ||
    config.r2_buckets?.length !== 1
  ) {
    throw new Error(`${label} must contain exactly one DB, CACHE_KV and R2 binding`);
  }
  const databaseBinding = findBinding(config.d1_databases, "DB");
  const databaseId = databaseBinding?.database_id;
  const namespaceId = findBinding(config.kv_namespaces, "CACHE_KV")?.id;
  const r2Binding = findBinding(config.r2_buckets, "R2");
  if (databaseBinding?.database_name !== "gomate-db-v2") {
    throw new Error(`${label} DB binding must target gomate-db-v2`);
  }
  if (!D1_ID_PATTERN.test(databaseId ?? "")) {
    throw new Error(`${label} DB binding must contain a reviewed D1 UUID`);
  }
  if (!KV_ID_PATTERN.test(namespaceId ?? "")) {
    throw new Error(`${label} CACHE_KV binding must contain a reviewed namespace ID`);
  }
  if (r2Binding?.bucket_name !== "gomate") {
    throw new Error(`${label} R2 binding must target the reviewed gomate bucket`);
  }

  const requiredSecrets = new Set(config.secrets?.required ?? []);
  for (const name of ["BETTER_AUTH_SECRET", "RESEND_API_KEY", "APP_URL"]) {
    if (!requiredSecrets.has(name)) {
      throw new Error(`${label} secrets.required is missing ${name}`);
    }
  }
}

function validateObservability(config, label) {
  const observability = config.observability;
  const logs = observability?.logs;
  const traces = observability?.traces;
  if (
    observability?.enabled !== true ||
    logs?.enabled !== true ||
    logs?.head_sampling_rate !== LOG_SAMPLING_RATE ||
    logs?.invocation_logs !== true ||
    logs?.persist !== true ||
    traces?.enabled !== true ||
    traces?.head_sampling_rate !== TRACE_SAMPLING_RATE ||
    traces?.persist !== true
  ) {
    throw new Error(
      `${label} observability must persist all logs and sample 10% of traces`,
    );
  }
}

function validateAuthRateLimits(config, label) {
  const actual = config.ratelimits ?? [];
  if (actual.length !== AUTH_RATE_LIMITS.length) {
    throw new Error(`${label} must contain exactly three auth rate limit bindings`);
  }
  for (const [name, namespaceId, limit] of AUTH_RATE_LIMITS) {
    const binding = actual.find((candidate) => candidate?.name === name);
    if (
      binding?.namespace_id !== namespaceId ||
      binding?.simple?.limit !== limit ||
      binding?.simple?.period !== 60
    ) {
      throw new Error(`${label} ${name} does not match the reviewed rate limit`);
    }
  }
}

function validateUnifiedRuntime(
  config,
  label,
  assetsDirectory,
  { allowPlainAppUrl = false } = {},
) {
  if (config.compatibility_date !== COMPATIBILITY_DATE) {
    throw new Error(`${label} compatibility_date must be ${COMPATIBILITY_DATE}`);
  }
  const flags = [...(config.compatibility_flags ?? [])].sort();
  if (JSON.stringify(flags) !== JSON.stringify(REQUIRED_COMPATIBILITY_FLAGS)) {
    throw new Error(`${label} compatibility flags do not match the reviewed set`);
  }
  if (
    config.assets?.directory !== assetsDirectory ||
    config.assets?.binding !== "ASSETS" ||
    JSON.stringify(config.assets?.run_worker_first) !==
      JSON.stringify(API_ASSET_PATTERNS)
  ) {
    throw new Error(`${label} assets must dispatch /api through the unified Worker`);
  }
  if (!allowPlainAppUrl && Object.hasOwn(config.vars ?? {}, "APP_URL")) {
    throw new Error(`${label} APP_URL must be supplied as a secret, not a plain variable`);
  }
  validateObservability(config, label);
  validateAuthRateLimits(config, label);
}

export function validatePreviewDeploy({ configPath = CONFIG_PATH } = {}) {
  if (process.env.CLOUDFLARE_ENV !== "production") {
    throw new Error("CLOUDFLARE_ENV must be production");
  }
  if (process.env.GITHUB_REF && process.env.GITHUB_REF !== "refs/heads/main") {
    throw new Error("Preview deployment must run from refs/heads/main");
  }

  const previewUrl = new URL(requiredEnv("PREVIEW_APP_URL"));
  if (
    previewUrl.protocol !== "https:" ||
    !/^gomate-production-preview\.[a-z0-9-]+\.workers\.dev$/u.test(
      previewUrl.hostname,
    ) ||
    previewUrl.pathname !== "/" ||
    previewUrl.search ||
    previewUrl.hash ||
    previewUrl.username ||
    previewUrl.password ||
    previewUrl.port
  ) {
    throw new Error(
      "PREVIEW_APP_URL must be the exact gomate-production-preview workers.dev origin",
    );
  }

  if (requiredEnv("BETTER_AUTH_SECRET").length < 32) {
    throw new Error("BETTER_AUTH_SECRET must contain at least 32 characters");
  }
  requiredEnv("RESEND_API_KEY");
  requiredEnv("CLOUDFLARE_API_TOKEN");
  for (const name of ["CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_ZONE_ID"]) {
    if (!KV_ID_PATTERN.test(requiredEnv(name))) {
      throw new Error(`${name} must be a 32-character Cloudflare ID`);
    }
  }

  const config = JSON.parse(readFileSync(configPath, "utf8"));
  const production = config.env?.production;
  if (config.name !== "gomate") {
    throw new Error("Top-level local Worker name must remain gomate");
  }
  if (config.main !== "./src/worker.ts") {
    throw new Error("Unified Worker main must remain ./src/worker.ts");
  }
  if (production?.name !== PREVIEW_WORKER_NAME) {
    throw new Error(`Production environment name must be ${PREVIEW_WORKER_NAME}`);
  }
  if (
    "route" in config ||
    "routes" in config ||
    "route" in production ||
    "routes" in production
  ) {
    throw new Error("Preview configuration must not contain route or routes");
  }
  if (production.vars?.WRITE_MODE !== "protected") {
    throw new Error("Preview WRITE_MODE must remain protected");
  }
  if (config.workers_dev !== true || config.preview_urls !== false) {
    throw new Error("Preview must use workers.dev with version preview URLs disabled");
  }

  validateUnifiedRuntime(config, "Source", "./dist", {
    allowPlainAppUrl: true,
  });
  validateUnifiedRuntime(
    {
      ...config,
      ...production,
      compatibility_date:
        production.compatibility_date ?? config.compatibility_date,
      compatibility_flags:
        production.compatibility_flags ?? config.compatibility_flags,
    },
    "Production",
    "./dist",
  );
  validateResolvedBindings(production, "Production");

  console.log("Protected preview deployment inputs are valid.");
}

export function validateBuiltPreview({ configPath = BUILT_CONFIG_PATH } = {}) {
  const config = JSON.parse(readFileSync(configPath, "utf8"));
  if (config.name !== PREVIEW_WORKER_NAME) {
    throw new Error(`Built Worker name must be ${PREVIEW_WORKER_NAME}`);
  }
  if (config.targetEnvironment !== "production") {
    throw new Error("Built Worker must resolve the production Wrangler environment");
  }
  if (config.main !== "entry.mjs" || config.no_bundle !== true) {
    throw new Error("Built Worker must use Astro's no-bundle entry.mjs output");
  }
  if ("route" in config || "routes" in config) {
    throw new Error("Built preview must not contain route or routes");
  }
  if (config.vars?.WRITE_MODE !== "protected") {
    throw new Error("Built preview WRITE_MODE must remain protected");
  }
  if (config.workers_dev !== true || config.preview_urls !== false) {
    throw new Error("Built preview must target workers.dev without version preview URLs");
  }
  validateUnifiedRuntime(config, "Built production", "../client");
  validateResolvedBindings(config, "Built production");
  console.log("Built Astro Worker resolves to the protected production preview.");
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  try {
    validatePreviewDeploy();
    validateBuiltPreview();
  } catch (error) {
    console.error(`[preview-deploy-validation] ${error.message}`);
    process.exit(1);
  }
}
