import { describe, it, expect, beforeEach, vi } from "vitest";
import { Hono } from "hono";
import { createTestDb } from "../helpers/db";
import { seedUser } from "../helpers/seed";
// ===== Mock 策略 =====
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

const { uploadRoute } = await import("../../routes/upload");

function createApp() {
  const app = new Hono<{ Bindings: { DB: unknown; R2: unknown; R2_PUBLIC_URL: string } }>();

  // 模拟 R2 存储
  const r2Store = new Map<string, ArrayBuffer>();
  const mockR2 = {
    put: async (key: string, data: ArrayBuffer) => { r2Store.set(key, data); },
    delete: async (key: string) => { r2Store.delete(key); },
    get: async (key: string) => {
      const data = r2Store.get(key);
      return data ? { arrayBuffer: async () => data } : null;
    },
  };

  app.route("/upload", uploadRoute);
  return { app, bindings: { DB: {}, R2: mockR2, R2_PUBLIC_URL: "https://test.r2.example.com" } };
}

async function req(
  app: ReturnType<typeof createApp>["app"],
  bindings: ReturnType<typeof createApp>["bindings"],
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  return app.fetch(new Request(`http://localhost${path}`, options), bindings);
}

/** 创建 FormData 请求 */
function createFormDataRequest(formData: FormData, headers: Record<string, string> = {}): RequestInit {
  return {
    method: "POST",
    body: formData,
    headers,
  };
}

/** 设置登录会话 */
function loginAs(user: { id: string; email: string; name: string }) {
  currentSession = { user };
}

function logout() {
  currentSession = null;
}

