import { describe, it, expect, beforeEach, vi } from "vitest";
import { Hono } from "hono";
import { createTestDb } from "../helpers/db";
import { seedUser, seedCity, seedLocation, seedTeam, seedTeamMember } from "../helpers/seed";
import { eq, and } from "drizzle-orm";
import * as schema from "../../db/schema";

// ===== Mock 策略 =====
// 路由内部调用 createAuth(c.env) 和 createDb(c.env.DB)
// vi.mock 替换这两个模块，使用测试数据库

let currentSession: { user: { id: string; email: string; name: string } } | null = null;
let testDb: ReturnType<typeof createTestDb>["db"];

vi.mock("../../lib/auth", () => ({
  createAuth: (_env: unknown) => ({
    api: {
      getSession: async (_opts: unknown) => currentSession,
    },
  }),
}));

vi.mock("../../db", () => ({
  createDb: (_d1: unknown) => testDb,
}));

// task #186：邮件发送器 mock（断言 approve 通知接线，避免依赖 Resend）
const mockSendJoinApplication = vi.fn(async (..._args: unknown[]) => ({ success: true }));
const mockSendApplicationApproved = vi.fn(async (..._args: unknown[]) => ({ success: true }));

vi.mock("../../lib/email", () => ({
  sendTeamJoinApplicationEmail: (...args: unknown[]) => mockSendJoinApplication(...args),
  sendApplicationApprovedEmail: (...args: unknown[]) => mockSendApplicationApproved(...args),
}));

// 在 mock 之后导入路由
const { teamsRoute } = await import("../../routes/teams");

/** 创建测试 app，通过 fetch API 传递 env bindings */
function createApp() {
  const app = new Hono<{ Bindings: { DB: unknown } }>();
  app.route("/teams", teamsRoute);
  return app;
}

/** 发送测试请求，自动传递 mock env */
async function req(
  app: ReturnType<typeof createApp>,
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const request = new Request(`http://localhost${path}`, options);
  // 通过 app.fetch 传递 env，让 c.env.DB 不为 undefined
  return app.fetch(request, { DB: {} });
}

function setSession(user: { id: string; email: string; name: string } | null) {
  currentSession = user ? { user } : null;
}

