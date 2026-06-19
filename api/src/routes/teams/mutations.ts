import { Hono } from "hono";
import { z } from "zod";
import { eq, and, sql } from "drizzle-orm";
import { createAuth } from "../../lib/auth";
import { createDb } from "../../db";
import * as schema from "../../db/schema";
import type { Env } from "../../lib/auth";
import { getRandomTeamIcon } from "./utils";

const mutations = new Hono<{ Bindings: Env }>();

const createTeamSchema = z.object({
  locationId: z.string().min(1),
  routeId: z.string().optional(),
  title: z.string().min(1).max(100),
  description: z.string().max(2000).optional(),
  date: z.string().min(1),
  time: z.string().min(1),
  duration: z.string().optional(),
  durationMin: z.number().optional(),
  maxMembers: z.number().int().min(2).max(50),
  requirements: z.array(z.string()).optional(),
});

const updateTeamSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  description: z.string().max(2000).optional().nullable(),
  maxMembers: z.number().int().min(2).max(50).optional(),
  requirements: z.array(z.string()).optional().nullable(),
  icon: z.string().optional(),
  time: z.string().optional(),
  durationMin: z.number().optional(),
});

/**
 * POST /teams
 * 创建新队伍（需登录，需填写微信号）
 */
mutations.post("/", async (c) => {
  try {
    const authInstance = createAuth(c.env);
    const session = await authInstance.api.getSession({ headers: c.req.raw.headers });
    if (!session) return c.json({ success: false, error: "请先登录" }, 401);

    const db = createDb(c.env.DB);
    const userId = session.user.id;

    const userRecord = await db
      .select({ wechat: schema.users.wechat })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .then((rows) => rows[0]);

    if (!userRecord?.wechat) {
      return c.json({ success: false, error: "请先填写微信号才能创建队伍" }, 400);
    }

    const body = await c.req.json();
    const parsed = createTeamSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ success: false, error: "输入无效", details: parsed.error.errors }, 400);
    }

    const { locationId, routeId, title, description, date, time, duration, durationMin, maxMembers, requirements } = parsed.data;

    const startTime = new Date(`${date}T${time}`);
    if (isNaN(startTime.getTime())) {
      return c.json({ success: false, error: "无效的日期或时间格式" }, 400);
    }

    const durationMinutes = durationMin || (duration
      ? parseFloat(duration.replace(/[^0-9.]/g, "")) * 60 || 240
      : 240);
    const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);
    const teamId = `team-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const memberId = `tm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();
    const teamIcon = getRandomTeamIcon();

    await db.insert(schema.teams).values({
      id: teamId, locationId, routeId, leaderId: userId, title,
      description: description || null, startTime, endTime,
      durationMin: durationMinutes, maxMembers,
      requirements: requirements ? JSON.stringify(requirements) : null,
      icon: teamIcon, status: "recruiting", createdAt: now, updatedAt: now,
    });
    await db.insert(schema.teamMembers).values({
      id: memberId, teamId, userId, status: "approved",
      joinedAt: now, createdAt: now,
    });

    return c.json({ success: true, team: { id: teamId, locationId, routeId, leaderId: userId, title, description, startTime: startTime.toISOString(), endTime: endTime.toISOString(), durationMin: durationMinutes, maxMembers, currentMembers: 1, requirements, icon: teamIcon, status: "recruiting", createdAt: now.toISOString() } });
  } catch (error) {
    console.error("Create team error:", error);
    return c.json({ success: false, error: "创建队伍失败" }, 500);
  }
});

/**
 * PUT /teams/:id
 * 更新队伍信息（仅队长可操作）
 */
mutations.put("/:id", async (c) => {
  try {
    const authInstance = createAuth(c.env);
    const session = await authInstance.api.getSession({ headers: c.req.raw.headers });
    if (!session) return c.json({ success: false, error: "请先登录" }, 401);

    const teamId = c.req.param("id");
    const db = createDb(c.env.DB);

    const team = await db.query.teams.findFirst({
      where: eq(schema.teams.id, teamId),
      with: { location: true },
    });

    if (!team) return c.json({ success: false, error: "队伍不存在" }, 404);
    if (team.leaderId !== session.user.id)
      return c.json({ success: false, error: "只有队长可以修改队伍" }, 403);

    const body = await c.req.json();
    const parsed = updateTeamSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ success: false, error: "输入无效", details: parsed.error.errors }, 400);
    }

    const { title, description, maxMembers, requirements, time, durationMin } = parsed.data;

    type UpdateData = {
      title: string; description: string | null; maxMembers: number;
      requirements: string | null; updatedAt: Date;
      durationMin?: number; startTime?: Date; endTime?: Date;
    };
    const updateData: UpdateData = {
      title, description: description || null, maxMembers,
      requirements: requirements ? JSON.stringify(requirements) : null,
      updatedAt: new Date(),
    };

    if (time || durationMin) {
      const originalStartTime = new Date(team.startTime);
      const currentDurationMin = durationMin || team.durationMin || 240;
      let newStartTime = originalStartTime;
      if (time) {
        const [hours, minutes] = time.split(":").map(Number);
        // time is in Beijing (UTC+8); get the Beijing date of original startTime
        const BEIJING_OFFSET_MS = 8 * 60 * 60 * 1000;
        const originalInBeijing = new Date(originalStartTime.getTime() + BEIJING_OFFSET_MS);
        const beijingMs = Date.UTC(
          originalInBeijing.getUTCFullYear(),
          originalInBeijing.getUTCMonth(),
          originalInBeijing.getUTCDate(),
          hours, minutes, 0, 0
        );
        newStartTime = new Date(beijingMs - BEIJING_OFFSET_MS);
        updateData.startTime = newStartTime;
      }
      updateData.endTime = new Date(newStartTime.getTime() + currentDurationMin * 60000);
      if (durationMin) updateData.durationMin = durationMin;
    }

    await db.update(schema.teams).set(updateData).where(eq(schema.teams.id, teamId));

    return c.json({ success: true, message: "队伍信息已更新" });
  } catch (error) {
    console.error("Update team error:", error);
    return c.json({ success: false, error: "更新队伍失败" }, 500);
  }
});

