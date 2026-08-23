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
  "activity_types",
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
    const tables = JSON.parse(output)
      .flatMap((entry) => entry.results ?? [])
      .map((row) => row.name);
    assert.deepEqual(tables, EXPECTED_TABLES);

    const catalogOutput = run(WRANGLER, [
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
      `SELECT
        (SELECT COUNT(*) FROM region) AS region_count,
        (SELECT COUNT(*) FROM locations) AS location_count,
        (SELECT COUNT(*) FROM tags) AS tag_count,
        (SELECT COUNT(*) FROM activity_types) AS activity_type_count,
        (SELECT COUNT(*) FROM location_tags) AS location_tag_count,
        (SELECT COUNT(*) FROM d1_migrations) AS migration_count,
        (SELECT COUNT(*) FROM locations WHERE id = 'location-shenzhen-wutongshan') AS retained_v3_location_count,
        (SELECT cover_image_url FROM locations WHERE id = 'location-shenzhen-wutongshan') AS wutongshan_cover_url;`,
    ]);
    const [catalog] = JSON.parse(catalogOutput).flatMap(
      (entry) => entry.results ?? [],
    );
    assert.deepEqual(catalog, {
      region_count: 19,
      location_count: 37,
      tag_count: 3,
      activity_type_count: 4,
      location_tag_count: 3,
      migration_count: 6,
      retained_v3_location_count: 1,
      wutongshan_cover_url:
        "https://gomate.cos.jiahongw.com/locations/hiking/wutong-mountain/wutongshan_01.jpg",
    });

    const foreignKeyOutput = run(WRANGLER, [
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
      "PRAGMA foreign_key_check;",
    ]);
    const foreignKeyViolations = JSON.parse(foreignKeyOutput).flatMap(
      (entry) => entry.results ?? [],
    );
    assert.deepEqual(foreignKeyViolations, []);
  } finally {
    rmSync(state, { recursive: true, force: true });
  }
});

test("admin catalog migration preserves the existing location and team graph", () => {
  const state = mkdtempSync(path.join(os.tmpdir(), "gomate-catalog-migration-test-"));
  const commonArgs = [
    "d1",
    "execute",
    "DB",
    "--local",
    "--persist-to",
    state,
    "--config",
    "wrangler.jsonc",
  ];
  try {
    for (const migration of [
      "0000_init.sql",
      "0001_reference_data.sql",
      "0002_account_issuer.sql",
      "0003_import_v2_catalog.sql",
      "0004_fix_wutongshan_cover_image.sql",
    ]) {
      run(WRANGLER, [
        ...commonArgs,
        "--file",
        path.join("migrations", migration),
      ]);
    }

    run(WRANGLER, [
      ...commonArgs,
      "--command",
      `INSERT INTO users (id, name, email) VALUES
          ('migration-leader', 'Leader', 'migration-leader@example.invalid'),
          ('migration-member', 'Member', 'migration-member@example.invalid');
       INSERT INTO teams (id, location_id, leader_id, activity_type, title, start_at, end_at)
         VALUES ('migration-team', 'location-shenzhen-wutongshan', 'migration-leader', 'hiking', 'Migration team', 4102444800000, 4102448400000);
       INSERT INTO team_tags (team_id, tag_id) VALUES ('migration-team', 'tag-hiking');
       INSERT INTO team_join_requests (id, team_id, user_id) VALUES ('migration-request', 'migration-team', 'migration-member');
       INSERT INTO team_members (team_id, user_id) VALUES ('migration-team', 'migration-member');
       INSERT INTO user_location_favorites (user_id, location_id) VALUES ('migration-member', 'location-shenzhen-wutongshan');
       INSERT INTO stories (id, author_id, team_id, location_id, content)
         VALUES ('migration-story', 'migration-leader', 'migration-team', 'location-shenzhen-wutongshan', 'Migration story');
       INSERT INTO story_tags (story_id, tag_id) VALUES ('migration-story', 'tag-nature');
       INSERT INTO story_likes (user_id, story_id) VALUES ('migration-member', 'migration-story');
       INSERT INTO user_story_favorites (user_id, story_id) VALUES ('migration-member', 'migration-story');
       INSERT INTO conversations (id, team_id, member_user_id, initiated_by_user_id)
         VALUES ('migration-conversation', 'migration-team', 'migration-member', 'migration-leader');
       INSERT INTO messages (id, conversation_id, sender_id, content)
         VALUES ('migration-message', 'migration-conversation', 'migration-leader', 'Migration message');`,
    ]);

    run(WRANGLER, [
      ...commonArgs,
      "--file",
      path.join("migrations", "0005_admin_content_catalogs.sql"),
    ]);

    const output = run(WRANGLER, [
      ...commonArgs,
      "--json",
      "--command",
      `SELECT
        (SELECT COUNT(*) FROM location_tags WHERE location_id = 'location-shenzhen-wutongshan') AS location_tags,
        (SELECT COUNT(*) FROM teams WHERE id = 'migration-team') AS teams,
        (SELECT COUNT(*) FROM team_tags WHERE team_id = 'migration-team') AS team_tags,
        (SELECT COUNT(*) FROM team_join_requests WHERE id = 'migration-request') AS join_requests,
        (SELECT COUNT(*) FROM team_members WHERE team_id = 'migration-team') AS team_members,
        (SELECT COUNT(*) FROM user_location_favorites WHERE user_id = 'migration-member') AS location_favorites,
        (SELECT COUNT(*) FROM stories WHERE id = 'migration-story' AND location_id = 'location-shenzhen-wutongshan' AND team_id = 'migration-team' AND like_count = 1) AS stories,
        (SELECT COUNT(*) FROM story_tags WHERE story_id = 'migration-story') AS story_tags,
        (SELECT COUNT(*) FROM story_likes WHERE story_id = 'migration-story') AS story_likes,
        (SELECT COUNT(*) FROM user_story_favorites WHERE story_id = 'migration-story') AS story_favorites,
        (SELECT COUNT(*) FROM conversations WHERE id = 'migration-conversation' AND last_message_preview = 'Migration message') AS conversations,
        (SELECT COUNT(*) FROM messages WHERE id = 'migration-message') AS messages,
        (SELECT COUNT(*) FROM activity_types WHERE is_active = 1) AS active_activity_types;`,
    ]);
    const [preserved] = JSON.parse(output).flatMap(
      (entry) => entry.results ?? [],
    );
    assert.deepEqual(preserved, {
      location_tags: 3,
      teams: 1,
      team_tags: 1,
      join_requests: 1,
      team_members: 1,
      location_favorites: 1,
      stories: 1,
      story_tags: 1,
      story_likes: 1,
      story_favorites: 1,
      conversations: 1,
      messages: 1,
      active_activity_types: 4,
    });

    const foreignKeyOutput = run(WRANGLER, [
      ...commonArgs,
      "--json",
      "--command",
      "PRAGMA foreign_key_check;",
    ]);
    assert.deepEqual(
      JSON.parse(foreignKeyOutput).flatMap((entry) => entry.results ?? []),
      [],
    );
  } finally {
    rmSync(state, { recursive: true, force: true });
  }
});
