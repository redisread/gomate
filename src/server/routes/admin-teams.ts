import type { AdminTeamsResponse, AdminTeamResponse } from "@/contracts";
import {
  and,
  asc,
  desc,
  eq,
  isNull,
  lt,
  ne,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

import { createDb } from "../db";
import * as schema from "../db/schema";
import { adminAccessErrorResponse, requireAdmin } from "../lib/admin-access";
import { APIErrors } from "../lib/api-errors";
import type { Env } from "../lib/auth";
import {
  decodeContentCursor,
  encodeContentCursor,
} from "../lib/content-cursor";
import { lifecycleCondition } from "../lib/team-lifecycle-query";
import { getTeamLifecycle } from "../lib/team-lifecycle";
import { activeTeamParticipantCount } from "../lib/team-participant-count";
import { validateRequest } from "../lib/validation";
import { toTeamResponse } from "./teams/utils";

const adminTeamsRoute = new Hono<{ Bindings: Env }>();
const listSchema = z
  .object({
    q: z.string().trim().max(100).optional(),
    recruitmentStatus: z.enum(["open", "closed"]).optional(),
    lifecycle: z
      .enum([
        "pending",
        "formed",
        "in_progress",
        "completed",
        "cancelled",
        "expired_unformed",
      ])
      .optional(),
    limit: z.coerce.number().int().min(1).max(50).default(20),
    cursor: z.string().min(1).max(500).optional(),
  })
  .strict();

adminTeamsRoute.use("*", async (c, next) => {
  c.header("Cache-Control", "private, no-store");
  try {
    await requireAdmin(c);
  } catch (error) {
    const denied = adminAccessErrorResponse(c, error);
    if (denied) return denied;
    throw error;
  }
  await next();
});

function teamRows(db: ReturnType<typeof createDb>) {
  return db
    .select({
      team: schema.teams,
      leader: schema.users,
      location: schema.locations,
      region: schema.region,
      activeParticipantCount: activeTeamParticipantCount(schema.teams.id),
    })
    .from(schema.teams)
    .innerJoin(schema.users, eq(schema.users.id, schema.teams.leaderId))
    .innerJoin(
      schema.locations,
      eq(schema.locations.id, schema.teams.locationId),
    )
    .innerJoin(schema.region, eq(schema.region.id, schema.locations.regionId));
}

adminTeamsRoute.get("/", async (c) => {
  const query = await validateRequest(
    c,
    "query",
    listSchema,
    "Invalid team filters",
    "issues",
  );
  if (query instanceof Response) return query;
  const cursor = query.cursor ? decodeContentCursor(query.cursor) : null;
  if (query.cursor && !cursor)
    return c.json(APIErrors.badRequest("Invalid team cursor"), 400);

  const conditions: SQL[] = [];
  const now = Date.now();
  if (query.q) {
    const pattern = `%${query.q.replace(/[\\%_]/gu, "\\$&")}%`;
    conditions.push(
      or(
        ...[
          schema.teams.title,
          schema.teams.id,
          schema.users.name,
          schema.users.nickname,
          schema.users.id,
        ].map((column) => sql`${column} LIKE ${pattern} ESCAPE ${"\\"}`),
      )!,
    );
  }
  if (query.recruitmentStatus)
    conditions.push(
      eq(schema.teams.recruitmentStatus, query.recruitmentStatus),
    );
  if (query.lifecycle)
    conditions.push(lifecycleCondition(query.lifecycle, new Date(now)));
  if (cursor) {
    const createdAt = new Date(cursor.t);
    conditions.push(
      or(
        lt(schema.teams.createdAt, createdAt),
        and(
          eq(schema.teams.createdAt, createdAt),
          lt(schema.teams.id, cursor.id),
        ),
      )!,
    );
  }
  const db = createDb(c.env.DB);
  const rows = await teamRows(db)
    .where(and(...conditions))
    .orderBy(desc(schema.teams.createdAt), desc(schema.teams.id))
    .limit(query.limit + 1);
  const page = rows.slice(0, query.limit);
  const last = page.at(-1)?.team;
  const body: AdminTeamsResponse = {
    success: true,
    teams: page.map((row) => {
      const team = row.team;
      return {
        id: team.id,
        title: team.title,
        recruitmentStatus: team.recruitmentStatus,
        lifecycle: getTeamLifecycle(team, now),
        createdAt: team.createdAt.toISOString(),
        activeParticipantCount: Number(row.activeParticipantCount),
        maxParticipants: team.maxParticipants,
        leader: {
          id: row.leader.id,
          name: row.leader.name,
          nickname: row.leader.nickname,
        },
        location: { id: row.location.id, name: row.location.name },
      };
    }),
    nextCursor:
      rows.length > query.limit && last
        ? encodeContentCursor({ t: last.createdAt.getTime(), id: last.id })
        : null,
  };
  return c.json(body);
});

adminTeamsRoute.get("/:id", async (c) => {
  const db = createDb(c.env.DB);
  const id = c.req.param("id");
  const [row] = await teamRows(db).where(eq(schema.teams.id, id)).limit(1);
  if (!row) return c.json(APIErrors.notFound("Team not found"), 404);
  const [members, tags] = await Promise.all([
    db
      .select({ member: schema.teamMembers, user: schema.users })
      .from(schema.teamMembers)
      .innerJoin(schema.users, eq(schema.users.id, schema.teamMembers.userId))
      .where(
        and(
          eq(schema.teamMembers.teamId, id),
          isNull(schema.teamMembers.leftAt),
          ne(schema.teamMembers.userId, row.team.leaderId),
        ),
      )
      .orderBy(
        asc(schema.teamMembers.joinedAt),
        asc(schema.teamMembers.userId),
      ),
    db
      .select({ tag: schema.tags })
      .from(schema.teamTags)
      .innerJoin(schema.tags, eq(schema.tags.id, schema.teamTags.tagId))
      .where(eq(schema.teamTags.teamId, id))
      .orderBy(asc(schema.tags.name), asc(schema.tags.id)),
  ]);
  const body: AdminTeamResponse = {
    success: true,
    team: toTeamResponse({
      ...row,
      participants: members.map(({ member, user }) => ({ ...member, user })),
      tags: tags.map(({ tag }) => tag),
      checklistVisible: true,
      contactVisible: false,
    }),
  };
  return c.json(body);
});

export { adminTeamsRoute };
