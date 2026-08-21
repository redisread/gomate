#!/usr/bin/env node
import { appendFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { validateProductionOrigin } from "./validate-production-release.mjs";
import { assertWorkerVersionId } from "./release-versions.mjs";

const REQUEST_ID = /^[a-z0-9-]{36,96}$/iu;
const wait = (delay) => new Promise((resolve) => setTimeout(resolve, delay));

export async function observeProduction({
  baseUrl = process.env.PRODUCTION_APP_URL,
  durationMs = 1_800_000,
  intervalMs = 60_000,
  expectedVersionId,
  fetchImpl = fetch,
  nowImpl = Date.now,
  waitImpl = wait,
} = {}) {
  baseUrl = validateProductionOrigin(baseUrl ?? "");
  expectedVersionId = expectedVersionId
    ? assertWorkerVersionId(expectedVersionId)
    : undefined;
  if (!Number.isInteger(durationMs) || durationMs < 0) {
    throw new Error("durationMs must be a non-negative integer");
  }
  if (!Number.isInteger(intervalMs) || intervalMs <= 0) {
    throw new Error("intervalMs must be a positive integer");
  }
  const deadline = nowImpl() + durationMs;
  let samples = 0;
  let firstRequestId;
  let lastRequestId;
  while (true) {
    for (const endpoint of [
      "/api/health",
      "/",
      "/api/regions?countryCode=CN&level=city&serviceEnabled=true",
    ]) {
      const response = await fetchImpl(new URL(endpoint, baseUrl), {
        signal: AbortSignal.timeout(15_000),
      });
      const requestId = response.headers.get("x-request-id")?.trim();
      const contentType = response.headers.get("content-type") ?? "";
      const servedVersionId = response.headers.get("x-worker-version-id");
      const isSsr = endpoint === "/";
      const payload = isSsr
        ? await response.text().catch(() => "")
        : await response.json().catch(() => null);
      const payloadIsValid = isSsr
        ? contentType.includes("text/html") && /<html[\s>]/iu.test(payload)
        : endpoint === "/api/health"
          ? payload?.status === "ok" &&
            (!expectedVersionId || payload?.versionId === expectedVersionId)
          : payload?.success === true;
      if (
        !response.ok ||
        (expectedVersionId && servedVersionId !== expectedVersionId) ||
        (!isSsr && !contentType.includes("application/json")) ||
        (!isSsr && (!requestId || !REQUEST_ID.test(requestId))) ||
        !payloadIsValid
      ) {
        if (expectedVersionId && servedVersionId !== expectedVersionId) {
          throw new Error(
            "Observation did not execute the expected Worker version",
          );
        }
        if (
          endpoint === "/api/health" &&
          expectedVersionId &&
          payload?.versionId !== expectedVersionId
        ) {
          throw new Error(
            "Observation did not execute the expected Worker version",
          );
        }
        throw new Error(
          `Observation failed for ${endpoint} (${response.status})`,
        );
      }
      if (endpoint.startsWith("/api/regions")) {
        const regions = payload.regions ?? payload.data ?? [];
        if (
          !Array.isArray(regions) ||
          !regions.some((region) => region.id === "region-cn-shenzhen")
        ) {
          throw new Error(
            "Production Region observation did not return Shenzhen",
          );
        }
      }
      if (requestId) {
        firstRequestId ??= requestId;
        lastRequestId = requestId;
      }
    }
    samples += 1;
    const remaining = deadline - nowImpl();
    if (remaining <= 0) break;
    await waitImpl(Math.min(intervalMs, remaining));
  }
  return { firstRequestId, lastRequestId, samples };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  const durationMs = Number(process.env.OBSERVATION_DURATION_MS ?? 300_000);
  const intervalMs = Number(process.env.OBSERVATION_INTERVAL_MS ?? 30_000);
  observeProduction({
    durationMs,
    intervalMs,
    expectedVersionId: process.env.EXPECTED_VERSION_ID,
  })
    .then((result) => {
      if (process.env.GITHUB_OUTPUT) {
        appendFileSync(
          process.env.GITHUB_OUTPUT,
          `first_request_id=${result.firstRequestId}\nlast_request_id=${result.lastRequestId}\nsamples=${result.samples}\n`,
        );
      }
      console.log(
        `Production observation passed with ${result.samples} samples.`,
      );
    })
    .catch((error) => {
      console.error(`[production-observation] ${error.message}`);
      process.exit(1);
    });
}
