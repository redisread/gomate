import { Hono } from "hono";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { APIErrors } from "../../lib/api-errors";
import { logger } from "../../lib/logger";
import { createAuth } from "../../lib/auth";
import { createDb } from "../../db";
import * as schema from "../../db/schema";
import type { Env } from "../../lib/auth";
import { generateId } from "../../lib/id";
import { emitTeamActionbookEvent } from "../../lib/team-events";
import type { TeamChecklist, ActionbookAssignment } from "@gomate/types";

/**
 * task #163（P0-A T1+T5）：Team「行动本」checklist 路由
 *
 * spec：notes/gomate-p0a-team-actionbook-spec.md v1.1 §2.3
 *
 * 两条路径：
 *   PUT    /:id/checklist                                     队长覆盖式更新
 *   POST   /:id/checklist/assignments/:assignmentId/claim     队员认领（幂等）
 *   DELETE /:id/checklist/assignments/:assignmentId/claim     队员取消认领（幂等）
 *
 * 并发防漂移：assignment 用稳定 id 定位，不用 index。
 * server 端总是负责 assigneeIds 去重、只允许操作自己。
 */

const checklist = new Hono<{ Bindings: Env }>();

// ==================== Zod schemas ====================

const meetingPointSchema = z
  .object({
    name: z.string().min(1).max(200),
    time: z.string().max(50).optional(),
    note: z.string().max(500).optional(),
  })
  .optional();

const transportSchema = z
  .object({
    mode: z.enum(["self_drive", "public", "charter", "other"]),
    detail: z.string().max(500).optional(),
  })
  .optional();

const gearSchema = z
  .object({
    essential: z.array(z.string().min(1).max(50)).max(50),
    optional: z.array(z.string().min(1).max(50)).max(50),
    note: z.string().max(500).optional(),
  })
  .optional();

/** 入参 assignment：id 可缺（新增项，server 补 uuid v4）；assigneeIds 可缺（默认 []） */
const assignmentInputSchema = z.object({
  id: z.string().min(1).max(100).optional(),
  task: z.string().min(1).max(200),
  assigneeIds: z.array(z.string().min(1).max(100)).max(50).optional(),
});

const checklistPutSchema = z
  .object({
    meetingPoint: meetingPointSchema,
    transport: transportSchema,
    gear: gearSchema,
    assignments: z.array(assignmentInputSchema).max(50).optional(),
    notes: z.string().max(2000).optional(),
  })
  .refine(
    // task #163 v1.1 spec §2.1：checklist 序列化后单字段 <2KB（软上限，防滥用）
    (v) => JSON.stringify(v).length <= 2048,
    { message: "checklist 内容过大（超过 2KB 上限）" },
  );

// ==================== 工具 ====================

/** DB 里 checklist 可能是 JSON 字符串（driver 不同表现不同）；统一 parse 成对象 */
function parseChecklist(raw: unknown): TeamChecklist | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "string") {
    if (!raw) return null;
    try {
      return JSON.parse(raw) as TeamChecklist;
    } catch {
      return null;
    }
  }
  return raw as TeamChecklist;
}

/**
 * 合并入参 assignments 与已有 assignments 的 id：
 * - 已有 id：保留 + 更新 task；assigneeIds 由队长入参覆盖（保留旧 id 意味着已认领关系不丢）
 * - 缺 id 的新增项：server 补 uuid v4（generateId 沿用现有 nanoid）
 * - 已有 assignmentId 若不在入参里：视为队长删除，直接不落库（关联的 claim 关系一并消失）
 * - assigneeIds 强制去重
 *
 * 注意：入参 assignments 已经是队长的最终视图，此函数只做补 id + 去重。
 */
function normalizeAssignments(
  input: z.infer<typeof assignmentInputSchema>[] | undefined,
  existing: ActionbookAssignment[] | undefined,
): ActionbookAssignment[] {
  if (!input) return [];
  const existingIds = new Set((existing ?? []).map((a) => a.id));
  return input.map((item) => {
    const id = item.id && existingIds.has(item.id) ? item.id : generateId();
    const assigneeIds = Array.from(new Set(item.assigneeIds ?? []));
    return { id, task: item.task, assigneeIds };
  });
}

async function getTeamOr404(db: ReturnType<typeof createDb>, teamId: string) {
  const team = await db.query.teams.findFirst({ where: eq(schema.teams.id, teamId) });
  return team ?? null;
}

