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
import { assertPreviewUnrouted } from "./assert-preview-unrouted.mjs";
import { smokeProtectedPreview } from "./smoke-protected-preview.mjs";
import {
  validateBuiltPreview,
  validatePreviewDeploy,
} from "./validate-preview-deploy.mjs";
import { writePreviewSecrets } from "./write-preview-secrets.mjs";

const REQUIRED_ENV = {
  BETTER_AUTH_SECRET: "a-secure-preview-auth-secret-at-least-32-chars",
  CLOUDFLARE_ACCOUNT_ID: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  CLOUDFLARE_API_TOKEN: "token",
  CLOUDFLARE_ENV: "production",
  CLOUDFLARE_ZONE_ID: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  GITHUB_REF: "refs/heads/main",
  PREVIEW_APP_URL: "https://gomate-production-preview.example.workers.dev",
  RESEND_API_KEY: "resend-key",
};

const REQUIRED_OBSERVABILITY = {
  enabled: true,
  logs: {
    enabled: true,
    head_sampling_rate: 1,
    invocation_logs: true,
    persist: true,
  },
  traces: {
    enabled: true,
    head_sampling_rate: 0.1,
    persist: true,
  },
};
const REQUIRED_AUTH_RATE_LIMITS = [
  {
    name: "AUTH_SIGN_IN_RATE_LIMITER",
    namespace_id: "26081",
    simple: { limit: 5, period: 60 },
  },
  {
    name: "AUTH_SIGN_UP_RATE_LIMITER",
    namespace_id: "26082",
    simple: { limit: 3, period: 60 },
  },
  {
    name: "AUTH_EMAIL_RATE_LIMITER",
    namespace_id: "26083",
    simple: { limit: 5, period: 60 },
  },
];

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
  assert.equal(
    tsconfig.compilerOptions?.noEmit,
    true,
    "api/tsconfig.json must keep noEmit=true because Wrangler's generated GlobalProps references frontend/src/worker.ts",
  );
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
  const violations = sourceFile.parseDiagnostics.map((diagnostic) => {
    const start = diagnostic.start ?? 0;
    const line = sourceFile.getLineAndCharacterOfPosition(start).line + 1;
    return `${fileName}:${line} TypeScript parse error`;
  });
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
          "logger module default imports are forbidden",
        ),
      );
    }

    const bindings = importClause.namedBindings;
    if (bindings && ts.isNamespaceImport(bindings)) {
      violations.push(
        loggerViolation(
          sourceFile,
          bindings,
          "logger module namespace aliases are forbidden",
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
          "dynamic logger module imports are forbidden",
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
            "computed logger method access is forbidden",
          ),
        );
        return;
      }
      if (
        !ts.isPropertyAccessExpression(access) ||
        access.expression !== node
      ) {
        violations.push(
          loggerViolation(
            sourceFile,
            node,
            "logger aliases and destructuring are forbidden",
          ),
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
        return;
      }
      if (!STABLE_LOG_EVENT_PATTERN.test(event.text)) {
        violations.push(
          loggerViolation(
            sourceFile,
            event,
            "logger event must be stable lowercase snake_case",
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

async function withRequiredEnv(callback) {
  const previous = Object.fromEntries(
    Object.keys(REQUIRED_ENV).map((key) => [key, process.env[key]]),
  );
  Object.assign(process.env, REQUIRED_ENV);
  try {
    return await callback();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

function validConfigPaths() {
  const directory = mkdtempSync(path.join(os.tmpdir(), "gomate-deploy-guard-"));
  const configPath = path.join(directory, "wrangler.jsonc");
  writeFileSync(
    configPath,
    `${JSON.stringify({
      name: "gomate",
      main: "./src/worker.ts",
      compatibility_date: "2026-06-18",
      compatibility_flags: ["nodejs_compat", "global_fetch_strictly_public"],
      workers_dev: true,
      preview_urls: false,
      assets: {
        directory: "./dist",
        binding: "ASSETS",
        run_worker_first: ["/api", "/api/*"],
      },
      observability: REQUIRED_OBSERVABILITY,
      ratelimits: REQUIRED_AUTH_RATE_LIMITS,
      env: {
        production: {
          name: "gomate-production-preview",
          compatibility_date: "2026-06-18",
          compatibility_flags: [
            "nodejs_compat",
            "global_fetch_strictly_public",
          ],
          assets: {
            directory: "./dist",
            binding: "ASSETS",
            run_worker_first: ["/api", "/api/*"],
          },
          d1_databases: [
            {
              binding: "DB",
              database_name: "gomate-db-v2",
              database_id: "123e4567-e89b-42d3-a456-426614174000",
            },
          ],
          kv_namespaces: [
            { binding: "CACHE_KV", id: "0123456789abcdef0123456789abcdef" },
          ],
          r2_buckets: [{ binding: "R2", bucket_name: "gomate" }],
          vars: { WRITE_MODE: "protected" },
          secrets: {
            required: ["BETTER_AUTH_SECRET", "RESEND_API_KEY", "APP_URL"],
          },
          observability: REQUIRED_OBSERVABILITY,
          ratelimits: REQUIRED_AUTH_RATE_LIMITS,
        },
      },
    })}\n`,
  );
  const builtConfigPath = path.join(directory, "built-wrangler.json");
  writeFileSync(
    builtConfigPath,
    `${JSON.stringify({
      name: "gomate-production-preview",
      targetEnvironment: "production",
      main: "entry.mjs",
      no_bundle: true,
      compatibility_date: "2026-06-18",
      compatibility_flags: ["nodejs_compat", "global_fetch_strictly_public"],
      workers_dev: true,
      preview_urls: false,
      assets: {
        directory: "../client",
        binding: "ASSETS",
        run_worker_first: ["/api", "/api/*"],
      },
      d1_databases: [
        {
          binding: "DB",
          database_name: "gomate-db-v2",
          database_id: "123e4567-e89b-42d3-a456-426614174000",
        },
      ],
      kv_namespaces: [
        { binding: "CACHE_KV", id: "0123456789abcdef0123456789abcdef" },
      ],
      r2_buckets: [{ binding: "R2", bucket_name: "gomate" }],
      vars: { WRITE_MODE: "protected" },
      secrets: {
        required: ["BETTER_AUTH_SECRET", "RESEND_API_KEY", "APP_URL"],
      },
      observability: REQUIRED_OBSERVABILITY,
      ratelimits: REQUIRED_AUTH_RATE_LIMITS,
    })}\n`,
  );
  return { builtConfigPath, configPath, directory };
}

test("validates the exact protected preview invariants", async (t) => {
  await withRequiredEnv(() => {
    const { builtConfigPath, configPath, directory } = validConfigPaths();
    t.after(() => rmSync(directory, { recursive: true, force: true }));
    assert.doesNotThrow(() => validatePreviewDeploy({ configPath }));
    assert.doesNotThrow(() =>
      validateBuiltPreview({ configPath: builtConfigPath }),
    );
  });
});

test("rejects unresolved resource placeholders before remote writes", async (t) => {
  await withRequiredEnv(() => {
    const { configPath, directory } = validConfigPaths();
    t.after(() => rmSync(directory, { recursive: true, force: true }));
    const config = JSON.parse(readFileSync(configPath, "utf8"));
    config.env.production.d1_databases[0].database_id =
      "REPLACE_IN_BINDINGS_PR";
    writeFileSync(configPath, `${JSON.stringify(config)}\n`);
    assert.throws(
      () => validatePreviewDeploy({ configPath }),
      /reviewed D1 UUID/u,
    );
  });
});

test("fails closed when production traces are not explicitly enabled", async (t) => {
  await withRequiredEnv(() => {
    const { configPath, directory } = validConfigPaths();
    t.after(() => rmSync(directory, { recursive: true, force: true }));
    const config = JSON.parse(readFileSync(configPath, "utf8"));
    config.env.production.observability.traces.enabled = false;
    writeFileSync(configPath, `${JSON.stringify(config)}\n`);

    assert.throws(
      () => validatePreviewDeploy({ configPath }),
      /observability/u,
    );
  });
});

test("production logger calls use stable literal event names", () => {
  const violations = [];
  let callCount = 0;

  for (const filePath of listTypeScriptFiles(API_SOURCE_ROOT)) {
    if (!isProductionLoggerSource(filePath)) continue;

    const source = readFileSync(filePath, "utf8");
    const result = analyzeLoggerSource(filePath, source);
    callCount += result.callCount;
    violations.push(...result.violations);
  }

  assert.ok(callCount > 0, "expected to scan production logger calls");
  assert.deepEqual(violations, []);
});

test("logger event AST guard rejects indirect and dynamic call shapes", () => {
  const directImport = 'import { logger } from "../lib/logger";\n';
  const invalidFixtures = [
    {
      name: "dynamic event on the next line",
      source: `${directImport}logger.error\n(dynamicEvent, error);`,
    },
    {
      name: "computed method access",
      source: `${directImport}logger["error"]("stable_event", error);`,
    },
    {
      name: "method alias",
      source: `${directImport}const emit = logger.error; emit("stable_event");`,
    },
    {
      name: "destructured method",
      source: `${directImport}const { error: emit } = logger; emit("stable_event");`,
    },
    {
      name: "aliased import",
      source:
        'import { logger as log } from "../lib/logger";\nlog.error("stable_event");',
    },
    {
      name: "template event",
      source: `${directImport}logger.error(\`dynamic_${"${kind}"}\`, error);`,
    },
    {
      name: "prose event",
      source: `${directImport}logger.warn("Old warning prose");`,
    },
  ];

  for (const fixture of invalidFixtures) {
    const result = analyzeLoggerSource(
      `fixture-${fixture.name}.tsx`,
      fixture.source,
    );
    assert.notDeepEqual(result.violations, [], fixture.name);
  }
});

test("logger event AST guard covers supported TypeScript source extensions", () => {
  const source =
    'import { logger } from "../lib/logger";\nlogger.info("stable_event");';

  for (const extension of ["ts", "tsx", "mts", "cts"]) {
    const filePath = path.join(API_SOURCE_ROOT, `fixture.${extension}`);
    assert.equal(isProductionLoggerSource(filePath), true, extension);
    assert.deepEqual(analyzeLoggerSource(filePath, source), {
      callCount: 1,
      violations: [],
    });
  }
});

test("fails closed when a production route targets the preview Worker", async () => {
  await withRequiredEnv(async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input) => {
      const url = new URL(input);
      let result;
      if (url.pathname.endsWith("/workers/subdomain")) {
        result = { subdomain: "example" };
      } else if (
        url.pathname === "/client/v4/zones/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
      ) {
        result = { name: "gomate.live" };
      } else if (url.pathname === "/client/v4/zones") {
        result = [
          {
            id: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
            name: "gomate.live",
          },
        ];
      } else if (url.pathname.endsWith("/workers/routes")) {
        result = [
          { script: "gomate-production-preview", pattern: "gomate.live/*" },
        ];
      } else {
        result = [];
      }
      return Response.json({
        success: true,
        result,
        ...(Array.isArray(result) ? { result_info: { total_pages: 1 } } : {}),
      });
    };
    try {
      await assert.rejects(
        assertPreviewUnrouted(),
        /already attached to production routing/u,
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

test("protected preview smoke requires correlated request IDs", async () => {
  const requestId = "11111111-1111-4111-8111-111111111111";
  const fetchImpl = async (input, init) => {
    const url = new URL(input);
    if (url.pathname === "/api/health") {
      return Response.json(
        { status: "ok" },
        {
          headers: { "x-request-id": requestId },
        },
      );
    }
    if (url.pathname === "/") {
      return new Response("<!doctype html>", {
        headers: { "content-type": "text/html" },
      });
    }
    assert.equal(init?.method, "POST");
    assert.match(String(init?.body), /log-canary-token-must-not-appear/u);
    return Response.json(
      { success: false, error: { code: "WRITE_PROTECTED" } },
      {
        status: 503,
        headers: {
          "retry-after": "60",
          "x-request-id": requestId,
        },
      },
    );
  };

  await assert.doesNotReject(
    smokeProtectedPreview({
      baseUrl: "https://gomate-production-preview.example.workers.dev",
      fetchImpl,
    }),
  );

  await assert.rejects(
    smokeProtectedPreview({
      baseUrl: "https://gomate-production-preview.example.workers.dev",
      fetchImpl: async (input, init) => {
        const response = await fetchImpl(input, init);
        if (new URL(input).pathname !== "/api/health") return response;
        return Response.json({ status: "ok" });
      },
    }),
    /X-Request-ID/u,
  );
});

test("protected preview smoke waits through transient workers.dev propagation", async () => {
  const requestId = "22222222-2222-4222-8222-222222222222";
  const waits = [];
  const requestTimeouts = [];
  let nowMs = 0;
  let healthAttempts = 0;
  let ssrAttempts = 0;
  let mutationAttempts = 0;
  const fetchImpl = async (input, init) => {
    const url = new URL(input);
    if (url.pathname === "/api/health") {
      healthAttempts += 1;
      if (healthAttempts === 1) throw new Error("network not ready");
      if (healthAttempts === 2)
        return new Response("not ready", { status: 523 });
      return Response.json(
        { status: "ok" },
        { headers: { "x-request-id": requestId } },
      );
    }
    if (url.pathname === "/") {
      ssrAttempts += 1;
      if (ssrAttempts === 1) {
        return new Response("not found", { status: 404 });
      }
      return new Response("<!doctype html>", {
        headers: { "content-type": "text/html" },
      });
    }
    mutationAttempts += 1;
    assert.equal(init?.method, "POST");
    return Response.json(
      { success: false, error: { code: "WRITE_PROTECTED" } },
      {
        status: 503,
        headers: {
          "retry-after": "60",
          "x-request-id": requestId,
        },
      },
    );
  };

  const result = await smokeProtectedPreview({
    baseUrl: "https://gomate-production-preview.example.workers.dev",
    fetchImpl,
    readinessTimeoutMs: 10,
    readinessRetryDelayMs: 1,
    nowImpl: () => nowMs,
    waitImpl: async (delayMs) => {
      waits.push(delayMs);
      nowMs += delayMs;
    },
    timeoutSignalImpl: (timeoutMs) => {
      requestTimeouts.push(timeoutMs);
      return { timeoutMs };
    },
  });

  assert.equal(healthAttempts, 3);
  assert.equal(ssrAttempts, 2);
  assert.equal(mutationAttempts, 1);
  assert.deepEqual(waits, [1, 1, 1]);
  assert.deepEqual(requestTimeouts, [10, 9, 8, 8, 7]);
  assert.deepEqual(result, {
    healthRequestId: requestId,
    blockedRequestId: requestId,
  });
});

test("protected preview smoke shares one bounded readiness deadline", async () => {
  const requestId = "33333333-3333-4333-8333-333333333333";
  let nowMs = 0;
  let healthAttempts = 0;
  let ssrAttempts = 0;
  const waits = [];
  await assert.rejects(
    smokeProtectedPreview({
      baseUrl: "https://gomate-production-preview.example.workers.dev",
      fetchImpl: async (input) => {
        const url = new URL(input);
        if (url.pathname === "/api/health") {
          healthAttempts += 1;
          if (healthAttempts === 1) {
            return new Response("not found", { status: 404 });
          }
          return Response.json(
            { status: "ok" },
            { headers: { "x-request-id": requestId } },
          );
        }
        ssrAttempts += 1;
        return new Response("not found", { status: 404 });
      },
      readinessTimeoutMs: 2,
      readinessRetryDelayMs: 1,
      nowImpl: () => nowMs,
      waitImpl: async (delayMs) => {
        waits.push(delayMs);
        nowMs += delayMs;
      },
      timeoutSignalImpl: (timeoutMs) => ({ timeoutMs }),
    }),
    /SSR smoke readiness timed out/u,
  );
  assert.equal(healthAttempts, 2);
  assert.equal(ssrAttempts, 1);
  assert.deepEqual(waits, [1, 1]);
});

test("protected preview smoke does not retry application failures", async () => {
  const requestId = "44444444-4444-4444-8444-444444444444";
  let attempts = 0;
  const waits = [];
  await assert.rejects(
    smokeProtectedPreview({
      baseUrl: "https://gomate-production-preview.example.workers.dev",
      fetchImpl: async () => {
        attempts += 1;
        return Response.json(
          { success: false, error: { code: "SERVICE_UNAVAILABLE" } },
          {
            status: 503,
            headers: { "x-request-id": requestId },
          },
        );
      },
      readinessTimeoutMs: 10,
      readinessRetryDelayMs: 1,
      waitImpl: async (delayMs) => waits.push(delayMs),
      timeoutSignalImpl: (timeoutMs) => ({ timeoutMs }),
    }),
    /Health smoke failed \(503\)/u,
  );
  assert.equal(attempts, 1);
  assert.deepEqual(waits, []);

  attempts = 0;
  await assert.rejects(
    smokeProtectedPreview({
      baseUrl: "https://gomate-production-preview.example.workers.dev",
      fetchImpl: async () => {
        attempts += 1;
        return new Response("wrong content type", {
          headers: { "content-type": "text/plain" },
        });
      },
      readinessTimeoutMs: 10,
      readinessRetryDelayMs: 1,
      waitImpl: async (delayMs) => waits.push(delayMs),
      timeoutSignalImpl: (timeoutMs) => ({ timeoutMs }),
    }),
    /Health smoke failed \(200\)/u,
  );
  assert.equal(attempts, 1);
  assert.deepEqual(waits, []);
});

test("deploy workflow blocks completion on post-smoke observability approval", () => {
  const workflow = readFileSync(
    path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      "../.github/workflows/deploy.yml",
    ),
    "utf8",
  );

  assert.match(workflow, /id: preview_smoke/u);
  assert.match(
    workflow,
    /health_request_id:.*preview_smoke\.outputs\.health_request_id/u,
  );
  assert.match(
    workflow,
    /blocked_request_id:.*preview_smoke\.outputs\.blocked_request_id/u,
  );
  assert.match(
    workflow,
    /observability-approval:[\s\S]*needs: deploy-preview/u,
  );
  assert.match(
    workflow,
    /observability-approval:[\s\S]*environment: production[\s\S]*Require request-correlation evidence/u,
  );
  assert.match(workflow, /canary email nor canary token/u);
  assert.match(workflow, /app-runtime tests verified normalized 500 logging/u);
});

test("fails closed when the preview Worker targets another account zone", async () => {
  await withRequiredEnv(async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input) => {
      const url = new URL(input);
      let result;
      if (url.pathname.endsWith("/workers/subdomain")) {
        result = { subdomain: "example" };
      } else if (
        url.pathname === "/client/v4/zones/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
      ) {
        result = { name: "gomate.live" };
      } else if (url.pathname === "/client/v4/zones") {
        result = [
          {
            id: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
            name: "gomate.live",
          },
          {
            id: "cccccccccccccccccccccccccccccccc",
            name: "example.net",
          },
        ];
      } else if (
        url.pathname ===
        "/client/v4/zones/cccccccccccccccccccccccccccccccc/workers/routes"
      ) {
        result = [
          {
            script: "gomate-production-preview",
            pattern: "preview.example.net/*",
          },
        ];
      } else {
        result = [];
      }
      return Response.json({
        success: true,
        result,
        ...(Array.isArray(result) ? { result_info: { total_pages: 1 } } : {}),
      });
    };
    try {
      await assert.rejects(
        assertPreviewUnrouted(),
        /example\.net:preview\.example\.net/u,
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

test("writes a private ephemeral Wrangler secrets file", async (t) => {
  await withRequiredEnv(() => {
    const directory = mkdtempSync(path.join(os.tmpdir(), "gomate-secrets-"));
    t.after(() => rmSync(directory, { recursive: true, force: true }));
    const outputPath = path.join(directory, "secrets.json");
    writePreviewSecrets(outputPath);

    assert.equal(statSync(outputPath).mode & 0o777, 0o600);
    assert.deepEqual(JSON.parse(readFileSync(outputPath, "utf8")), {
      APP_URL: REQUIRED_ENV.PREVIEW_APP_URL,
      BETTER_AUTH_SECRET: REQUIRED_ENV.BETTER_AUTH_SECRET,
      RESEND_API_KEY: REQUIRED_ENV.RESEND_API_KEY,
    });
  });
});

test("cleanup script removes only the exact runner temp secrets file", (t) => {
  const directory = mkdtempSync(
    path.join(os.tmpdir(), "gomate-secrets-cleanup-"),
  );
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const outputPath = path.join(directory, "gomate-worker-secrets.json");
  writeFileSync(outputPath, "{}\n");
  const result = spawnCleanup(directory, outputPath);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(existsSync(outputPath), false);

  const refused = spawnCleanup(
    directory,
    path.join(directory, "different.json"),
  );
  assert.equal(refused.status, 1);
  assert.match(refused.stderr, /Refusing to remove/u);
});

test("cleanup script accepts the exact production runner temp secrets file", (t) => {
  const directory = mkdtempSync(
    path.join(os.tmpdir(), "gomate-production-secret-"),
  );
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const outputPath = path.join(directory, "gomate-production-secrets.json");
  writeFileSync(outputPath, "{}\n", { mode: 0o600 });
  const result = spawnCleanup(directory, outputPath);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(existsSync(outputPath), false);
});

function spawnCleanup(runnerTemp, secretsFile) {
  const script = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "remove-preview-secrets.mjs",
  );
  return spawnSync(process.execPath, [script], {
    encoding: "utf8",
    env: { ...process.env, RUNNER_TEMP: runnerTemp, SECRETS_FILE: secretsFile },
  });
}
