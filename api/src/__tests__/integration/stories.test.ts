import { describe, it, expect, beforeEach, vi } from "vitest";
import { Hono } from "hono";
import { and, eq } from "drizzle-orm";
import { createTestDb } from "../helpers/db";
import { seedUser, seedStory, seedTag, seedEntityTag, seedCity, seedLocation } from "../helpers/seed";
import * as schema from "../../db/schema";

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

    it("故事不存在返回 404", async () => {
      const res = await req(app, "/stories/non-existent-id");
      expect(res.status).toBe(404);
      const json = await res.json() as { success: boolean; error: { message: string } };
      expect(json.success).toBe(false);
      expect(json.error.message).toBe("故事不存在");
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
});
