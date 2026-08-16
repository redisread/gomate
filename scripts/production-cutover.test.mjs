import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  prepareProductionCutover,
  validateProductionOrigin,
} from "./prepare-production-cutover.mjs";
import {
  assertProductionDomain,
  attachProductionDomain,
} from "./production-domain.mjs";
import { observeProduction } from "./observe-production.mjs";
import { runProductionCanary } from "./production-canary.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function builtConfig() {
  return {
    targetEnvironment: "production",
    name: "gomate-production-preview",
    main: "entry.mjs",
    no_bundle: true,
    workers_dev: true,
    preview_urls: false,
    vars: { WRITE_MODE: "protected" },
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
    secrets: { required: ["BETTER_AUTH_SECRET", "RESEND_API_KEY", "APP_URL"] },
  };
}

test("cutover config adds only the exact custom domain and reviewed write mode", () => {
  const directory = mkdtempSync(path.join(os.tmpdir(), "gomate-cutover-"));
  try {
    const configPath = path.join(directory, "wrangler.json");
    writeFileSync(configPath, JSON.stringify(builtConfig()));
    prepareProductionCutover({ configPath, mode: "protected" });
    let config = JSON.parse(readFileSync(configPath, "utf8"));
    assert.deepEqual(config.routes, [
      { pattern: "gomate.live", custom_domain: true },
    ]);
    assert.equal(config.vars.WRITE_MODE, "protected");
    assert.equal(Object.hasOwn(config.vars, "APP_URL"), false);

    writeFileSync(configPath, JSON.stringify(builtConfig()));
    prepareProductionCutover({ configPath, mode: "open" });
    config = JSON.parse(readFileSync(configPath, "utf8"));
    assert.equal(config.vars.WRITE_MODE, "open");
    assert.throws(
      () => prepareProductionCutover({ configPath, mode: "invalid" }),
      /protected or open/u,
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("production origin is exact and fragment-free", () => {
  assert.equal(
    validateProductionOrigin("https://gomate.live"),
    "https://gomate.live",
  );
  for (const value of [
    "http://gomate.live",
    "https://www.gomate.live",
    "https://gomate.live/path",
    "https://gomate.live/?token=bad",
  ]) {
    assert.throws(() => validateProductionOrigin(value), /exactly https/u);
  }
});

test("domain audit requires one exact hostname, zone, and Worker", async () => {
  const fetchImpl = async () =>
    new Response(
      JSON.stringify({
        success: true,
        result: [
          {
            id: "domain-id",
            hostname: "gomate.live",
            service: "gomate-frontend",
            zone_id: "0b714cd4257332034b3c4c0c099feb9e",
          },
        ],
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  await assert.doesNotReject(() =>
    assertProductionDomain({
      accountId: "e3afbb613458022947cd9dc9f5bd6334",
      apiToken: "test-token",
      expectedService: "gomate-frontend",
      fetchImpl,
    }),
  );
  await assert.rejects(
    () =>
      assertProductionDomain({
        accountId: "e3afbb613458022947cd9dc9f5bd6334",
        apiToken: "test-token",
        expectedService: "gomate-production-preview",
        fetchImpl,
      }),
    /expected Worker/u,
  );
});

test("domain audit supports an approved cutover state and bounded propagation retries", async () => {
  let attempts = 0;
  let now = 0;
  const result = await assertProductionDomain({
    accountId: "e3afbb613458022947cd9dc9f5bd6334",
    apiToken: "test-token",
    expectedServices: "gomate-frontend,gomate-production-preview",
    timeoutMs: 20,
    retryDelayMs: 5,
    nowImpl: () => now,
    waitImpl: async (delay) => {
      now += delay;
    },
    fetchImpl: async () => {
      attempts += 1;
      return new Response(
        JSON.stringify({
          success: true,
          result: [
            {
              id: "domain-id",
              hostname: "gomate.live",
              service:
                attempts === 1
                  ? "gomate-frontend"
                  : "gomate-production-preview",
              zone_id: "0b714cd4257332034b3c4c0c099feb9e",
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    },
  });
  assert.equal(result.service, "gomate-frontend");
  assert.equal(attempts, 1);

  attempts = 0;
  now = 0;
  const propagated = await assertProductionDomain({
    accountId: "e3afbb613458022947cd9dc9f5bd6334",
    apiToken: "test-token",
    expectedService: "gomate-production-preview",
    timeoutMs: 20,
    retryDelayMs: 5,
    nowImpl: () => now,
    waitImpl: async (delay) => {
      now += delay;
    },
    fetchImpl: async () => {
      attempts += 1;
      return new Response(
        JSON.stringify({
          success: true,
          result: [
            {
              id: "domain-id",
              hostname: "gomate.live",
              service:
                attempts < 3 ? "gomate-frontend" : "gomate-production-preview",
              zone_id: "0b714cd4257332034b3c4c0c099feb9e",
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    },
  });
  assert.equal(propagated.service, "gomate-production-preview");
  assert.equal(attempts, 3);
});

test("domain audit rejects the accidental suffixed Worker after cutover", async () => {
  await assert.rejects(
    () =>
      assertProductionDomain({
        accountId: "e3afbb613458022947cd9dc9f5bd6334",
        apiToken: "test-token",
        expectedService: "gomate-production-preview-production",
      }),
    /unapproved Worker/u,
  );
  await assert.rejects(
    () =>
      attachProductionDomain({
        accountId: "e3afbb613458022947cd9dc9f5bd6334",
        apiToken: "test-token",
        service: "gomate-production-preview-production",
      }),
    /not an approved Worker/u,
  );
});

test("rollback reattaches only the exact hostname, zone, and approved Worker", async () => {
  let request;
  await attachProductionDomain({
    accountId: "e3afbb613458022947cd9dc9f5bd6334",
    apiToken: "test-token",
    service: "gomate-frontend",
    fetchImpl: async (url, init) => {
      request = { url: String(url), init };
      return new Response(
        JSON.stringify({
          success: true,
          result: {
            hostname: "gomate.live",
            service: "gomate-frontend",
            zone_id: "0b714cd4257332034b3c4c0c099feb9e",
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    },
  });
  assert.equal(request.init.method, "PUT");
  assert.deepEqual(JSON.parse(request.init.body), {
    hostname: "gomate.live",
    service: "gomate-frontend",
    zone_id: "0b714cd4257332034b3c4c0c099feb9e",
  });
});

test("production observation checks health and Region without writes", async () => {
  const calls = [];
  let now = 0;
  const result = await observeProduction({
    baseUrl: "https://gomate.live",
    durationMs: 120,
    intervalMs: 60,
    nowImpl: () => now,
    waitImpl: async (delay) => {
      now += delay;
    },
    fetchImpl: async (url) => {
      calls.push(String(url));
      const isHealth = String(url).includes("/api/health");
      return new Response(
        JSON.stringify(
          isHealth
            ? { status: "ok", timestamp: "2026-08-16T17:37:36.642Z" }
            : { success: true, regions: [{ id: "region-cn-shenzhen" }] },
        ),
        {
          status: 200,
          headers: {
            "content-type": "application/json",
            "x-request-id": `00000000-0000-4000-8000-00000000000${calls.length}`,
          },
        },
      );
    },
  });
  assert.equal(result.samples, 3);
  assert.equal(calls.length, 6);
  assert.ok(
    calls.every(
      (url) => !url.includes("auth/sign") && !url.includes("users/me"),
    ),
  );
});

test("production observation rejects an invalid health payload", async () => {
  await assert.rejects(
    () =>
      observeProduction({
        baseUrl: "https://gomate.live",
        durationMs: 0,
        fetchImpl: async (url) =>
          new Response(
            JSON.stringify(
              String(url).includes("/api/health")
                ? { success: true }
                : {
                    success: true,
                    regions: [{ id: "region-cn-shenzhen" }],
                  },
            ),
            {
              status: 200,
              headers: {
                "content-type": "application/json",
                "x-request-id": "00000000-0000-4000-8000-000000000001",
              },
            },
          ),
      }),
    /Observation failed for \/api\/health/u,
  );
});

test("production canary covers auth, session, mutation, and sign-out without exposing tokens", async () => {
  const calls = [];
  const payloads = [
    [{ success: true }, { "set-cookie": null }],
    [{ success: true }, {}],
    [
      { user: { id: "user-canary" } },
      { "set-cookie": "session=safe; HttpOnly" },
    ],
    [{ user: { id: "user-canary" } }, {}],
    [{ success: true, user: { nickname: "Stage C Canary Verified" } }, {}],
    [{ success: true }, {}],
    [null, {}],
  ];
  const result = await runProductionCanary({
    baseUrl: "https://gomate.live",
    email: "stage-c-canary-123@example.invalid",
    authSecret: "test-auth-secret-at-least-32-characters-long",
    createVerificationTokenImpl: async () => "private-token",
    fetchImpl: async (url, init) => {
      calls.push({ url: String(url), init });
      const [payload, extraHeaders] = payloads[calls.length - 1];
      const headers = new Headers({
        "content-type": "application/json",
        "x-request-id": `10000000-0000-4000-8000-00000000000${calls.length}`,
      });
      if (extraHeaders["set-cookie"]) {
        headers.set("set-cookie", extraHeaders["set-cookie"]);
      }
      return new Response(payload === null ? "null" : JSON.stringify(payload), {
        status: 200,
        headers,
      });
    },
  });
  assert.equal(calls.length, 7);
  assert.match(calls[4].url, /\/api\/users\/me$/u);
  assert.equal(calls[4].init.method, "PATCH");
  assert.ok(
    calls.slice(3).every(({ init }) => init.headers.cookie === "session=safe"),
  );
  assert.ok(
    Object.values(result).every((value) => !value.includes("private-token")),
  );
});

test("cutover and rollback workflows are protected and narrowly scoped", () => {
  const cutover = readFileSync(
    path.join(root, ".github/workflows/cutover-production.yml"),
    "utf8",
  );
  const rollback = readFileSync(
    path.join(root, ".github/workflows/rollback-production-cutover.yml"),
    "utf8",
  );
  assert.match(cutover, /CUTOVER_PRODUCTION/u);
  assert.match(cutover, /github\.ref\s*==\s*'refs\/heads\/main'/u);
  assert.match(cutover, /environment:\s*production/gu);
  assert.match(cutover, /--mode protected[\s\S]*--mode open/iu);
  assert.match(cutover, /gomate\.live/u);
  assert.match(cutover, /observe-production\.mjs/u);
  assert.match(cutover, /production-canary\.mjs/u);
  assert.match(
    cutover,
    /EXPECTED_DOMAIN_SERVICES:\s*gomate-frontend,gomate-production-preview/u,
  );
  assert.doesNotMatch(cutover, /gomate-production-preview-production/u);
  assert.match(cutover, /DOMAIN_ASSERT_TIMEOUT_MS:\s*"120000"/u);
  assert.doesNotMatch(
    cutover,
    /environment:\s*production\s+env:\s+CLOUDFLARE_ENV:\s*production/u,
  );
  assert.match(
    cutover,
    /pnpm --filter @gomate\/frontend worker:dry-run\s+pnpm --filter @gomate\/frontend worker:size/u,
  );
  assert.doesNotMatch(
    cutover,
    /migrations apply|seed\.sql|wrangler\s+r2|wrangler\s+kv/iu,
  );
  assert.match(rollback, /ROLLBACK_PRODUCTION/u);
  assert.match(rollback, /gomate-frontend/u);
  assert.match(rollback, /mode=protected|--mode protected/u);
  assert.doesNotMatch(rollback, /DELETE FROM|wrangler\s+r2|wrangler\s+kv/iu);
});
