import { Hono } from "hono";
import { z } from "zod";
import { eq, and, isNull, sql } from "drizzle-orm";
import { APIErrors } from "../../lib/api-errors";
import { logger } from "../../lib/logger";
import { createDb } from "../../db";
import * as schema from "../../db/schema";
import type { Env } from "../../lib/auth";
import { getActiveSession } from "../../lib/active-session";
import { generateId } from "../../lib/id";
import { emitTeamActionbookEvent } from "../../lib/team-events";
import { parseChecklist } from "../../lib/team-checklist-utils";
import type { TeamChecklist, ActionbookAssignment } from "@/contracts";

/**
 * Team「行动本」checklist 路由。
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

const checklistPutSchema = z.object({
  meetingPoint: meetingPointSchema,
  transport: transportSchema,
  gear: gearSchema,
  assignments: z.array(assignmentInputSchema).max(50).optional(),
  notes: z.string().max(2000).optional(),
});

/** spec §2.1：checklist 序列化后单字段 <2KB（软上限，防滥用） */
const CHECKLIST_MAX_BYTES = 2048;

// ==================== 工具 ====================

/**
 * 合并入参 assignments 与已有 assignments 的 id：
 * - 已有 id：保留 + 更新 task；assigneeIds 由队长入参覆盖（保留旧 id 意味着已认领关系不丢）
 * - 缺 id 的新增项：server 使用 Web Crypto 生成唯一 ID
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
  const team = await db.query.teams.findFirst({
    where: eq(schema.teams.id, teamId),
  });
  return team ?? null;
}

/** 当前用户是否仍是队长或 left_at 为空的 active 成员。 */
async function hasChecklistAccess(
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
      isNull(schema.teamMembers.leftAt),
    ),
  });
  return !!member;
}

/**
 * CAS 直接比较 checklist JSON 内容，避免同一毫秒内 updated_at 未变化时丢写。
 * D1/Drizzle 会用 JSON column encoder 把对象编码成数据库中的 JSON 文本。
 */
function checklistContentMatches(checklistValue: TeamChecklist | null) {
  return checklistValue === null
    ? isNull(schema.teams.checklist)
    : eq(schema.teams.checklist, checklistValue);
}

/**
 * 把认领权限放进 UPDATE 本身。预查只用于快速错误响应；真正授权点始终是
 * 单条 conditional DML，避免成员在预查后离队仍能写入。
 */
function actorStillEligible(userId: string) {
  return sql<boolean>`(
    ${schema.teams.leaderId} = ${userId}
    or exists (
      select 1
      from ${schema.teamMembers}
      where ${schema.teamMembers.teamId} = ${schema.teams.id}
        and ${schema.teamMembers.userId} = ${userId}
        and ${schema.teamMembers.leftAt} is null
    )
  )`;
}

function uniqueAssigneeIds(assignments: ActionbookAssignment[]): string[] {
  return Array.from(
    new Set(assignments.flatMap((assignment) => assignment.assigneeIds)),
  );
}

async function findInvalidAssigneeIds(
  db: ReturnType<typeof createDb>,
  teamId: string,
  leaderId: string,
  assigneeIds: string[],
): Promise<string[]> {
  if (assigneeIds.length === 0) return [];
  const activeRows = await db
    .select({ userId: schema.teamMembers.userId })
    .from(schema.teamMembers)
    .where(
      and(
        eq(schema.teamMembers.teamId, teamId),
        isNull(schema.teamMembers.leftAt),
      ),
    );
  const eligible = new Set([leaderId, ...activeRows.map((row) => row.userId)]);
  return assigneeIds.filter((userId) => !eligible.has(userId));
}

/**
 * PUT 的 assignee 校验也必须与写入原子化。json_each 只绑定一份 JSON 参数，
 * 不会因最多 2KB 的 assignee 列表触发 SQLite bind-variable 上限。
 */
function allAssigneesStillEligible(assigneeIds: string[]) {
  return sql<boolean>`not exists (
    select 1
    from json_each(${JSON.stringify(assigneeIds)}) as requested
    where cast(requested.value as text) <> ${schema.teams.leaderId}
      and not exists (
        select 1
        from ${schema.teamMembers}
        where ${schema.teamMembers.teamId} = ${schema.teams.id}
          and ${schema.teamMembers.userId} = cast(requested.value as text)
          and ${schema.teamMembers.leftAt} is null
      )
  )`;
}

// ==================== PUT /:id/checklist ====================

/**
 * PUT /teams/:id/checklist
 * 队长覆盖式更新整个 checklist。
 * assignment id 保留策略：入参 id 若已存在则复用，否则 server 补新 uuid。
 */
