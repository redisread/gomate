#!/usr/bin/env node
import { appendFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const API_ROOT = "https://api.cloudflare.com/client/v4";
const ACCOUNT_ID = "e3afbb613458022947cd9dc9f5bd6334";
const ZONE_ID = "0b714cd4257332034b3c4c0c099feb9e";
const RETIRE_NOT_BEFORE = Date.parse("2026-08-23T18:53:01Z");
const PRODUCTION_WORKER = "gomate-production-preview";
const PRODUCTION_D1 = {
  id: "befa3d89-6551-4a25-8a1c-670efe62a315",
  name: "gomate-db-v2",
};
const PRODUCTION_KV = {
  id: "f9904d1fa72140c18067e07d541ca92b",
  title: "gomate-cache-v2",
};
const LEGACY_WORKERS = [
  "gomate-api",
  "gomate-frontend",
  "gomate-production-preview-production",
];
const LEGACY_D1 = {
  id: "7d17d076-202f-48f8-b343-24209cdb0ba1",
  name: "gomate-db",
};
const LEGACY_KV = [
  { id: "638ecd78e70c48fda01904bc9c2105d8", title: "GOMATE_KV" },
  {
    id: "6e3db6b00bc4421faeb1402c2e51f7d1",
    title: "gomate-frontend-session",
  },
];

function required(value, label) {
  const result = value?.trim();
  if (!result) throw new Error(`${label} is required`);
  return result;
}

async function cloudflareRequest({
  accountId,
  apiToken,
  resourcePath,
  method = "GET",
  fetchImpl,
}) {
  const response = await fetchImpl(
    `${API_ROOT}/accounts/${encodeURIComponent(accountId)}${resourcePath}`,
    { method, headers: { Authorization: `Bearer ${apiToken}` } },
  );
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.success !== true) {
    throw new Error(
      `Cloudflare retirement request failed (${response.status})`,
    );
  }
  return payload.result;
}

async function inventory({ accountId, apiToken, fetchImpl }) {
  const [domains, workers, databases, namespaces, r2] = await Promise.all([
    cloudflareRequest({
      accountId,
      apiToken,
      resourcePath: "/workers/domains",
      fetchImpl,
    }),
    cloudflareRequest({
      accountId,
      apiToken,
      resourcePath: "/workers/scripts",
      fetchImpl,
    }),
    cloudflareRequest({
      accountId,
      apiToken,
      resourcePath: "/d1/database",
      fetchImpl,
    }),
    cloudflareRequest({
      accountId,
      apiToken,
      resourcePath: "/storage/kv/namespaces",
      fetchImpl,
    }),
    cloudflareRequest({
      accountId,
      apiToken,
      resourcePath: "/r2/buckets",
      fetchImpl,
    }),
  ]);
  if (
    !Array.isArray(domains) ||
    !Array.isArray(workers) ||
    !Array.isArray(databases) ||
    !Array.isArray(namespaces) ||
    !Array.isArray(r2?.buckets)
  ) {
    throw new Error("Cloudflare retirement inventory is invalid");
  }
  return { domains, workers, databases, namespaces, buckets: r2.buckets };
}

function assertProductionResources(state) {
  const productionDomains = state.domains.filter(
    (domain) => domain.hostname === "gomate.live",
  );
  if (
    productionDomains.length !== 1 ||
    productionDomains[0].service !== PRODUCTION_WORKER ||
    productionDomains[0].zone_id !== ZONE_ID
  ) {
    throw new Error("gomate.live is not owned by the reviewed unified Worker");
  }
  if (!state.workers.some((worker) => worker.id === PRODUCTION_WORKER)) {
    throw new Error("Production unified Worker is missing");
  }
  if (
    !state.databases.some(
      (database) =>
        database.uuid === PRODUCTION_D1.id &&
        database.name === PRODUCTION_D1.name,
    )
  ) {
    throw new Error("Production V2 D1 is missing");
  }
  if (
    !state.namespaces.some(
      (namespace) =>
        namespace.id === PRODUCTION_KV.id &&
        namespace.title === PRODUCTION_KV.title,
    )
  ) {
    throw new Error("Production V2 KV is missing");
  }
  if (!state.buckets.some((bucket) => bucket.name === "gomate")) {
    throw new Error("Shared gomate R2 bucket is missing");
  }
}

function assertLegacyIdentity(state) {
  const databaseById = state.databases.find(
    (database) => database.uuid === LEGACY_D1.id,
  );
  const databaseByName = state.databases.find(
    (database) => database.name === LEGACY_D1.name,
  );
  if (
    (databaseById && databaseById.name !== LEGACY_D1.name) ||
    (databaseByName && databaseByName.uuid !== LEGACY_D1.id)
  ) {
    throw new Error("Legacy D1 identity does not match the reviewed target");
  }
  for (const target of LEGACY_KV) {
    const byId = state.namespaces.find(
      (namespace) => namespace.id === target.id,
    );
    const byTitle = state.namespaces.find(
      (namespace) => namespace.title === target.title,
    );
    if (
      (byId && byId.title !== target.title) ||
      (byTitle && byTitle.id !== target.id)
    ) {
      throw new Error("Legacy KV identity does not match the reviewed target");
    }
  }
  const apiDomains = state.domains.filter(
    (domain) => domain.hostname === "api.gomate.live",
  );
  if (
    apiDomains.length > 1 ||
    (apiDomains.length === 1 &&
      (apiDomains[0].service !== "gomate-api" ||
        apiDomains[0].zone_id !== ZONE_ID))
  ) {
    throw new Error("Legacy API domain identity is invalid");
  }
}

