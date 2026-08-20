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
  writeFileSync(
    path.join(migrations, "0000.sql"),
    "CREATE TABLE apikey (id TEXT);\n",
  );

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
  writeFileSync(
    path.join(root, "frontend", "src", "worker.js"),
    "export default {};\n",
  );

  const result = run(root);
  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /frontend\/src\/worker\.js: removed path still exists/u,
  );
});

test("rejects legacy resource identifiers in every operational file", () => {
  const root = fixture();
  const scriptsDirectory = path.join(root, "scripts");
  mkdirSync(scriptsDirectory, { recursive: true });
  writeFileSync(
    path.join(scriptsDirectory, "legacy.mjs"),
    [
      'const workers = ["gomate-api", "gomate-frontend"];',
      'const database = "gomate-db";',
      'const namespace = "GOMATE_KV";',
    ].join("\n"),
  );
  const result = run(root);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /legacy Worker name/u);
  assert.match(result.stderr, /legacy D1 name/u);
  assert.match(result.stderr, /legacy Worker binding/u);
});

test("does not permit removed origins or bindings in operational scripts", () => {
  const root = fixture();
  const scriptsDirectory = path.join(root, "scripts");
  mkdirSync(scriptsDirectory, { recursive: true });
  writeFileSync(
    path.join(scriptsDirectory, "unreviewed.mjs"),
    [
      'const forbiddenOrigin = "https://api.gomate.live";',
      'const forbiddenBinding = "FRONTEND_URL";',
      "",
    ].join("\n"),
  );

  const result = run(root);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /legacy API origin/u);
  assert.match(result.stderr, /legacy Worker binding/u);
});
