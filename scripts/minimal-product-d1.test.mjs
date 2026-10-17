import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  mkdir,
  readdir,
  copyFile,
  writeFile,
  rm,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
const root = fileURLToPath(new URL("../", import.meta.url));

test(
  "real local D1 applies populated and empty contraction chains without losing core data",
  { timeout: 180000 },
  async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "gomate-contract-d1-"));
    try {
      const migrations = path.join(dir, "migrations");
      await mkdir(migrations);
      const config = path.join(dir, "wrangler.json");
      await writeFile(
        config,
        JSON.stringify({
          name: "gomate-contract-test",
          compatibility_date: "2026-06-18",
          d1_databases: [
            {
              binding: "DB",
              database_name: "contract-local",
              database_id: "11111111-1111-1111-1111-111111111111",
              migrations_dir: migrations,
            },
          ],
        }),
      );
      const run = (state, args) =>
        execFileSync(
          path.join(root, "node_modules/.bin/wrangler"),
          [
            "d1",
            ...args,
            "--local",
            "--persist-to",
            path.join(dir, state),
            "--config",
            config,
          ],
          {
            cwd: root,
            encoding: "utf8",
            maxBuffer: 10 * 1024 * 1024,
            stdio: ["ignore", "pipe", "pipe"],
          },
        );
      const query = (state, sql) =>
        JSON.parse(
          run(state, ["execute", "DB", "--json", "--command", sql]),
        ).flatMap((result) => result.results ?? []);
      const files = (await readdir(path.join(root, "migrations")))
        .filter((n) => n.endsWith(".sql"))
        .sort();
      for (const name of files.filter((n) => n < "0010"))
        await copyFile(
          path.join(root, "migrations", name),
          path.join(migrations, name),
        );
      run("populated", ["migrations", "apply", "DB"]);
      run("populated", [
        "execute",
        "DB",
        "--file",
        path.join(root, "tests/fixtures/minimal-product-precontract.sql"),
      ]);
      for (const name of files.filter((n) => n >= "0010"))
        await copyFile(
          path.join(root, "migrations", name),
          path.join(migrations, name),
        );
      run("populated", ["migrations", "apply", "DB"]);
      assert.deepEqual(
        query(
          "populated",
          "SELECT title,meeting_point FROM teams WHERE id='migration-team'",
        ),
        [{ title: "日本語を保持", meeting_point: "駅\n08:00\n北口" }],
      );
      assert.deepEqual(
        query(
          "populated",
          "SELECT user_id,left_at FROM team_members WHERE team_id='migration-team' ORDER BY user_id",
        ),
        [
          { user_id: "migration-left", left_at: 60 },
          { user_id: "migration-member", left_at: null },
        ],
      );
      assert.deepEqual(
        query(
          "populated",
          "SELECT tag_id FROM team_tags WHERE team_id='migration-team'",
        ),
        [{ tag_id: "migration-tag" }],
      );
      assert.deepEqual(query("populated", "PRAGMA foreign_key_check"), []);
      assert.equal(
        query(
          "populated",
          "SELECT count(*) AS n FROM users WHERE id LIKE 'migration-%'",
        )[0].n,
        3,
      );
      assert.equal(
        query(
          "populated",
          "SELECT count(*) AS n FROM sqlite_master WHERE type='table' AND name IN ('stories','messages','conversations','team_join_requests','story_likes','story_tags','user_location_favorites','user_story_favorites')",
        )[0].n,
        0,
      );
      assert.throws(() =>
        query(
          "populated",
          "UPDATE teams SET max_participants=1 WHERE id='migration-team'",
        ),
      );
      run("empty", ["migrations", "apply", "DB"]);
      assert.deepEqual(query("empty", "PRAGMA foreign_key_check"), []);
      assert.ok(query("empty", "SELECT count(*) AS n FROM locations")[0].n > 0);
      run("populated", ["migrations", "apply", "DB"]); // migration bookkeeping makes retries a no-op
      assert.equal(
        query(
          "populated",
          "SELECT count(*) AS n FROM team_members WHERE team_id='migration-team'",
        )[0].n,
        2,
      );
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  },
);
