import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WRANGLER = path.join(ROOT, "node_modules", ".bin", "wrangler");
const EXPECTED_TABLES = [
  "accounts",
  "conversations",
  "d1_migrations",
  "location_tags",
  "locations",
  "messages",
  "region",
  "sessions",
  "stories",
  "story_likes",
  "story_tags",
  "tags",
  "team_join_requests",
  "team_members",
  "team_tags",
  "teams",
  "user_location_favorites",
  "user_story_favorites",
  "users",
  "verifications",
];

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    encoding: "utf8",
    ...options,
  });
  assert.equal(
    result.status,
    0,
    `${command} failed:\n${result.stdout}\n${result.stderr}`,
  );
  return result.stdout;
}

test("binding-level reset removes unknown tables and rebuilds exactly v3", () => {
  const state = mkdtempSync(path.join(os.tmpdir(), "gomate-reset-test-"));
  const env = { ...process.env, GOMATE_LOCAL_STATE: state };
  try {
    run(process.execPath, ["scripts/reset-local-db.mjs"], { env });
    run(WRANGLER, [
      "d1",
      "execute",
      "DB",
      "--local",
      "--persist-to",
      state,
      "--config",
      "wrangler.jsonc",
      "--command",
      "CREATE TABLE reset_probe (id TEXT PRIMARY KEY);",
    ]);
    run(process.execPath, ["scripts/reset-local-db.mjs"], { env });

    const output = run(WRANGLER, [
      "d1",
      "execute",
      "DB",
      "--local",
      "--persist-to",
      state,
      "--config",
      "wrangler.jsonc",
      "--json",
      "--command",
      "SELECT name FROM sqlite_schema WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' ORDER BY name;",
    ]);
    const tables = JSON.parse(output).flatMap((entry) => entry.results ?? []).map((row) => row.name);
    assert.deepEqual(tables, EXPECTED_TABLES);
  } finally {
    rmSync(state, { recursive: true, force: true });
  }
});
