#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SOURCE_ROOTS = [
  "src/pages/admin",
  "src/components/admin",
  "src/components/features/location-form",
];
const SOURCE_FILES = [
  "src/components/features/location-edit-client.tsx",
  "src/layouts/AdminLayout.astro",
  "src/pages/403.astro",
];
const SOURCE_EXTENSIONS = new Set([".astro", ".tsx", ".ts"]);
const RETIRED_KEY_PATTERN =
  /admin\.(?:seasons\.[a-z]+|status(?:Draft|Published|Archived))/gu;
const UNSAFE_HELPER_PATTERN =
  /\b(?:getApiErrorMessage|apiPost|apiPut|apiPatch|apiDelete)\b|\b(?:error|cause)\.message\b/gu;
const RAW_ADMIN_LOCALE_PATTERN =
  /(?:\b(?:const|let)\s+\w+\s*(?::[^=;\n]+)?\s*=\s*Astro\.locals\.locale\b|\bloadLocaleData\s*\([\s\S]{0,300}\bAstro\.locals\.locale\b)/gu;
const RAW_ENUM_PATTERN = /\{\s*(?:user|location)\.(?:role|status)\s*\}/gu;
const STATIC_KEY_PATTERN = /\bt\(\s*["']((?:admin|enums)\.[^"']+)["']/gu;
const LITERAL_TITLE_PATTERN =
  /<AdminLayout\b[^>]*\btitle\s*=\s*["'][^"']+["']/gu;
const JSX_TEXT_PATTERN =
  /<([A-Za-z][\w.:-]*)\b[^<]*>\s*([^<{\n][^<{\n]*?)\s*<\/\1>/gu;
const UI_ATTRIBUTE_PATTERN =
  /\b(?:aria-label|title|placeholder)\s*=\s*["']([^"']+)["']/gu;
const NATURAL_LANGUAGE_PATTERN =
  /[A-Za-z\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u;
const TECHNICAL_PLACEHOLDER_PATTERN =
  /^(?:https?:\/\/|[-+]?\d+(?:\.\d+)?|[\w.-]+@[\w.-]+)$/u;

function lineNumber(code, index) {
  return code.slice(0, index).split("\n").length;
}

function addMatches(issues, { code, filePath, pattern, rule, message }) {
  pattern.lastIndex = 0;
  let match;
  while ((match = pattern.exec(code))) {
    issues.push({
      filePath,
      line: lineNumber(code, match.index),
      rule,
      message,
    });
  }
}

function isNaturalUiCopy(value) {
  const normalized = value.trim();
  return (
    normalized.length > 0 &&
    NATURAL_LANGUAGE_PATTERN.test(normalized) &&
    !TECHNICAL_PLACEHOLDER_PATTERN.test(normalized)
  );
}

export function auditAdminI18nSource({ filePath, code, localeKeys }) {
  const issues = [];

  addMatches(issues, {
    code,
    filePath,
    pattern: LITERAL_TITLE_PATTERN,
    rule: "literal_admin_title",
    message: "AdminLayout title must use a translation key",
  });
  addMatches(issues, {
    code,
    filePath,
    pattern: RETIRED_KEY_PATTERN,
    rule: "retired_admin_key",
    message:
      "Use the shared enums namespace instead of a retired admin enum key",
  });
  addMatches(issues, {
    code,
    filePath,
    pattern: RAW_ENUM_PATTERN,
    rule: "raw_admin_enum",
    message:
      "Map administrator role and status values to exhaustive translation keys",
  });
  addMatches(issues, {
    code,
    filePath,
    pattern: UNSAFE_HELPER_PATTERN,
    rule: "unsafe_admin_error_helper",
    message:
      "Administrator UI must use the message-isolating admin i18n helper",
  });
  addMatches(issues, {
    code,
    filePath,
    pattern: RAW_ADMIN_LOCALE_PATTERN,
    rule: "unresolved_admin_locale",
    message:
      "Resolve Astro locale values before loading administrator SSR translations",
  });

  STATIC_KEY_PATTERN.lastIndex = 0;
  let keyMatch;
  while ((keyMatch = STATIC_KEY_PATTERN.exec(code))) {
    if (!localeKeys.has(keyMatch[1])) {
      issues.push({
        filePath,
        line: lineNumber(code, keyMatch.index),
        rule: "unknown_translation_key",
        message: `Unknown administrator translation key: ${keyMatch[1]}`,
      });
    }
  }

  for (const [pattern, valueIndex] of [
    [JSX_TEXT_PATTERN, 2],
    [UI_ATTRIBUTE_PATTERN, 1],
  ]) {
    pattern.lastIndex = 0;
    let copyMatch;
    while ((copyMatch = pattern.exec(code))) {
      const copy = copyMatch[valueIndex];
      if (isNaturalUiCopy(copy)) {
        issues.push({
          filePath,
          line: lineNumber(code, copyMatch.index),
          rule: "hardcoded_ui_copy",
          message: `Hardcoded administrator UI copy: ${copy.trim()}`,
        });
      }
    }
  }

  return issues;
}

function flattenLocaleKeys(value, prefix, target) {
  for (const [key, nested] of Object.entries(value)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (nested && typeof nested === "object" && !Array.isArray(nested)) {
      flattenLocaleKeys(nested, fullKey, target);
    } else {
      target.add(fullKey);
    }
  }
}

function loadAdministratorLocaleKeys(projectRoot) {
  const keys = new Set();
  for (const namespace of ["admin", "enums"]) {
    const filePath = path.join(
      projectRoot,
      "public",
      "locales",
      "zh-CN",
      `${namespace}.json`,
    );
    const value = JSON.parse(fs.readFileSync(filePath, "utf8"));
    flattenLocaleKeys(value, namespace, keys);
  }
  return keys;
}

function collectSourceFiles(projectRoot) {
  const files = [];
  const visit = (target) => {
    if (!fs.existsSync(target)) return;
    const stat = fs.statSync(target);
    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(target))
        visit(path.join(target, entry));
      return;
    }
    if (
      SOURCE_EXTENSIONS.has(path.extname(target)) &&
      !/\.(?:test|spec)\.[^.]+$/u.test(target)
    ) {
      files.push(target);
    }
  };

  for (const sourceRoot of SOURCE_ROOTS)
    visit(path.join(projectRoot, sourceRoot));
  for (const sourceFile of SOURCE_FILES)
    visit(path.join(projectRoot, sourceFile));
  return [...new Set(files)].sort();
}

export function runAdminI18nAudit(projectRoot) {
  const localeKeys = loadAdministratorLocaleKeys(projectRoot);
  return collectSourceFiles(projectRoot).flatMap((absolutePath) =>
    auditAdminI18nSource({
      filePath: path.relative(projectRoot, absolutePath),
      code: fs.readFileSync(absolutePath, "utf8"),
      localeKeys,
    }),
  );
}

function main() {
  const projectRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
  );
  const issues = runAdminI18nAudit(projectRoot);
  console.log("=== Admin i18n Validation ===\n");
  if (issues.length === 0) {
    console.log("✓ Administrator i18n source audit passed");
    return;
  }

  for (const issue of issues) {
    console.error(
      `✗ ${issue.filePath}:${issue.line} [${issue.rule}] ${issue.message}`,
    );
  }
  console.error(`\n${issues.length} administrator i18n issue(s) found`);
  process.exitCode = 1;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main();
}
