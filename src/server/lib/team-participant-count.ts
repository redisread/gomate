import { sql, type SQL } from "drizzle-orm";
import type { AnySQLiteColumn } from "drizzle-orm/sqlite-core";

/** Canonical capacity count. The leader is excluded by the database invariant. */
export function activeTeamMemberCount(teamId: AnySQLiteColumn): SQL<number> {
  return sql<number>`coalesce((
    select count(*) from team_members active_member
    where active_member.team_id = ${teamId}
      and active_member.left_at is null
  ), 0)`;
}
