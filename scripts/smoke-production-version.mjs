#!/usr/bin/env node

import { appendFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { assertWorkerVersionId } from "./release-versions.mjs";

const REQUEST_ID_PATTERN = /^[a-z0-9-]{36,96}$/iu;
const WORKER_NAME = "gomate";
const wait = (delay) => new Promise((resolve) => setTimeout(resolve, delay));

function productionOrigin(value) {
  const url = new URL(value);
  if (url.href !== "https://gomate.live/") {
    throw new Error("Production origin must be exactly https://gomate.live");
  }
  return url;
}

function requestHeaders(expectedVersionId, useVersionOverride) {
  if (!useVersionOverride) return undefined;
  return {
    "Cloudflare-Workers-Version-Overrides": `${WORKER_NAME}="${expectedVersionId}"`,
  };
}

function assertRetryWindow(timeoutMs, delayMs) {
  if (!Number.isInteger(timeoutMs) || timeoutMs < 0) {
    throw new Error("retryTimeoutMs must be a non-negative integer");
  }
  if (!Number.isInteger(delayMs) || delayMs <= 0) {
    throw new Error("retryDelayMs must be a positive integer");
  }
}

async function validateSmokeResponse(response, endpoint, expectedVersionId) {
  const contentType = response.headers.get("content-type") ?? "";
  if (response.headers.get("x-worker-version-id") !== expectedVersionId) {
    throw new Error("Response did not execute the expected Worker version");
  }
  if (endpoint === "/") {
    const body = await response.text();
    if (
      !response.ok ||
      !contentType.includes("text/html") ||
      !/<html[\s>]/iu.test(body)
    ) {
      throw new Error("Production Astro SSR smoke failed");
    }
    return undefined;
  }

  const requestId = response.headers.get("x-request-id")?.trim();
  const payload = await response.json().catch(() => null);
  if (
    !response.ok ||
    !contentType.includes("application/json") ||
    !requestId ||
    !REQUEST_ID_PATTERN.test(requestId)
  ) {
    throw new Error(`Production smoke failed for ${endpoint}`);
  }
  if (endpoint === "/api/health") {
    if (payload?.status !== "ok" || payload?.versionId !== expectedVersionId) {
      throw new Error(
        "Health check did not execute the expected Worker version",
      );
    }
  } else {
    const regions = payload?.regions ?? payload?.data;
    if (
      payload?.success !== true ||
      !Array.isArray(regions) ||
      !regions.some((region) => region.id === "region-cn-shenzhen")
    ) {
      throw new Error("Production Region smoke did not return Shenzhen");
    }
  }
  return requestId;
}

export async function smokeProductionVersion({
  baseUrl,
  expectedVersionId,
  useVersionOverride = false,
  retryTimeoutMs = 120_000,
  retryDelayMs = 5_000,
  fetchImpl = fetch,
  nowImpl = Date.now,
  waitImpl = wait,
} = {}) {
  const origin = productionOrigin(baseUrl);
  expectedVersionId = assertWorkerVersionId(expectedVersionId);
  assertRetryWindow(retryTimeoutMs, retryDelayMs);
  const headers = requestHeaders(expectedVersionId, useVersionOverride);
  const requestIds = [];
  const deadline = nowImpl() + retryTimeoutMs;

  for (const endpoint of [
    "/api/health",
    "/",
    "/api/regions?countryCode=CN&level=city&serviceEnabled=true",
  ]) {
    while (true) {
      try {
        const response = await fetchImpl(new URL(endpoint, origin), {
          headers,
          signal: AbortSignal.timeout(20_000),
        });
        const requestId = await validateSmokeResponse(
          response,
          endpoint,
          expectedVersionId,
        );
        if (requestId) requestIds.push(requestId);
        break;
      } catch (error) {
        const remaining = deadline - nowImpl();
        if (remaining <= 0) throw error;
        await waitImpl(Math.min(retryDelayMs, remaining));
      }
    }
  }

  return { requestIds, versionId: expectedVersionId };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  smokeProductionVersion({
    baseUrl: process.env.PRODUCTION_APP_URL,
    expectedVersionId: process.env.EXPECTED_VERSION_ID,
    useVersionOverride: process.env.USE_VERSION_OVERRIDE === "true",
  })
    .then((result) => {
      if (process.env.GITHUB_OUTPUT) {
        appendFileSync(
          process.env.GITHUB_OUTPUT,
          `version_id=${result.versionId}\nfirst_request_id=${result.requestIds[0]}\nlast_request_id=${result.requestIds.at(-1)}\n`,
        );
      }
      console.log(`Production smoke passed for version ${result.versionId}.`);
    })
    .catch((error) => {
      console.error(`[production-version-smoke] ${error.message}`);
      process.exit(1);
    });
}
