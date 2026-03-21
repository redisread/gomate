import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { createAuth } from "../lib/auth";
import { createDb } from "../db";
import * as schema from "../db/schema";
import type { Env } from "../lib/auth";

const upload = new Hono<{ Bindings: Env }>();

/** 允许的图片 MIME 类型 */
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
/** 最大文件大小：5MB */
const MAX_FILE_SIZE = 5 * 1024 * 1024;

/**
 * 生成 R2 对象公开 URL
 */
function getPublicUrl(env: Env, key: string): string {
  const base = env.R2_PUBLIC_URL || "https://gomate.cos.jiahongw.com";
  return `${base}/${key}`;
}

/**
 * POST /upload/avatar
 * 上传用户头像到 R2
 */
upload.post("/avatar", async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get("file") as File | null;
    const userId = formData.get("userId") as string | null;

    if (!file) return c.json({ error: "No file provided" }, 400);
    if (!userId) return c.json({ error: "User ID is required" }, 400);
    if (!ALLOWED_IMAGE_TYPES.includes(file.type))
      return c.json({ error: "Invalid file type. Allowed: JPEG, PNG, GIF, WebP" }, 400);
    if (file.size > MAX_FILE_SIZE)
      return c.json({ error: "File too large. Maximum size: 5MB" }, 400);

    if (!c.env.R2) return c.json({ error: "R2 storage not configured" }, 500);

    const ext = file.type.split("/")[1] || "jpg";
    const key = `avatars/${userId}-${Date.now()}.${ext}`;
    const arrayBuffer = await file.arrayBuffer();

    await c.env.R2.put(key, arrayBuffer, {
      httpMetadata: { contentType: file.type },
    });

    const host = c.req.header("host") || "";
    const isLocalDev = host.includes("localhost") || host.includes("127.0.0.1");
    const publicUrl = isLocalDev ? `http://${host}/r2/${key}` : getPublicUrl(c.env, key);

    return c.json({ success: true, key, url: publicUrl, size: file.size, type: file.type });
  } catch (error) {
    console.error("Avatar upload error:", error);
    return c.json({ error: "Failed to upload avatar" }, 500);
  }
});

/**
 * DELETE /upload/avatar?key={key}
 * 删除用户头像（仅允许删除自己的头像）
 */
upload.delete("/avatar", async (c) => {
  try {
    const authInstance = createAuth(c.env);
    const session = await authInstance.api.getSession({ headers: c.req.raw.headers });
    if (!session) return c.json({ error: "请先登录" }, 401);

    const key = c.req.query("key");
    if (!key) return c.json({ error: "Object key is required" }, 400);

    if (!c.env.R2) return c.json({ error: "R2 storage not configured" }, 500);

    // 验证 key 属于当前用户
    const db = createDb(c.env.DB);
    const userRecord = await db
      .select({ image: schema.users.image })
      .from(schema.users)
      .where(eq(schema.users.id, session.user.id))
      .then((rows) => rows[0]);

    if (!userRecord?.image?.includes(key)) {
      return c.json({ error: "无权删除该文件" }, 403);
    }

    await c.env.R2.delete(key);

    return c.json({ success: true });
  } catch (error) {
    console.error("Avatar delete error:", error);
    return c.json({ error: "Failed to delete avatar" }, 500);
  }
});

/**
 * POST /upload/location
 * 上传地点封面图（需要管理员权限）
 */
upload.post("/location", async (c) => {
  try {
    const authInstance = createAuth(c.env);
    const session = await authInstance.api.getSession({ headers: c.req.raw.headers });
    if (!session) return c.json({ error: "请先登录" }, 401);

    const db = createDb(c.env.DB);
    const user = await db
      .select({ role: schema.users.role })
      .from(schema.users)
      .where(eq(schema.users.id, session.user.id))
      .then((rows) => rows[0]);
    if (!user || user.role !== "admin") return c.json({ error: "无权限访问" }, 403);

    if (!c.env.R2) return c.json({ error: "R2 storage not configured" }, 500);

    const formData = await c.req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return c.json({ error: "No file provided" }, 400);
    if (!ALLOWED_IMAGE_TYPES.includes(file.type))
      return c.json({ error: "Invalid file type" }, 400);
    if (file.size > MAX_FILE_SIZE)
      return c.json({ error: "File too large. Maximum size: 5MB" }, 400);

    const ext = file.type.split("/")[1] || "jpg";
    const key = `locations/${Date.now()}.${ext}`;
    const arrayBuffer = await file.arrayBuffer();

    await c.env.R2.put(key, arrayBuffer, {
      httpMetadata: { contentType: file.type },
    });

    const host = c.req.header("host") || "";
    const isLocalDev = host.includes("localhost") || host.includes("127.0.0.1");
    const publicUrl = isLocalDev ? `http://${host}/r2/${key}` : getPublicUrl(c.env, key);

    return c.json({ success: true, key, url: publicUrl, size: file.size, type: file.type });
  } catch (error) {
    console.error("Location image upload error:", error);
    return c.json({ error: "Failed to upload location image" }, 500);
  }
});

/**
 * GET /r2/*
 * 本地开发代理：从 R2 读取文件返回
 */
upload.get("/r2/*", async (c) => {
  try {
    if (!c.env.R2) return c.json({ error: "R2 not configured" }, 500);

    const key = c.req.path.replace(/^\/r2\//, "");
    if (!key) return c.json({ error: "Key is required" }, 400);

    const object = await c.env.R2.get(key);
    if (!object) return c.json({ error: "File not found" }, 404);

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);

    return new Response(object.body, { headers });
  } catch (error) {
    console.error("R2 proxy error:", error);
    return c.json({ error: "Failed to get file" }, 500);
  }
});

export { upload as uploadRoute };