/**
 * DELETE /teams/:id
 * 删除队伍（仅队长，仅 recruiting/cancelled 状态）
 */
mutations.delete("/:id", async (c) => {
  try {
    const authInstance = createAuth(c.env);
    const session = await authInstance.api.getSession({ headers: c.req.raw.headers });
    if (!session) return c.json({ success: false, error: "请先登录" }, 401);

    const teamId = c.req.param("id");
    const userId = session.user.id;
    const db = createDb(c.env.DB);

    const team = await db.query.teams.findFirst({ where: eq(schema.teams.id, teamId) });
    if (!team) return c.json({ success: false, error: "队伍不存在" }, 404);

    if (team.leaderId !== userId)
      return c.json({ success: false, error: "只有队长可以删除队伍" }, 403);

    if (team.status !== "recruiting" && team.status !== "cancelled")
      return c.json({ success: false, error: "只有招募中或已取消的队伍可以删除" }, 400);

    await db.delete(schema.teamMembers).where(eq(schema.teamMembers.teamId, teamId));
    await db.delete(schema.teams).where(eq(schema.teams.id, teamId));

    return c.json({ success: true, message: "队伍已删除" });
  } catch (error) {
    console.error("Delete team error:", error);
    return c.json({ success: false, error: "删除队伍失败" }, 500);
  }
});

/**
 * POST /teams/:id/form
 * 组建队伍（仅队长）
 */
mutations.post("/:id/form", async (c) => {
  try {
    const authInstance = createAuth(c.env);
    const session = await authInstance.api.getSession({ headers: c.req.raw.headers });
    if (!session) return c.json({ success: false, error: "请先登录" }, 401);

    const teamId = c.req.param("id");
    const db = createDb(c.env.DB);

    const body = await c.req.json<{ isUnderfilled?: boolean }>().catch(() => ({} as { isUnderfilled?: boolean }));
    const isUnderfilled = body.isUnderfilled === true;

    const team = await db.query.teams.findFirst({ where: eq(schema.teams.id, teamId) });
    if (!team) return c.json({ success: false, error: "队伍不存在" }, 404);
    if (team.leaderId !== session.user.id) return c.json({ success: false, error: "只有队长可以组建队伍" }, 403);
    if (team.status !== "recruiting" && team.status !== "full")
      return c.json({ success: false, error: "当前队伍状态无法组建" }, 400);

    const [{ approvedCount }] = await db
      .select({ approvedCount: sql<number>`count(*)` })
      .from(schema.teamMembers)
      .where(and(eq(schema.teamMembers.teamId, teamId), eq(schema.teamMembers.status, "approved")));

    if (approvedCount < 1) return c.json({ success: false, error: "队伍至少需要1人才能组建" }, 400);

    await db.update(schema.teams)
      .set({ status: "formed", updatedAt: new Date() })
      .where(eq(schema.teams.id, teamId));

    return c.json({ success: true, message: "队伍已组建", isUnderfilled });
  } catch (error) {
    console.error("Form team error:", error);
    return c.json({ success: false, error: "组建队伍失败" }, 500);
  }
});

/**
 * POST /teams/:id/cancel
 * 取消队伍（仅队长，仅 recruiting/full 状态）
 */
mutations.post("/:id/cancel", async (c) => {
  try {
    const authInstance = createAuth(c.env);
    const session = await authInstance.api.getSession({ headers: c.req.raw.headers });
    if (!session) return c.json({ success: false, error: "请先登录" }, 401);

    const teamId = c.req.param("id");
    const db = createDb(c.env.DB);

    const team = await db.query.teams.findFirst({ where: eq(schema.teams.id, teamId) });
    if (!team) return c.json({ success: false, error: "队伍不存在" }, 404);
    if (team.leaderId !== session.user.id)
      return c.json({ success: false, error: "只有队长可以取消队伍" }, 403);
    if (team.status !== "recruiting" && team.status !== "full")
      return c.json({ success: false, error: "当前队伍状态无法取消" }, 400);

    await db.update(schema.teams)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(schema.teams.id, teamId));

    return c.json({ success: true, message: "队伍已取消" });
  } catch (error) {
    console.error("Cancel team error:", error);
    return c.json({ success: false, error: "取消队伍失败" }, 500);
  }
});

export default mutations;
