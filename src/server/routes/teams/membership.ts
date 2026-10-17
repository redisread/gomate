import { teamCookieSecurity } from "./contracts";
import { TimestampSchema } from "@/contracts";
import {
  createApiApp,
  createRoute,
  jsonResponse,
  errorResponses,
  z,
} from "../../lib/openapi";
import { and, eq, isNull, sql } from "drizzle-orm";
import { createDb } from "../../db";
import * as schema from "../../db/schema";
import { APIErrors } from "../../lib/api-errors";
import { getActiveSession } from "../../lib/active-session";
import { logger } from "../../lib/logger";

const membership = createApiApp();
const joinResult = z.object({
  success: z.literal(true),
  status: z.enum(["joined", "already_member"]),
});

membership.openapi(
  createRoute({
    description:
      "需要有效登录，无需申请或队长审批。队伍须尚未开始、开放招募、未取消且有名额；人数包含队长。首次加入返回 201 和 joined，队长或已加入成员重复调用返回 200 和 already_member，不重复占用名额。条件不满足返回 409。",
    method: "post",
    path: "/join",
    operationId: "teamsJoin",
    tags: ["队伍"],
    summary: "直接加入队伍",
    "x-audience": "public",
    security: teamCookieSecurity,
    request: { params: z.object({ id: z.string() }) },
    responses: {
      200: jsonResponse(joinResult, "已是队长或有效成员，不重复占用名额。"),
      201: jsonResponse(joinResult, "已直接加入队伍并占用一个成员名额。"),
      ...errorResponses(401, 404, 409, 500),
    },
  }),
  async (c) => {
    try {
      const session = await getActiveSession(c.env, c.req.raw.headers);
      if (!session) return c.json(APIErrors.unauthorized("请先登录"), 401);
      const teamId = c.req.valid("param").id;
      const userId = session.user.id;
      const db = createDb(c.env.DB);
      const team = await db.query.teams.findFirst({
        where: eq(schema.teams.id, teamId),
      });
      if (!team) return c.json(APIErrors.notFound("队伍不存在"), 404);
      if (team.leaderId === userId)
        return c.json(
          { success: true as const, status: "already_member" as const },
          200,
        );
      const now = Date.now();
      const result = await c.env.DB.prepare(
        `
      INSERT INTO team_members(team_id,user_id,joined_at,left_at)
      SELECT t.id, ?, ?, NULL FROM teams t
      WHERE t.id=? AND t.leader_id<>? AND t.recruitment_status='open'
        AND t.cancelled_at IS NULL AND t.start_at>?
        AND EXISTS (SELECT 1 FROM users WHERE id=? AND status='active' AND deleted_at IS NULL)
        AND 1+(SELECT COUNT(*) FROM team_members m WHERE m.team_id=t.id AND m.left_at IS NULL AND m.user_id<>t.leader_id)<t.max_participants
        AND NOT EXISTS(SELECT 1 FROM team_members m WHERE m.team_id=t.id AND m.user_id=? AND m.left_at IS NULL)
      ON CONFLICT(team_id,user_id) DO UPDATE SET joined_at=excluded.joined_at,left_at=NULL
      WHERE team_members.left_at IS NOT NULL
    `,
      )
        .bind(userId, now, teamId, userId, now, userId, userId)
        .run();
      if (Number(result.meta?.changes) === 1)
        return c.json(
          { success: true as const, status: "joined" as const },
          201,
        );
      const active = await db.query.teamMembers.findFirst({
        where: and(
          eq(schema.teamMembers.teamId, teamId),
          eq(schema.teamMembers.userId, userId),
          isNull(schema.teamMembers.leftAt),
        ),
      });
      if (active)
        return c.json(
          { success: true as const, status: "already_member" as const },
          200,
        );
      return c.json(
        APIErrors.conflict("队伍已满、已关闭或已开始，无法加入"),
        409,
      );
    } catch (error) {
      logger.error("team_join_failed", error);
      return c.json(APIErrors.internalError("加入队伍失败"), 500);
    }
  },
);

