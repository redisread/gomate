import { describe, it, expect, beforeEach, vi } from "vitest";
import { Hono } from "hono";
import { createTestDb } from "../helpers/db";
import { seedUser } from "../helpers/seed";
import { eq } from "drizzle-orm";
import * as schema from "../../db/schema";
// ===== Mock 策略 =====
let currentSession: { user: { id: string; email: string; name: string } } | null = null;
let testDb: ReturnType<typeof createTestDb>["db"];
let failNextDbUpdate = false;

vi.mock("../../lib/auth", () => ({
  createAuth: (_env: unknown) => ({
    api: {
      getSession: async (_opts: unknown) => currentSession,
    },
  }),
}));

vi.mock("../../db", () => ({
  createDb: (_d1: unknown) => new Proxy(testDb, {
    get(target, property, receiver) {
      if (property === "update" && failNextDbUpdate) {
        return () => {
          failNextDbUpdate = false;
          throw new Error("simulated D1 update failure");
        };
      }
      return Reflect.get(target, property, receiver);
    },
  }),
}));

const { uploadRoute } = await import("../../routes/upload");

function createApp() {
  const app = new Hono<{ Bindings: { DB: unknown; R2: unknown; R2_PUBLIC_URL: string } }>();

  // 模拟 R2 存储
  const r2Store = new Map<string, ArrayBuffer>();
  const putObject = vi.fn(async (key: string, data: ArrayBuffer) => {
    r2Store.set(key, data);
  });
  const deleteObject = vi.fn(async (keys: string | string[]) => {
    for (const key of Array.isArray(keys) ? keys : [keys]) r2Store.delete(key);
  });
  const mockR2 = {
    put: putObject,
    delete: deleteObject,
    get: async (key: string) => {
      const data = r2Store.get(key);
      return data ? { arrayBuffer: async () => data } : null;
    },
  };

  app.route("/upload", uploadRoute);
  return {
    app,
    bindings: { DB: {}, R2: mockR2, R2_PUBLIC_URL: "https://test.r2.example.com" },
    deleteObject,
    putObject,
    r2Store,
  };
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

/** 创建带有正确 Magic Number 的测试图片 Blob */
function createTestImageBlob(type: "jpeg" | "png" | "webp" | "gif" = "jpeg"): Blob {
  const magicNumbers = {
    jpeg: [0xFF, 0xD8, 0xFF],
    png: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
    webp: [
      0x52, 0x49, 0x46, 0x46,
      0x00, 0x00, 0x00, 0x00,
      0x57, 0x45, 0x42, 0x50,
    ],
    gif: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61],
  };
  const mimeTypes = {
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
  };
  const magic = magicNumbers[type];
  const content = new Uint8Array([...magic, ...Array.from({ length: 20 }, (_, i) => i)]);
  return new Blob([content], { type: mimeTypes[type] });
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
  let deleteObject: ReturnType<typeof createApp>["deleteObject"];
  let r2Store: ReturnType<typeof createApp>["r2Store"];

  beforeEach(async () => {
    const fresh = createTestDb();
    testDb = fresh.db;
    const created = createApp();
    app = created.app;
    bindings = created.bindings;
    deleteObject = created.deleteObject;
    r2Store = created.r2Store;
    currentSession = null;
    failNextDbUpdate = false;
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

    it("目标用户始终取当前会话，不接受客户端覆盖", async () => {
      // Arrange
      const user = await seedUser(testDb, { id: "current_user" });
      loginAs(user);
      const formData = new FormData();
      formData.append("file", createTestImageBlob("jpeg"), "avatar.jpg");
      formData.append("userId", "other_user");

      // Act
      const res = await req(app, bindings, "/upload/avatar", createFormDataRequest(formData));

      // Assert
      expect(res.status).toBe(200);
      const data = await res.json() as Record<string, unknown>;
      expect(data.key).toMatch(/^avatars\/current_user\//);
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
      const imageBlob = createTestImageBlob("jpeg");
      formData.append("file", imageBlob, "avatar.jpg");

      // Act
      const res = await req(app, bindings, "/upload/avatar", createFormDataRequest(formData));

      // Assert
      expect(res.status).toBe(200);
      const data = await res.json() as Record<string, unknown>;
      expect(data.success).toBe(true);
      expect(data.key).toContain(`avatars/${user.id}`);
      expect(data.url).toMatch(/https?:\/\//);
      const [stored] = await testDb
        .select({ image: schema.users.image })
        .from(schema.users)
        .where(eq(schema.users.id, user.id));
      expect(stored.image).toBe(data.url);
    });

    it("D1 提交后的清理持续失败不把成功上传误报为 500", async () => {
      const user = await seedUser(testDb, {
        id: "cleanup-user",
        image: "https://test.r2.example.com/avatars/cleanup-user/legacy.jpg",
      });
      loginAs(user);
      deleteObject.mockRejectedValue(new Error("R2 cleanup unavailable"));
      const formData = new FormData();
      formData.append("file", createTestImageBlob("jpeg"), "avatar.jpg");

      const res = await req(app, bindings, "/upload/avatar", createFormDataRequest(formData));

      expect(res.status).toBe(200);
      const body = await res.json() as { key: string; url: string };
      expect(deleteObject).toHaveBeenCalledTimes(3);
      const [stored] = await testDb.select({ image: schema.users.image })
        .from(schema.users).where(eq(schema.users.id, user.id));
      expect(stored.image).toBe(body.url);
      expect(r2Store.has(body.key)).toBe(true);
    });

    it("Content-Length 超过 multipart 上限时在解析和 R2 写入前拒绝", async () => {
      const user = await seedUser(testDb);
      loginAs(user);
      const formData = new FormData();
      formData.append("file", createTestImageBlob("jpeg"), "avatar.jpg");

      const res = await req(app, bindings, "/upload/avatar", createFormDataRequest(formData, {
        "Content-Length": String(6 * 1024 * 1024),
      }));

      expect(res.status).toBe(413);
      expect((bindings.R2.put as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
    });

    it("即使 Content-Length 谎报较小也会在有界读取阶段拒绝超限请求", async () => {
      const user = await seedUser(testDb);
      loginAs(user);
      const bytes = new Uint8Array(5 * 1024 * 1024 + 70 * 1024);
      bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      const formData = new FormData();
      formData.append("file", new Blob([bytes], { type: "image/png" }), "large.png");

      const res = await req(app, bindings, "/upload/avatar", createFormDataRequest(formData, {
        "Content-Length": "1",
      }));

      expect(res.status).toBe(413);
      expect((bindings.R2.put as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
    });

    it("扩展名、MIME 与真实魔数不一致时拒绝", async () => {
      const user = await seedUser(testDb);
      loginAs(user);
      const gifBytes = await createTestImageBlob("gif").arrayBuffer();
      const formData = new FormData();
      formData.append("file", new Blob([gifBytes], { type: "image/png" }), "avatar.png");

      const res = await req(app, bindings, "/upload/avatar", createFormDataRequest(formData));

      expect(res.status).toBe(400);
      expect((bindings.R2.put as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
    });

    it("R2_PUBLIC_URL 非法时在任何对象写入前失败", async () => {
      const user = await seedUser(testDb);
      loginAs(user);
      bindings.R2_PUBLIC_URL = "http://insecure.example.test?redirect=evil";
      const formData = new FormData();
      formData.append("file", createTestImageBlob("jpeg"), "avatar.jpg");

      const res = await req(app, bindings, "/upload/avatar", createFormDataRequest(formData));

      expect(res.status).toBe(500);
      expect((bindings.R2.put as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
    });

    it("最终对象写入失败会清理临时对象且不更新用户头像", async () => {
      const user = await seedUser(testDb);
      loginAs(user);
      (bindings.R2.put as ReturnType<typeof vi.fn>).mockImplementation(
        async (key: string, data: ArrayBuffer) => {
          r2Store.set(key, data);
          if (key.startsWith("avatars/")) throw new Error("final put failed");
        },
      );
      const formData = new FormData();
      formData.append("file", createTestImageBlob("jpeg"), "avatar.jpg");

      const res = await req(app, bindings, "/upload/avatar", createFormDataRequest(formData));

      expect(res.status).toBe(500);
      expect(r2Store.size).toBe(0);
      const [stored] = await testDb.select({ image: schema.users.image })
        .from(schema.users).where(eq(schema.users.id, user.id));
      expect(stored.image).toBeNull();
    });

    it("D1 头像引用更新失败会补偿删除临时与最终对象", async () => {
      const user = await seedUser(testDb);
      loginAs(user);
      failNextDbUpdate = true;
      const formData = new FormData();
      formData.append("file", createTestImageBlob("jpeg"), "avatar.jpg");

      const res = await req(app, bindings, "/upload/avatar", createFormDataRequest(formData));

      expect(res.status).toBe(500);
      expect(r2Store.size).toBe(0);
      const [stored] = await testDb.select({ image: schema.users.image })
        .from(schema.users).where(eq(schema.users.id, user.id));
      expect(stored.image).toBeNull();
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

      // Act
      const res = await req(app, bindings, "/upload/avatar", createFormDataRequest(formData));

      // Assert
      expect(res.status).toBe(400);
    });

    /**
     * 测试场景：上传没有扩展名的文件
     * 预期结果：返回 400
     */
    it("上传没有扩展名的文件 → 400", async () => {
      // Arrange
      const user = await seedUser(testDb);
      loginAs(user);
      const formData = new FormData();
      formData.append("file", new Blob(["test"], { type: "image/jpeg" }), "avatar");

      // Act
      const res = await req(app, bindings, "/upload/avatar", createFormDataRequest(formData));

      // Assert
      expect(res.status).toBe(400);
    });

    /**
     * 测试场景：上传 MIME 类型和扩展名不匹配的文件
     * 预期结果：返回 400
     */
    it("上传 MIME 类型和扩展名不匹配的文件 → 400", async () => {
      // Arrange
      const user = await seedUser(testDb);
      loginAs(user);
      const formData = new FormData();
      // 客户端声称是 PNG，但文件名是 .jpg
      formData.append("file", createTestImageBlob("png"), "avatar.jpg");

      // Act
      const res = await req(app, bindings, "/upload/avatar", createFormDataRequest(formData));

      // Assert
      expect(res.status).toBe(400);
    });

    /**
     * 测试场景：上传不支持的扩展名（合法 MIME 但非法扩展名）
     * 预期结果：返回 400
     */
    it("上传不支持的扩展名 → 400", async () => {
      // Arrange
      const user = await seedUser(testDb);
      loginAs(user);
      const formData = new FormData();
      formData.append("file", new Blob(["test"], { type: "image/jpeg" }), "avatar.bmp");

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

      // Act
      const res = await req(app, bindings, "/upload/avatar", createFormDataRequest(formData));

      // Assert
      expect(res.status).toBe(400);
    });

  });

  describe("DELETE /upload/avatar - 删除头像", () => {
    /**
     * 测试场景：未登录删除头像
     * 预期结果：返回 401
     */
    it("未登录 → 401", async () => {
      // Act
      const res = await req(app, bindings, "/upload/avatar?key=avatars/user_1/image.jpg", { method: "DELETE" });

      // Assert
      expect(res.status).toBe(401);
    });

    /**
     * 测试场景：不提供 key
     * 预期结果：返回 400
     */
    it("不提供 key → 400", async () => {
      // Arrange
      const user = await seedUser(testDb, {
        id: "user_1",
        image: "https://test.r2.example.com/avatars/user_1/image.jpg",
      });
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
      const user = await seedUser(testDb, {
        id: "user_1",
        image: "https://test.r2.example.com/avatars/user_1/image.jpg",
      });
      loginAs(user);

      // Act
      const res = await req(app, bindings, "/upload/avatar?key=avatars/user_1/image.jpg", { method: "DELETE" });

      // Assert
      expect(res.status).toBe(200);
      const data = await res.json() as Record<string, unknown>;
      expect(data.success).toBe(true);
    });

    it("R2 删除持续失败时回滚 D1 清空，避免悬空业务状态", async () => {
      const originalImage = "https://test.r2.example.com/avatars/user_1/image.jpg";
      const user = await seedUser(testDb, { id: "user_1", image: originalImage });
      loginAs(user);
      deleteObject.mockRejectedValue(new Error("R2 unavailable"));

      const res = await req(app, bindings, "/upload/avatar?key=avatars/user_1/image.jpg", {
        method: "DELETE",
      });

      expect(res.status).toBe(500);
      expect(deleteObject).toHaveBeenCalledTimes(3);
      const [stored] = await testDb.select({ image: schema.users.image })
        .from(schema.users).where(eq(schema.users.id, user.id));
      expect(stored.image).toBe(originalImage);
    });

    /**
     * 测试场景：无权删除他人头像
     * 预期结果：返回 403
     */
    it("无权删除他人头像 → 403", async () => {
      // Arrange
      const user = await seedUser(testDb, { image: "https://test.r2.example.com/avatars/other_user/image.jpg" });
      loginAs(user);

      // Act
      const res = await req(app, bindings, "/upload/avatar?key=avatars/user_1/image.jpg", { method: "DELETE" });

      // Assert
      expect(res.status).toBe(403);
    });

    it("不能借由 image URL 的 query 嵌入他人 key 后删除他人对象", async () => {
      const attacker = await seedUser(testDb, {
        id: "attacker",
        image: "https://example.com/avatar?next=avatars/victim/secret.jpg",
      });
      loginAs(attacker);

      const res = await req(
        app,
        bindings,
        "/upload/avatar?key=avatars/victim/secret.jpg",
        { method: "DELETE" },
      );

      expect(res.status).toBe(403);
      expect(deleteObject).not.toHaveBeenCalled();
    });

    it("不能利用相似用户 ID 前缀删除另一个用户的对象", async () => {
      const attacker = await seedUser(testDb, {
        id: "user",
        image: "https://test.r2.example.com/avatars/user-2/secret.jpg",
      });
      loginAs(attacker);

      const res = await req(
        app,
        bindings,
        "/upload/avatar?key=avatars/user-2/secret.jpg",
        { method: "DELETE" },
      );

      expect(res.status).toBe(403);
      expect(deleteObject).not.toHaveBeenCalled();
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
      formData.append("file", createTestImageBlob("png"), "location.png");

      // Act
      const res = await req(app, bindings, "/upload/location", createFormDataRequest(formData));

      // Assert
      expect(res.status).toBe(200);
      const data = await res.json() as Record<string, unknown>;
      expect(data.success).toBe(true);
      expect(data.key).toMatch(new RegExp(`^temp/locations/${admin.id}/`));
    });

    it("R2 报错前即使已写入地点临时对象也会补偿删除", async () => {
      const admin = await seedUser(testDb, { role: "admin" });
      loginAs(admin);
      (bindings.R2.put as ReturnType<typeof vi.fn>).mockImplementation(
        async (key: string, data: ArrayBuffer) => {
          r2Store.set(key, data);
          throw new Error("ambiguous R2 write failure");
        },
      );
      const formData = new FormData();
      formData.append("file", createTestImageBlob("png"), "location.png");

      const res = await req(app, bindings, "/upload/location", createFormDataRequest(formData));

      expect(res.status).toBe(500);
      expect(r2Store.size).toBe(0);
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

    it("上传超过 5MB 的文件 → 413", async () => {
      const user = await seedUser(testDb);
      loginAs(user);
      const formData = new FormData();
      const oversized = new Blob([new Uint8Array(5 * 1024 * 1024 + 1)], { type: "image/png" });
      formData.append("file", oversized, "large.png");

      const res = await req(app, bindings, "/upload/story", createFormDataRequest(formData));

      expect(res.status).toBe(413);
    });

    it("允许恰好 5MiB 图片和正常 multipart framing", async () => {
      const user = await seedUser(testDb);
      loginAs(user);
      const bytes = new Uint8Array(5 * 1024 * 1024);
      bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      const formData = new FormData();
      formData.append("file", new Blob([bytes], { type: "image/png" }), "exact.png");

      const res = await req(app, bindings, "/upload/story", createFormDataRequest(formData));

      expect(res.status).toBe(200);
    });

    it("5MiB 文件的 multipart header 超过预留 64KiB 时返回 413", async () => {
      const user = await seedUser(testDb);
      loginAs(user);
      const bytes = new Uint8Array(5 * 1024 * 1024);
      bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      const formData = new FormData();
      const longFilename = `${"a".repeat(70 * 1024)}.png`;
      formData.append("file", new Blob([bytes], { type: "image/png" }), longFilename);

      const res = await req(app, bindings, "/upload/story", createFormDataRequest(formData));

      expect(res.status).toBe(413);
    });

    it("登录用户上传合法故事封面 → 200", async () => {
      const user = await seedUser(testDb);
      loginAs(user);
      const formData = new FormData();
      formData.append("file", createTestImageBlob("webp"), "cover.webp");

      const res = await req(app, bindings, "/upload/story", createFormDataRequest(formData));

      expect(res.status).toBe(200);
      const data = await res.json() as Record<string, unknown>;
      expect(data.success).toBe(true);
      expect(data.key).toMatch(new RegExp(`^temp/stories/${user.id}/`));
      expect(data.url).toContain(`/api/r2/${String(data.key)}`);
      expect(data.size).toBeGreaterThan(0);
      expect(data.type).toBe("image/webp");
    });
  });
});
