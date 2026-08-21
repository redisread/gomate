import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { writeProductionSecrets } from "./write-production-secrets.mjs";

const PROJECT_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const API_SOURCE_ROOT = path.join(PROJECT_ROOT, "api", "src");
const STABLE_LOG_EVENT_PATTERN = /^[a-z][a-z0-9_]{2,63}$/u;
const LOGGER_MODULE_PATTERN = /(?:^|\/)logger(?:\.[cm]?[jt]s)?$/u;
const LOGGER_METHODS = new Set(["debug", "error", "info", "warn"]);
const PRODUCTION_TYPESCRIPT_PATTERN = /\.(?:[cm]?ts|tsx)$/u;
const TYPESCRIPT_TEST_PATTERN = /\.(?:spec|test)\.(?:[cm]?ts|tsx)$/u;
const TYPESCRIPT_DECLARATION_PATTERN = /\.d\.(?:[cm]?ts|tsx)$/u;

test("API validation build cannot emit the generated Worker main module", () => {
  const tsconfig = JSON.parse(
    readFileSync(path.join(PROJECT_ROOT, "api", "tsconfig.json"), "utf8"),
  );
  assert.equal(tsconfig.compilerOptions?.noEmit, true);
});

function listTypeScriptFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filePath = path.resolve(directory, entry.name);
    return entry.isDirectory() ? listTypeScriptFiles(filePath) : [filePath];
  });
}

function isProductionLoggerSource(filePath) {
  const sourcePath = path
    .relative(API_SOURCE_ROOT, filePath)
    .split(path.sep)
    .join("/");
  const segments = sourcePath.split("/");
  return (
    PRODUCTION_TYPESCRIPT_PATTERN.test(sourcePath) &&
    !TYPESCRIPT_DECLARATION_PATTERN.test(sourcePath) &&
    !TYPESCRIPT_TEST_PATTERN.test(sourcePath) &&
    !segments.includes("__tests__") &&
    !segments.includes("generated")
  );
}

function isLoggerModuleSpecifier(node) {
  return ts.isStringLiteral(node) && LOGGER_MODULE_PATTERN.test(node.text);
}

function sourceLine(sourceFile, node) {
  return (
    sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1
  );
}

function loggerViolation(sourceFile, node, message) {
  return `${sourceFile.fileName}:${sourceLine(sourceFile, node)} ${message}`;
}

function isOfficialLoggerDeclaration(sourceFile, node) {
  const sourcePath = sourceFile.fileName.split(path.sep).join("/");
  return (
    sourcePath.endsWith("/lib/logger.ts") &&
    ts.isVariableDeclaration(node.parent) &&
    node.parent.name === node
  );
}

function isNonReferencePropertyName(node) {
  const parent = node.parent;
  return (
    (ts.isPropertyAccessExpression(parent) && parent.name === node) ||
    (ts.isPropertyAssignment(parent) && parent.name === node) ||
    (ts.isBindingElement(parent) && parent.propertyName === node) ||
    ((ts.isMethodDeclaration(parent) ||
      ts.isPropertyDeclaration(parent) ||
      ts.isPropertySignature(parent) ||
      ts.isMethodSignature(parent)) &&
      parent.name === node)
  );
}

function analyzeLoggerSource(fileName, source) {
  const scriptKind = fileName.endsWith(".tsx")
    ? ts.ScriptKind.TSX
    : ts.ScriptKind.TS;
  const sourceFile = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
    scriptKind,
  );
  const violations = [];
  const loggerImportNames = new Set();
  let callCount = 0;

  for (const statement of sourceFile.statements) {
    if (
      !ts.isImportDeclaration(statement) ||
      !isLoggerModuleSpecifier(statement.moduleSpecifier)
    ) {
      continue;
    }
    const importClause = statement.importClause;
    if (!importClause) continue;
    if (importClause.name) {
      violations.push(
        loggerViolation(
          sourceFile,
          importClause.name,
          "default logger imports are forbidden",
        ),
      );
    }
    const bindings = importClause.namedBindings;
    if (bindings && ts.isNamespaceImport(bindings)) {
      violations.push(
        loggerViolation(
          sourceFile,
          bindings,
          "logger namespace aliases are forbidden",
        ),
      );
      continue;
    }
    if (!bindings || !ts.isNamedImports(bindings)) continue;
    for (const element of bindings.elements) {
      const importedName = element.propertyName?.text ?? element.name.text;
      const localName = element.name.text;
      if (importedName !== "logger" && localName !== "logger") continue;
      if (element.propertyName || importedName !== "logger") {
        violations.push(
          loggerViolation(
            sourceFile,
            element,
            "logger import aliases are forbidden",
          ),
        );
        continue;
      }
      loggerImportNames.add(element.name);
    }
  }

  function visit(node) {
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments.some(isLoggerModuleSpecifier)
    ) {
      violations.push(
        loggerViolation(
          sourceFile,
          node,
          "dynamic logger imports are forbidden",
        ),
      );
    }
    if (ts.isIdentifier(node) && node.text === "logger") {
      if (
        loggerImportNames.has(node) ||
        isOfficialLoggerDeclaration(sourceFile, node) ||
        isNonReferencePropertyName(node)
      ) {
        ts.forEachChild(node, visit);
        return;
      }
      const access = node.parent;
      if (ts.isElementAccessExpression(access) && access.expression === node) {
        violations.push(
          loggerViolation(
            sourceFile,
            access,
            "computed logger access is forbidden",
          ),
        );
        return;
      }
      if (
        !ts.isPropertyAccessExpression(access) ||
        access.expression !== node
      ) {
        violations.push(
          loggerViolation(sourceFile, node, "logger aliases are forbidden"),
        );
        return;
      }
      const call = access.parent;
      if (
        access.questionDotToken ||
        !LOGGER_METHODS.has(access.name.text) ||
        !ts.isCallExpression(call) ||
        call.expression !== access ||
        call.questionDotToken
      ) {
        violations.push(
          loggerViolation(
            sourceFile,
            access,
            "logger methods must be called directly",
          ),
        );
        return;
      }
      callCount += 1;
      const event = call.arguments[0];
      if (!event || !ts.isStringLiteral(event)) {
        violations.push(
          loggerViolation(
            sourceFile,
            call,
            "logger event must be a string literal",
          ),
        );
      } else if (!STABLE_LOG_EVENT_PATTERN.test(event.text)) {
        violations.push(
          loggerViolation(
            sourceFile,
            event,
            "logger event must be lowercase snake_case",
          ),
        );
      }
      return;
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return { callCount, violations };
}

