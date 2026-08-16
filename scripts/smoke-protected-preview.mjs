#!/usr/bin/env node
/** Verify the deployed preview is readable while all mutations stay blocked. */

import { appendFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const REQUEST_ID_PATTERN = /^[a-z0-9-]{36,96}$/iu;
const DEFAULT_READINESS_TIMEOUT_MS = 120_000;
const DEFAULT_READINESS_RETRY_DELAY_MS = 5_000;
const TRANSIENT_READINESS_STATUSES = new Set([404, 523]);

const wait = (delayMs) => new Promise((resolve) => setTimeout(resolve, delayMs));
const timeoutSignal = (timeoutMs) => AbortSignal.timeout(timeoutMs);

function requiredRequestId(response, label) {
  const requestId = response.headers.get("x-request-id")?.trim();
  if (!requestId || !REQUEST_ID_PATTERN.test(requestId)) {
    throw new Error(`${label} smoke response is missing a valid X-Request-ID`);
  }
  return requestId;
}

async function waitForReadyResponse({
  label,
  request,
  isReady,
  deadlineMs,
  retryDelayMs,
  waitImpl,
  nowImpl,
  timeoutSignalImpl,
}) {
  while (true) {
    const remainingMs = deadlineMs - nowImpl();
    if (remainingMs <= 0) {
      throw new Error(`${label} smoke readiness timed out`);
    }

    let response;
    try {
      response = await request(timeoutSignalImpl(remainingMs));
    } catch {
      const retryWaitMs = Math.min(retryDelayMs, deadlineMs - nowImpl());
      if (retryWaitMs <= 0) {
        throw new Error(`${label} smoke readiness timed out`);
      }
      await waitImpl(retryWaitMs);
      continue;
    }

    if (isReady(response)) return response;
    if (
      !TRANSIENT_READINESS_STATUSES.has(response.status) ||
      response.headers.has("x-request-id")
    ) {
      throw new Error(`${label} smoke failed (${response.status})`);
    }

    const retryWaitMs = Math.min(retryDelayMs, deadlineMs - nowImpl());
    if (retryWaitMs <= 0) {
      throw new Error(`${label} smoke readiness timed out`);
    }
    await waitImpl(retryWaitMs);
  }
}

export async function smokeProtectedPreview({
  baseUrl = process.env.PREVIEW_APP_URL?.trim(),
  fetchImpl = fetch,
  readinessTimeoutMs = DEFAULT_READINESS_TIMEOUT_MS,
  readinessRetryDelayMs = DEFAULT_READINESS_RETRY_DELAY_MS,
  waitImpl = wait,
  nowImpl = Date.now,
  timeoutSignalImpl = timeoutSignal,
} = {}) {
  if (!baseUrl) throw new Error("PREVIEW_APP_URL is required");
  if (!Number.isInteger(readinessTimeoutMs) || readinessTimeoutMs <= 0) {
    throw new Error("readinessTimeoutMs must be a positive integer");
  }
  if (
    !Number.isInteger(readinessRetryDelayMs) ||
    readinessRetryDelayMs <= 0
  ) {
    throw new Error("readinessRetryDelayMs must be a positive integer");
  }
  const readinessDeadlineMs = nowImpl() + readinessTimeoutMs;

  const health = await waitForReadyResponse({
    label: "Health",
    request: (signal) =>
      fetchImpl(new URL("/api/health", baseUrl), { signal }),
    isReady: (response) =>
      response.ok &&
      response.headers.get("content-type")?.includes("application/json"),
    deadlineMs: readinessDeadlineMs,
    retryDelayMs: readinessRetryDelayMs,
    waitImpl,
    nowImpl,
    timeoutSignalImpl,
  });
  const healthRequestId = requiredRequestId(health, "Health");

  await waitForReadyResponse({
    label: "SSR",
    request: (signal) => fetchImpl(new URL("/", baseUrl), { signal }),
    isReady: (response) =>
      response.ok && response.headers.get("content-type")?.includes("text/html"),
    deadlineMs: readinessDeadlineMs,
    retryDelayMs: readinessRetryDelayMs,
    waitImpl,
    nowImpl,
    timeoutSignalImpl,
  });

  const blocked = await fetchImpl(new URL("/api/auth/sign-in/email", baseUrl), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: "observability-canary@example.invalid",
      password: "log-canary-token-must-not-appear",
    }),
  });
  const blockedRequestId = requiredRequestId(blocked, "Protected mutation");
  const blockedPayload = await blocked.json().catch(() => null);
  if (
    blocked.status !== 503 ||
    blocked.headers.get("retry-after") !== "60" ||
    blockedPayload?.error?.code !== "WRITE_PROTECTED"
  ) {
    throw new Error("Preview mutation did not return 503 WRITE_PROTECTED");
  }

  return { healthRequestId, blockedRequestId };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  smokeProtectedPreview()
    .then(({ healthRequestId, blockedRequestId }) => {
      if (process.env.GITHUB_OUTPUT) {
        appendFileSync(
          process.env.GITHUB_OUTPUT,
          `health_request_id=${healthRequestId}\nblocked_request_id=${blockedRequestId}\n`,
        );
      }
      console.log(
        `Protected preview smoke passed; health request ${healthRequestId}, blocked mutation ${blockedRequestId}.`,
      );
    })
    .catch((error) => {
      console.error(`[preview-smoke] ${error.message}`);
      process.exit(1);
    });
}
