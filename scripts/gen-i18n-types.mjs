#!/usr/bin/env node
/**
 * Generate TypeScript type definitions for i18n translation keys.
 *
 * Reads all namespace JSON files from public/locales/zh-CN/
 * Outputs a TypeScript file with:
 *   - TranslationKey type (union of all "ns.keyPath" strings)
 *   - NamespacedKeys type map
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const LOCALES_DIR = path.join(PROJECT_ROOT, "public", "locales", "zh-CN");
const OUTPUT_FILE = path.join(PROJECT_ROOT, "src", "i18n", "types.ts");

/**
 * Collect all leaf key paths from a nested object.
 */
function collectKeys(obj, prefix = "") {
  const keys = [];
  for (const k of Object.keys(obj)) {
    const full = prefix ? `${prefix}.${k}` : k;
    if (typeof obj[k] === "object" && obj[k] !== null && !Array.isArray(obj[k])) {
      keys.push(...collectKeys(obj[k], full));
    } else {
      keys.push(full);
    }
  }
  return keys;
}

function main() {
  // Read all JSON files
  const files = fs
    .readdirSync(LOCALES_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort();

  const allKeys = [];
  const nsKeyMap = {};

  for (const file of files) {
    const nsName = file.replace(".json", "");
    const content = JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, file), "utf-8"));
    const keys = collectKeys(content);
    allKeys.push(...keys.map((k) => `${nsName}.${k}`));
    nsKeyMap[nsName] = keys;
  }

  // Build TypeScript output
  const lines = [
    "/**",
    " * Auto-generated i18n translation key types.",
    " * DO NOT EDIT MANUALLY. Run `pnpm i18n:gen-types` to regenerate.",
    " */",
    "",
    "// ─── All translation keys ────────────────────────────────────────────────",
    "",
    "/** Union of all valid translation keys (namespace.keyPath format) */",
    `export type TranslationKey =`,
    ...allKeys.map((k) => `  | "${k}"`),
    "  ;",
    "",
    "// ─── Namespace-keyed map ─────────────────────────────────────────────────",
    "",
    "/** Map of namespace -> its available keys */",
    "export type NamespacedKeys = {",
  ];

  for (const [ns, keys] of Object.entries(nsKeyMap)) {
    lines.push(`  ${ns}: ${keys.map((k) => `"${k}"`).join(" | ")};`);
  }

  lines.push("};", "");

  fs.writeFileSync(OUTPUT_FILE, lines.join("\n"), "utf-8");
  console.log(`Generated ${allKeys.length} translation keys -> ${OUTPUT_FILE}`);
}

main();
