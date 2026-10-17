import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core";
import * as schema from "../db/schema";
import { activeTeamParticipantCount } from "./team-participant-count";

const root = new URL("../../../migrations/", import.meta.url);
const migrations = readdirSync(root)
  .filter((name) => name.endsWith(".sql"))
  .sort();
let db: DatabaseSync;

beforeEach(() => {
  db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys=ON");
  for (const name of migrations) {
    db.exec(
      `BEGIN; PRAGMA defer_foreign_keys=ON; ${readFileSync(new URL(name, root), "utf8")}; COMMIT;`,
    );
  }
  db.exec(`
    INSERT INTO users(id,name,email) VALUES
      ('leader','Leader','leader@example.com'),
      ('member','Member','member@example.com'),
      ('returning','Returning','returning@example.com');
    INSERT INTO teams(id,location_id,leader_id,activity_type,title,start_at,end_at,max_participants)
      VALUES('capacity-team','location-shenzhen-wutongshan','leader','hiking','Capacity',2000000000000,2000003600000,2);
  `);
});
afterEach(() => db.close());

function countParticipants() {
  const query = new SQLiteSyncDialect().sqlToQuery(
    activeTeamParticipantCount(schema.teams.id),
  );
  return db
    .prepare(`SELECT ${query.sql} AS count FROM teams WHERE id='capacity-team'`)
    .get()?.count;
}

describe("participant count and deployed capacity constraints", () => {
  it("counts the leader and active members, excluding departed members", () => {
    expect(countParticipants()).toBe(1);
    db.exec(
      "INSERT INTO team_members(team_id,user_id) VALUES('capacity-team','member')",
    );
    expect(countParticipants()).toBe(2);
    db.exec("UPDATE team_members SET left_at=10 WHERE user_id='member'");
    expect(countParticipants()).toBe(1);
  });

  it("rejects inserts and reactivation when full, then admits a returning member after a place is released", () => {
    db.exec(
      "INSERT INTO team_members(team_id,user_id) VALUES('capacity-team','member')",
    );
    expect(() =>
      db.exec(
        "INSERT INTO team_members(team_id,user_id) VALUES('capacity-team','returning')",
      ),
    ).toThrow(/TEAM_CAPACITY_EXCEEDED/);
    db.exec(
      "INSERT INTO team_members(team_id,user_id,left_at) VALUES('capacity-team','returning',10)",
    );
    expect(() =>
      db.exec("UPDATE team_members SET left_at=NULL WHERE user_id='returning'"),
    ).toThrow(/TEAM_CAPACITY_EXCEEDED/);
    expect(
      db
        .prepare("SELECT left_at FROM team_members WHERE user_id='returning'")
        .get()?.left_at,
    ).toBe(10);
    db.exec("UPDATE team_members SET left_at=20 WHERE user_id='member'");
    db.exec("UPDATE team_members SET left_at=NULL WHERE user_id='returning'");
    expect(countParticipants()).toBe(2);
  });

  it("rejects reducing capacity below the leader and active members without changing the team", () => {
    db.exec(
      "INSERT INTO team_members(team_id,user_id) VALUES('capacity-team','member')",
    );
    expect(() =>
      db.exec("UPDATE teams SET max_participants=1 WHERE id='capacity-team'"),
    ).toThrow(/TEAM_CAPACITY_EXCEEDED/);
    expect(
      db
        .prepare("SELECT max_participants FROM teams WHERE id='capacity-team'")
        .get()?.max_participants,
    ).toBe(2);
  });
});