/** 队员必须是该队伍 approved 成员或队长本人才能认领 */
async function assertJoined(
  db: ReturnType<typeof createDb>,
  teamId: string,
  userId: string,
  leaderId: string,
): Promise<boolean> {
  if (userId === leaderId) return true;
  const member = await db.query.teamMembers.findFirst({
    where: and(
      eq(schema.teamMembers.teamId, teamId),
      eq(schema.teamMembers.userId, userId),
      eq(schema.teamMembers.status, "approved"),
    ),
  });
  return !!member;
}

// ==================== PUT /:id/checklist ====================

/**
 * PUT /teams/:id/checklist
 * 队长覆盖式更新整个 checklist。
 * assignment id 保留策略：入参 id 若已存在则复用，否则 server 补新 uuid。
 */
checklist.put("/:id/checklist", async (c) => {
  try {
    const authInstance = createAuth(c.env);
    const session = await authInstance.api.getSession({ headers: c.req.raw.headers });
    if (!session) return c.json(APIErrors.unauthorized("请先登录"), 401);

    const teamId = c.req.param("id");
    const db = createDb(c.env.DB);

    const team = await getTeamOr404(db, teamId);
    if (!team) return c.json(APIErrors.notFound("队伍不存在"), 404);
    if (team.leaderId !== session.user.id)
      return c.json(APIErrors.forbidden("只有队长可以编辑行动本"), 403);

    const body = await c.req.json().catch(() => null);
    const parsed = checklistPutSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(APIErrors.validationError("输入无效", parsed.error.errors), 400);
    }

    const existing = parseChecklist(team.checklist);
    const normalizedAssignments = normalizeAssignments(
      parsed.data.assignments,
      existing?.assignments,
    );

    const next: TeamChecklist = {
      ...(parsed.data.meetingPoint ? { meetingPoint: parsed.data.meetingPoint } : {}),
      ...(parsed.data.transport ? { transport: parsed.data.transport } : {}),
      ...(parsed.data.gear ? { gear: parsed.data.gear } : {}),
      ...(normalizedAssignments.length ? { assignments: normalizedAssignments } : {}),
      ...(parsed.data.notes ? { notes: parsed.data.notes } : {}),
    };

    await db
      .update(schema.teams)
      .set({ checklist: next, updatedAt: new Date() })
      .where(eq(schema.teams.id, teamId));

    emitTeamActionbookEvent({
      type: "checklist.updated",
      teamId,
      actorUserId: session.user.id,
      timestamp: Date.now(),
    });

    return c.json({ success: true, checklist: next });
  } catch (error) {
    logger.error("Update checklist error:", error);
    return c.json(APIErrors.internalError("更新行动本失败"), 500);
  }
});

// ==================== POST /:id/checklist/assignments/:assignmentId/claim ====================

/**
 * POST /teams/:id/checklist/assignments/:assignmentId/claim
 * 队员自助认领指定 assignment（幂等：重复调用不重复加）。
 * 只能操作自己的 userId；assignment 不存在返回 404（防漂移）。
 * 并发防丢失：用 updatedAt CAS 更新，冲突时重试一次。
 */
