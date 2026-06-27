import { APIErrors } from "../lib/api-errors";
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
function getPublicUrl(env: Env, key: string): string | null {
  if (!env.R2_PUBLIC_URL) {
    console.error("[Upload] R2_PUBLIC_URL not configured");
    return null;
  }
  return `${env.R2_PUBLIC_URL}/${key}`;
}

async function uploadImageFile(c: { env: Env; req: { header: (name: string) => string | undefined } }, file: File, key: string) {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type))
    return { error: APIErrors.badRequest("Invalid file type. Allowed: JPEG, PNG, GIF, WebP"), status: 400 as const };
  if (file.size > MAX_FILE_SIZE)
    return { error: APIErrors.badRequest("File too large. Maximum size: 5MB"), status: 400 as const };
  if (!c.env.R2) return { error: APIErrors.internalError("R2 storage not configured"), status: 500 as const };

  const arrayBuffer = await file.arrayBuffer();
  await c.env.R2.put(key, arrayBuffer, {
    httpMetadata: { contentType: file.type },
  });

  const host = c.req.header("host") || "";
  const isLocalDev = host.includes("localhost") || host.includes("127.0.0.1");
  const publicUrl = isLocalDev
    ? `http://${host}/r2/${key}`
    : getPublicUrl(c.env, key);
  if (!publicUrl) return { error: APIErrors.internalError("R2_PUBLIC_URL not configured"), status: 500 as const };

  return { data: { success: true, key, url: publicUrl, size: file.size, type: file.type } };
}

/**
 * POST /upload/avatar
 * 上传用户头像到 R2（需登录，只能上传自己的头像）
 */
upload.post("/avatar", async (c) => {
  try {
    const authInstance = createAuth(c.env);
    const session = await authInstance.api.getSession({ headers: c.req.raw.headers });
    if (!session) return c.json(APIErrors.unauthorized("请先登录"), 401);

    const formData = await c.req.formData();
    const file = formData.get("file") as File | null;
    const userId = formData.get("userId") as string | null;

    if (!file) return c.json(APIErrors.badRequest("No file provided"), 400);
    if (!userId) return c.json(APIErrors.badRequest("User ID is required"), 400);

    // 鉴权：只允许上传自己的头像（管理员除外）
    if (userId !== session.user.id) {
      const db = createDb(c.env.DB);
      const userRecord = await db
        .select({ role: schema.users.role })
        .from(schema.users)
        .where(eq(schema.users.id, session.user.id))
        .then((rows) => rows[0]);
      if (!userRecord || userRecord.role !== "admin") {
        return c.json(APIErrors.forbidden("无权上传他人头像"), 403);
      }
    }

    const ext = file.type.split("/")[1] || "jpg";
    const key = `avatars/${userId}-${Date.now()}.${ext}`;
    const result = await uploadImageFile(c, file, key);
    if ("error" in result) return c.json(result.error, result.status);
    return c.json(result.data);
  } catch (error) {
    console.error("Avatar upload error:", error);
    return c.json(APIErrors.internalError("Failed to upload avatar"), 500);
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
    if (!session) return c.json(APIErrors.unauthorized("请先登录"), 401);

    const key = c.req.query("key");
    if (!key) return c.json(APIErrors.badRequest("Object key is required"), 400);

    if (!c.env.R2) return c.json(APIErrors.internalError("R2 storage not configured"), 500);

    // 验证 key 属于当前用户
    const db = createDb(c.env.DB);
    const userRecord = await db
      .select({ image: schema.users.image })
      .from(schema.users)
      .where(eq(schema.users.id, session.user.id))
      .then((rows) => rows[0]);

    if (!userRecord?.image?.includes(key)) {
      return c.json(APIErrors.forbidden("无权删除该文件"), 403);
    }

    await c.env.R2.delete(key);

    return c.json({ success: true });
  } catch (error) {
    console.error("Avatar delete error:", error);
    return c.json(APIErrors.internalError("Failed to delete avatar"), 500);
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
    if (!session) return c.json(APIErrors.unauthorized("请先登录"), 401);

    const db = createDb(c.env.DB);
    const user = await db
      .select({ role: schema.users.role })
      .from(schema.users)
      .where(eq(schema.users.id, session.user.id))
      .then((rows) => rows[0]);
    if (!user || user.role !== "admin") return c.json(APIErrors.forbidden("无权限访问"), 403);

    const formData = await c.req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return c.json(APIErrors.badRequest("No file provided"), 400);

    const ext = file.type.split("/")[1] || "jpg";
    const key = `locations/${Date.now()}.${ext}`;
    const result = await uploadImageFile(c, file, key);
    if ("error" in result) return c.json(result.error, result.status);
    return c.json(result.data);
  } catch (error) {
    console.error("Location image upload error:", error);
    return c.json(APIErrors.internalError("Failed to upload location image"), 500);
  }
});

/**
 * POST /upload/story
 * 上传故事封面图（需要登录）
 */
upload.post("/story", async (c) => {
  try {
    const authInstance = createAuth(c.env);
    const session = await authInstance.api.getSession({ headers: c.req.raw.headers });
    if (!session) return c.json(APIErrors.unauthorized("请先登录"), 401);

    const formData = await c.req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return c.json(APIErrors.badRequest("No file provided"), 400);

    const ext = file.type.split("/")[1] || "jpg";
    const key = `stories/${session.user.id}-${Date.now()}.${ext}`;
    const result = await uploadImageFile(c, file, key);
    if ("error" in result) return c.json(result.error, result.status);
    return c.json(result.data);
  } catch (error) {
    console.error("Story image upload error:", error);
    return c.json(APIErrors.internalError("Failed to upload story image"), 500);
  }
});

export { upload as uploadRoute };