async function verifyPublicProduction({ baseUrl, fetchImpl }) {
  const health = await fetchImpl(new URL("/api/health", baseUrl));
  const healthPayload = await health.json().catch(() => null);
  if (!health.ok || healthPayload?.status !== "ok") {
    throw new Error("Production health failed after retirement");
  }
  const regions = await fetchImpl(
    new URL(
      "/api/regions?countryCode=CN&level=city&serviceEnabled=true",
      baseUrl,
    ),
  );
  const regionPayload = await regions.json().catch(() => null);
  if (
    !regions.ok ||
    regionPayload?.success !== true ||
    !regionPayload.regions?.some((region) => region.id === "region-cn-shenzhen")
  ) {
    throw new Error("Production Region verification failed after retirement");
  }
}

export async function retireLegacyProduction({
  accountId = process.env.CLOUDFLARE_ACCOUNT_ID,
  apiToken = process.env.CLOUDFLARE_API_TOKEN,
  baseUrl = process.env.PRODUCTION_APP_URL,
  nowImpl = Date.now,
  fetchImpl = fetch,
} = {}) {
  accountId = required(accountId, "CLOUDFLARE_ACCOUNT_ID");
  apiToken = required(apiToken, "CLOUDFLARE_API_TOKEN");
  baseUrl = required(baseUrl, "PRODUCTION_APP_URL");
  if (accountId !== ACCOUNT_ID || baseUrl !== "https://gomate.live") {
    throw new Error("Legacy retirement target is not the reviewed production");
  }
  if (nowImpl() < RETIRE_NOT_BEFORE) {
    throw new Error("Mandatory seven-day retention window has not elapsed");
  }

  const before = await inventory({ accountId, apiToken, fetchImpl });
  assertProductionResources(before);
  assertLegacyIdentity(before);
  const deleted = [];
  const apiDomain = before.domains.find(
    (domain) => domain.hostname === "api.gomate.live",
  );
  if (apiDomain) {
    await cloudflareRequest({
      accountId,
      apiToken,
      resourcePath: `/workers/domains/${encodeURIComponent(apiDomain.id)}`,
      method: "DELETE",
      fetchImpl,
    });
    deleted.push("domain:api.gomate.live");
  }
  for (const workerName of LEGACY_WORKERS) {
    if (before.workers.some((worker) => worker.id === workerName)) {
      await cloudflareRequest({
        accountId,
        apiToken,
        resourcePath: `/workers/scripts/${encodeURIComponent(workerName)}`,
        method: "DELETE",
        fetchImpl,
      });
      deleted.push(`worker:${workerName}`);
    }
  }
  if (before.databases.some((database) => database.uuid === LEGACY_D1.id)) {
    await cloudflareRequest({
      accountId,
      apiToken,
      resourcePath: `/d1/database/${LEGACY_D1.id}`,
      method: "DELETE",
      fetchImpl,
    });
    deleted.push(`d1:${LEGACY_D1.name}`);
  }
  for (const target of LEGACY_KV) {
    if (before.namespaces.some((namespace) => namespace.id === target.id)) {
      await cloudflareRequest({
        accountId,
        apiToken,
        resourcePath: `/storage/kv/namespaces/${target.id}`,
        method: "DELETE",
        fetchImpl,
      });
      deleted.push(`kv:${target.title}`);
    }
  }

  const after = await inventory({ accountId, apiToken, fetchImpl });
  assertProductionResources(after);
  if (
    after.domains.some((domain) => domain.hostname === "api.gomate.live") ||
    after.workers.some((worker) => LEGACY_WORKERS.includes(worker.id)) ||
    after.databases.some((database) => database.uuid === LEGACY_D1.id) ||
    after.namespaces.some((namespace) =>
      LEGACY_KV.some((target) => target.id === namespace.id),
    )
  ) {
    throw new Error("Legacy Cloudflare resource retirement is incomplete");
  }
  await verifyPublicProduction({ baseUrl, fetchImpl });
  return { deleted };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  retireLegacyProduction()
    .then(({ deleted }) => {
      const lines = [
        "### Legacy Cloudflare retirement complete",
        ...deleted.map((resource) => `- Deleted ${resource}`),
        "- Preserved gomate-production-preview, gomate-db-v2, gomate-cache-v2, and R2 gomate.",
        "- Verified gomate.live health and Shenzhen Region after retirement.",
      ];
      if (process.env.GITHUB_STEP_SUMMARY) {
        appendFileSync(
          process.env.GITHUB_STEP_SUMMARY,
          `${lines.join("\n")}\n`,
        );
      }
      console.log(lines.join("\n"));
    })
    .catch((error) => {
      console.error(`[legacy-retirement] ${error.message}`);
      process.exit(1);
    });
}
