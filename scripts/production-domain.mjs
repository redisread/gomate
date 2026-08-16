#!/usr/bin/env node
import path from "node:path";
import { pathToFileURL } from "node:url";

const API_ROOT = "https://api.cloudflare.com/client/v4";
const ZONE_ID = "0b714cd4257332034b3c4c0c099feb9e";
const ALLOWED_TARGET_SERVICES = new Set([
  "gomate-frontend",
  "gomate-production-preview",
]);
const DEFAULT_RETRY_DELAY_MS = 5_000;

function required(value, label) {
  const result = value?.trim();
  if (!result) throw new Error(`${label} is required`);
  return result;
}

function nonNegativeInteger(value, label, fallback) {
  const candidate = value === undefined || value === "" ? fallback : Number(value);
  if (!Number.isInteger(candidate) || candidate < 0) {
    throw new Error(`${label} must be a non-negative integer`);
  }
  return candidate;
}

function expectedServiceSet(value) {
  const services = required(value, "EXPECTED_DOMAIN_SERVICE(S)")
    .split(",")
    .map((service) => service.trim())
    .filter(Boolean);
  if (
    services.length === 0 ||
    services.some((service) => !ALLOWED_TARGET_SERVICES.has(service))
  ) {
    throw new Error("Expected domain services contain an unapproved Worker");
  }
  return new Set(services);
}

async function cloudflareRequest({ accountId, apiToken, fetchImpl, init }) {
  const response = await fetchImpl(
    `${API_ROOT}/accounts/${encodeURIComponent(accountId)}/workers/domains`,
    {
      ...init,
      headers: {
        Authorization: `Bearer ${apiToken}`,
        ...(init?.body ? { "content-type": "application/json" } : {}),
      },
    },
  );
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.success !== true) {
    throw new Error(
      `Cloudflare custom-domain request failed (${response.status})`,
    );
  }
  return payload.result;
}

export async function assertProductionDomain({
  accountId = process.env.CLOUDFLARE_ACCOUNT_ID,
  apiToken = process.env.CLOUDFLARE_API_TOKEN,
  expectedService,
  expectedServices,
  timeoutMs = process.env.DOMAIN_ASSERT_TIMEOUT_MS,
  retryDelayMs = process.env.DOMAIN_ASSERT_RETRY_DELAY_MS,
  waitImpl = (delay) => new Promise((resolve) => setTimeout(resolve, delay)),
  nowImpl = Date.now,
  fetchImpl = fetch,
} = {}) {
  accountId = required(accountId, "CLOUDFLARE_ACCOUNT_ID");
  apiToken = required(apiToken, "CLOUDFLARE_API_TOKEN");
  const approvedServices = expectedServiceSet(
    expectedServices ??
      expectedService ??
      process.env.EXPECTED_DOMAIN_SERVICES ??
      process.env.EXPECTED_DOMAIN_SERVICE,
  );
  timeoutMs = nonNegativeInteger(timeoutMs, "DOMAIN_ASSERT_TIMEOUT_MS", 0);
  retryDelayMs = nonNegativeInteger(
    retryDelayMs,
    "DOMAIN_ASSERT_RETRY_DELAY_MS",
    DEFAULT_RETRY_DELAY_MS,
  );
  if (retryDelayMs === 0 && timeoutMs > 0) {
    throw new Error("DOMAIN_ASSERT_RETRY_DELAY_MS must be positive when retrying");
  }
  const deadline = nowImpl() + timeoutMs;

  while (true) {
    try {
      const domains = await cloudflareRequest({ accountId, apiToken, fetchImpl });
      if (!Array.isArray(domains)) {
        throw new Error("Cloudflare custom-domain inventory is invalid");
      }
      const matches = domains.filter(
        (domain) => domain?.hostname === "gomate.live",
      );
      if (
        matches.length === 1 &&
        approvedServices.has(matches[0]?.service) &&
        matches[0]?.zone_id === ZONE_ID
      ) {
        console.log(
          `Verified gomate.live is attached to ${matches[0].service}.`,
        );
        return matches[0];
      }
    } catch (error) {
      if (nowImpl() >= deadline) throw error;
    }

    const remainingMs = deadline - nowImpl();
    if (remainingMs <= 0) {
      throw new Error(
        "gomate.live is not attached to an expected Worker and zone",
      );
    }
    await waitImpl(Math.min(retryDelayMs, remainingMs));
  }
}

export async function attachProductionDomain({
  accountId = process.env.CLOUDFLARE_ACCOUNT_ID,
  apiToken = process.env.CLOUDFLARE_API_TOKEN,
  service = process.env.TARGET_DOMAIN_SERVICE,
  fetchImpl = fetch,
} = {}) {
  accountId = required(accountId, "CLOUDFLARE_ACCOUNT_ID");
  apiToken = required(apiToken, "CLOUDFLARE_API_TOKEN");
  service = required(service, "TARGET_DOMAIN_SERVICE");
  if (!ALLOWED_TARGET_SERVICES.has(service)) {
    throw new Error("TARGET_DOMAIN_SERVICE is not an approved Worker");
  }
  const result = await cloudflareRequest({
    accountId,
    apiToken,
    fetchImpl,
    init: {
      method: "PUT",
      body: JSON.stringify({
        hostname: "gomate.live",
        service,
        zone_id: ZONE_ID,
      }),
    },
  });
  if (
    result?.hostname !== "gomate.live" ||
    result?.service !== service ||
    result?.zone_id !== ZONE_ID
  ) {
    throw new Error(
      "Cloudflare returned an unexpected custom-domain attachment",
    );
  }
  console.log(`Attached gomate.live to ${service}.`);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  const command = process.argv[2];
  const operation =
    command === "assert"
      ? assertProductionDomain
      : command === "attach"
        ? attachProductionDomain
        : null;
  if (!operation) {
    console.error("Usage: production-domain.mjs assert|attach");
    process.exit(1);
  }
  operation().catch((error) => {
    console.error(`[production-domain] ${error.message}`);
    process.exit(1);
  });
}
