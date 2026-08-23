import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  assertProductionBuildEnvironment,
  assertProductionDeployEnvironment,
  assertProductionWriteMode,
  parseJsonc,
  assertPreviewDeployEnvironment,
} from "./production-build-guard.mjs";
import { PRODUCTION_WRANGLER_COMMANDS } from "./deploy-production.mjs";
import { previewDeployCommand } from "./deploy-preview.mjs";

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

test("allows non-main branches to build Preview versions", () => {
  assert.doesNotThrow(() =>
    assertProductionBuildEnvironment({
      CLOUDFLARE_ENV: "production",
      WORKERS_CI: "1",
      WORKERS_CI_BRANCH: "feature/example",
    }),
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

test("allows Preview deployment only from a non-main Workers Build", () => {
  assert.doesNotThrow(() =>
    assertPreviewDeployEnvironment({
      CLOUDFLARE_ENV: "production",
      WORKERS_CI: "1",
      WORKERS_CI_BRANCH: "feature/example",
    }),
  );
});

test("rejects Preview deployment from main or outside Workers Builds", () => {
  assert.throws(
    () =>
      assertPreviewDeployEnvironment({
        WORKERS_CI: "1",
        WORKERS_CI_BRANCH: "main",
      }),
    /不允许使用 main/u,
  );
  assert.throws(
    () =>
      assertPreviewDeployEnvironment({ WORKERS_CI_BRANCH: "feature/example" }),
    /只允许由 Workers Builds/u,
  );
});

test("uploads only a version with a stable branch alias", () => {
  const result = previewDeployCommand({
    CLOUDFLARE_ENV: "production",
    WORKERS_CI: "1",
    WORKERS_CI_BRANCH: "feature/example",
  });
  assert.match(result.alias, /^[a-z][a-z0-9-]*$/u);
  assert.deepEqual(result.args, [
    "versions",
    "upload",
    "--env",
    "production",
    "--config",
    "dist/server/wrangler.json",
    "--keep-vars",
    "--var",
    "WRITE_MODE:protected",
    "--preview-alias",
    result.alias,
  ]);
  assert.equal(result.args.includes("deploy"), false);
  assert.equal(result.args.includes("migrations"), false);
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