test("production logger calls use stable literal event names", () => {
  const violations = [];
  let callCount = 0;
  for (const filePath of listTypeScriptFiles(API_SOURCE_ROOT)) {
    if (!isProductionLoggerSource(filePath)) continue;
    const result = analyzeLoggerSource(
      filePath,
      readFileSync(filePath, "utf8"),
    );
    callCount += result.callCount;
    violations.push(...result.violations);
  }
  assert.ok(callCount > 0);
  assert.deepEqual(violations, []);
});

test("logger guard rejects indirect and dynamic call shapes", () => {
  const directImport = 'import { logger } from "../lib/logger";\n';
  for (const source of [
    `${directImport}logger.error(dynamicEvent, error);`,
    `${directImport}logger["error"]("stable_event", error);`,
    `${directImport}const emit = logger.error; emit("stable_event");`,
    `${directImport}const { error: emit } = logger; emit("stable_event");`,
    'import { logger as log } from "../lib/logger";\nlog.error("stable_event");',
    `${directImport}logger.warn("Old warning prose");`,
  ]) {
    assert.notDeepEqual(
      analyzeLoggerSource("fixture.tsx", source).violations,
      [],
    );
  }
});

test("logger guard covers supported TypeScript source extensions", () => {
  const source =
    'import { logger } from "../lib/logger";\nlogger.info("stable_event");';
  for (const extension of ["ts", "tsx", "mts", "cts"]) {
    const filePath = path.join(API_SOURCE_ROOT, `fixture.${extension}`);
    assert.equal(isProductionLoggerSource(filePath), true);
    assert.deepEqual(analyzeLoggerSource(filePath, source), {
      callCount: 1,
      violations: [],
    });
  }
});

test("production secrets file is private and contains only required values", (t) => {
  const directory = mkdtempSync(path.join(os.tmpdir(), "gomate-secrets-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const outputPath = path.join(directory, "gomate-production-secrets.json");
  const previous = {
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    PRODUCTION_APP_URL: process.env.PRODUCTION_APP_URL,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    SECRETS_FILE: process.env.SECRETS_FILE,
  };
  Object.assign(process.env, {
    BETTER_AUTH_SECRET: "production-auth-secret-at-least-32-characters",
    PRODUCTION_APP_URL: "https://gomate.live",
    RESEND_API_KEY: "resend-key",
    SECRETS_FILE: outputPath,
  });
  t.after(() => {
    for (const [name, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  });
  writeProductionSecrets(outputPath);
  assert.equal(statSync(outputPath).mode & 0o777, 0o600);
  assert.deepEqual(JSON.parse(readFileSync(outputPath, "utf8")), {
    APP_URL: "https://gomate.live",
    BETTER_AUTH_SECRET: "production-auth-secret-at-least-32-characters",
    RESEND_API_KEY: "resend-key",
  });
});

test("cleanup removes only the exact production runner secrets file", (t) => {
  const directory = mkdtempSync(path.join(os.tmpdir(), "gomate-cleanup-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const outputPath = path.join(directory, "gomate-production-secrets.json");
  writeFileSync(outputPath, "{}\n", { mode: 0o600 });
  const script = path.join(
    PROJECT_ROOT,
    "scripts",
    "remove-deployment-secrets.mjs",
  );
  const result = spawnSync(process.execPath, [script], {
    encoding: "utf8",
    env: { ...process.env, RUNNER_TEMP: directory, SECRETS_FILE: outputPath },
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(existsSync(outputPath), false);

  const refused = spawnSync(process.execPath, [script], {
    encoding: "utf8",
    env: {
      ...process.env,
      RUNNER_TEMP: directory,
      SECRETS_FILE: path.join(directory, "different.json"),
    },
  });
  assert.equal(refused.status, 1);
  assert.match(refused.stderr, /Refusing to remove/u);
});
