#!/usr/bin/env node
/** Verify the deployed preview is readable while all mutations stay blocked. */

import { appendFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const REQUEST_ID_PATTERN = /^[a-z0-9-]{36,96}$/iu;

function requiredRequestId(response, label) {
  const requestId = response.headers.get("x-request-id")?.trim();
  if (!requestId || !REQUEST_ID_PATTERN.test(requestId)) {
    throw new Error(`${label} smoke response is missing a valid X-Request-ID`);
  }
  return requestId;
}

export async function smokeProtectedPreview({
  baseUrl = process.env.PREVIEW_APP_URL?.trim(),
  fetchImpl = fetch,
} = {}) {
  if (!baseUrl) throw new Error("PREVIEW_APP_URL is required");

  const health = await fetchImpl(new URL("/api/health", baseUrl));
  if (!health.ok || !health.headers.get("content-type")?.includes("application/json")) {
    throw new Error(`Health smoke failed (${health.status})`);
  }
  const healthRequestId = requiredRequestId(health, "Health");

  const home = await fetchImpl(new URL("/", baseUrl));
  if (!home.ok || !home.headers.get("content-type")?.includes("text/html")) {
    throw new Error(`SSR smoke failed (${home.status})`);
  }

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
