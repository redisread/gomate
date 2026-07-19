import { describe, it, expect, beforeEach, vi } from "vitest";
import { Hono } from "hono";
import { createTestDb } from "../helpers/db";
import { seedUser, seedCity, seedLocation, seedTeam, seedTeamMember } from "../helpers/seed";
import { eq } from "drizzle-orm";
import * as schema from "../../db/schema";
import type { TeamChecklist } from "@gomate/types";

/**
 * task #163（P0-A T1+T5）：Team「行动本」checklist 集成测试
 *
 * 覆盖：
 * - PUT /teams/:id/checklist：队长权限、非队长 403、匿名 401、404
 * - assignment id 保留策略：入参已存在 id → 复用；缺 id → server 补新 uuid
 * - POST claim：joined-only、幂等、assignmentId（非 index）定位
 * - DELETE claim：幂等 204、不在时也 204
 * - assigneeIds server 去重
 */

let currentSession: { user: { id: string; email: string; name: string } } | null = null;
let testDb: ReturnType<typeof createTestDb>["db"];

vi.mock("../../lib/auth", () => ({
  createAuth: (_env: unknown) => ({
    api: { getSession: async (_opts: unknown) => currentSession },
  }),
}));

vi.mock("../../db", () => ({
  createDb: (_d1: unknown) => testDb,
}));

const { teamsRoute } = await import("../../routes/teams");

function createApp() {
  const app = new Hono<{ Bindings: { DB: unknown } }>();
  app.route("/teams", teamsRoute);
  return app;
}

async function req(
  app: ReturnType<typeof createApp>,
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const request = new Request(`http://localhost${path}`, options);
  return app.fetch(request, { DB: {} });
}

function setSession(user: { id: string; email: string; name: string } | null) {
  currentSession = user ? { user } : null;
}

