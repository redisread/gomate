#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(
  process.env.GOMATE_LEGACY_CHECK_ROOT ??
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."),
);

const removedPaths = [
  "packages/mcp",
  "api/src/routes/v1",
  "api/src/routes/activity-posts.ts",
  "api/src/routes/cities.ts",
  "api/src/routes/shares.ts",
  "api/src/routes/admin.ts",
  "api/src/lib/audit.ts",
  "api/src/lib/idempotency.ts",
  "api/src/lib/team-status.ts",
  "api/src/services/share-image/resvg.wasm",
  "api/wrangler.toml",
  "api/.dev.vars.example",
  "frontend/wrangler.toml",
  "frontend/.env.local.example",
  "frontend/.env.production",
  ".github/workflows/api-deploy.yml",
  ".github/workflows/frontend-deploy.yml",
  ".github/workflows/lighthouse-frontend.yml",
  "e2e/v1-read-endpoints.spec.ts",
  "frontend/src/components/features/activity-posts",
  "frontend/src/components/features/api-keys-client.tsx",
  "frontend/src/components/ui/city-select.tsx",
  "frontend/src/lib/cities.ts",
  "frontend/src/lib/cities.test.ts",
  "frontend/src/worker.js",
  "frontend/src/pages/settings/api-keys.astro",
  "packages/lib/src/geo-city-center.ts",
  "packages/lib/src/geo-fallback.ts",
];

const ignoredDirectories = new Set([
  ".git",
  ".pnpm-store",
  ".wrangler",
  ".astro",
  ".codex",
  ".agents",
  "coverage",
  "dist",
  "dist-worker",
  "node_modules",
  "notes",
  "tasks",
]);

const ignoredFiles = new Set([
  "docs/database-design-v2.md",
  "docs/database-schema.md",
  "docs/prod-change-policy.md",
  "scripts/check-legacy-removal.mjs",
  "scripts/check-legacy-removal.test.mjs",
]);

const textExtensions = new Set([
  ".astro",
  ".cjs",
  ".js",
  ".json",
  ".jsonc",
  ".jsx",
  ".md",
  ".mjs",
  ".mts",
  ".sql",
  ".toml",
  ".ts",
  ".tsx",
  ".yaml",
  ".yml",
]);

const forbiddenContent = [
  ["Better Auth API-key package", /@better-auth\/api-key/i],
  ["API-key client plugin", /\bapiKeyClient\b/],
  ["API-key auth plugin", /\bapiKey\s*\(/],
  ["API-key schema/model", /\bapiKeys\b/],
  ["API-key actor field", /actor_?api_?key|actorApiKeyId/i],
  ["API-key request header", /x-api-key/i],
  ["API-key value prefix", /gm_live_/i],
  ["API-key route or settings path", /\/(?:auth\/)?api-key(?:s)?(?:\/|\b)/i],
  ["MCP workspace/package", /(?:packages\/mcp|@gomate\/mcp)/i],
  ["public v1 route/module", /(?:routes\/v1|\/v1(?:\/|\*|\b))/i],
];

const operationalForbiddenContent = [
  ["split-deployment browser API base", /\bPUBLIC_API_URL\b/],
  ["split API development port", /\bGOMATE_API_PORT\b|localhost:8799/],
  ["legacy API origin", /https:\/\/api\.gomate\.live/],
  ["legacy API secret file", /api\/\.dev\.vars/],
  ["legacy frontend environment file", /frontend\/\.env\.local/],
  ["legacy Worker binding", /\bGOMATE_KV\b|\bFRONTEND_URL\b|\bCORS_ALLOWED_ORIGINS\b|\bBETTER_AUTH_URL\b/],
  ["removed route path", /\/(?:shares\/track|activity-posts|cities)(?:\/|\b)/],
  ["removed schema relation", /schema\.(?:cities|activityPosts|shareEvents|userFavorites|entityToTags|apiKeys)\b/],
  ["removed lifecycle mutation", /\bupdateExpiredTeams\b/],
  ["forbidden Astro session", /\bAstro\.session\b/],
  ["removed resvg runtime", /@resvg\/resvg-wasm/],
  ["legacy Worker name", /\bgomate-(?:api|frontend)\b/],
  ["legacy D1 name", /\bgomate-db(?!-v2)\b/],
];

function isOperationalFile(relativePath) {
  return (
    relativePath === "package.json" ||
    relativePath === "playwright.config.ts" ||
    relativePath.startsWith(".github/workflows/") ||
    relativePath.startsWith("scripts/") ||
    relativePath.startsWith("e2e/") ||
    relativePath.startsWith("api/src/") ||
    relativePath === "api/package.json" ||
    relativePath.startsWith("frontend/src/") ||
    relativePath === "frontend/package.json" ||
    relativePath === "frontend/wrangler.jsonc"
  );
}

function isDatabaseDefinitionFile(relativePath) {
  return (
    relativePath.endsWith(".sql") ||
    relativePath === "api/src/db/schema.ts" ||
    /^api\/db\/migrations\/meta\/\d+_snapshot\.json$/u.test(relativePath)
  );
}

function collectTextFiles(directory, relativeDirectory = "") {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;

    const relativePath = path.join(relativeDirectory, entry.name);
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectTextFiles(absolutePath, relativePath));
    } else if (
      entry.isFile() &&
      textExtensions.has(path.extname(entry.name)) &&
      !ignoredFiles.has(relativePath) &&
      !relativePath.startsWith("frontend/.wrangler.dev.")
    ) {
      files.push(relativePath);
    }
  }
  return files;
}

const violations = [];

for (const removedPath of removedPaths) {
  const absolutePath = path.join(root, removedPath);
  if (existsSync(absolutePath)) {
    violations.push(`${removedPath}: removed path still exists`);
  }
}

const textFiles = collectTextFiles(root);
const wranglerConfigs = textFiles.filter((relativePath) =>
  /^wrangler\.(?:json|jsonc|toml)$/u.test(path.basename(relativePath)),
);
if (
  wranglerConfigs.length !== 1 ||
  wranglerConfigs[0] !== path.join("frontend", "wrangler.jsonc")
) {
  violations.push(
    `Wrangler config set must be exactly frontend/wrangler.jsonc; found: ${wranglerConfigs.join(", ") || "none"}`,
  );
}

for (const relativePath of textFiles) {
  const lines = readFileSync(path.join(root, relativePath), "utf8").split(/\r?\n/);
  lines.forEach((line, index) => {
    if (isDatabaseDefinitionFile(relativePath) && /\bapikeys?\b/iu.test(line)) {
      violations.push(
        `${relativePath}:${index + 1}: legacy singular API-key identifier`,
      );
    }
    for (const [label, pattern] of forbiddenContent) {
      if (pattern.test(line)) {
        violations.push(`${relativePath}:${index + 1}: ${label}`);
      }
    }
    if (isOperationalFile(relativePath)) {
      for (const [label, pattern] of operationalForbiddenContent) {
        if (pattern.test(line)) {
          violations.push(`${relativePath}:${index + 1}: ${label}`);
        }
      }
    }
  });
}

if (violations.length > 0) {
  console.error(`Legacy removal check failed with ${violations.length} violation(s):`);
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

console.log("Legacy split deployment, MCP, public v1, API-key, and removed route surfaces are absent.");