checklist.put("/:id/checklist", async (c) => {
  try {
    const session = await getActiveSession(c.env, c.req.raw.headers);
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
      return c.json(
        APIErrors.validationError("输入无效", parsed.error.errors),
        400,
      );
    }

    const existing = parseChecklist(team.checklist);
    const normalizedAssignments = normalizeAssignments(
      parsed.data.assignments,
      existing?.assignments,
    );

    // B1（Martin CR）：spec 是「队长覆盖式更新整个 checklist」，未传字段视为清空。
    // 之前用条件展开会保留旧值 → 与 spec 矛盾。这里改为无条件字段赋值。
    const next: TeamChecklist = {
      meetingPoint: parsed.data.meetingPoint,
      transport: parsed.data.transport,
      gear: parsed.data.gear,
      assignments: normalizedAssignments,
      notes: parsed.data.notes,
    };

    // S1（Martin CR）：<2KB 软上限从 zod refine 挪到落盘前显式校验，
    // 返回 validationError 带明确 message，前端能落到 error.code 映射链路。
    const serialized = JSON.stringify(next);
    const serializedBytes = new TextEncoder().encode(serialized).byteLength;
    if (serializedBytes > CHECKLIST_MAX_BYTES) {
      return c.json(
        APIErrors.validationError("checklist 内容过大（超过 2KB 上限）", [
          {
            code: "custom",
            path: [],
            message: `序列化后 ${serializedBytes} 字节，上限 ${CHECKLIST_MAX_BYTES}`,
          },
        ]),
        400,
      );
    }

    const assigneeIds = uniqueAssigneeIds(normalizedAssignments);
    const invalidAssigneeIds = await findInvalidAssigneeIds(
      db,
      teamId,
      team.leaderId,
      assigneeIds,
    );
    if (invalidAssigneeIds.length > 0) {
      return c.json(
        APIErrors.validationError(
          "assigneeIds 只能包含队长或当前 active 成员",
          { invalidAssigneeIds },
        ),
        400,
      );
    }

    const result = await db
      .update(schema.teams)
      .set({ checklist: next, updatedAt: new Date() })
      .where(
        and(
          eq(schema.teams.id, teamId),
          eq(schema.teams.leaderId, session.user.id),
          checklistContentMatches(team.checklist),
          allAssigneesStillEligible(assigneeIds),
        ),
      )
      .returning({ id: schema.teams.id });

    if (result.length === 0) {
      const current = await getTeamOr404(db, teamId);
      if (!current) return c.json(APIErrors.notFound("队伍不存在"), 404);
      if (current.leaderId !== session.user.id) {
        return c.json(APIErrors.forbidden("只有队长可以编辑行动本"), 403);
      }
      const invalidNow = await findInvalidAssigneeIds(
        db,
        teamId,
        current.leaderId,
        assigneeIds,
      );
      if (invalidNow.length > 0) {
        return c.json(
          APIErrors.validationError(
            "assigneeIds 只能包含队长或当前 active 成员",
            { invalidAssigneeIds: invalidNow },
          ),
          400,
        );
      }
      return c.json(
        APIErrors.conflict("行动本已被并发修改，请刷新后重试"),
        409,
      );
    }

    emitTeamActionbookEvent({
      type: "checklist.updated",
      teamId,
      actorUserId: session.user.id,
      timestamp: Date.now(),
    });

    return c.json({ success: true, checklist: next });
  } catch (error) {
    logger.error("team_checklist_update_failed", error);
    return c.json(APIErrors.internalError("更新行动本失败"), 500);
  }
});

// ==================== POST /:id/checklist/assignments/:assignmentId/claim ====================

/**
 * POST /teams/:id/checklist/assignments/:assignmentId/claim
 * 队员自助认领指定 assignment（幂等：重复调用不重复加）。
 * 只能操作自己的 userId；assignment 不存在返回 404（防漂移）。
 * 并发防丢失：用 checklist 内容 CAS，并在同一 UPDATE 中重新验证 active membership。
 */
