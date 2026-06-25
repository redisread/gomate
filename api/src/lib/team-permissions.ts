import { APIErrors } from "./api-errors";
import { createDb } from "../db";
import * as schema from "../db/schema";
import { eq } from "drizzle-orm";
import type { Context, Next } from "hono";
import type { Env } from "./auth";
import { createAuth } from "./auth";

/**
 * Team permission check middleware
 * Checks if the current user is the team leader
 *
 * Usage:
 * ```typescript
 * teams.put('/:id', requireTeamLeader(), async (c) => {
 *   // User is guaranteed to be the team leader
 * });
 * ```
 */
export function requireTeamLeader() {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    try {
      const teamId = c.req.param("id");
      if (!teamId) {
        return c.json(APIErrors.badRequest("缺少队伍ID"), 400);
      }

      // Get session from auth
      const authInstance = createAuth(c.env);
      const session = await authInstance.api.getSession({ headers: c.req.raw.headers });
      if (!session) {
        return c.json(APIErrors.unauthorized("请先登录"), 401);
      }

      const userId = session.user.id;
      const db = createDb(c.env.DB);

      // Check if user is the team leader
      const team = await db.query.teams.findFirst({
        where: eq(schema.teams.id, teamId),
      });

      if (!team) {
        return c.json(APIErrors.notFound("队伍不存在"), 404);
      }

      if (team.leaderId !== userId) {
        return c.json(APIErrors.forbidden("只有队长可以执行此操作"), 403);
      }

      // Store team info in context for later use
      c.set("team", team);

      await next();
    } catch (error) {
      console.error("Team permission check error:", error);
      return c.json(APIErrors.internalError("权限检查失败"), 500);
    }
  };
}

/**
 * Check if user is a team member (any role)
 */
export function requireTeamMember() {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    try {
      const teamId = c.req.param("id");
      if (!teamId) {
        return c.json(APIErrors.badRequest("缺少队伍ID"), 400);
      }

      // Get session from auth
      const authInstance = createAuth(c.env);
      const session = await authInstance.api.getSession({ headers: c.req.raw.headers });
      if (!session) {
        return c.json(APIErrors.unauthorized("请先登录"), 401);
      }

      const userId = session.user.id;
      const db = createDb(c.env.DB);

      // Check if user is a member of the team
      const membership = await db.query.teamMembers.findFirst({
        where: eq(schema.teamMembers.teamId, teamId),
      });

      if (!membership) {
        return c.json(APIErrors.forbidden("您不是该队伍的成员"), 403);
      }

      // Store membership info in context
      c.set("membership", membership);

      await next();
    } catch (error) {
      console.error("Team member check error:", error);
      return c.json(APIErrors.internalError("权限检查失败"), 500);
    }
  };
}
