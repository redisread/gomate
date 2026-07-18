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
// task #158：ja 纳入 key 一致性校验（此前仅 zh-CN/en，漏 ja 的 key  CI 不拦截）
const LOCALES = ["zh-CN", "en", "ja"];
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

// ─── Check 5 helpers: island ns coverage ────────────────────────────────────

const SRC_DIR = path.join(PROJECT_ROOT, "frontend", "src");
const PAGES_DIR = path.join(SRC_DIR, "pages");
// Layout.astro 对每页固定加载的基座 ns（见 Layout.astro nsList 拼接）
const BASE_NS = ["nav", "common", "content"];
const RESOLVE_EXTS = ["", ".tsx", ".ts", ".jsx", ".js", "/index.tsx", "/index.ts"];

function walkAstroPages(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkAstroPages(full));
    else if (entry.name.endsWith(".astro")) out.push(full);
  }
  return out;
}

/** 解析 import 来源到文件路径（@/ → src/，相对路径基于 fromFile） */
function resolveImport(spec, fromFile) {
  let base;
  if (spec.startsWith("@/")) base = path.join(SRC_DIR, spec.slice(2));
  else if (spec.startsWith(".")) base = path.resolve(path.dirname(fromFile), spec);
  else return null; // 包导入不跟踪
  for (const ext of RESOLVE_EXTS) {
    const candidate = base + ext;
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  return null;
}

/** 提取文件中的静态 import / export-from 来源（regex 级，够用于组件树追踪） */
function extractImportSpecs(code) {
  const specs = [];
  const re = /(?:import|export)[^'"]*?from\s*["']([^"']+)["']/g;
  let m;
  while ((m = re.exec(code))) specs.push(m[1]);
  return specs;
}

/** 提取 useI18n([...]) 字面量数组里的 ns 列表（先剥注释，防 JSDoc 示例误匹配） */
function extractUseI18nNs(code) {
  const stripped = code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
  const ns = new Set();
  const re = /useI18n\(\s*\[([^\]]*)\]/g;
  let m;
  while ((m = re.exec(stripped))) {
    for (const item of m[1].split(",")) {
      const v = item.trim().replace(/^["']|["']$/g, "");
      if (v) ns.add(v);
    }
  }
  return ns;
}

/**
 * 对每个页面：island 入口（带 client:* 指令的组件）传递闭包内所有
 * useI18n ns 必须 ⊆ declareI18nNs ∪ BASE_NS。
 */
function checkIslandNsCoverage() {
  let errCount = 0;
  const pages = walkAstroPages(PAGES_DIR);

  for (const page of pages) {
    const code = fs.readFileSync(page, "utf-8");
    const relPage = path.relative(PROJECT_ROOT, page);

    // 页面声明（可多次调用，合并）
    const declared = new Set(BASE_NS);
    const declRe = /declareI18nNs\(\s*Astro\.locals\s*,\s*\[([^\]]*)\]/g;
    let dm;
    while ((dm = declRe.exec(code))) {
      for (const item of dm[1].split(",")) {
        const v = item.trim().replace(/^["']|["']$/g, "");
        if (v) declared.add(v);
      }
    }

    // island 入口组件：带 client: 指令的大写标签
    const islandNames = new Set();
    const islandRe = /<([A-Z][A-Za-z0-9]*)[^>]*?client:(?:load|visible|idle|only|media)/g;
    let im;
    while ((im = islandRe.exec(code))) islandNames.add(im[1]);

    // 组件名 → import 来源
    const entryFiles = [];
    const importRe = /import\s+(?:([A-Z][A-Za-z0-9]*)\s*,?|\{([^}]*)\})\s*(?:[A-Z][A-Za-z0-9]*\s*,?\s*)?from\s*["']([^"']+)["']/g;
    let nm;
    while ((nm = importRe.exec(code))) {
      const names = [];
      if (nm[1]) names.push(nm[1]);
      if (nm[2]) names.push(...nm[2].split(",").map((s) => s.trim().split(/\s+as\s+/).pop()).filter(Boolean));
      if (names.some((n) => islandNames.has(n))) {
        const resolved = resolveImport(nm[3], page);
        if (resolved) entryFiles.push(resolved);
      }
    }

    // BFS 传递闭包，收集 useI18n ns
    const visited = new Set();
    const queue = [...entryFiles];
    const usedNs = new Map(); // ns -> first file using it
    while (queue.length) {
      const file = queue.shift();
      if (visited.has(file) || !file.endsWith(".tsx") && !file.endsWith(".ts")) continue;
      visited.add(file);
      const fcode = fs.readFileSync(file, "utf-8");
      for (const ns of extractUseI18nNs(fcode)) {
        if (!usedNs.has(ns)) usedNs.set(ns, path.relative(PROJECT_ROOT, file));
      }
      for (const spec of extractImportSpecs(fcode)) {
        const resolved = resolveImport(spec, file);
        if (resolved && !visited.has(resolved)) queue.push(resolved);
      }
    }

    for (const [ns, usedIn] of usedNs) {
      if (!declared.has(ns)) {
        log("error", `${relPage}: island 使用 ns "${ns}"（${usedIn}）但页面未 declareI18nNs`);
        errCount++;
      }
    }
  }
  return errCount;
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

  // ── Check 5: Island Namespace Coverage ──
  // task #158：island 组件树里 useI18n 声明的 ns 必须 ⊆ 页面 declareI18nNs ∪ 基座三件套，
  // 否则 SSR 数据缺口导致 hydration mismatch（task #162 事故的静态防线）。
  console.log("\n── Island Namespace Coverage ──");
  const nsErrors = checkIslandNsCoverage();
  if (nsErrors === 0) {
    console.log("  ✓ All island namespaces covered by page declarations");
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