membership.openapi(
  createRoute({
    description:
      "需要有效登录，仅非队长的有效成员可在活动开始前退出，且队伍不能已取消。成功返回离队时间 leftAt，保留历史成员记录；重复退出、活动已开始或身份失效返回 409。",
    method: "post",
    path: "/leave",
    operationId: "teamsLeave",
    tags: ["队伍"],
    summary: "退出队伍",
    "x-audience": "public",
    security: teamCookieSecurity,
    request: { params: z.object({ id: z.string() }) },

    responses: {
      200: jsonResponse(
        z.object({ success: z.literal(true), leftAt: TimestampSchema }),
        "请求成功，响应字段见下方结构。",
      ),
      ...errorResponses(400, 401, 409, 500),
    },
  }),
  async (c) => {
    try {
      const session = await getActiveSession(c.env, c.req.raw.headers);
      if (!session) return c.json(APIErrors.unauthorized("请先登录"), 401);

      const teamId = c.req.valid("param").id;
      if (!teamId) return c.json(APIErrors.badRequest("缺少队伍 ID"), 400);
      const db = createDb(c.env.DB);
      const leftAt = new Date();
      const updated = await db
        .update(schema.teamMembers)
        .set({ leftAt })
        .where(
          and(
            eq(schema.teamMembers.teamId, teamId),
            eq(schema.teamMembers.userId, session.user.id),
            isNull(schema.teamMembers.leftAt),
            sql`EXISTS (SELECT 1 FROM teams t JOIN users u ON u.id = ${session.user.id} WHERE t.id = ${teamId} AND t.cancelled_at IS NULL AND t.start_at > ${Date.now()} AND t.leader_id <> ${session.user.id} AND u.status = 'active' AND u.deleted_at IS NULL)`,
          ),
        )
        .returning({ userId: schema.teamMembers.userId });

      if (updated.length !== 1) {
        return c.json(APIErrors.conflict("你不是该队伍的活动成员"), 409);
      }
      return c.json(
        { success: true as const, leftAt: leftAt.toISOString() },
        200,
      );
    } catch (error) {
      logger.error("team_leave_failed", error);
      return c.json(APIErrors.internalError("退出队伍失败"), 500);
    }
  },
);

membership.openapi(
  createRoute({
    description:
      "仅当前有效队长可在活动开始前移除成员，队伍不能已取消，且不能移除队长本人。最终写入重新检查权限、时间和成员状态；目标已离队或写入条件变化时返回 404。成功返回被移除的 userId。",
    method: "post",
    path: "/members/{userId}/remove",
    operationId: "teamsMemberRemove",
    tags: ["队伍"],
    summary: "移除队伍成员",
    "x-audience": "public",
    security: teamCookieSecurity,
    request: { params: z.object({ id: z.string(), userId: z.string() }) },

    responses: {
      200: jsonResponse(
        z.object({ success: z.literal(true), userId: z.string() }),
        "请求成功，响应字段见下方结构。",
      ),
      ...errorResponses(400, 401, 403, 404, 409, 500),
    },
  }),
  async (c) => {
    try {
      const session = await getActiveSession(c.env, c.req.raw.headers);
      if (!session) return c.json(APIErrors.unauthorized("请先登录"), 401);

      const teamId = c.req.valid("param").id;
      if (!teamId) return c.json(APIErrors.badRequest("缺少队伍 ID"), 400);
      const targetUserId = c.req.valid("param").userId;
      const db = createDb(c.env.DB);
      const team = await db.query.teams.findFirst({
        where: eq(schema.teams.id, teamId),
      });
      if (!team) return c.json(APIErrors.notFound("队伍不存在"), 404);
      if (team.leaderId !== session.user.id) {
        return c.json(APIErrors.forbidden("只有队长可以移除成员"), 403);
      }
      if (targetUserId === team.leaderId) {
        return c.json(APIErrors.conflict("队长不能被移除"), 409);
      }

      const updated = await db
        .update(schema.teamMembers)
        .set({ leftAt: new Date() })
        .where(
          and(
            eq(schema.teamMembers.teamId, teamId),
            eq(schema.teamMembers.userId, targetUserId),
            isNull(schema.teamMembers.leftAt),
            sql`EXISTS (SELECT 1 FROM teams t JOIN users u ON u.id = ${session.user.id} WHERE t.id = ${teamId} AND t.leader_id = ${session.user.id} AND t.leader_id <> ${targetUserId} AND t.cancelled_at IS NULL AND t.start_at > ${Date.now()} AND u.status = 'active' AND u.deleted_at IS NULL)`,
          ),
        )
        .returning({ userId: schema.teamMembers.userId });

      if (updated.length !== 1) {
        return c.json(APIErrors.notFound("活动成员不存在"), 404);
      }
      return c.json({ success: true as const, userId: targetUserId }, 200);
    } catch (error) {
      logger.error("team_member_remove_failed", error);
      return c.json(APIErrors.internalError("移除成员失败"), 500);
    }
  },
);

export default membership;