/** 从 DB 读回 checklist（driver 差异：可能是 JSON 字符串或对象） */
async function readChecklist(teamId: string): Promise<TeamChecklist | null> {
  const [row] = await testDb.select().from(schema.teams).where(eq(schema.teams.id, teamId));
  const raw = row?.checklist as unknown;
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

describe("Teams checklist API 集成测试", () => {
  let app: ReturnType<typeof createApp>;
  let leader: schema.User;
  let member: schema.User;
  let stranger: schema.User;
  let city: schema.City;
  let location: schema.Location;
  let team: schema.Team;

  beforeEach(async () => {
    const fresh = createTestDb();
    testDb = fresh.db;
    app = createApp();
    currentSession = null;

    leader = await seedUser(testDb, { name: "队长" });
    member = await seedUser(testDb, { name: "成员" });
    stranger = await seedUser(testDb, { name: "路人" });
    city = await seedCity(testDb);
    location = await seedLocation(testDb, city.id);
    team = await seedTeam(testDb, leader.id, location.id, { title: "周末徒步" });
    await seedTeamMember(testDb, team.id, member.id, "approved");
  });

  // ===== PUT /teams/:id/checklist =====

  describe("PUT /teams/:id/checklist - 队长覆盖式更新", () => {
    it("匿名用户 → 401", async () => {
      const res = await req(app, `/teams/${team.id}/checklist`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ notes: "test" }),
      });
      expect(res.status).toBe(401);
    });

    it("非队长成员 → 403", async () => {
      setSession({ id: member.id, email: "m@x.com", name: "m" });
      const res = await req(app, `/teams/${team.id}/checklist`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ notes: "test" }),
      });
      expect(res.status).toBe(403);
    });

    it("队伍不存在 → 404", async () => {
      setSession({ id: leader.id, email: "l@x.com", name: "l" });
      const res = await req(app, "/teams/not-exist/checklist", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ notes: "test" }),
      });
      expect(res.status).toBe(404);
    });

    it("队长完整提交 → 200，DB 落盘一致", async () => {
      setSession({ id: leader.id, email: "l@x.com", name: "l" });
      const body = {
        meetingPoint: { name: "地铁北门", time: "07:30", note: "迟到 15 分钟不等" },
        transport: { mode: "self_drive" as const, detail: "3 辆车拼车" },
        gear: { essential: ["登山鞋", "水"], optional: ["登山杖"], note: "自带午餐" },
        assignments: [
          { task: "买水", assigneeIds: [] },
          { task: "买路餐", assigneeIds: [member.id] },
        ],
        notes: "队伍口令：出发",
      };
      const res = await req(app, `/teams/${team.id}/checklist`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      expect(res.status).toBe(200);
      const json = (await res.json()) as { success: boolean; checklist: TeamChecklist };
      expect(json.success).toBe(true);
      expect(json.checklist.meetingPoint?.name).toBe("地铁北门");
      expect(json.checklist.transport?.mode).toBe("self_drive");
      expect(json.checklist.gear?.essential).toEqual(["登山鞋", "水"]);
      expect(json.checklist.assignments).toHaveLength(2);
      // server 补 uuid：入参无 id，返回值应带 id
      expect(json.checklist.assignments![0].id).toBeTruthy();
      expect(json.checklist.assignments![1].id).toBeTruthy();
      expect(json.checklist.assignments![0].id).not.toBe(json.checklist.assignments![1].id);

      const saved = await readChecklist(team.id);
      expect(saved?.notes).toBe("队伍口令：出发");
    });

    it("入参 assignment.id 命中已有 → 复用；缺 id → 生成新 uuid", async () => {
      setSession({ id: leader.id, email: "l@x.com", name: "l" });

      // 第一次 PUT：种下两条 assignment，让 server 生成 id
      const first = await req(app, `/teams/${team.id}/checklist`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          assignments: [
            { task: "带水", assigneeIds: [] },
            { task: "带餐", assigneeIds: [] },
          ],
        }),
      });
      const firstJson = (await first.json()) as { checklist: TeamChecklist };
      const existingId = firstJson.checklist.assignments![0].id;

      // 第二次 PUT：一条带已有 id（应复用）、一条不带 id（应新生成）
      const second = await req(app, `/teams/${team.id}/checklist`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          assignments: [
            { id: existingId, task: "带水（改）", assigneeIds: [member.id] },
            { task: "带气罐", assigneeIds: [] },
          ],
        }),
      });
      const secondJson = (await second.json()) as { checklist: TeamChecklist };
      expect(secondJson.checklist.assignments).toHaveLength(2);
      expect(secondJson.checklist.assignments![0].id).toBe(existingId); // 复用
      expect(secondJson.checklist.assignments![0].task).toBe("带水（改）");
      expect(secondJson.checklist.assignments![0].assigneeIds).toEqual([member.id]);
      expect(secondJson.checklist.assignments![1].id).toBeTruthy();
      expect(secondJson.checklist.assignments![1].id).not.toBe(existingId); // 新 id
    });

    it("入参 assigneeIds 重复 → server 去重", async () => {
      setSession({ id: leader.id, email: "l@x.com", name: "l" });
      const res = await req(app, `/teams/${team.id}/checklist`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          assignments: [{ task: "买水", assigneeIds: [member.id, member.id, member.id] }],
        }),
      });
      const json = (await res.json()) as { checklist: TeamChecklist };
      expect(json.checklist.assignments![0].assigneeIds).toEqual([member.id]);
    });

    it("入参非法 (task 空字符串) → 400", async () => {
      setSession({ id: leader.id, email: "l@x.com", name: "l" });
      const res = await req(app, `/teams/${team.id}/checklist`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ assignments: [{ task: "" }] }),
      });
      expect(res.status).toBe(400);
    });

    it("入参序列化后 > 2KB → 400（软上限，防滥用）", async () => {
      setSession({ id: leader.id, email: "l@x.com", name: "l" });
      // 精心构造：多个字段加起来触发 >2KB 上限
      // 单字段 notes 上限 2000，加 gear/notes/note 组合足以超 2048
      const res = await req(app, `/teams/${team.id}/checklist`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          notes: "x".repeat(2000),
          gear: { essential: ["a", "b"], optional: ["c"], note: "y".repeat(500) },
        }),
      });
      expect(res.status).toBe(400);
    });

    // B1（Martin CR）：spec §2.3 明确「PUT 是队长覆盖式更新整个 checklist」，
    // 未传字段 → 清空。第一版用条件展开会保留旧值，破坏覆盖式语义。此处回归。
    it("PUT 覆盖式：不传字段应清空旧值（B1 回归）", async () => {
      setSession({ id: leader.id, email: "l@x.com", name: "l" });

      // 第一次：写入完整 checklist（有 meetingPoint / transport / gear / assignments / notes）
      const first = await req(app, `/teams/${team.id}/checklist`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          meetingPoint: { name: "地铁北门", time: "07:30" },
          transport: { mode: "self_drive" as const, detail: "拼车" },
          gear: { essential: ["水"], optional: [] },
          assignments: [{ task: "买水", assigneeIds: [] }],
          notes: "旧口令",
        }),
      });
      expect(first.status).toBe(200);
      const firstJson = (await first.json()) as { checklist: TeamChecklist };
      expect(firstJson.checklist.meetingPoint?.name).toBe("地铁北门");
      expect(firstJson.checklist.assignments).toHaveLength(1);

      // 第二次：只传 notes，其他字段全部缺省 → 应清空
      const second = await req(app, `/teams/${team.id}/checklist`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ notes: "新口令" }),
      });
      expect(second.status).toBe(200);
      const secondJson = (await second.json()) as { checklist: TeamChecklist };
      expect(secondJson.checklist.notes).toBe("新口令");
      expect(secondJson.checklist.meetingPoint).toBeUndefined();
      expect(secondJson.checklist.transport).toBeUndefined();
      expect(secondJson.checklist.gear).toBeUndefined();
      // assignments：既然全没传，normalize 后是 []（server 视为「清空」）
      expect(secondJson.checklist.assignments).toEqual([]);

      // DB 落盘一致
      const saved = await readChecklist(team.id);
      expect(saved?.notes).toBe("新口令");
      expect(saved?.meetingPoint).toBeUndefined();
      expect(saved?.transport).toBeUndefined();
      expect(saved?.gear).toBeUndefined();
      expect(saved?.assignments).toEqual([]);
    });

    it("PUT 覆盖式：显式传空 assignments 也应清空", async () => {
      setSession({ id: leader.id, email: "l@x.com", name: "l" });

      await req(app, `/teams/${team.id}/checklist`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          assignments: [
            { task: "买水", assigneeIds: [member.id] },
            { task: "买餐", assigneeIds: [] },
          ],
        }),
      });

      const res = await req(app, `/teams/${team.id}/checklist`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ assignments: [] }),
      });
      expect(res.status).toBe(200);
      const json = (await res.json()) as { checklist: TeamChecklist };
      expect(json.checklist.assignments).toEqual([]);
    });
  });

  // ===== POST /teams/:id/checklist/assignments/:assignmentId/claim =====

  describe("POST claim - 队员认领", () => {
    async function seedOneAssignment(): Promise<string> {
      setSession({ id: leader.id, email: "l@x.com", name: "l" });
      const res = await req(app, `/teams/${team.id}/checklist`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ assignments: [{ task: "买水", assigneeIds: [] }] }),
      });
      const json = (await res.json()) as { checklist: TeamChecklist };
      return json.checklist.assignments![0].id;
    }

    it("匿名 → 401", async () => {
      const aid = await seedOneAssignment();
      setSession(null);
      const res = await req(app, `/teams/${team.id}/checklist/assignments/${aid}/claim`, {
        method: "POST",
      });
      expect(res.status).toBe(401);
    });

    it("非成员（路人） → 403", async () => {
      const aid = await seedOneAssignment();
      setSession({ id: stranger.id, email: "s@x.com", name: "s" });
      const res = await req(app, `/teams/${team.id}/checklist/assignments/${aid}/claim`, {
        method: "POST",
      });
      expect(res.status).toBe(403);
    });

    it("assignmentId 不存在 → 404（防漂移）", async () => {
      await seedOneAssignment();
      setSession({ id: member.id, email: "m@x.com", name: "m" });
      const res = await req(app, `/teams/${team.id}/checklist/assignments/no-such-id/claim`, {
        method: "POST",
      });
      expect(res.status).toBe(404);
    });

    it("成员认领 → 200，assigneeIds 含 userId；重复调用幂等", async () => {
      const aid = await seedOneAssignment();
      setSession({ id: member.id, email: "m@x.com", name: "m" });

      const first = await req(app, `/teams/${team.id}/checklist/assignments/${aid}/claim`, {
        method: "POST",
      });
      expect(first.status).toBe(200);
      const firstJson = (await first.json()) as { assignment: { assigneeIds: string[] } };
      expect(firstJson.assignment.assigneeIds).toEqual([member.id]);

      const second = await req(app, `/teams/${team.id}/checklist/assignments/${aid}/claim`, {
        method: "POST",
      });
      expect(second.status).toBe(200);
      const secondJson = (await second.json()) as { assignment: { assigneeIds: string[] } };
      expect(secondJson.assignment.assigneeIds).toEqual([member.id]); // 幂等：仍是一个

      const saved = await readChecklist(team.id);
      expect(saved?.assignments![0].assigneeIds).toEqual([member.id]);
    });

    it("队长本人（也是队长）→ 200，可认领", async () => {
      const aid = await seedOneAssignment();
      setSession({ id: leader.id, email: "l@x.com", name: "l" });
      const res = await req(app, `/teams/${team.id}/checklist/assignments/${aid}/claim`, {
        method: "POST",
      });
      expect(res.status).toBe(200);
      const json = (await res.json()) as { assignment: { assigneeIds: string[] } };
      expect(json.assignment.assigneeIds).toEqual([leader.id]);
    });
  });

  // ===== DELETE /teams/:id/checklist/assignments/:assignmentId/claim =====

  describe("DELETE claim - 队员取消认领", () => {
    async function seedAssignmentClaimedByMember(): Promise<string> {
      setSession({ id: leader.id, email: "l@x.com", name: "l" });
      const res = await req(app, `/teams/${team.id}/checklist`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ assignments: [{ task: "买水", assigneeIds: [member.id] }] }),
      });
      const json = (await res.json()) as { checklist: TeamChecklist };
      return json.checklist.assignments![0].id;
    }

    it("匿名 → 401", async () => {
      const aid = await seedAssignmentClaimedByMember();
      setSession(null);
      const res = await req(app, `/teams/${team.id}/checklist/assignments/${aid}/claim`, {
        method: "DELETE",
      });
      expect(res.status).toBe(401);
    });

    it("路人 → 403", async () => {
      const aid = await seedAssignmentClaimedByMember();
      setSession({ id: stranger.id, email: "s@x.com", name: "s" });
      const res = await req(app, `/teams/${team.id}/checklist/assignments/${aid}/claim`, {
        method: "DELETE",
      });
      expect(res.status).toBe(403);
    });

    it("assignmentId 不存在 → 404", async () => {
      await seedAssignmentClaimedByMember();
      setSession({ id: member.id, email: "m@x.com", name: "m" });
      const res = await req(app, `/teams/${team.id}/checklist/assignments/no-such-id/claim`, {
        method: "DELETE",
      });
      expect(res.status).toBe(404);
    });

    it("成员取消认领 → 204，DB 中 userId 已移除；重复调用仍 204（幂等）", async () => {
      const aid = await seedAssignmentClaimedByMember();
      setSession({ id: member.id, email: "m@x.com", name: "m" });

      const first = await req(app, `/teams/${team.id}/checklist/assignments/${aid}/claim`, {
        method: "DELETE",
      });
      expect(first.status).toBe(204);

      const saved = await readChecklist(team.id);
      expect(saved?.assignments![0].assigneeIds).toEqual([]);

      const second = await req(app, `/teams/${team.id}/checklist/assignments/${aid}/claim`, {
        method: "DELETE",
      });
      expect(second.status).toBe(204); // 幂等：本来就不在，仍 204
    });
  });

  // ===== 并发防漂移：assignmentId 稳定 =====

  describe("并发防漂移：assignmentId 而非 index", () => {
    it("队长删掉前一个 assignment 后，用旧 index 认领不会误伤（走 404）", async () => {
      setSession({ id: leader.id, email: "l@x.com", name: "l" });
      const firstPut = await req(app, `/teams/${team.id}/checklist`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          assignments: [
            { task: "买水", assigneeIds: [] },
            { task: "买餐", assigneeIds: [] },
          ],
        }),
      });
      const first = (await firstPut.json()) as { checklist: TeamChecklist };
      const idA = first.checklist.assignments![0].id;
      const idB = first.checklist.assignments![1].id;

      // 队长删掉第一个（"买水"）
      await req(app, `/teams/${team.id}/checklist`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          assignments: [{ id: idB, task: "买餐", assigneeIds: [] }],
        }),
      });

      // 用旧的 idA 认领：应 404，而不是错认到 idB
      setSession({ id: member.id, email: "m@x.com", name: "m" });
      const claim = await req(app, `/teams/${team.id}/checklist/assignments/${idA}/claim`, {
        method: "POST",
      });
      expect(claim.status).toBe(404);

      // idB 依然可认领
      const claimB = await req(app, `/teams/${team.id}/checklist/assignments/${idB}/claim`, {
        method: "POST",
      });
      expect(claimB.status).toBe(200);
    });

    /**
     * CAS 并发保护的说明（不在集成测试中真正验证）：
     *
     * 认领/取消认领路由用 `UPDATE ... WHERE id = ? AND updatedAt = ?` 做
     * compare-and-swap，命中 0 行时重读一次再重试；两次都失败返回 409。
     *
     * 集成测试的 better-sqlite3 是同步 driver + Promise.all 无法真并发，
     * 只能在生产（D1）验证真并发丢失场景。若需白盒测试，可在下一版通过
     * 打桩 db.update 强制第一次返回 [] 来断言重试路径。
     */
  });
});
