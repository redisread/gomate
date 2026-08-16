#!/usr/bin/env node
import { appendFileSync } from "node:fs";
import { smokeProtectedPreview } from "./smoke-protected-preview.mjs";
import { validateProductionOrigin } from "./prepare-production-cutover.mjs";

try {
  const baseUrl = validateProductionOrigin(
    process.env.PRODUCTION_APP_URL ?? "",
  );
  const result = await smokeProtectedPreview({ baseUrl });
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(
      process.env.GITHUB_OUTPUT,
      `health_request_id=${result.healthRequestId}\nblocked_request_id=${result.blockedRequestId}\n`,
    );
  }
  console.log("Protected production smoke passed with correlated request IDs.");
} catch (error) {
  console.error(`[protected-production-smoke] ${error.message}`);
  process.exit(1);
}
