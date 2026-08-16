import type Database from "better-sqlite3";
import { and, eq, isNull } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import * as schema from "../../db/schema";
import {
  buildLocationPageQuery,
} from "../../routes/locations/queries";
import {
  buildConversationInboxQuery,
  buildMessageHistoryQuery,
} from "../../routes/messages";
import { buildTeamPageQuery } from "../../routes/teams/queries";
import {
  buildCreatedTeamsPageQuery,
  buildJoinedTeamsPageQuery,
  buildOwnJoinRequestsPageQuery,
  buildPendingJoinRequestsPageQuery,
} from "../../routes/users";
import { createTestDb, type TestDb } from "../helpers/db";

interface QuerySource {
  toSQL(): { sql: string; params: unknown[] };
}

function explain(sqlite: Database.Database, source: QuerySource) {
  const query = source.toSQL();
  expect(query.sql.toLowerCase()).not.toContain(" offset ");
  const details = sqlite
    .prepare(`EXPLAIN QUERY PLAN ${query.sql}`)
    .all(...query.params)
    .map((row) => String((row as { detail: unknown }).detail))
    .join("\n");
  expect(details).not.toBe("");
  return details;
}

function asProductionDb(db: TestDb) {
  return db as never;
}

describe("production keyset query plans", () => {
  it("explains the exact location and team list builders used by the routes", () => {
    const { db, sqlite } = createTestDb();
    const locationPlan = explain(
      sqlite,
      buildLocationPageQuery(
        asProductionDb(db),
        and(
          eq(schema.locations.regionId, "region"),
          eq(schema.locations.status, "published"),
        ),
        13,
      ),
    );
    expect(locationPlan).toContain("locations_region_feed_idx");

    const teamPlan = explain(
      sqlite,
      buildTeamPageQuery(
        asProductionDb(db),
        eq(schema.teams.locationId, "location"),
        13,
      ),
    );
    expect(teamPlan).toContain("teams_location_start_idx");
  });

  it("explains every exact user timeline builder used by the routes", () => {
    const { db, sqlite } = createTestDb();
    const productionDb = asProductionDb(db);

    expect(explain(
      sqlite,
      buildCreatedTeamsPageQuery(productionDb, "leader", null, 11),
    )).toContain("teams_leader_created_idx");
    expect(explain(
      sqlite,
      buildJoinedTeamsPageQuery(productionDb, "member", null, 11),
    )).toContain("team_members_user_idx");
    expect(explain(
      sqlite,
      buildOwnJoinRequestsPageQuery(productionDb, "member", null, 11),
    )).toContain("team_join_requests_user_created_idx");
    expect(explain(
      sqlite,
      buildPendingJoinRequestsPageQuery(productionDb, "leader", null, 11),
    )).toMatch(/team_join_requests_team_status_idx|teams_leader_created_idx/u);
  });

  it("explains the exact conversation and message builders used by the routes", () => {
    const { db, sqlite } = createTestDb();
    const productionDb = asProductionDb(db);

    expect(explain(
      sqlite,
      buildConversationInboxQuery(
        productionDb,
        eq(schema.conversations.memberUserId, "member"),
        21,
      ),
    )).toContain("conversations_member_inbox_idx");

    expect(explain(
      sqlite,
      buildMessageHistoryQuery(
        productionDb,
        and(
          eq(schema.messages.conversationId, "conversation"),
          isNull(schema.messages.readAt),
        ),
        "member",
        21,
      ),
    )).toContain("messages_conversation_cursor_idx");
  });
});
