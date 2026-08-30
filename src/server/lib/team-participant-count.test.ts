import { describe, expect, it } from "vitest";
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core";
import { readFileSync } from "node:fs";
import * as schema from "../db/schema";
import { activeTeamParticipantCount } from "./team-participant-count";

const capacityMigration = readFileSync(
  new URL("../../../migrations/0008_team_capacity_includes_leader.sql", import.meta.url),
  "utf8",
);

describe("activeTeamParticipantCount", () => {
  it("counts the leader together with active team members", () => {
    const dialect = new SQLiteSyncDialect();
    const query = dialect.sqlToQuery(activeTeamParticipantCount(schema.teams.id));

    expect(query.sql).toMatch(/^1 \+ coalesce\(/u);
    expect(query.sql).toContain("active_member.left_at is null");
  });

  it("keeps insert, reactivation, and capacity-update triggers on the same total", () => {
    for (const trigger of [
      "team_members_capacity_validate_insert",
      "team_members_capacity_validate_reactivate",
      "teams_capacity_validate_update",
    ]) {
      expect(capacityMigration).toContain(`DROP TRIGGER \`${trigger}\``);
      const definition = capacityMigration.match(
        new RegExp("CREATE TRIGGER `" + trigger + "`[\\s\\S]*?END;", "u"),
      )?.[0];
      expect(definition).toMatch(/1 \+ \(\s*SELECT COUNT\(\*\)/u);
    }
  });
});
