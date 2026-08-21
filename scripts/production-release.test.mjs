import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  assertExclusiveProductionVersionAllowed,
  assertProductionVersionAllowed,
  assertWorkerVersionId,
  parseActiveDeployment,
  parseVersionUploadOutput,
} from "./release-versions.mjs";
import { smokeProductionVersion } from "./smoke-production-version.mjs";
import { observeProduction } from "./observe-production.mjs";
import {
  validateBuiltProductionRelease,
  validateProductionRelease,
} from "./validate-production-release.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const observability = {
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

const rateLimits = [
  ["AUTH_SIGN_IN_RATE_LIMITER", "26081", 5],
  ["AUTH_SIGN_UP_RATE_LIMITER", "26082", 3],
  ["AUTH_EMAIL_RATE_LIMITER", "26083", 5],
].map(([name, namespace_id, limit]) => ({
  name,
  namespace_id,
  simple: { limit, period: 60 },
}));

function bindings() {
  return {
    d1_databases: [
      {
        binding: "DB",
        database_name: "gomate-db-v2",
        database_id: "befa3d89-6551-4a25-8a1c-670efe62a315",
      },
    ],
    kv_namespaces: [
      { binding: "CACHE_KV", id: "f9904d1fa72140c18067e07d541ca92b" },
    ],
    r2_buckets: [{ binding: "R2", bucket_name: "gomate" }],
    ratelimits: rateLimits,
    secrets: {
      required: ["BETTER_AUTH_SECRET", "RESEND_API_KEY", "APP_URL"],
    },
    observability,
    version_metadata: { binding: "CF_VERSION_METADATA" },
  };
}

function sourceConfig() {
  return {
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
    vars: { APP_URL: "http://localhost:5432", WRITE_MODE: "open" },
    observability,
    ratelimits: rateLimits,
    version_metadata: { binding: "CF_VERSION_METADATA" },
    env: {
      production: {
        name: "gomate",
        routes: [{ pattern: "gomate.live", custom_domain: true }],
        assets: {
          directory: "./dist",
          binding: "ASSETS",
          run_worker_first: ["/api", "/api/*"],
        },
        vars: { WRITE_MODE: "open" },
        ...bindings(),
      },
    },
  };
}

function builtConfig() {
  return {
    targetEnvironment: "production",
    name: "gomate",
    main: "entry.mjs",
    no_bundle: true,
    compatibility_date: "2026-06-18",
    compatibility_flags: ["nodejs_compat", "global_fetch_strictly_public"],
    workers_dev: true,
    preview_urls: false,
    routes: [{ pattern: "gomate.live", custom_domain: true }],
    assets: {
      directory: "../client",
      binding: "ASSETS",
      run_worker_first: ["/api", "/api/*"],
    },
    vars: { WRITE_MODE: "open" },
    ...bindings(),
  };
}

