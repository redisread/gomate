import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  assertProductionBuildEnvironment,
  assertProductionDeployEnvironment,
  assertProductionWriteMode,
  parseJsonc,
} from "./production-build-guard.mjs";
import { PRODUCTION_WRANGLER_COMMANDS } from "./deploy-production.mjs";

test("allows local production-parity builds", () => {
  assert.doesNotThrow(() =>
    assertProductionBuildEnvironment({ CLOUDFLARE_ENV: "production" }),
  );
});

test("allows the production branch in Workers Builds", () => {
  assert.doesNotThrow(() =>
    assertProductionBuildEnvironment({
      CLOUDFLARE_ENV: "production",
      WORKERS_CI: "1",
      WORKERS_CI_BRANCH: "main",
    }),
  );
});

test("rejects non-production Workers Builds branches", () => {
  assert.throws(
    () =>
      assertProductionBuildEnvironment({
        WORKERS_CI: "1",
        WORKERS_CI_BRANCH: "feature/example",
      }),
    /只允许 main/u,
  );
});

test("rejects an explicitly selected non-production environment", () => {
  assert.throws(
    () =>
      assertProductionBuildEnvironment({ CLOUDFLARE_ENV: "preview" }),
    /只允许 CLOUDFLARE_ENV=production/u,
  );
});

test("allows production deployment from the main Workers Build", () => {
  assert.doesNotThrow(() =>
    assertProductionDeployEnvironment({
      CLOUDFLARE_ENV: "production",
      WORKERS_CI: "1",
      WORKERS_CI_BRANCH: "main",
    }),
  );
});

test("requires normal production deployments to keep writes open", () => {
  assert.doesNotThrow(() =>
    assertProductionWriteMode({
      CLOUDFLARE_ENV: "production",
      WORKERS_CI: "1",
      WORKERS_CI_BRANCH: "main",
      WRITE_MODE: "open",
    }),
  );
  assert.throws(
    () =>
      assertProductionWriteMode({
        CLOUDFLARE_ENV: "production",
        WORKERS_CI: "1",
        WORKERS_CI_BRANCH: "main",
        WRITE_MODE: "protected",
      }),
    /WRITE_MODE=open/u,
  );
});

test("keeps the checked-in production configuration open by default", async () => {
  const source = await readFile(new URL("../wrangler.jsonc", import.meta.url), "utf8");
  const config = parseJsonc(source);

  assert.equal(config.env?.production?.vars?.WRITE_MODE, "open");
});

test("rejects production deployment outside Workers Builds", () => {
  assert.throws(
    () =>
      assertProductionDeployEnvironment({
        CLOUDFLARE_ENV: "production",
      }),
    /只允许由 main 分支的 Workers Builds 执行/u,
  );
});

test("deploys the Astro build through Wranglers redirected config", () => {
  assert.deepEqual(PRODUCTION_WRANGLER_COMMANDS, [
    [
      "d1",
      "migrations",
      "apply",
      "DB",
      "--remote",
      "--env",
      "production",
      "--config",
      "wrangler.jsonc",
    ],
    ["deploy", "--env", "production"],
  ]);
});