describe("上传 API 集成测试", () => {
  let app: ReturnType<typeof createApp>["app"];
  let bindings: ReturnType<typeof createApp>["bindings"];

  beforeEach(async () => {
    const fresh = createTestDb();
    testDb = fresh.db;
    const created = createApp();
    app = created.app;
    bindings = created.bindings;
    currentSession = null;
  });

  describe("POST /upload/avatar - 上传头像", () => {
    /**
     * 测试场景：未登录时上传
     * 预期结果：返回 401
     */
    it("未登录 → 401", async () => {
      // Arrange
      logout();
      const formData = new FormData();
      formData.append("file", new Blob(["test"], { type: "image/jpeg" }), "test.jpg");
      formData.append("userId", "user_1");

      // Act
      const res = await req(app, bindings, "/upload/avatar", createFormDataRequest(formData));

      // Assert
      expect(res.status).toBe(401);
    });

    /**
     * 测试场景：登录但未提供 userId
     * 预期结果：返回 400
     */
    it("未提供 userId → 400", async () => {
      // Arrange
      const user = await seedUser(testDb);
      loginAs(user);
      const formData = new FormData();
      formData.append("file", new Blob(["test"], { type: "image/jpeg" }), "test.jpg");

      // Act
      const res = await req(app, bindings, "/upload/avatar", createFormDataRequest(formData));

      // Assert
      expect(res.status).toBe(400);
    });

    /**
     * 测试场景：上传自己的头像，文件类型和大小合法
     * 预期结果：返回 200，包含 url 和 key
     */
    it("上传自己的合法头像 → 200", async () => {
      // Arrange
      const user = await seedUser(testDb);
      loginAs(user);
      const formData = new FormData();
      const imageBlob = new Blob(["fake-image-data"], { type: "image/jpeg" });
      formData.append("file", imageBlob, "avatar.jpg");
      formData.append("userId", user.id);

      // Act
      const res = await req(app, bindings, "/upload/avatar", createFormDataRequest(formData));

      // Assert
      expect(res.status).toBe(200);
      const data = await res.json() as Record<string, unknown>;
      expect(data.success).toBe(true);
      expect(data.key).toContain(`avatars/${user.id}`);
      expect(data.url).toMatch(/https?:\/\//);
    });

    /**
     * 测试场景：上传不支持的文件类型
     * 预期结果：返回 400
     */
    it("上传不支持的文件类型 → 400", async () => {
      // Arrange
      const user = await seedUser(testDb);
      loginAs(user);
      const formData = new FormData();
      formData.append("file", new Blob(["test"], { type: "application/pdf" }), "doc.pdf");
      formData.append("userId", user.id);

      // Act
      const res = await req(app, bindings, "/upload/avatar", createFormDataRequest(formData));

      // Assert
      expect(res.status).toBe(400);
    });

    /**
     * 测试场景：未提供文件
     * 预期结果：返回 400
     */
    it("未提供文件 → 400", async () => {
      // Arrange
      const user = await seedUser(testDb);
      loginAs(user);
      const formData = new FormData();
      formData.append("userId", user.id);

      // Act
      const res = await req(app, bindings, "/upload/avatar", createFormDataRequest(formData));

      // Assert
      expect(res.status).toBe(400);
    });

    /**
     * 测试场景：普通用户上传他人头像
     * 预期结果：返回 403
     */
    it("普通用户上传他人头像 → 403", async () => {
      // Arrange
      const user1 = await seedUser(testDb, { id: "user_1" });
      const user2 = await seedUser(testDb, { id: "user_2" });
      loginAs(user1);
      const formData = new FormData();
      formData.append("file", new Blob(["test"], { type: "image/png" }), "avatar.png");
      formData.append("userId", user2.id);

      // Act
      const res = await req(app, bindings, "/upload/avatar", createFormDataRequest(formData));

      // Assert
      expect(res.status).toBe(403);
    });

    /**
     * 测试场景：管理员上传他人头像
     * 预期结果：返回 200（管理员有权限）
     */
    it("管理员上传他人头像 → 200", async () => {
      // Arrange
      const admin = await seedUser(testDb, { role: "admin" });
      const otherUser = await seedUser(testDb, { id: "other_user" });
      loginAs(admin);
      const formData = new FormData();
      formData.append("file", new Blob(["test"], { type: "image/jpeg" }), "avatar.jpg");
      formData.append("userId", otherUser.id);

      // Act
      const res = await req(app, bindings, "/upload/avatar", createFormDataRequest(formData));

      // Assert
      expect(res.status).toBe(200);
      const data = await res.json() as Record<string, unknown>;
      expect(data.success).toBe(true);
    });
  });

  describe("DELETE /upload/avatar - 删除头像", () => {
    /**
     * 测试场景：未登录删除头像
     * 预期结果：返回 401
     */
    it("未登录 → 401", async () => {
      // Act
      const res = await req(app, bindings, "/upload/avatar?key=avatars/user_1-123.jpg", { method: "DELETE" });

      // Assert
      expect(res.status).toBe(401);
    });

    /**
     * 测试场景：不提供 key
     * 预期结果：返回 400
     */
    it("不提供 key → 400", async () => {
      // Arrange
      const user = await seedUser(testDb, { image: "https://test.r2.example.com/avatars/user_1-123.jpg" });
      loginAs(user);

      // Act
      const res = await req(app, bindings, "/upload/avatar", { method: "DELETE" });

      // Assert
      expect(res.status).toBe(400);
    });

    /**
     * 测试场景：删除自己的头像
     * 预期结果：返回 200
     */
    it("删除自己的头像 → 200", async () => {
      // Arrange
      const user = await seedUser(testDb, { image: "https://test.r2.example.com/avatars/user_1-123.jpg" });
      loginAs(user);

      // Act
      const res = await req(app, bindings, "/upload/avatar?key=avatars/user_1-123.jpg", { method: "DELETE" });

      // Assert
      expect(res.status).toBe(200);
      const data = await res.json() as Record<string, unknown>;
      expect(data.success).toBe(true);
    });

    /**
     * 测试场景：无权删除他人头像
     * 预期结果：返回 403
     */
    it("无权删除他人头像 → 403", async () => {
      // Arrange
      const user = await seedUser(testDb, { image: "https://test.r2.example.com/avatars/other_user-456.jpg" });
      loginAs(user);

      // Act
      const res = await req(app, bindings, "/upload/avatar?key=avatars/user_1-123.jpg", { method: "DELETE" });

      // Assert
      expect(res.status).toBe(403);
    });
  });

  describe("POST /upload/location - 上传地点图片", () => {
    /**
     * 测试场景：普通用户上传地点图片
     * 预期结果：返回 403
     */
    it("普通用户 → 403", async () => {
      // Arrange
      const user = await seedUser(testDb);
      loginAs(user);
      const formData = new FormData();
      formData.append("file", new Blob(["test"], { type: "image/jpeg" }), "location.jpg");

      // Act
      const res = await req(app, bindings, "/upload/location", createFormDataRequest(formData));

      // Assert
      expect(res.status).toBe(403);
    });

    /**
     * 测试场景：管理员上传地点图片
     * 预期结果：返回 200
     */
    it("管理员上传地点图片 → 200", async () => {
      // Arrange
      const admin = await seedUser(testDb, { role: "admin" });
      loginAs(admin);
      const formData = new FormData();
      formData.append("file", new Blob(["test"], { type: "image/png" }), "location.png");

      // Act
      const res = await req(app, bindings, "/upload/location", createFormDataRequest(formData));

      // Assert
      expect(res.status).toBe(200);
      const data = await res.json() as Record<string, unknown>;
      expect(data.success).toBe(true);
    });

    /**
     * 测试场景：未登录上传地点图片
     * 预期结果：返回 401
     */
    it("未登录 → 401", async () => {
      // Arrange
      logout();
      const formData = new FormData();
      formData.append("file", new Blob(["test"], { type: "image/jpeg" }), "location.jpg");

      // Act
      const res = await req(app, bindings, "/upload/location", createFormDataRequest(formData));

      // Assert
      expect(res.status).toBe(401);
    });
  });

  describe("POST /upload/story - 上传故事封面", () => {
    it("未登录 → 401", async () => {
      logout();
      const formData = new FormData();
      formData.append("file", new Blob(["test"], { type: "image/jpeg" }), "story.jpg");

      const res = await req(app, bindings, "/upload/story", createFormDataRequest(formData));

      expect(res.status).toBe(401);
    });

    it("上传不支持的文件类型 → 400", async () => {
      const user = await seedUser(testDb);
      loginAs(user);
      const formData = new FormData();
      formData.append("file", new Blob(["test"], { type: "application/pdf" }), "story.pdf");

      const res = await req(app, bindings, "/upload/story", createFormDataRequest(formData));

      expect(res.status).toBe(400);
    });

    it("上传超过 5MB 的文件 → 400", async () => {
      const user = await seedUser(testDb);
      loginAs(user);
      const formData = new FormData();
      const oversized = new Blob([new Uint8Array(5 * 1024 * 1024 + 1)], { type: "image/png" });
      formData.append("file", oversized, "large.png");

      const res = await req(app, bindings, "/upload/story", createFormDataRequest(formData));

      expect(res.status).toBe(400);
    });

    it("登录用户上传合法故事封面 → 200", async () => {
      const user = await seedUser(testDb);
      loginAs(user);
      const formData = new FormData();
      formData.append("file", new Blob(["fake-story-cover"], { type: "image/webp" }), "cover.webp");

      const res = await req(app, bindings, "/upload/story", createFormDataRequest(formData));

      expect(res.status).toBe(200);
      const data = await res.json() as Record<string, unknown>;
      expect(data.success).toBe(true);
      expect(data.key).toContain(`stories/${user.id}`);
      expect(data.url).toMatch(/https?:\/\//);
      expect(data.size).toBeGreaterThan(0);
      expect(data.type).toBe("image/webp");
    });
  });
});