test("production release validation requires the live route and open write mode", () => {
  const directory = mkdtempSync(path.join(os.tmpdir(), "gomate-release-"));
  try {
    const sourceConfigPath = path.join(directory, "wrangler.jsonc");
    const builtConfigPath = path.join(directory, "built-wrangler.json");
    writeFileSync(sourceConfigPath, JSON.stringify(sourceConfig()));
    writeFileSync(builtConfigPath, JSON.stringify(builtConfig()));

    assert.doesNotThrow(() =>
      validateProductionRelease({
        configPath: sourceConfigPath,
        env: {
          BETTER_AUTH_SECRET: "production-auth-secret-at-least-32-characters",
          CLOUDFLARE_ACCOUNT_ID: "a".repeat(32),
          CLOUDFLARE_API_TOKEN: "token",
          CLOUDFLARE_ENV: "production",
          CLOUDFLARE_ZONE_ID: "b".repeat(32),
          GITHUB_REF: "refs/heads/main",
          PRODUCTION_APP_URL: "https://gomate.live",
          RESEND_API_KEY: "resend-key",
        },
      }),
    );
    assert.doesNotThrow(() =>
      validateBuiltProductionRelease({ configPath: builtConfigPath }),
    );

    const protectedConfig = sourceConfig();
    protectedConfig.env.production.vars.WRITE_MODE = "protected";
    writeFileSync(sourceConfigPath, JSON.stringify(protectedConfig));
    assert.throws(
      () =>
        validateProductionRelease({
          configPath: sourceConfigPath,
          env: {
            BETTER_AUTH_SECRET: "production-auth-secret-at-least-32-characters",
            CLOUDFLARE_ACCOUNT_ID: "a".repeat(32),
            CLOUDFLARE_API_TOKEN: "token",
            CLOUDFLARE_ENV: "production",
            CLOUDFLARE_ZONE_ID: "b".repeat(32),
            GITHUB_REF: "refs/heads/main",
            PRODUCTION_APP_URL: "https://gomate.live",
            RESEND_API_KEY: "resend-key",
          },
        }),
      /WRITE_MODE must be open/u,
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("Wrangler structured output yields the exact uploaded version", () => {
  const versionId = "11111111-2222-4333-8444-555555555555";
  const output = [
    JSON.stringify({ type: "wrangler-session", version: 1 }),
    JSON.stringify({
      type: "version-upload",
      version: 1,
      worker_name: "gomate",
      version_id: versionId,
    }),
  ].join("\n");
  assert.deepEqual(parseVersionUploadOutput(output), {
    versionId,
    workerName: "gomate",
  });
  assert.throws(
    () => parseVersionUploadOutput('{"type":"command-failed"}\n'),
    /version-upload/u,
  );
});

test("active deployment parser selects only the version serving 100 percent", () => {
  const olderVersionId = "11111111-2222-4333-8444-555555555555";
  const newerVersionId = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
  const active = parseActiveDeployment(
    JSON.stringify([
      {
        id: "older-deployment",
        created_on: "2026-08-01T00:00:00.000Z",
        versions: [{ version_id: olderVersionId, percentage: 100 }],
      },
      {
        id: "newer-deployment",
        created_on: "2026-08-20T00:00:00.000Z",
        versions: [
          {
            version_id: newerVersionId,
            percentage: 100,
          },
        ],
      },
    ]),
  );
  assert.equal(active.versionId, newerVersionId);
  assert.equal(active.deploymentId, "newer-deployment");
  assert.throws(
    () =>
      parseActiveDeployment(
        JSON.stringify([
          {
            created_on: "2026-08-20T00:00:00.000Z",
            versions: [{ version_id: active.versionId, percentage: 50 }],
          },
        ]),
      ),
    /exactly one 100% version/u,
  );
});

test("Worker version IDs reject command injection input", () => {
  assert.equal(
    assertWorkerVersionId("aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee"),
    "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
  );
  for (const value of ["latest", "id; echo bad", "$(whoami)", ""])
    assert.throws(() => assertWorkerVersionId(value), /Worker version ID/u);
});

test("schema-sensitive operations accept only reviewed Worker versions", () => {
  const directory = mkdtempSync(path.join(os.tmpdir(), "gomate-versions-"));
  try {
    const allowlistPath = path.join(directory, "allowlist.json");
    const allowed = "11111111-2222-4333-8444-555555555555";
    writeFileSync(
      allowlistPath,
      JSON.stringify({ schemaVersion: 1, versionIds: [allowed] }),
    );
    assert.equal(
      assertProductionVersionAllowed(allowed, { allowlistPath }),
      allowed,
    );
    assert.equal(
      assertExclusiveProductionVersionAllowed(allowed, { allowlistPath }),
      allowed,
    );
    assert.throws(
      () =>
        assertProductionVersionAllowed("aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee", {
          allowlistPath,
        }),
      /not approved for the current production schema/u,
    );
    writeFileSync(
      allowlistPath,
      JSON.stringify({
        schemaVersion: 1,
        versionIds: [allowed, "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee"],
      }),
    );
    assert.throws(
      () => assertExclusiveProductionVersionAllowed(allowed, { allowlistPath }),
      /exactly the current compatible Worker/u,
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("candidate smoke pins every request to the uploaded version", async () => {
  const versionId = "11111111-2222-4333-8444-555555555555";
  const calls = [];
  const result = await smokeProductionVersion({
    baseUrl: "https://gomate.live",
    expectedVersionId: versionId,
    useVersionOverride: true,
    fetchImpl: async (url, init) => {
      calls.push({ url: String(url), headers: new Headers(init?.headers) });
      const pathname = new URL(url).pathname;
      if (pathname === "/") {
        return new Response("<!doctype html><html></html>", {
          status: 200,
          headers: {
            "content-type": "text/html; charset=utf-8",
            "x-worker-version-id": versionId,
          },
        });
      }
      const payload =
        pathname === "/api/health"
          ? { status: "ok", versionId }
          : { success: true, regions: [{ id: "region-cn-shenzhen" }] };
      return new Response(JSON.stringify(payload), {
        status: 200,
        headers: {
          "content-type": "application/json",
          "x-worker-version-id": versionId,
          "x-request-id": `00000000-0000-4000-8000-00000000000${calls.length}`,
        },
      });
    },
  });
  assert.equal(result.versionId, versionId);
  assert.equal(calls.length, 3);
  assert.ok(
    calls.every(
      ({ headers }) =>
        headers.get("Cloudflare-Workers-Version-Overrides") ===
        `gomate="${versionId}"`,
    ),
  );
});

test("version smoke retries a short Cloudflare propagation mismatch", async () => {
  const expectedVersionId = "11111111-2222-4333-8444-555555555555";
  let now = 0;
  let healthAttempts = 0;
  const waits = [];
  await smokeProductionVersion({
    baseUrl: "https://gomate.live",
    expectedVersionId,
    retryTimeoutMs: 10_000,
    retryDelayMs: 1_000,
    nowImpl: () => now,
    waitImpl: async (delay) => {
      waits.push(delay);
      now += delay;
    },
    fetchImpl: async (url) => {
      const pathname = new URL(url).pathname;
      if (pathname === "/") {
        return new Response("<!doctype html><html></html>", {
          headers: {
            "content-type": "text/html",
            "x-worker-version-id": expectedVersionId,
          },
        });
      }
      if (pathname === "/api/health") {
        healthAttempts += 1;
        return Response.json(
          {
            status: "ok",
            versionId:
              healthAttempts === 1
                ? "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee"
                : expectedVersionId,
          },
          {
            headers: {
              "x-worker-version-id":
                healthAttempts === 1
                  ? "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee"
                  : expectedVersionId,
              "x-request-id": `00000000-0000-4000-8000-00000000000${healthAttempts}`,
            },
          },
        );
      }
      return Response.json(
        { success: true, regions: [{ id: "region-cn-shenzhen" }] },
        {
          headers: {
            "x-worker-version-id": expectedVersionId,
            "x-request-id": "00000000-0000-4000-8000-000000000003",
          },
        },
      );
    },
  });

  assert.equal(healthAttempts, 2);
  assert.deepEqual(waits, [1_000]);
});

test("version smoke rejects SSR rendered by another Worker version", async () => {
  const expectedVersionId = "11111111-2222-4333-8444-555555555555";
  await assert.rejects(
    () =>
      smokeProductionVersion({
        baseUrl: "https://gomate.live",
        expectedVersionId,
        retryTimeoutMs: 0,
        fetchImpl: async (url) => {
          const pathname = new URL(url).pathname;
          if (pathname === "/") {
            return new Response("<!doctype html><html></html>", {
              headers: {
                "content-type": "text/html",
                "x-worker-version-id": "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
              },
            });
          }
          return Response.json(
            pathname === "/api/health"
              ? { status: "ok", versionId: expectedVersionId }
              : { success: true, regions: [{ id: "region-cn-shenzhen" }] },
            {
              headers: {
                "x-request-id": "00000000-0000-4000-8000-000000000001",
                "x-worker-version-id": expectedVersionId,
              },
            },
          );
        },
      }),
    /expected Worker version/u,
  );
});

test("production observation rejects traffic served by another version", async () => {
  await assert.rejects(
    () =>
      observeProduction({
        baseUrl: "https://gomate.live",
        durationMs: 0,
        expectedVersionId: "11111111-2222-4333-8444-555555555555",
        fetchImpl: async (url) => {
          const isHealth = new URL(url).pathname === "/api/health";
          return new Response(
            JSON.stringify(
              isHealth
                ? {
                    status: "ok",
                    versionId: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
                  }
                : {
                    success: true,
                    regions: [{ id: "region-cn-shenzhen" }],
                  },
            ),
            {
              status: 200,
              headers: {
                "content-type": "application/json",
                "x-worker-version-id": "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
                "x-request-id": "00000000-0000-4000-8000-000000000001",
              },
            },
          );
        },
      }),
    /expected Worker version/u,
  );
});

test("production observation includes the Astro SSR surface", async () => {
  const paths = [];
  const versionId = "11111111-2222-4333-8444-555555555555";
  await observeProduction({
    baseUrl: "https://gomate.live",
    durationMs: 0,
    expectedVersionId: versionId,
    fetchImpl: async (url) => {
      const pathname = new URL(url).pathname;
      paths.push(pathname);
      if (pathname === "/") {
        return new Response("<!doctype html><html></html>", {
          headers: {
            "content-type": "text/html",
            "x-worker-version-id": versionId,
          },
        });
      }
      return Response.json(
        pathname === "/api/health"
          ? { status: "ok", versionId }
          : { success: true, regions: [{ id: "region-cn-shenzhen" }] },
        {
          headers: {
            "x-worker-version-id": versionId,
            "x-request-id": "00000000-0000-4000-8000-000000000001",
          },
        },
      );
    },
  });
  assert.deepEqual(paths, ["/api/health", "/", "/api/regions"]);
});

test("production workflows use Wrangler Action immutable versions and explicit rollback", () => {
  const release = readFileSync(
    path.join(root, ".github", "workflows", "deploy.yml"),
    "utf8",
  );
  const rollback = readFileSync(
    path.join(root, ".github", "workflows", "rollback-production.yml"),
    "utf8",
  );
  const migration = readFileSync(
    path.join(root, ".github", "workflows", "migrate-production.yml"),
    "utf8",
  );

  assert.match(release, /cloudflare\/wrangler-action@v4/u);
  assert.match(release, /versions upload/u);
  assert.match(release, /versions deploy/u);
  assert.match(release, /@0%/u);
  assert.match(release, /WRANGLER_OUTPUT_FILE_PATH/u);
  assert.doesNotMatch(release, /assert-preview-unrouted/u);
  assert.doesNotMatch(release, /wrangler deploy --secrets-file/u);
  assert.doesNotMatch(release, /d1 migrations apply/u);
  assert.match(release, /failure\(\) \|\| cancelled\(\)/u);
  assert.doesNotMatch(release, /^\s{2}promote:/mu);
  assert.doesNotMatch(release, /needs\.candidate/u);
  assert.match(release, /steps\.stage\.outcome != 'skipped'/u);
  assert.match(rollback, /cloudflare\/wrangler-action@v4/u);
  assert.match(rollback, /Capture current production version/u);
  assert.match(rollback, /Stage rollback target at zero percent/u);
  assert.match(rollback, /Smoke rollback target through Version Override/u);
  assert.match(rollback, /Promote exact rollback target/u);
  assert.match(rollback, /Restore original version after rollback failure/u);
  assert.match(rollback, /failure\(\) \|\| cancelled\(\)/u);
  assert.match(rollback, /steps\.stage_rollback\.outcome != 'skipped'/u);
  assert.match(rollback, /production-version-allowlist/u);
  assert.match(migration, /APPLY_PRODUCTION_MIGRATIONS/u);
  assert.match(migration, /compatible_version_id/u);
  assert.match(migration, /Match migration approval to the live Worker/u);
  assert.match(migration, /production-version-allowlist/u);
  assert.match(migration, /cloudflare\/wrangler-action@v4/u);
  assert.match(migration, /d1 migrations apply/u);
  for (const workflow of [release, rollback, migration]) {
    assert.match(workflow, /EXPECTED_DOMAIN_SERVICE(?:=|: )gomate/u);
    assert.doesNotMatch(workflow, /gomate-production-preview/u);
  }
});