describe("Teams API 集成测试", () => {
  let app: ReturnType<typeof createApp>;
  let leader: schema.User;
  let member: schema.User;
  let city: schema.City;
  let location: schema.Location;

  beforeEach(async () => {
    const fresh = createTestDb();
    testDb = fresh.db;
    app = createApp();
    currentSession = null;
    mockSendJoinApplication.mockClear();
    mockSendApplicationApproved.mockClear();

    leader = await seedUser(testDb, { name: "队长", wechat: "leader_wechat" });
    member = await seedUser(testDb, { name: "成员", wechat: "member_wechat" });
    city = await seedCity(testDb);
    location = await seedLocation(testDb, city.id);
  });

  // ===== GET /teams =====
  describe("GET /teams - 获取队伍列表", () => {
    it("无过滤条件时返回所有队伍", async () => {
      await seedTeam(testDb, leader.id, location.id, { title: "队伍A" });
      await seedTeam(testDb, leader.id, location.id, { title: "队伍B" });

      const res = await req(app, "/teams");
      expect(res.status).toBe(200);
      const json = await res.json() as { teams: unknown[] };
      expect(json.teams).toHaveLength(2);
    });

    it("按 locationId 过滤只返回该地点的队伍", async () => {
      const city2 = await seedCity(testDb);
      const location2 = await seedLocation(testDb, city2.id);
      await seedTeam(testDb, leader.id, location.id, { title: "队伍A" });
      await seedTeam(testDb, leader.id, location2.id, { title: "队伍B" });

      const res = await req(app, `/teams?locationId=${location.id}`);
      expect(res.status).toBe(200);
      const json = await res.json() as { teams: { title: string }[] };
      expect(json.teams).toHaveLength(1);
      expect(json.teams[0].title).toBe("队伍A");
    });

    it("列表查询不会批量更新已过期队伍状态", async () => {
      const pastStart = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const team = await seedTeam(testDb, leader.id, location.id, {
        title: "已过期但未归档队伍",
        startTime: pastStart,
        endTime: new Date(pastStart.getTime() + 60 * 60 * 1000),
        status: "recruiting",
      });

      const res = await req(app, "/teams");
      expect(res.status).toBe(200);

      const [afterList] = await testDb.select().from(schema.teams).where(eq(schema.teams.id, team.id));
      expect(afterList.status).toBe("recruiting");
    });

    it("公共列表响应带 CDN 缓存头", async () => {
      await seedTeam(testDb, leader.id, location.id, { title: "队伍A" });

      const res = await req(app, "/teams?page=1&pageSize=12");

      expect(res.status).toBe(200);
      expect(res.headers.get("Cache-Control")).toContain("s-maxage=300");
      expect(res.headers.get("Cache-Control")).toContain("stale-while-revalidate=600");
    });
  });

  // ===== POST /teams - 创建队伍 =====
  describe("POST /teams - 创建队伍", () => {
    it("未登录用户创建队伍返回 401", async () => {
      setSession(null);
      const res = await req(app, "/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationId: location.id, title: "测试队伍", date: "2026-06-01", time: "08:00", maxMembers: 5 }),
      });
      expect(res.status).toBe(401);
    });

    it("已登录但未填写微信号的用户创建队伍返回 400", async () => {
      const noWechatUser = await seedUser(testDb, { name: "无微信用户", wechat: undefined });
      setSession({ id: noWechatUser.id, email: noWechatUser.email, name: noWechatUser.name });

      const res = await req(app, "/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationId: location.id, title: "测试队伍", date: "2026-06-01", time: "08:00", maxMembers: 5 }),
      });
      expect(res.status).toBe(400);
      const json = await res.json() as { error: { message: string } };
      expect(json.error.message).toContain("微信号");
    });

    it("已登录且有微信号的用户成功创建队伍返回 200", async () => {
      setSession({ id: leader.id, email: leader.email, name: leader.name });

      const res = await req(app, "/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationId: location.id,
          title: "测试徒步队伍",
          date: "2026-06-01",
          time: "08:00",
          maxMembers: 5,
        }),
      });
      expect(res.status).toBe(200);
      const json = await res.json() as { success: boolean; team: { title: string } };
      expect(json.success).toBe(true);
      expect(json.team.title).toBe("测试徒步队伍");
    });

    it("缺少必填字段返回 400", async () => {
      setSession({ id: leader.id, email: leader.email, name: leader.name });

      const res = await req(app, "/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationId: location.id }),
      });
      expect(res.status).toBe(400);
    });
  });

  // ===== GET /teams/:id - 获取队伍详情 =====
  describe("GET /teams/:id - 获取队伍详情", () => {
    it("获取存在的队伍详情返回 200", async () => {
      const team = await seedTeam(testDb, leader.id, location.id);

      const res = await req(app, `/teams/${team.id}`);
      expect(res.status).toBe(200);
      const json = await res.json() as { team: { id: string } };
      expect(json.team.id).toBe(team.id);
    });

    it("requirements 为非 JSON 字符串时不应 500，返回 []", async () => {
      // 直接插入脏数据模拟旧数据
      const id = `team-${Date.now()}`;
      const futureTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await testDb.insert(schema.teams).values({
        id,
        locationId: location.id,
        leaderId: leader.id,
        title: "脏数据测试队伍",
        startTime: futureTime,
        endTime: new Date(futureTime.getTime() + 4 * 60 * 60 * 1000),
        durationMin: 240,
        maxMembers: 5,
        icon: "⛰️",
        status: "recruiting",
        requirements: "无特殊要求", // 非 JSON 字符串
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await req(app, `/teams/${id}`);
      expect(res.status).toBe(200);
      const json = await res.json() as { team: { id: string; requirements: unknown[] } };
      expect(json.team.id).toBe(id);
      expect(json.team.requirements).toEqual([]);
    });

    it("详情查询仅刷新当前过期队伍状态", async () => {
      const pastEnd = new Date(Date.now() - 60 * 60 * 1000);
      const team = await seedTeam(testDb, leader.id, location.id, {
        status: "recruiting",
        startTime: new Date(pastEnd.getTime() - 4 * 60 * 60 * 1000),
        endTime: pastEnd,
      });

      const res = await req(app, `/teams/${team.id}`);
      expect(res.status).toBe(200);

      const [afterDetail] = await testDb.select().from(schema.teams).where(eq(schema.teams.id, team.id));
      expect(afterDetail.status).toBe("cancelled");
    });

    it("获取不存在的队伍返回 404", async () => {
      const res = await req(app, "/teams/nonexistent-id");
      expect(res.status).toBe(404);
    });

    // task #165 CR B1：spec §3.1 隐私红线 —— 访客拿不到 checklist
    // server 端必须按身份判定，非成员时剥掉 checklist 字段
    describe("checklist 隐私隔离（task #165 CR B1）", () => {
      const SECRET_CHECKLIST = {
        meetingPoint: { name: "深山老林集合点", time: "05:30" },
        gear: { essential: ["登山鞋", "急救包"], optional: [] as string[] },
        assignments: [{ id: "a1", task: "带路", assigneeIds: ["u-member"] }],
        notes: "队内暗号",
      };

      it("leader → response.checklist 有完整数据", async () => {
        const team = await seedTeam(testDb, leader.id, location.id);
        await testDb
          .update(schema.teams)
          .set({ checklist: SECRET_CHECKLIST })
          .where(eq(schema.teams.id, team.id));

        setSession({ id: leader.id, email: leader.email ?? "", name: leader.name });
        const res = await req(app, `/teams/${team.id}`);
        expect(res.status).toBe(200);
        const json = (await res.json()) as { team: { checklist: typeof SECRET_CHECKLIST } };
        expect(json.team.checklist).toEqual(SECRET_CHECKLIST);
      });

      it("approved member → response.checklist 有完整数据", async () => {
        const team = await seedTeam(testDb, leader.id, location.id);
        await seedTeamMember(testDb, team.id, member.id, "approved");
        await testDb
          .update(schema.teams)
          .set({ checklist: SECRET_CHECKLIST })
          .where(eq(schema.teams.id, team.id));

        setSession({ id: member.id, email: member.email ?? "", name: member.name });
        const res = await req(app, `/teams/${team.id}`);
        expect(res.status).toBe(200);
        const json = (await res.json()) as { team: { checklist: typeof SECRET_CHECKLIST } };
        expect(json.team.checklist).toEqual(SECRET_CHECKLIST);
      });

      it("已登录但非成员非队长 → response.checklist 为 null（隐私剥除）", async () => {
        const team = await seedTeam(testDb, leader.id, location.id);
        await seedTeamMember(testDb, team.id, member.id, "approved");
        await testDb
          .update(schema.teams)
          .set({ checklist: SECRET_CHECKLIST })
          .where(eq(schema.teams.id, team.id));

        // 第三个用户 outsider —— 已登录但与该 team 无关
        const outsider = await seedUser(testDb, { name: "路人甲" });
        setSession({ id: outsider.id, email: outsider.email ?? "", name: outsider.name });
        const res = await req(app, `/teams/${team.id}`);
        expect(res.status).toBe(200);
        const json = (await res.json()) as { team: { checklist: unknown } };
        expect(json.team.checklist).toBeNull();
      });

      it("未登录用户 → response.checklist 为 null（隐私剥除）", async () => {
        const team = await seedTeam(testDb, leader.id, location.id);
        await testDb
          .update(schema.teams)
          .set({ checklist: SECRET_CHECKLIST })
          .where(eq(schema.teams.id, team.id));

        setSession(null);
        const res = await req(app, `/teams/${team.id}`);
        expect(res.status).toBe(200);
        const json = (await res.json()) as { team: { checklist: unknown } };
        expect(json.team.checklist).toBeNull();
      });
    });
  });

  // ===== POST /teams/:id/join - 申请加入 =====
  describe("POST /teams/:id/join - 申请加入队伍", () => {
    it("未登录用户申请加入返回 401", async () => {
      const team = await seedTeam(testDb, leader.id, location.id);
      setSession(null);

      const res = await req(app, `/teams/${team.id}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(401);
    });

    it("有微信号的用户成功申请加入，状态为 pending", async () => {
      const team = await seedTeam(testDb, leader.id, location.id, { maxMembers: 5 });
      setSession({ id: member.id, email: member.email, name: member.name });

      const res = await req(app, `/teams/${team.id}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(200);

      const [membership] = await testDb.select().from(schema.teamMembers)
        .where(and(eq(schema.teamMembers.teamId, team.id), eq(schema.teamMembers.userId, member.id)));
      expect(membership.status).toBe("pending");
    });

    it("重复申请（已有 pending 申请）返回 400 错误消息", async () => {
      const team = await seedTeam(testDb, leader.id, location.id);
      await seedTeamMember(testDb, team.id, member.id, "pending");
      setSession({ id: member.id, email: member.email, name: member.name });

      const res = await req(app, `/teams/${team.id}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      // 路由返回 400 并带有错误消息
      expect(res.status).toBe(400);
      const json = await res.json() as { error?: { message: string } };
      expect(json.error?.message).toContain("已经提交了申请");
    });

    it("被拒绝的用户重新申请成功，状态重置为 pending", async () => {
      const team = await seedTeam(testDb, leader.id, location.id);
      await seedTeamMember(testDb, team.id, member.id, "rejected");
      setSession({ id: member.id, email: member.email, name: member.name });

      const res = await req(app, `/teams/${team.id}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(200);
      const json = await res.json() as { success: boolean };
      expect(json.success).toBe(true);

      const [membership] = await testDb.select().from(schema.teamMembers)
        .where(and(eq(schema.teamMembers.teamId, team.id), eq(schema.teamMembers.userId, member.id)));
      expect(membership.status).toBe("pending");
    });
  });

  // ===== POST /teams/:id/members/:userId/approve - 批准申请 =====
  describe("POST /teams/:id/members/:userId/approve - 批准申请", () => {
    it("队长批准申请成功", async () => {
      const team = await seedTeam(testDb, leader.id, location.id, { maxMembers: 5 });
      await seedTeamMember(testDb, team.id, leader.id, "approved");
      await seedTeamMember(testDb, team.id, member.id, "pending");
      setSession({ id: leader.id, email: leader.email, name: leader.name });

      const res = await req(app, `/teams/${team.id}/members/${member.id}/approve`, {
        method: "POST",
      });
      expect(res.status).toBe(200);

      const [membership] = await testDb.select().from(schema.teamMembers)
        .where(and(eq(schema.teamMembers.teamId, team.id), eq(schema.teamMembers.userId, member.id)));
      expect(membership.status).toBe("approved");
    });

    it("task #186：批准申请后异步通知申请人（sendApplicationApprovedEmail 被调用，payload 正确）", async () => {
      const team = await seedTeam(testDb, leader.id, location.id, { maxMembers: 5 });
      await seedTeamMember(testDb, team.id, leader.id, "approved");
      await seedTeamMember(testDb, team.id, member.id, "pending");
      setSession({ id: leader.id, email: leader.email, name: leader.name });

      const res = await req(app, `/teams/${team.id}/members/${member.id}/approve`, {
        method: "POST",
      });
      expect(res.status).toBe(200);

      // 通知走 waitUntil 异步触发，waitFor 等 floating promise 落地
      await vi.waitFor(() => expect(mockSendApplicationApproved).toHaveBeenCalledTimes(1));
      const payload = mockSendApplicationApproved.mock.calls[0]![0] as Record<string, unknown>;
      expect(payload).toMatchObject({
        applicantEmail: member.email,
        applicantName: member.name,
        teamTitle: team.title,
        locationName: location.name,
        teamUrl: expect.stringContaining(`/teams/${team.id}`),
      });
    });

    it("task #186：邮件发送失败不影响审批结果（通知 .catch 兜底）", async () => {
      mockSendApplicationApproved.mockRejectedValueOnce(new Error("Resend down"));
      const team = await seedTeam(testDb, leader.id, location.id, { maxMembers: 5 });
      await seedTeamMember(testDb, team.id, leader.id, "approved");
      await seedTeamMember(testDb, team.id, member.id, "pending");
      setSession({ id: leader.id, email: leader.email, name: leader.name });

      const res = await req(app, `/teams/${team.id}/members/${member.id}/approve`, {
        method: "POST",
      });
      expect(res.status).toBe(200);

      const [membership] = await testDb.select().from(schema.teamMembers)
        .where(and(eq(schema.teamMembers.teamId, team.id), eq(schema.teamMembers.userId, member.id)));
      expect(membership.status).toBe("approved");
    });

    it("非队长批准申请返回 403", async () => {
      const team = await seedTeam(testDb, leader.id, location.id);
      await seedTeamMember(testDb, team.id, member.id, "pending");
      const otherUser = await seedUser(testDb, { name: "其他用户", wechat: "other_wechat" });
      setSession({ id: otherUser.id, email: otherUser.email, name: otherUser.name });

      const res = await req(app, `/teams/${team.id}/members/${member.id}/approve`, {
        method: "POST",
      });
      expect(res.status).toBe(403);
    });

    it("批准后队伍满员自动变为 full 状态", async () => {
      // maxMembers=2，队长已是成员，再批准一人就满了
      const team = await seedTeam(testDb, leader.id, location.id, { maxMembers: 2 });
      await seedTeamMember(testDb, team.id, leader.id, "approved");
      await seedTeamMember(testDb, team.id, member.id, "pending");
      setSession({ id: leader.id, email: leader.email, name: leader.name });

      const res = await req(app, `/teams/${team.id}/members/${member.id}/approve`, {
        method: "POST",
      });
      expect(res.status).toBe(200);

      const [updatedTeam] = await testDb.select().from(schema.teams).where(eq(schema.teams.id, team.id));
      expect(updatedTeam.status).toBe("full");
    });
  });

  // ===== POST /teams/:id/members/:userId/reject - 拒绝申请 =====
  describe("POST /teams/:id/members/:userId/reject - 拒绝申请", () => {
    it("队长拒绝申请成功，状态变为 rejected", async () => {
      const team = await seedTeam(testDb, leader.id, location.id);
      await seedTeamMember(testDb, team.id, member.id, "pending");
      setSession({ id: leader.id, email: leader.email, name: leader.name });

      const res = await req(app, `/teams/${team.id}/members/${member.id}/reject`, {
        method: "POST",
      });
      expect(res.status).toBe(200);

      const [membership] = await testDb.select().from(schema.teamMembers)
        .where(and(eq(schema.teamMembers.teamId, team.id), eq(schema.teamMembers.userId, member.id)));
      expect(membership.status).toBe("rejected");
    });
  });

  // ===== POST /teams/:id/leave - 退出队伍 =====
  describe("POST /teams/:id/leave - 退出队伍", () => {
    it("普通成员成功退出 recruiting 队伍", async () => {
      const team = await seedTeam(testDb, leader.id, location.id, { status: "recruiting" });
      await seedTeamMember(testDb, team.id, leader.id, "approved");
      await seedTeamMember(testDb, team.id, member.id, "approved");
      setSession({ id: member.id, email: member.email, name: member.name });

      const res = await req(app, `/teams/${team.id}/leave`, { method: "POST" });
      expect(res.status).toBe(200);
      const json = await res.json() as { success: boolean };
      expect(json.success).toBe(true);
    });

    it("队长不能退出队伍返回 400", async () => {
      const team = await seedTeam(testDb, leader.id, location.id);
      await seedTeamMember(testDb, team.id, leader.id, "approved");
      setSession({ id: leader.id, email: leader.email, name: leader.name });

      const res = await req(app, `/teams/${team.id}/leave`, { method: "POST" });
      expect(res.status).toBe(400);
      const json = await res.json() as { error: { message: string } };
      expect(json.error.message).toContain("队长不能退出");
    });
  });

  // ===== POST /teams/:id/cancel-application - 取消申请 =====
  describe("POST /teams/:id/cancel-application - 取消申请", () => {
    it("成功取消待审核申请，状态变为 cancelled", async () => {
      const team = await seedTeam(testDb, leader.id, location.id);
      await seedTeamMember(testDb, team.id, member.id, "pending");
      setSession({ id: member.id, email: member.email, name: member.name });

      const res = await req(app, `/teams/${team.id}/cancel-application`, { method: "POST" });
      expect(res.status).toBe(200);

      const [membership] = await testDb.select().from(schema.teamMembers)
        .where(and(eq(schema.teamMembers.teamId, team.id), eq(schema.teamMembers.userId, member.id)));
      expect(membership.status).toBe("cancelled");
    });
  });

  // ===== POST /teams/:id/members/:userId/remove - 移除成员 =====
  describe("POST /teams/:id/members/:userId/remove - 移除成员", () => {
    it("队长成功移除成员", async () => {
      const team = await seedTeam(testDb, leader.id, location.id);
      await seedTeamMember(testDb, team.id, leader.id, "approved");
      await seedTeamMember(testDb, team.id, member.id, "approved");
      setSession({ id: leader.id, email: leader.email, name: leader.name });

      const res = await req(app, `/teams/${team.id}/members/${member.id}/remove`, { method: "POST" });
      expect(res.status).toBe(200);
    });

    it("队长不能移除自己返回 400", async () => {
      const team = await seedTeam(testDb, leader.id, location.id);
      await seedTeamMember(testDb, team.id, leader.id, "approved");
      setSession({ id: leader.id, email: leader.email, name: leader.name });

      const res = await req(app, `/teams/${team.id}/members/${leader.id}/remove`, { method: "POST" });
      expect(res.status).toBe(400);
    });

    it("非队长移除成员返回 403", async () => {
      const team = await seedTeam(testDb, leader.id, location.id);
      await seedTeamMember(testDb, team.id, leader.id, "approved");
      await seedTeamMember(testDb, team.id, member.id, "approved");
      setSession({ id: member.id, email: member.email, name: member.name });

      const res = await req(app, `/teams/${team.id}/members/${leader.id}/remove`, { method: "POST" });
      expect(res.status).toBe(403);
    });
  });

  // ===== POST /teams/:id/form - 组建队伍 =====
  describe("POST /teams/:id/form - 组建队伍", () => {
    it("队长成功组建有成员的队伍", async () => {
      const team = await seedTeam(testDb, leader.id, location.id, { status: "recruiting" });
      await seedTeamMember(testDb, team.id, leader.id, "approved");
      await seedTeamMember(testDb, team.id, member.id, "approved");
      setSession({ id: leader.id, email: leader.email, name: leader.name });

      const res = await req(app, `/teams/${team.id}/form`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(200);

      const [updatedTeam] = await testDb.select().from(schema.teams).where(eq(schema.teams.id, team.id));
      expect(updatedTeam.status).toBe("formed");
    });

    it("只有队长自己时（approvedCount=1）也可以组建", async () => {
      const team = await seedTeam(testDb, leader.id, location.id, { status: "recruiting" });
      await seedTeamMember(testDb, team.id, leader.id, "approved");
      setSession({ id: leader.id, email: leader.email, name: leader.name });

      const res = await req(app, `/teams/${team.id}/form`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(200);
    });

    it("非队长不能组建队伍返回 403", async () => {
      const team = await seedTeam(testDb, leader.id, location.id);
      await seedTeamMember(testDb, team.id, leader.id, "approved");
      await seedTeamMember(testDb, team.id, member.id, "approved");
      setSession({ id: member.id, email: member.email, name: member.name });

      const res = await req(app, `/teams/${team.id}/form`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(403);
    });
  });

  // ===== GET /teams/:id/my-status - 查询我的状态 =====
  describe("GET /teams/:id/my-status - 查询我的状态", () => {
    it("成员查询自己的 pending 状态", async () => {
      const team = await seedTeam(testDb, leader.id, location.id);
      await seedTeamMember(testDb, team.id, member.id, "pending");
      setSession({ id: member.id, email: member.email, name: member.name });

      const res = await req(app, `/teams/${team.id}/my-status`);
      expect(res.status).toBe(200);
      const json = await res.json() as { status: string };
      expect(json.status).toBe("pending");
    });

    it("未登录用户查询状态返回 null", async () => {
      const team = await seedTeam(testDb, leader.id, location.id);
      setSession(null);

      const res = await req(app, `/teams/${team.id}/my-status`);
      expect(res.status).toBe(200);
      const json = await res.json() as { status: string | null };
      // 路由未登录时返回 { success: true, status: null }
      expect(json.status).toBeNull();
    });
  });

  describe("task #152 切源：teams 难度筛选读 location 字段", () => {
    it("?difficulty= 按 location.difficulty 过滤", async () => {
      const locModerate = await seedLocation(testDb, city.id, { name: "适中山", difficulty: "moderate" });
      const locEasy = await seedLocation(testDb, city.id, { name: "轻松山", difficulty: "easy" });
      await seedTeam(testDb, leader.id, locModerate.id, { title: "适中队" });
      await seedTeam(testDb, leader.id, locEasy.id, { title: "轻松队" });

      const res = await req(app, "/teams?difficulty=moderate");
      expect(res.status).toBe(200);
      const json = await res.json() as { teams: { title: string }[] };
      expect(json.teams).toHaveLength(1);
      expect(json.teams[0].title).toBe("适中队");
    });

    it("队伍详情 location 携带徒步参数字段", async () => {
      const loc = await seedLocation(testDb, city.id, {
        name: "参数山", difficulty: "hard", durationMin: 300, durationMax: 420,
        distance: 8.5, elevation: 1200,
      });
      const team = await seedTeam(testDb, leader.id, loc.id, { title: "参数队" });

      const res = await req(app, `/teams/${team.id}`);
      expect(res.status).toBe(200);
      const json = await res.json() as {
        team: {
          location: {
            name: string; difficulty: string; durationMin: number;
            durationMax: number; distance: number; elevation: number;
          };
        };
      };
      expect(json.team.location.difficulty).toBe("hard");
      expect(json.team.location.durationMin).toBe(300);
      expect(json.team.location.durationMax).toBe(420);
      expect(json.team.location.distance).toBe(8.5);
      expect(json.team.location.elevation).toBe(1200);
    });
  });
});
