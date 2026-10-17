import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";

const directory = new URL("../../../migrations/", import.meta.url);
const files = readdirSync(directory)
  .filter((name) => name.endsWith(".sql"))
  .sort();
function apply(db: DatabaseSync, name: string) {
  db.exec("BEGIN");
  try {
    db.exec(readFileSync(new URL(name, directory), "utf8"));
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

const preservedFixture = readFileSync(
  new URL(
    "../../../tests/fixtures/minimal-product-precontract.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("minimal product migration boundary", () => {
  it("preserves core rows and membership constraints while removing retired structures", () => {
    const db = new DatabaseSync(":memory:");
    try {
      db.exec("PRAGMA foreign_keys=ON");
      for (const name of files.filter((name) => name < "0010")) apply(db, name);
      db.exec(preservedFixture);
      for (const name of files.filter((name) => name >= "0010"))
        apply(db, name);
      expect(
        db
          .prepare(
            "SELECT title,meeting_point FROM teams WHERE id='migration-team'",
          )
          .get(),
      ).toMatchObject({
        title: "日本語を保持",
        meeting_point: "駅\n08:00\n北口",
      });
      expect(
        db
          .prepare(
            "SELECT user_id,left_at FROM team_members WHERE team_id='migration-team' ORDER BY user_id",
          )
          .all(),
      ).toEqual([
        { user_id: "migration-left", left_at: 60 },
        { user_id: "migration-member", left_at: null },
      ]);
      expect(
        db
          .prepare(
            "SELECT tag_id FROM team_tags WHERE team_id='migration-team'",
          )
          .get(),
      ).toMatchObject({ tag_id: "migration-tag" });
      expect(db.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
      const snapshot = JSON.parse(
        readFileSync(new URL("meta/0011_snapshot.json", directory), "utf8"),
      );
      const tableNames = db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
        )
        .all()
        .map((row) => row.name)
        .sort();
      expect(tableNames).toEqual(Object.keys(snapshot.tables).sort());
      for (const [name, table] of Object.entries(snapshot.tables) as [
        string,
        { columns: Record<string, unknown> },
      ][]) {
        expect(
          db
            .prepare(`PRAGMA table_info("${name}")`)
            .all()
            .map((row) => row.name)
            .sort(),
        ).toEqual(Object.keys(table.columns).sort());
      }

      const names = db
        .prepare("SELECT name FROM sqlite_master WHERE type='table'")
        .all()
        .map((row) => row.name);
      for (const name of [
        "stories",
        "story_tags",
        "story_likes",
        "messages",
        "conversations",
        "user_story_favorites",
        "user_location_favorites",
        "team_join_requests",
      ])
        expect(names).not.toContain(name);
      expect(
        db
          .prepare("PRAGMA table_info(teams)")
          .all()
          .map((row) => row.name),
      ).not.toContain("checklist");
      expect(() =>
        db.exec(
          "UPDATE teams SET max_participants=1 WHERE id='migration-team'",
        ),
      ).toThrow(/TEAM_CAPACITY_EXCEEDED/);
      expect(() =>
        db.exec(
          "INSERT INTO team_members(team_id,user_id) VALUES ('migration-team','migration-leader')",
        ),
      ).toThrow(/TEAM_LEADER/);
    } finally {
      db.close();
    }
  });
  it("replays the entire chain into an empty database", () => {
    const db = new DatabaseSync(":memory:");
    try {
      db.exec("PRAGMA foreign_keys=ON");
      for (const name of files) apply(db, name);
      expect(db.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
      expect(
        db.prepare("SELECT count(*) AS count FROM locations").get()?.count,
      ).toBeGreaterThan(0);
    } finally {
      db.close();
    }
  });
});