checklist.post("/:id/checklist/assignments/:assignmentId/claim", async (c) => {
  try {
    const session = await getActiveSession(c.env, c.req.raw.headers);
    if (!session) return c.json(APIErrors.unauthorized("请先登录"), 401);

    const teamId = c.req.param("id");
    const assignmentId = c.req.param("assignmentId");
    const userId = session.user.id;
    const db = createDb(c.env.DB);

    const team = await getTeamOr404(db, teamId);
    if (!team) return c.json(APIErrors.notFound("队伍不存在"), 404);

    const joined = await hasChecklistAccess(db, teamId, userId, team.leaderId);
    if (!joined)
      return c.json(APIErrors.forbidden("仅已加入的成员可认领分工"), 403);

    // CAS 重试：checklist 内容或成员身份变化会让 conditional UPDATE 命中 0 行。
    for (let attempt = 0; attempt < 2; attempt++) {
      const current = attempt === 0 ? team : await getTeamOr404(db, teamId);
      if (!current) return c.json(APIErrors.notFound("队伍不存在"), 404);

      const existing = parseChecklist(current.checklist);
      const assignments = existing?.assignments ?? [];
      const idx = assignments.findIndex((a) => a.id === assignmentId);
      if (idx < 0)
        return c.json(APIErrors.notFound("分工不存在或已被删除"), 404);

      const target = assignments[idx];
      const changed = !target.assigneeIds.includes(userId);
      const next: ActionbookAssignment = changed
        ? { ...target, assigneeIds: [...target.assigneeIds, userId] }
        : target;
      const nextAssignments = assignments.slice();
      nextAssignments[idx] = next;
      const nextChecklist: TeamChecklist = {
        ...existing,
        assignments: nextAssignments,
      };

      const result = await db
        .update(schema.teams)
        .set(
          changed
            ? { checklist: nextChecklist, updatedAt: new Date() }
            : { checklist: nextChecklist },
        )
        .where(
          and(
            eq(schema.teams.id, teamId),
            checklistContentMatches(current.checklist),
            actorStillEligible(userId),
          ),
        )
        .returning({ id: schema.teams.id });

      if (result.length > 0) {
        if (changed) {
          emitTeamActionbookEvent({
            type: "assignment.claim_changed",
            action: "claim",
            teamId,
            assignmentId,
            actorUserId: userId,
            timestamp: Date.now(),
          });
        }
        return c.json({ success: true, assignment: next });
      }

      const latest = await getTeamOr404(db, teamId);
      if (!latest) return c.json(APIErrors.notFound("队伍不存在"), 404);
      if (!(await hasChecklistAccess(db, teamId, userId, latest.leaderId))) {
        return c.json(APIErrors.forbidden("仅已加入的成员可认领分工"), 403);
      }
      // checklist 内容发生变化，进入下一轮重读并合并，不覆盖并发写入。
    }
    // 两次都失败，返回 409 让客户端重试
    return c.json(APIErrors.conflict("并发写入冲突，请重试"), 409);
  } catch (error) {
    logger.error("team_checklist_claim_failed", error);
    return c.json(APIErrors.internalError("认领分工失败"), 500);
  }
});

// ==================== DELETE /:id/checklist/assignments/:assignmentId/claim ====================

/**
 * DELETE /teams/:id/checklist/assignments/:assignmentId/claim
 * 队员取消认领（幂等：不在时返回 204 语义 —— 走 204 no content）。
 * 并发防丢失：用 checklist 内容 CAS，并在同一 UPDATE 中重新验证 active membership。
 */
checklist.delete(
  "/:id/checklist/assignments/:assignmentId/claim",
  async (c) => {
    try {
      const session = await getActiveSession(c.env, c.req.raw.headers);
      if (!session) return c.json(APIErrors.unauthorized("请先登录"), 401);

      const teamId = c.req.param("id");
      const assignmentId = c.req.param("assignmentId");
      const userId = session.user.id;
      const db = createDb(c.env.DB);

      const team = await getTeamOr404(db, teamId);
      if (!team) return c.json(APIErrors.notFound("队伍不存在"), 404);

      const joined = await hasChecklistAccess(
        db,
        teamId,
        userId,
        team.leaderId,
      );
      if (!joined)
        return c.json(APIErrors.forbidden("仅已加入的成员可取消认领"), 403);

      for (let attempt = 0; attempt < 2; attempt++) {
        const current = attempt === 0 ? team : await getTeamOr404(db, teamId);
        if (!current) return c.json(APIErrors.notFound("队伍不存在"), 404);

        const existing = parseChecklist(current.checklist);
        const assignments = existing?.assignments ?? [];
        const idx = assignments.findIndex((a) => a.id === assignmentId);
        if (idx < 0)
          return c.json(APIErrors.notFound("分工不存在或已被删除"), 404);

        const target = assignments[idx];
        const changed = target.assigneeIds.includes(userId);
        const next: ActionbookAssignment = changed
          ? {
              ...target,
              assigneeIds: target.assigneeIds.filter((uid) => uid !== userId),
            }
          : target;
        const nextAssignments = assignments.slice();
        nextAssignments[idx] = next;
        const nextChecklist: TeamChecklist = {
          ...existing,
          assignments: nextAssignments,
        };

        const result = await db
          .update(schema.teams)
          .set(
            changed
              ? { checklist: nextChecklist, updatedAt: new Date() }
              : { checklist: nextChecklist },
          )
          .where(
            and(
              eq(schema.teams.id, teamId),
              checklistContentMatches(current.checklist),
              actorStillEligible(userId),
            ),
          )
          .returning({ id: schema.teams.id });

        if (result.length > 0) {
          if (changed) {
            emitTeamActionbookEvent({
              type: "assignment.claim_changed",
              action: "unclaim",
              teamId,
              assignmentId,
              actorUserId: userId,
              timestamp: Date.now(),
            });
          }
          return c.body(null, 204);
        }

        const latest = await getTeamOr404(db, teamId);
        if (!latest) return c.json(APIErrors.notFound("队伍不存在"), 404);
        if (!(await hasChecklistAccess(db, teamId, userId, latest.leaderId))) {
          return c.json(APIErrors.forbidden("仅已加入的成员可取消认领"), 403);
        }
      }
      return c.json(APIErrors.conflict("并发写入冲突，请重试"), 409);
    } catch (error) {
      logger.error("team_checklist_unclaim_failed", error);
      return c.json(APIErrors.internalError("取消认领失败"), 500);
    }
  },
);

export default checklist;
