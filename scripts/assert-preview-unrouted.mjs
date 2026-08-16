#!/usr/bin/env node
/** Fail closed when the preview Worker is attached to a zone route/domain. */

import path from "node:path";
import { pathToFileURL } from "node:url";

const API_ROOT = "https://api.cloudflare.com/client/v4";
const PREVIEW_WORKER_NAME = "gomate-production-preview";
const PAGE_SIZE = 50;

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

async function fetchCloudflarePage(pathname, page) {
  const token = requiredEnv("CLOUDFLARE_API_TOKEN");
  const url = new URL(`${API_ROOT}${pathname}`);
  url.searchParams.set("page", String(page));
  url.searchParams.set("per_page", String(PAGE_SIZE));

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const payload = await response.json().catch(() => null);
  if (
    !response.ok ||
    payload?.success !== true ||
    !Array.isArray(payload.result)
  ) {
    throw new Error(
      `Cloudflare route audit failed for ${pathname} (${response.status})`,
    );
  }
  return payload;
}

async function fetchCloudflareObject(pathname) {
  const token = requiredEnv("CLOUDFLARE_API_TOKEN");
  const response = await fetch(`${API_ROOT}${pathname}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const payload = await response.json().catch(() => null);
  if (
    !response.ok ||
    payload?.success !== true ||
    !payload.result ||
    typeof payload.result !== "object" ||
    Array.isArray(payload.result)
  ) {
    throw new Error(
      `Cloudflare identity audit failed for ${pathname} (${response.status})`,
    );
  }
  return payload.result;
}

async function fetchAll(pathname) {
  const first = await fetchCloudflarePage(pathname, 1);
  const pages = Number(first.result_info?.total_pages ?? 1);
  if (!Number.isInteger(pages) || pages < 1 || pages > 100) {
    throw new Error(`Unexpected Cloudflare pagination for ${pathname}`);
  }

  const results = [...first.result];
  for (let page = 2; page <= pages; page += 1) {
    const next = await fetchCloudflarePage(pathname, page);
    results.push(...next.result);
  }
  return results;
}

export async function assertPreviewUnrouted() {
  const accountId = requiredEnv("CLOUDFLARE_ACCOUNT_ID");
  const zoneId = requiredEnv("CLOUDFLARE_ZONE_ID");
  const previewUrl = new URL(requiredEnv("PREVIEW_APP_URL"));
  const [accountSubdomain, zone, domains, zones] = await Promise.all([
    fetchCloudflareObject(
      `/accounts/${encodeURIComponent(accountId)}/workers/subdomain`,
    ),
    fetchCloudflareObject(`/zones/${encodeURIComponent(zoneId)}`),
    fetchAll(`/accounts/${encodeURIComponent(accountId)}/workers/domains`),
    fetchAll(`/zones?account.id=${encodeURIComponent(accountId)}`),
  ]);

  if (zone.name !== "gomate.live") {
    throw new Error("CLOUDFLARE_ZONE_ID must resolve to gomate.live");
  }
  if (!zones.some((candidate) => candidate?.id === zoneId)) {
    throw new Error("CLOUDFLARE_ZONE_ID is not visible in the configured account");
  }
  const expectedHostname = `${PREVIEW_WORKER_NAME}.${accountSubdomain.subdomain}.workers.dev`;
  if (previewUrl.hostname !== expectedHostname) {
    throw new Error(
      `PREVIEW_APP_URL must use the audited account subdomain ${expectedHostname}`,
    );
  }

  const attachedDomains = domains.filter(
    (domain) => domain?.service === PREVIEW_WORKER_NAME,
  );
  const attachedRoutes = [];
  for (const candidate of zones) {
    if (typeof candidate?.id !== "string" || !/^[0-9a-f]{32}$/iu.test(candidate.id)) {
      throw new Error("Cloudflare zone audit returned an invalid zone ID");
    }
    const routes = await fetchAll(
      `/zones/${encodeURIComponent(candidate.id)}/workers/routes`,
    );
    attachedRoutes.push(
      ...routes
        .filter((route) => route?.script === PREVIEW_WORKER_NAME)
        .map((route) => ({ ...route, zoneName: candidate.name })),
    );
  }
  if (attachedDomains.length > 0 || attachedRoutes.length > 0) {
    const targets = [
      ...attachedDomains.map((domain) => domain.hostname ?? domain.id),
      ...attachedRoutes.map(
        (route) => `${route.zoneName ?? "unknown-zone"}:${route.pattern ?? route.id}`,
      ),
    ];
    throw new Error(
      `Preview Worker is already attached to production routing: ${targets.join(", ")}`,
    );
  }

  console.log(
    `Verified ${PREVIEW_WORKER_NAME} has no custom domain or zone route.`,
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  assertPreviewUnrouted().catch((error) => {
    console.error(`[preview-route-audit] ${error.message}`);
    process.exit(1);
  });
}
