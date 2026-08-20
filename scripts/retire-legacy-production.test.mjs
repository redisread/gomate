import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { retireLegacyProduction } from "./retire-legacy-production.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const accountRoot =
  "https://api.cloudflare.com/client/v4/accounts/e3afbb613458022947cd9dc9f5bd6334";

function initialState({
  includeLegacy = true,
  productionService,
  productionLocationCount = 36,
} = {}) {
  return {
    domains: [
      {
        id: "domain-production",
        hostname: "gomate.live",
        service: productionService ?? "gomate-production-preview",
        zone_id: "0b714cd4257332034b3c4c0c099feb9e",
      },
      ...(includeLegacy
        ? [
            {
              id: "domain-api",
              hostname: "api.gomate.live",
              service: "gomate-api",
              zone_id: "0b714cd4257332034b3c4c0c099feb9e",
            },
          ]
        : []),
    ],
    workers: [
      { id: "gomate-production-preview" },
      ...(includeLegacy
        ? [
            { id: "gomate-api" },
            { id: "gomate-frontend" },
            { id: "gomate-production-preview-production" },
          ]
        : []),
    ],
    databases: [
      {
        uuid: "befa3d89-6551-4a25-8a1c-670efe62a315",
        name: "gomate-db-v2",
      },
      ...(includeLegacy
        ? [
            {
              uuid: "7d17d076-202f-48f8-b343-24209cdb0ba1",
              name: "gomate-db",
            },
          ]
        : []),
    ],
    namespaces: [
      {
        id: "f9904d1fa72140c18067e07d541ca92b",
        title: "gomate-cache-v2",
      },
      ...(includeLegacy
        ? [
            {
              id: "638ecd78e70c48fda01904bc9c2105d8",
              title: "GOMATE_KV",
            },
            {
              id: "6e3db6b00bc4421faeb1402c2e51f7d1",
              title: "gomate-frontend-session",
            },
          ]
        : []),
    ],
    buckets: [{ name: "gomate" }],
    productionLocationCount,
  };
}

function fakeCloudflare(state, requests) {
  return async (url, init = {}) => {
    const value = String(url);
    const method = init.method ?? "GET";
    requests.push({ url: value, method });
    if (value === "https://gomate.live/api/health") {
      return Response.json({ status: "ok" });
    }
    if (value.startsWith("https://gomate.live/api/regions?")) {
      return Response.json({
        success: true,
        regions: [{ id: "region-cn-shenzhen" }],
      });
    }
    const relative = value.slice(accountRoot.length);
    if (method === "GET") {
      const result =
        relative === "/workers/domains"
          ? state.domains
          : relative === "/workers/scripts"
            ? state.workers
            : relative === "/d1/database"
              ? state.databases
              : relative === "/storage/kv/namespaces"
                ? state.namespaces
                : relative === "/r2/buckets"
                  ? { buckets: state.buckets }
                  : null;
      return Response.json(
        { success: result !== null, result },
        { status: result === null ? 404 : 200 },
      );
    }
    if (
      method === "POST" &&
      relative === "/d1/database/befa3d89-6551-4a25-8a1c-670efe62a315/query"
    ) {
      return Response.json({
        success: true,
        result: [
          {
            success: true,
            results: [
              {
                location_count: state.productionLocationCount,
                region_count: state.productionLocationCount === 36 ? 19 : 3,
              },
            ],
          },
        ],
      });
    }
    if (method !== "DELETE") {
      return Response.json({ success: false }, { status: 405 });
    }
    if (relative.startsWith("/workers/domains/")) {
      const id = decodeURIComponent(relative.split("/").at(-1));
      state.domains = state.domains.filter((domain) => domain.id !== id);
    } else if (relative.startsWith("/workers/scripts/")) {
      const id = decodeURIComponent(relative.split("/").at(-1));
      state.workers = state.workers.filter((worker) => worker.id !== id);
    } else if (relative.startsWith("/d1/database/")) {
      const id = relative.split("/").at(-1);
      state.databases = state.databases.filter(
        (database) => database.uuid !== id,
      );
    } else if (relative.startsWith("/storage/kv/namespaces/")) {
      const id = relative.split("/").at(-1);
      state.namespaces = state.namespaces.filter(
        (namespace) => namespace.id !== id,
      );
    } else {
      return Response.json({ success: false }, { status: 404 });
    }
    return Response.json({ success: true, result: null });
  };
}