checklist.post("/:id/checklist/assignments/:assignmentId/claim", async (c) => {
  try {
    const authInstance = createAuth(c.env);
    const session = await authInstance.api.getSession({ headers: c.req.raw.headers });
    if (!session) return c.json(APIErrors.unauthorized("请先登录"), 401);

    const teamId = c.req.param("id");
    const assignmentId = c.req.param("assignmentId");
    const userId = session.user.id;
    const db = createDb(c.env.DB);

    const team = await getTeamOr404(db, teamId);
    if (!team) return c.json(APIErrors.notFound("队伍不存在"), 404);

    const joined = await assertJoined(db, teamId, userId, team.leaderId);
    if (!joined) return c.json(APIErrors.forbidden("仅已加入的成员可认领分工"), 403);

    // CAS 重试：并发时另一方先写 → 我们的 UPDATE where updatedAt=old 命中 0 行 → 重新读一次
    for (let attempt = 0; attempt < 2; attempt++) {
      const current = attempt === 0
        ? team
        : await getTeamOr404(db, teamId);
      if (!current) return c.json(APIErrors.notFound("队伍不存在"), 404);

      const existing = parseChecklist(current.checklist);
      const assignments = existing?.assignments ?? [];
      const idx = assignments.findIndex((a) => a.id === assignmentId);
      if (idx < 0) return c.json(APIErrors.notFound("分工不存在或已被删除"), 404);

      const target = assignments[idx];
      if (target.assigneeIds.includes(userId)) {
        // 幂等：已认领，直接返回当前状态
        return c.json({ success: true, assignment: target });
      }

      const next: ActionbookAssignment = {
        ...target,
        assigneeIds: [...target.assigneeIds, userId],
      };
      const nextAssignments = assignments.slice();
      nextAssignments[idx] = next;
      const nextChecklist: TeamChecklist = { ...existing, assignments: nextAssignments };

      // compare-and-swap：where updatedAt = 当前值
      const result = await db
        .update(schema.teams)
        .set({ checklist: nextChecklist, updatedAt: new Date() })
        .where(and(eq(schema.teams.id, teamId), eq(schema.teams.updatedAt, current.updatedAt)))
        .returning({ id: schema.teams.id });

      if (result.length > 0) {
        emitTeamActionbookEvent({
          type: "assignment.claim_changed",
          action: "claim",
          teamId,
          assignmentId,
          actorUserId: userId,
          timestamp: Date.now(),
        });
        return c.json({ success: true, assignment: next });
      }
      // CAS 失败：另一方先写，进入下一轮重读
    }
    // 两次都失败，返回 409 让客户端重试
    return c.json(APIErrors.conflict("并发写入冲突，请重试"), 409);
  } catch (error) {
    logger.error("Claim assignment error:", error);
    return c.json(APIErrors.internalError("认领分工失败"), 500);
  }
});

// ==================== DELETE /:id/checklist/assignments/:assignmentId/claim ====================

/**
 * DELETE /teams/:id/checklist/assignments/:assignmentId/claim
 * 队员取消认领（幂等：不在时返回 204 语义 —— 走 204 no content）。
 * 并发防丢失：用 updatedAt CAS 更新，冲突时重试一次。
 */
checklist.delete("/:id/checklist/assignments/:assignmentId/claim", async (c) => {
  try {
    const authInstance = createAuth(c.env);
    const session = await authInstance.api.getSession({ headers: c.req.raw.headers });
    if (!session) return c.json(APIErrors.unauthorized("请先登录"), 401);

    const teamId = c.req.param("id");
    const assignmentId = c.req.param("assignmentId");
    const userId = session.user.id;
    const db = createDb(c.env.DB);

    const team = await getTeamOr404(db, teamId);
    if (!team) return c.json(APIErrors.notFound("队伍不存在"), 404);

    const joined = await assertJoined(db, teamId, userId, team.leaderId);
    if (!joined) return c.json(APIErrors.forbidden("仅已加入的成员可取消认领"), 403);

    for (let attempt = 0; attempt < 2; attempt++) {
      const current = attempt === 0
        ? team
        : await getTeamOr404(db, teamId);
      if (!current) return c.json(APIErrors.notFound("队伍不存在"), 404);

      const existing = parseChecklist(current.checklist);
      const assignments = existing?.assignments ?? [];
      const idx = assignments.findIndex((a) => a.id === assignmentId);
      if (idx < 0) return c.json(APIErrors.notFound("分工不存在或已被删除"), 404);

      const target = assignments[idx];
      if (!target.assigneeIds.includes(userId)) {
        // 幂等：本来就没认领，直接返回当前状态
        return c.body(null, 204);
      }

      const next: ActionbookAssignment = {
        ...target,
        assigneeIds: target.assigneeIds.filter((uid) => uid !== userId),
      };
      const nextAssignments = assignments.slice();
      nextAssignments[idx] = next;
      const nextChecklist: TeamChecklist = { ...existing, assignments: nextAssignments };

      const result = await db
        .update(schema.teams)
        .set({ checklist: nextChecklist, updatedAt: new Date() })
        .where(and(eq(schema.teams.id, teamId), eq(schema.teams.updatedAt, current.updatedAt)))
        .returning({ id: schema.teams.id });

      if (result.length > 0) {
        emitTeamActionbookEvent({
          type: "assignment.claim_changed",
          action: "unclaim",
          teamId,
          assignmentId,
          actorUserId: userId,
          timestamp: Date.now(),
        });
        return c.body(null, 204);
      }
    }
    return c.json(APIErrors.conflict("并发写入冲突，请重试"), 409);
  } catch (error) {
    logger.error("Unclaim assignment error:", error);
    return c.json(APIErrors.internalError("取消认领失败"), 500);
  }
});

export default checklist;
