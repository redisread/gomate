import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const CHECKER = path.join(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."),
  "scripts",
  "check-legacy-removal.mjs",
);

function fixture() {
  const root = mkdtempSync(path.join(os.tmpdir(), "gomate-legacy-check-"));
  mkdirSync(path.join(root, "frontend"), { recursive: true });
  writeFileSync(path.join(root, "frontend", "wrangler.jsonc"), "{}\n");
  return root;
}

function run(root) {
  return spawnSync(process.execPath, [CHECKER], {
    encoding: "utf8",
    env: { ...process.env, GOMATE_LEGACY_CHECK_ROOT: root },
  });
}

test("accepts the single canonical Wrangler config", () => {
  const result = run(fixture());
  assert.equal(result.status, 0, result.stderr);
});

test("scans SQL for singular legacy apikey identifiers", () => {
  const root = fixture();
  const migrations = path.join(root, "api", "db", "migrations");
  mkdirSync(migrations, { recursive: true });
  writeFileSync(path.join(migrations, "0000.sql"), "CREATE TABLE apikey (id TEXT);\n");

  const result = run(root);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /legacy singular API-key identifier/u);
});

test("rejects every additional Wrangler config", () => {
  const root = fixture();
  mkdirSync(path.join(root, "api"), { recursive: true });
  writeFileSync(path.join(root, "api", "wrangler.jsonc"), "{}\n");

  const result = run(root);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Wrangler config set must be exactly/u);
});

test("ignores generated Worker dry-run output", () => {
  const root = fixture();
  const generated = path.join(root, "dist-worker", "api", "src");
  mkdirSync(generated, { recursive: true });
  writeFileSync(
    path.join(generated, "legacy.js"),
    'const api = "https://api.gomate.live/v1/cities";\n',
  );
  writeFileSync(path.join(root, "dist-worker", "wrangler.json"), "{}\n");

  const result = run(root);
  assert.equal(result.status, 0, result.stderr);
});

test("rejects a transpiled Worker source sibling", () => {
  const root = fixture();
  mkdirSync(path.join(root, "frontend", "src"), { recursive: true });
  writeFileSync(path.join(root, "frontend", "src", "worker.js"), "export default {};\n");

  const result = run(root);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /frontend\/src\/worker\.js: removed path still exists/u);
});

test("allows the exact legacy frontend Worker only in reviewed rollback files", () => {
  const root = fixture();
  const workflowDirectory = path.join(root, ".github", "workflows");
  const scriptsDirectory = path.join(root, "scripts");
  mkdirSync(workflowDirectory, { recursive: true });
  mkdirSync(scriptsDirectory, { recursive: true });
  writeFileSync(
    path.join(workflowDirectory, "rollback-production-cutover.yml"),
    "TARGET_DOMAIN_SERVICE: gomate-frontend\n",
  );
  writeFileSync(
    path.join(scriptsDirectory, "production-domain.mjs"),
    'const oldWorker = "gomate-frontend";\n',
  );
  const result = run(root);
  assert.equal(result.status, 0, result.stderr);
});

test("still rejects legacy Worker names outside or beyond the rollback allowlist", () => {
  const outsideRoot = fixture();
  mkdirSync(path.join(outsideRoot, "scripts"), { recursive: true });
  writeFileSync(
    path.join(outsideRoot, "scripts", "unreviewed.mjs"),
    'const oldWorker = "gomate-frontend";\n',
  );
  const outside = run(outsideRoot);
  assert.equal(outside.status, 1);
  assert.match(outside.stderr, /legacy Worker name/u);

  const apiRoot = fixture();
  mkdirSync(path.join(apiRoot, "scripts"), { recursive: true });
  writeFileSync(
    path.join(apiRoot, "scripts", "production-domain.mjs"),
    'const forbiddenWorker = "gomate-api";\n',
  );
  const api = run(apiRoot);
  assert.equal(api.status, 1);
  assert.match(api.stderr, /legacy Worker name/u);
});
