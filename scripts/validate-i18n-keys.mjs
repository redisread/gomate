#!/usr/bin/env node
/**
 * Validate i18n key consistency across all locales.
 *
 * Checks:
 * 1. Key consistency: all locales must have identical keys per namespace
 * 2. Nested depth: no key path exceeds 3 levels deep
 * 3. Empty values: detect empty strings, null, undefined
 * 4. Missing files: namespace present in one locale but missing in another
 *
 * Exit code 0 = pass, 1 = fail.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const LOCALES_DIR = path.join(PROJECT_ROOT, "frontend", "public", "locales");
const LOCALES = ["zh-CN", "en"];
const BASE_LOCALE = "zh-CN";

let errors = 0;
let warnings = 0;

function log(type, msg) {
  const prefix = type === "error" ? "✗" : type === "warn" ? "⚠" : "✓";
  console.log(`  ${prefix} ${msg}`);
  if (type === "error") errors++;
  else warnings++;
}

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

/**
 * Check max nesting depth (max 3 levels).
 */
function checkDepth(obj, prefix = "", maxDepth = 3) {
  const deep = [];
  for (const k of Object.keys(obj)) {
    const full = prefix ? `${prefix}.${k}` : k;
    const parts = full.split(".");
    if (parts.length > maxDepth) {
      deep.push(full);
    }
    if (typeof obj[k] === "object" && obj[k] !== null && !Array.isArray(obj[k])) {
      deep.push(...checkDepth(obj[k], full, maxDepth));
    }
  }
  return deep;
}

/**
 * Check for empty/null values.
 */
function checkEmptyValues(obj, prefix = "") {
  const empty = [];
  for (const k of Object.keys(obj)) {
    const full = prefix ? `${prefix}.${k}` : k;
    if (obj[k] === "" || obj[k] === null || obj[k] === undefined) {
      empty.push({ key: full, value: obj[k] });
    } else if (typeof obj[k] === "object" && !Array.isArray(obj[k])) {
      empty.push(...checkEmptyValues(obj[k], full));
    }
  }
  return empty;
}

function loadJSON(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return null;
  }
}

function main() {
  console.log("=== i18n Key Validation ===\n");

  // Read all namespace files from base locale
  const baseDir = path.join(LOCALES_DIR, BASE_LOCALE);
  if (!fs.existsSync(baseDir)) {
    console.log(`✗ Base locale directory not found: ${baseDir}`);
    process.exit(1);
  }

  const nsFiles = fs.readdirSync(baseDir).filter((f) => f.endsWith(".json")).sort();

  if (nsFiles.length === 0) {
    console.log("✗ No namespace JSON files found");
    process.exit(1);
  }

  console.log(`Checking ${nsFiles.length} namespaces across ${LOCALES.length} locales...\n`);

  // ── Check 1: Key Consistency ──
  console.log("── Key Consistency ──");
  for (const file of nsFiles) {
    const nsName = file.replace(".json", "");
    const baseData = loadJSON(path.join(baseDir, file));
    if (!baseData) {
      log("error", `${BASE_LOCALE}/${file}: failed to parse JSON`);
      continue;
    }
    const baseKeys = new Set(collectKeys(baseData));

    for (const locale of LOCALES) {
      if (locale === BASE_LOCALE) continue;
      const localeFile = path.join(LOCALES_DIR, locale, file);
      if (!fs.existsSync(localeFile)) {
        log("error", `${locale}/${file}: file missing`);
        continue;
      }
      const localeData = loadJSON(localeFile);
      if (!localeData) {
        log("error", `${locale}/${file}: failed to parse JSON`);
        continue;
      }
      const localeKeys = new Set(collectKeys(localeData));
      const missing = [...baseKeys].filter((k) => !localeKeys.has(k));
      const extra = [...localeKeys].filter((k) => !baseKeys.has(k));

      if (missing.length > 0) {
        log("error", `${locale}/${nsName}: missing ${missing.length} keys`);
        missing.slice(0, 3).forEach((k) => log("error", `  - ${k}`));
        if (missing.length > 3) log("warn", `  ... and ${missing.length - 3} more`);
      }
      if (extra.length > 0) {
        log("warn", `${locale}/${nsName}: ${extra.length} extra keys not in base`);
        extra.slice(0, 3).forEach((k) => log("warn", `  + ${k}`));
      }
    }
  }

  // ── Check 2: Missing Files ──
  console.log("\n── Missing Files ──");
  for (const locale of LOCALES) {
    if (locale === BASE_LOCALE) continue;
    const localeDir = path.join(LOCALES_DIR, locale);
    for (const file of nsFiles) {
      if (!fs.existsSync(path.join(localeDir, file))) {
        log("error", `${locale}/${file}: missing`);
      }
    }
  }
  if (errors === 0) {
    console.log("  ✓ All namespace files present");
  }

  // ── Check 3: Nesting Depth ──
  console.log("\n── Nesting Depth (max 3) ──");
  let depthErrors = 0;
  for (const file of nsFiles) {
    const baseData = loadJSON(path.join(baseDir, file));
    if (!baseData) continue;
    const deep = checkDepth(baseData);
    if (deep.length > 0) {
      log("warn", `${file}: ${deep.length} keys exceed 3 levels`);
      deep.slice(0, 3).forEach((k) => log("warn", `  ${k} (${k.split(".").length} levels)`));
      depthErrors += deep.length;
    }
  }
  if (depthErrors === 0) {
    console.log("  ✓ All keys within 3 levels");
  }

  // ── Check 4: Empty Values ──
  console.log("\n── Empty Values ──");
  let emptyCount = 0;
  for (const locale of LOCALES) {
    const localeDir = path.join(LOCALES_DIR, locale);
    for (const file of fs.readdirSync(localeDir).filter((f) => f.endsWith(".json"))) {
      const data = loadJSON(path.join(localeDir, file));
      if (!data) continue;
      const empty = checkEmptyValues(data);
      if (empty.length > 0) {
        log("warn", `${locale}/${file}: ${empty.length} empty/null values`);
        empty.slice(0, 3).forEach((e) => log("warn", `  "${e.key}" = ${JSON.stringify(e.value)}`));
        emptyCount += empty.length;
      }
    }
  }
  if (emptyCount === 0) {
    console.log("  ✓ No empty or null values");
  }

  // ── Summary ──
  console.log(`\n── Summary ──`);
  console.log(`  Errors: ${errors}`);
  console.log(`  Warnings: ${warnings}`);

  if (errors > 0) {
    console.log("\n✗ Validation failed");
    process.exit(1);
  } else {
    console.log("\n✓ Validation passed");
    process.exit(0);
  }
}

main();