test("legacy retirement fails before the explicitly approved boundary", async () => {
  let fetched = false;
  await assert.rejects(
    () =>
      retireLegacyProduction({
        accountId: "e3afbb613458022947cd9dc9f5bd6334",
        apiToken: "test-token",
        baseUrl: "https://gomate.live",
        nowImpl: () => Date.parse("2026-08-20T14:59:59Z"),
        fetchImpl: async () => {
          fetched = true;
          throw new Error("must not fetch");
        },
      }),
    /approved legacy retirement time/u,
  );
  assert.equal(fetched, false);
});

test("legacy retirement deletes only reviewed legacy resources", async () => {
  const state = initialState();
  const requests = [];
  const result = await retireLegacyProduction({
    accountId: "e3afbb613458022947cd9dc9f5bd6334",
    apiToken: "test-token",
    baseUrl: "https://gomate.live",
    nowImpl: () => Date.parse("2026-08-20T15:00:00Z"),
    fetchImpl: fakeCloudflare(state, requests),
  });
  assert.deepEqual(result.deleted, [
    "domain:api.gomate.live",
    "worker:gomate-api",
    "worker:gomate-frontend",
    "worker:gomate-production-preview-production",
    "d1:gomate-db",
    "kv:GOMATE_KV",
    "kv:gomate-frontend-session",
  ]);
  assert.equal(state.workers.length, 1);
  assert.equal(state.workers[0].id, "gomate-production-preview");
  assert.equal(state.databases.length, 1);
  assert.equal(state.namespaces.length, 1);
  assert.deepEqual(state.buckets, [{ name: "gomate" }]);
  assert.equal(requests.filter(({ method }) => method === "DELETE").length, 7);
});

test("legacy retirement is idempotent after reviewed resources are absent", async () => {
  const state = initialState({ includeLegacy: false });
  const requests = [];
  const result = await retireLegacyProduction({
    accountId: "e3afbb613458022947cd9dc9f5bd6334",
    apiToken: "test-token",
    baseUrl: "https://gomate.live",
    nowImpl: () => Date.parse("2026-08-24T00:00:00Z"),
    fetchImpl: fakeCloudflare(state, requests),
  });
  assert.deepEqual(result.deleted, []);
  assert.equal(
    requests.some(({ method }) => method === "DELETE"),
    false,
  );
});

test("legacy retirement fails closed when production domain ownership drifts", async () => {
  const state = initialState({ productionService: "gomate-frontend" });
  const requests = [];
  await assert.rejects(
    () =>
      retireLegacyProduction({
        accountId: "e3afbb613458022947cd9dc9f5bd6334",
        apiToken: "test-token",
        baseUrl: "https://gomate.live",
        nowImpl: () => Date.parse("2026-08-24T00:00:00Z"),
        fetchImpl: fakeCloudflare(state, requests),
      }),
    /reviewed unified Worker/u,
  );
  assert.equal(
    requests.some(({ method }) => method === "DELETE"),
    false,
  );
});

test("legacy retirement refuses to delete the old D1 before Location migration", async () => {
  const state = initialState({ productionLocationCount: 0 });
  const requests = [];
  await assert.rejects(
    () =>
      retireLegacyProduction({
        accountId: "e3afbb613458022947cd9dc9f5bd6334",
        apiToken: "test-token",
        baseUrl: "https://gomate.live",
        nowImpl: () => Date.parse("2026-08-24T00:00:00Z"),
        fetchImpl: fakeCloudflare(state, requests),
      }),
    /Location migration is not complete/u,
  );
  assert.equal(
    requests.some(({ method }) => method === "DELETE"),
    false,
  );
});

test("legacy retirement workflow is protected and has no R2 deletion", () => {
  const workflow = readFileSync(
    path.join(root, ".github/workflows/retire-legacy-production.yml"),
    "utf8",
  );
  assert.match(workflow, /RETIRE_LEGACY_RESOURCES/u);
  assert.match(workflow, /github\.ref\s*==\s*'refs\/heads\/main'/u);
  assert.match(workflow, /environment:\s*production/u);
  assert.match(workflow, /group:\s*gomate-production-mutation/u);
  assert.match(workflow, /retire-legacy-production\.mjs/u);
  assert.doesNotMatch(workflow, /wrangler\s+r2|migrations apply|seed\.sql/iu);
});
