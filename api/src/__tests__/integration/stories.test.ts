import { describe, it, expect, beforeEach, vi } from "vitest";
import { Hono } from "hono";
import { and, eq } from "drizzle-orm";
import { createTestDb } from "../helpers/db";
import { seedUser, seedStory, seedTag, seedEntityTag, seedCity, seedLocation } from "../helpers/seed";
import * as schema from "../../db/schema";

let currentSession: { user: { id: string; email: string; name: string; role?: string } } | null = null;
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

const { default: storiesRoute } = await import("../../routes/stories");

function createApp() {
  const app = new Hono<{ Bindings: { DB: unknown } }>();
  app.route("/stories", storiesRoute);
  return app;
}

async function req(app: ReturnType<typeof createApp>, path: string, options: RequestInit = {}) {
  return app.fetch(new Request(`http://localhost${path}`, options), { DB: {} });
}

describe("Stories API 集成测试", () => {
  let app: ReturnType<typeof createApp>;
  let user: schema.User;
  let location: schema.Location;

  beforeEach(async () => {
    const fresh = createTestDb();
    testDb = fresh.db;
    app = createApp();
    currentSession = null;

    user = await seedUser(testDb, { name: "测试用户", email: "test@example.com" });
    const city = await seedCity(testDb);
    location = await seedLocation(testDb, city.id, { name: "测试地点" });
  });

  describe("GET /stories - 故事列表", () => {
    it("获取故事列表返回分页数据", async () => {
      await seedStory(testDb, user.id, { title: "故事1", status: "published" });
      await seedStory(testDb, user.id, { title: "故事2", status: "published" });

      const res = await req(app, "/stories");
      expect(res.status).toBe(200);
      const json = await res.json() as { success: boolean; data: unknown[]; pagination: unknown };
      expect(json.success).toBe(true);
      expect(json.data).toHaveLength(2);
      expect(json.pagination).toBeDefined();
    });

    it("支持分页参数 page 和 limit", async () => {
      for (let i = 0; i < 5; i++) {
        await seedStory(testDb, user.id, { title: `故事${i}`, status: "published" });
      }

      const res = await req(app, "/stories?page=1&limit=2");
      expect(res.status).toBe(200);
      const json = await res.json() as { success: boolean; data: unknown[]; pagination: { hasMore: boolean; total: number } };
      expect(json.data).toHaveLength(2);
      expect(json.pagination.hasMore).toBe(true);
      expect(json.pagination.total).toBe(5);
    });

    it("?tag=xxx 只返回对应标签的故事", async () => {
      // 创建标签
      const tag = await seedTag(testDb, { name: "溯溪", type: "activity" });

      // 创建故事
      const story1 = await seedStory(testDb, user.id, { title: "溯溪故事", status: "published" });
      const _story2 = await seedStory(testDb, user.id, { title: "其他故事", status: "published" });

      // 关联标签
      await seedEntityTag(testDb, story1.id, "story", tag.id);

      const res = await req(app, "/stories?tag=溯溪");
      expect(res.status).toBe(200);
      const json = await res.json() as { success: boolean; data: { title: string }[] };
      expect(json.success).toBe(true);
      expect(json.data).toHaveLength(1);
      expect(json.data[0].title).toBe("溯溪故事");
    });

    it("?tag=不存在的标签 返回空数组", async () => {
      const res = await req(app, "/stories?tag=不存在的标签");
      expect(res.status).toBe(200);
      const json = await res.json() as { success: boolean; data: unknown[]; pagination: { total: number } };
      expect(json.success).toBe(true);
      expect(json.data).toHaveLength(0);
      expect(json.pagination.total).toBe(0);
    });

    it("标签筛选下分页参数正确", async () => {
      const tag = await seedTag(testDb, { name: "徒步", type: "activity" });

      // 创建多个带标签的故事
      for (let i = 0; i < 5; i++) {
        const story = await seedStory(testDb, user.id, { title: `徒步故事${i}`, status: "published" });
        await seedEntityTag(testDb, story.id, "story", tag.id);
      }

      // 创建一个不带标签的故事
      await seedStory(testDb, user.id, { title: "其他故事", status: "published" });

      const res = await req(app, "/stories?tag=徒步&page=1&limit=2");
      expect(res.status).toBe(200);
      const json = await res.json() as { success: boolean; data: unknown[]; pagination: { hasMore: boolean; total: number } };
      expect(json.data).toHaveLength(2);
      expect(json.pagination.hasMore).toBe(true);
      expect(json.pagination.total).toBe(5);
    });

    it("无 tag 参数时返回所有已发布故事", async () => {
      await seedStory(testDb, user.id, { title: "故事1", status: "published" });
      await seedStory(testDb, user.id, { title: "故事2", status: "published" });
      await seedStory(testDb, user.id, { title: "草稿", status: "draft" });

      const res = await req(app, "/stories");
      expect(res.status).toBe(200);
      const json = await res.json() as { success: boolean; data: unknown[] };
      expect(json.data).toHaveLength(2); // 只返回 published
    });

    it("标签筛选下 Load More 保持筛选状态", async () => {
      const tag = await seedTag(testDb, { name: "露营", type: "activity" });

      // 创建3个带标签的故事（刚好2页）
      for (let i = 0; i < 3; i++) {
        const story = await seedStory(testDb, user.id, { title: `露营故事${i}`, status: "published" });
        await seedEntityTag(testDb, story.id, "story", tag.id);
      }

      // 第一页
      const res1 = await req(app, "/stories?tag=露营&page=1&limit=2");
      const json1 = await res1.json() as { data: unknown[]; pagination: { hasMore: boolean } };
      expect(json1.data).toHaveLength(2);
      expect(json1.pagination.hasMore).toBe(true);

      // 第二页
      const res2 = await req(app, "/stories?tag=露营&page=2&limit=2");
      const json2 = await res2.json() as { data: unknown[]; pagination: { hasMore: boolean } };
      expect(json2.data).toHaveLength(1);
      expect(json2.pagination.hasMore).toBe(false);
    });

    it("?status=draft 未登录返回空数组，不泄露草稿（task #156）", async () => {
      await seedStory(testDb, user.id, { title: "草稿", status: "draft" });

      const res = await req(app, "/stories?status=draft");
      expect(res.status).toBe(200);
      const json = await res.json() as { data: unknown[] };
      expect(json.data).toHaveLength(0);
    });

    it("?status=draft 登录只返回自己的草稿（task #156）", async () => {
      const other = await seedUser(testDb, { name: "其他用户", email: "other@example.com" });
      await seedStory(testDb, user.id, { title: "我的草稿", status: "draft" });
      await seedStory(testDb, other.id, { title: "别人的草稿", status: "draft" });
      currentSession = { user: { id: user.id, email: user.email, name: user.name } };

      const res = await req(app, "/stories?status=draft");
      const json = await res.json() as { data: { title: string }[] };
      expect(json.data.map((s) => s.title)).toEqual(["我的草稿"]);
    });

    it("?status=hidden 按 published 处理，不泄露已删故事（task #156）", async () => {
      await seedStory(testDb, user.id, { title: "公开故事", status: "published" });
      await seedStory(testDb, user.id, { title: "已删故事", status: "hidden" });

      const res = await req(app, "/stories?status=hidden");
      const json = await res.json() as { data: { title: string }[] };
      expect(json.data.map((s) => s.title)).toEqual(["公开故事"]);
    });

    it("?status=draft&tag= 组合过滤不丢条件（task #156 回归）", async () => {
      const tag = await seedTag(testDb, { name: "徒步", type: "activity" });
      const myDraft = await seedStory(testDb, user.id, { title: "带标签草稿", status: "draft" });
      await seedEntityTag(testDb, myDraft.id, "story", tag.id);
      await seedStory(testDb, user.id, { title: "无标签草稿", status: "draft" });
      currentSession = { user: { id: user.id, email: user.email, name: user.name } };

      const res = await req(app, "/stories?status=draft&tag=徒步");
      const json = await res.json() as { data: { title: string }[] };
      expect(json.data.map((s) => s.title)).toEqual(["带标签草稿"]);
    });
  });

  describe("GET /stories/:id - 故事详情", () => {
    it("获取故事详情成功", async () => {
      const story = await seedStory(testDb, user.id, { title: "测试故事", status: "published" });

      const res = await req(app, `/stories/${story.id}`);
      expect(res.status).toBe(200);
      const json = await res.json() as { success: boolean; data: { title: string } };
      expect(json.success).toBe(true);
      expect(json.data.title).toBe("测试故事");
    });

    it("并发查看公开故事不会丢失浏览计数", async () => {
      const story = await seedStory(testDb, user.id, { title: "浏览计数", status: "published" });

      const responses = await Promise.all(
        Array.from({ length: 5 }, () => req(app, `/stories/${story.id}`)),
      );
      responses.forEach((response) => expect(response.status).toBe(200));

      const persisted = await testDb.query.stories.findFirst({
        where: eq(schema.stories.id, story.id),
        columns: { viewCount: true },
      });
      expect(persisted?.viewCount).toBe(5);
    });

    it("故事不存在返回 404", async () => {
      const res = await req(app, "/stories/non-existent-id");
      expect(res.status).toBe(404);
      const json = await res.json() as { success: boolean; error: { message: string } };
      expect(json.success).toBe(false);
      expect(json.error.message).toBe("故事不存在");
    });

    it("hidden 故事详情返回 404", async () => {
      const story = await seedStory(testDb, user.id, { title: "已删除故事", status: "hidden" });

      const res = await req(app, `/stories/${story.id}`);

      expect(res.status).toBe(404);
    });

    it("详情返回 tags 关联，编辑表单可回显（task #155 回归用例）", async () => {
      const tagA = await seedTag(testDb, { name: "徒步", type: "activity" });
      const tagB = await seedTag(testDb, { name: "露营", type: "activity" });
      const story = await seedStory(testDb, user.id, { title: "带标签故事", status: "published" });
      await seedEntityTag(testDb, story.id, "story", tagA.id);
      await seedEntityTag(testDb, story.id, "story", tagB.id);

      const res = await req(app, `/stories/${story.id}`);

      expect(res.status).toBe(200);
      const json = await res.json() as { success: boolean; data: { tags: { id: string; name: string }[] } };
      expect(json.data.tags.map((t) => t.name).sort()).toEqual(["徒步", "露营"]);
    });

    it("无标签故事详情 tags 返回空数组", async () => {
      const story = await seedStory(testDb, user.id, { title: "无标签故事", status: "published" });

      const res = await req(app, `/stories/${story.id}`);

      expect(res.status).toBe(200);
      const json = await res.json() as { success: boolean; data: { tags: unknown[] } };
      expect(json.data.tags).toEqual([]);
    });

    it("draft 故事作者本人可查看且不计浏览（task #156）", async () => {
      const story = await seedStory(testDb, user.id, { title: "我的草稿", status: "draft" });
      currentSession = { user: { id: user.id, email: user.email, name: user.name } };

      const res = await req(app, `/stories/${story.id}`);

      expect(res.status).toBe(200);
      const json = await res.json() as { success: boolean; data: { status: string; viewCount: number; title: string } };
      expect(json.data.status).toBe("draft");
      expect(json.data.title).toBe("我的草稿");
      expect(json.data.viewCount).toBe(0);
    });

    it("draft 故事未登录返回 404，不泄露存在性（task #156）", async () => {
      const story = await seedStory(testDb, user.id, { title: "私密草稿", status: "draft" });

      const res = await req(app, `/stories/${story.id}`);

      expect(res.status).toBe(404);
    });

    it("draft 故事非作者登录同样 404（task #156）", async () => {
      const other = await seedUser(testDb, { name: "其他用户", email: "other@example.com" });
      const story = await seedStory(testDb, user.id, { title: "私密草稿", status: "draft" });
      currentSession = { user: { id: other.id, email: other.email, name: other.name } };

      const res = await req(app, `/stories/${story.id}`);

      expect(res.status).toBe(404);
    });

    it("draft 故事管理员可查看（task #156）", async () => {
      const story = await seedStory(testDb, user.id, { title: "待审草稿", status: "draft" });
      currentSession = { user: { id: "admin-id", email: "admin@example.com", name: "管理员", role: "admin" } };

      const res = await req(app, `/stories/${story.id}`);

      expect(res.status).toBe(200);
    });

    it("hidden 故事作者本人也返回 404（task #156）", async () => {
      const story = await seedStory(testDb, user.id, { title: "已删故事", status: "hidden" });
      currentSession = { user: { id: user.id, email: user.email, name: user.name } };

      const res = await req(app, `/stories/${story.id}`);

      expect(res.status).toBe(404);
    });
  });

  describe("GET /stories/stats - 故事统计", () => {
    it("获取统计数据成功", async () => {
      await seedStory(testDb, user.id, { title: "故事1", status: "published" });

      const res = await req(app, "/stories/stats");
      expect(res.status).toBe(200);
      const json = await res.json() as { success: boolean; data: { weeklyNewStories: number } };
      expect(json.success).toBe(true);
      expect(typeof json.data.weeklyNewStories).toBe("number");
    });
  });

  describe("GET /stories/tags - 故事标签", () => {
    it("不统计 hidden 故事的标签", async () => {
      const tag = await seedTag(testDb, { name: "已删除标签", type: "activity" });
      const hiddenStory = await seedStory(testDb, user.id, { title: "已隐藏故事", status: "hidden" });
      await seedEntityTag(testDb, hiddenStory.id, "story", tag.id);

      const res = await req(app, "/stories/tags");

      expect(res.status).toBe(200);
      const json = await res.json() as { tags: { name: string }[] };
      expect(json.tags.some((item) => item.name === "已删除标签")).toBe(false);
    });
  });

  describe("POST /stories - 创建故事", () => {
    it("未登录创建故事 → 401", async () => {
      const res = await req(app, "/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "一次海岸线徒步",
          summary: "记录一次轻量海岸线徒步。",
          content: "天气很好，路线也适合新手。",
          coverImage: "https://example.com/story.jpg",
          locationId: location.id,
        }),
      });

      expect(res.status).toBe(401);
    });

    it("登录用户创建合法故事后写入 stories 并返回 id", async () => {
      currentSession = { user: { id: user.id, email: user.email, name: user.name } };

      const res = await req(app, "/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "  一次海岸线徒步  ",
          summary: "  记录一次轻量海岸线徒步。  ",
          content: "  天气很好，路线也适合新手。  ",
          coverImage: "https://example.com/story.jpg",
          locationId: location.id,
        }),
      });

      expect(res.status).toBe(200);
      const json = await res.json() as { success: boolean; data: { id: string } };
      expect(json.success).toBe(true);
      expect(json.data.id).toBeTruthy();

      const story = await testDb.query.stories.findFirst({
        where: eq(schema.stories.id, json.data.id),
      });
      expect(story?.authorId).toBe(user.id);
      expect(story?.title).toBe("一次海岸线徒步");
      expect(story?.summary).toBe("记录一次轻量海岸线徒步。");
      expect(story?.content).toBe("天气很好，路线也适合新手。");
      expect(story?.status).toBe("published");
    });

    it("不带 coverImage/tags 也可创建（spec §6 契约放宽）", async () => {
      currentSession = { user: { id: user.id, email: user.email, name: user.name } };

      const res = await req(app, "/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "无封面无标签故事",
          summary: "验证封面与标签改可选后的契约。",
          content: "正文内容满足必填要求。",
          locationId: location.id,
        }),
      });

      expect(res.status).toBe(200);
      const json = await res.json() as { success: boolean; data: { id: string } };
      expect(json.success).toBe(true);

      const story = await testDb.query.stories.findFirst({
        where: eq(schema.stories.id, json.data.id),
      });
      expect(story?.coverImage).toBeNull();
    });

    it("非法 coverImage（非 URL）仍返回 400", async () => {
      currentSession = { user: { id: user.id, email: user.email, name: user.name } };

      const res = await req(app, "/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "非法封面故事",
          summary: "optional 不等于不校验格式。",
          content: "正文内容满足必填要求。",
          coverImage: "not-a-url",
          locationId: location.id,
        }),
      });

      expect(res.status).toBe(400);
    });

    it("创建带标签故事后可通过标签筛选并出现在热门标签", async () => {
      currentSession = { user: { id: user.id, email: user.email, name: user.name } };

      const res = await req(app, "/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "海边露营记录",
          summary: "周末海边露营和轻徒步记录。",
          content: "从停车场到营地一路都比较平缓。",
          coverImage: "https://example.com/camping.jpg",
          locationId: location.id,
          tags: ["  露营  ", "徒步", "露营", ""],
        }),
      });

      expect(res.status).toBe(200);
      const json = await res.json() as { data: { id: string } };

      const campingTag = await testDb.query.tags.findFirst({
        where: eq(schema.tags.name, "露营"),
      });
      expect(campingTag?.type).toBe("activity");

      const tagLink = await testDb.query.entityToTags.findFirst({
        where: and(
          eq(schema.entityToTags.entityId, json.data.id),
          eq(schema.entityToTags.entityType, "story"),
          eq(schema.entityToTags.tagId, campingTag!.id)
        ),
      });
      expect(tagLink).toBeDefined();

      const filteredRes = await req(app, "/stories?tag=露营");
      const filteredJson = await filteredRes.json() as { data: { id: string; title: string }[] };
      expect(filteredJson.data).toHaveLength(1);
      expect(filteredJson.data[0].id).toBe(json.data.id);

      const tagsRes = await req(app, "/stories/tags");
      const tagsJson = await tagsRes.json() as { tags: { name: string; count: number }[] };
      expect(tagsJson.tags.some((tag) => tag.name === "露营" && Number(tag.count) >= 1)).toBe(true);
    });
  });

  describe("PUT /stories/:id - 更新故事", () => {
    it("带 tags 更新成功并替换标签关联（task #147 回归用例）", async () => {
      currentSession = { user: { id: user.id, email: user.email, name: user.name } };
      const story = await seedStory(testDb, user.id, { title: "原标题" });
      const oldTag = await seedTag(testDb, { name: "旧标签", type: "activity" });
      await seedEntityTag(testDb, story.id, "story", oldTag.id);

      const res = await req(app, `/stories/${story.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "新标题", tags: ["新标签", "旧标签"] }),
      });

      expect(res.status).toBe(200);

      const updated = await testDb.query.stories.findFirst({
        where: eq(schema.stories.id, story.id),
      });
      expect(updated?.title).toBe("新标题");

      // 旧关联被替换：新标签 + 旧标签各一条，无残留重复
      const links = await testDb.query.entityToTags.findMany({
        where: and(
          eq(schema.entityToTags.entityId, story.id),
          eq(schema.entityToTags.entityType, "story")
        ),
      });
      expect(links).toHaveLength(2);

      const newTag = await testDb.query.tags.findFirst({
        where: eq(schema.tags.name, "新标签"),
      });
      expect(newTag).toBeDefined();
    });

    it("tags 传空数组清除全部标签关联（task #147 回归用例）", async () => {
      currentSession = { user: { id: user.id, email: user.email, name: user.name } };
      const story = await seedStory(testDb, user.id, { title: "带标签故事" });
      const tag = await seedTag(testDb, { name: "待清除", type: "activity" });
      await seedEntityTag(testDb, story.id, "story", tag.id);

      const res = await req(app, `/stories/${story.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "带标签故事", tags: [] }),
      });

      expect(res.status).toBe(200);

      const links = await testDb.query.entityToTags.findMany({
        where: and(
          eq(schema.entityToTags.entityId, story.id),
          eq(schema.entityToTags.entityType, "story")
        ),
      });
      expect(links).toHaveLength(0);
    });

    it("不传 tags 字段只更新正文，标签关联保持不变", async () => {
      currentSession = { user: { id: user.id, email: user.email, name: user.name } };
      const story = await seedStory(testDb, user.id, { title: "保留标签故事" });
      const tag = await seedTag(testDb, { name: "保留", type: "activity" });
      await seedEntityTag(testDb, story.id, "story", tag.id);

      const res = await req(app, `/stories/${story.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "保留标签故事（改）" }),
      });

      expect(res.status).toBe(200);

      const links = await testDb.query.entityToTags.findMany({
        where: and(
          eq(schema.entityToTags.entityId, story.id),
          eq(schema.entityToTags.entityType, "story")
        ),
      });
      expect(links).toHaveLength(1);
    });
  });

  describe("POST /stories/:id/like - 点赞 toggle", () => {
    it("未登录点赞 → 401", async () => {
      const story = await seedStory(testDb, user.id, { title: "测试故事", status: "published" });

      const res = await req(app, `/stories/${story.id}/like`, { method: "POST" });

      expect(res.status).toBe(401);
    });

    it("点赞不存在的故事 → 404", async () => {
      currentSession = { user: { id: user.id, email: user.email, name: user.name } };

      const res = await req(app, "/stories/non-existent-id/like", { method: "POST" });

      expect(res.status).toBe(404);
    });

    it("首次点赞 → liked=true, likeCount=1", async () => {
      currentSession = { user: { id: user.id, email: user.email, name: user.name } };
      const story = await seedStory(testDb, user.id, { title: "测试故事", status: "published" });

      const res = await req(app, `/stories/${story.id}/like`, { method: "POST" });

      expect(res.status).toBe(200);
      const json = await res.json() as { success: boolean; liked: boolean; likeCount: number };
      expect(json.success).toBe(true);
      expect(json.liked).toBe(true);
      expect(json.likeCount).toBe(1);

      const dbStory = await testDb.query.stories.findFirst({
        where: eq(schema.stories.id, story.id),
      });
      expect(dbStory?.likeCount).toBe(1);
    });

    it("再次点赞（取消） → liked=false, likeCount=0", async () => {
      currentSession = { user: { id: user.id, email: user.email, name: user.name } };
      const story = await seedStory(testDb, user.id, { title: "测试故事", status: "published" });

      // 第一次点赞
      await req(app, `/stories/${story.id}/like`, { method: "POST" });

      // 第二次点赞 → 取消
      const res = await req(app, `/stories/${story.id}/like`, { method: "POST" });

      expect(res.status).toBe(200);
      const json = await res.json() as { success: boolean; liked: boolean; likeCount: number };
      expect(json.success).toBe(true);
      expect(json.liked).toBe(false);
      expect(json.likeCount).toBe(0);

      const dbStory = await testDb.query.stories.findFirst({
        where: eq(schema.stories.id, story.id),
      });
      expect(dbStory?.likeCount).toBe(0);
    });

    it("likeCount 不会减到负数", async () => {
      currentSession = { user: { id: user.id, email: user.email, name: user.name } };
      // 手动创建一个 likeCount=0 的故事
      const story = await seedStory(testDb, user.id, { title: "零点赞故事", status: "published", likeCount: 0 });

      // 先点赞
      await req(app, `/stories/${story.id}/like`, { method: "POST" });
      // 再取消
      await req(app, `/stories/${story.id}/like`, { method: "POST" });
      // 再次取消（异常状态：点赞记录已删除但 likeCount 已经是 0）
      // 直接操作 DB 删除 like 记录但保留 likeCount=0，然后尝试取消
      await testDb.delete(schema.userStoryLikes).where(
        and(
          eq(schema.userStoryLikes.userId, user.id),
          eq(schema.userStoryLikes.storyId, story.id),
        ),
      );
      await testDb.update(schema.stories).set({ likeCount: 0 }).where(eq(schema.stories.id, story.id));

      // 此时 likeCount=0，再插入点赞再取消，不会为负
      const res1 = await req(app, `/stories/${story.id}/like`, { method: "POST" });
      expect((await res1.json() as { likeCount: number }).likeCount).toBe(1);

      const res2 = await req(app, `/stories/${story.id}/like`, { method: "POST" });
      expect((await res2.json() as { likeCount: number }).likeCount).toBe(0);
    });

    it("多次点赞/取消后数据一致", async () => {
      currentSession = { user: { id: user.id, email: user.email, name: user.name } };
      const story = await seedStory(testDb, user.id, { title: "测试故事", status: "published" });

      // 连续 toggle 3 次
      await req(app, `/stories/${story.id}/like`, { method: "POST" }); // +1
      await req(app, `/stories/${story.id}/like`, { method: "POST" }); // -1
      const res = await req(app, `/stories/${story.id}/like`, { method: "POST" }); // +1

      const json = await res.json() as { liked: boolean; likeCount: number };
      expect(json.liked).toBe(true);
      expect(json.likeCount).toBe(1);

      const dbStory = await testDb.query.stories.findFirst({
        where: eq(schema.stories.id, story.id),
      });
      expect(dbStory?.likeCount).toBe(1);

      const likeRecord = await testDb.query.userStoryLikes.findFirst({
        where: and(
          eq(schema.userStoryLikes.userId, user.id),
          eq(schema.userStoryLikes.storyId, story.id),
        ),
      });
      expect(likeRecord).toBeDefined();
    });

    it("并发点赞：同一用户多次请求只产生一条记录", async () => {
      currentSession = { user: { id: user.id, email: user.email, name: user.name } };
      const story = await seedStory(testDb, user.id, { title: "并发测试故事", status: "published" });

      // 模拟并发：5 个请求同时发送（一个用户对同一故事）
      const results = await Promise.all(
        Array.from({ length: 5 }, () =>
          req(app, `/stories/${story.id}/like`, { method: "POST" })
        )
      );

      // 所有请求都应成功
      results.forEach((res) => expect(res.status).toBe(200));

      // 数据库中只有 1 条点赞记录（PRIMARY KEY 约束保证）
      const likeRecords = await testDb.select().from(schema.userStoryLikes).where(
        eq(schema.userStoryLikes.storyId, story.id),
      );
      expect(likeRecords.length).toBeLessThanOrEqual(1);

      // 派生计数必须与唯一点赞记录严格一致，不能接受并发漂移。
      const dbStory = await testDb.query.stories.findFirst({
        where: eq(schema.stories.id, story.id),
      });
      expect(dbStory?.likeCount).toBe(likeRecords.length);
    });
  });

  describe("DELETE /stories/:id - 删除故事", () => {
    it("管理员可以删除其他用户的故事", async () => {
      const admin = await seedUser(testDb, { role: "admin", email: "admin@example.com" });
      currentSession = { user: { id: admin.id, email: admin.email, name: admin.name, role: "admin" } };
      const story = await seedStory(testDb, user.id, { title: "他人故事", status: "published" });

      const res = await req(app, `/stories/${story.id}`, { method: "DELETE" });

      expect(res.status).toBe(200);
      const deletedStory = await testDb.query.stories.findFirst({
        where: eq(schema.stories.id, story.id),
      });
      expect(deletedStory?.status).toBe("hidden");
    });

    it("作者删除故事后软删除记录并清理 story 标签关联", async () => {
      currentSession = { user: { id: user.id, email: user.email, name: user.name, role: "user" } };
      const tag = await seedTag(testDb, { name: "待清理标签", type: "activity" });
      const story = await seedStory(testDb, user.id, { title: "准备删除的故事", status: "published" });
      await seedEntityTag(testDb, story.id, "story", tag.id);

      const res = await req(app, `/stories/${story.id}`, { method: "DELETE" });

      expect(res.status).toBe(200);
      const deletedStory = await testDb.query.stories.findFirst({
        where: eq(schema.stories.id, story.id),
      });
      expect(deletedStory?.status).toBe("hidden");

      const remainingLink = await testDb.query.entityToTags.findFirst({
        where: and(
          eq(schema.entityToTags.entityId, story.id),
          eq(schema.entityToTags.entityType, "story")
        ),
      });
      expect(remainingLink).toBeUndefined();

      const tagsRes = await req(app, "/stories/tags");
      const tagsJson = await tagsRes.json() as { tags: { name: string }[] };
      expect(tagsJson.tags.some((item) => item.name === "待清理标签")).toBe(false);

      const detailRes = await req(app, `/stories/${story.id}`);
      expect(detailRes.status).toBe(404);
    });
  });
});
