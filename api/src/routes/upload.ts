import { APIErrors } from "../lib/api-errors";
import { logger } from "../lib/logger";
import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { createAuth } from "../lib/auth";
import { createDb } from "../db";
import * as schema from "../db/schema";
import { checkRateLimit } from "../lib/rate-limit";
import type { Env } from "../lib/auth";

const upload = new Hono<{ Bindings: Env }>();

/** 允许的图片 MIME 类型 */
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
/** 允许的文件扩展名 */
const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp"];
/** 最大文件大小：5MB */
const MAX_FILE_SIZE = 5 * 1024 * 1024;
/** 上传速率限制：10 次/小时 */
const UPLOAD_RATE_LIMIT_MAX = 10;
const UPLOAD_RATE_LIMIT_WINDOW = 3600;

/** MIME 类型到扩展名的映射 */
const MIME_TO_EXT: Record<string, string[]> = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/gif": ["gif"],
  "image/webp": ["webp"],
};

/** 常见图片格式的 Magic Number */
const MAGIC_NUMBERS = {
  jpeg: [0xFF, 0xD8, 0xFF],
  png: [0x89, 0x50, 0x4E, 0x47],
  gif: [0x47, 0x49, 0x46, 0x38],
  webp: [0x52, 0x49, 0x46, 0x46],
};

function validateMagicNumber(buffer: ArrayBuffer): boolean {
  const bytes = new Uint8Array(buffer);
  if (bytes.length < 4) return false;

  const checks = [
    { magic: MAGIC_NUMBERS.jpeg, minLen: 3 },
    { magic: MAGIC_NUMBERS.png, minLen: 4 },
    { magic: MAGIC_NUMBERS.gif, minLen: 4 },
    { magic: MAGIC_NUMBERS.webp, minLen: 4 },
  ];

  return checks.some(({ magic, minLen }) => {
    if (bytes.length < minLen) return false;
    return magic.every((b, i) => bytes[i] === b);
  });
}

/**
 * 验证文件扩展名是否在白名单中，且与 MIME 类型一致
 */
function validateFileExtension(file: File): { valid: boolean; ext: string; error?: string } {
  const fileName = file.name || "";
  const extMatch = fileName.match(/\.([a-zA-Z0-9]+)$/);
  const ext = extMatch ? extMatch[1].toLowerCase() : "";

  if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
    return { valid: false, ext: "", error: `Invalid file extension: .${ext}. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}` };
  }

  // 验证 MIME 类型和扩展名的一致性
  const expectedExts = MIME_TO_EXT[file.type];
  if (!expectedExts || !expectedExts.includes(ext)) {
    return { valid: false, ext, error: `MIME type ${file.type} does not match extension .${ext}` };
  }

  return { valid: true, ext };
}
function getPublicUrl(env: Env, key: string): string | null {
  if (!env.R2_PUBLIC_URL) {
    logger.error("[Upload] R2_PUBLIC_URL not configured");
    return null;
  }
  return `${env.R2_PUBLIC_URL}/${key}`;
}

async function uploadImageFile(c: { env: Env; req: { header: (name: string) => string | undefined } }, file: File, key: string) {
  // 验证文件扩展名和 MIME 类型一致性
  const extValidation = validateFileExtension(file);
  if (!extValidation.valid) {
    return { error: APIErrors.badRequest(extValidation.error || "Invalid file extension"), status: 400 as const };
  }

  if (!ALLOWED_IMAGE_TYPES.includes(file.type))
    return { error: APIErrors.badRequest("Invalid file type. Allowed: JPEG, PNG, GIF, WebP"), status: 400 as const };
  if (file.size > MAX_FILE_SIZE)
    return { error: APIErrors.badRequest("File too large. Maximum size: 5MB"), status: 400 as const };

  const arrayBuffer = await file.arrayBuffer();
  if (!validateMagicNumber(arrayBuffer))
    return { error: APIErrors.badRequest("Invalid file content. File header does not match allowed image formats."), status: 400 as const };

  if (!c.env.R2) return { error: APIErrors.internalError("R2 storage not configured"), status: 500 as const };

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

    // 速率限制
    const rateLimit = await checkRateLimit(c.env.GOMATE_KV, `rate:upload:${session.user.id}`, UPLOAD_RATE_LIMIT_MAX, UPLOAD_RATE_LIMIT_WINDOW);
    if (!rateLimit.allowed) return c.json(APIErrors.badRequest(`上传过于频繁，请 ${rateLimit.retryAfter} 秒后重试`), 429);

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

    const extValidation = validateFileExtension(file);
    if (!extValidation.valid) return c.json(APIErrors.badRequest(extValidation.error || "Invalid file"), 400);

    const ext = extValidation.ext;
    const key = `avatars/${userId}-${Date.now()}.${ext}`;
    const result = await uploadImageFile(c, file, key);
    if ("error" in result) return c.json(result.error, result.status);
    return c.json(result.data);
  } catch (error) {
    logger.error("Avatar upload error:", error);
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
    logger.error("Avatar delete error:", error);
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

    // 速率限制
    const rateLimit = await checkRateLimit(c.env.GOMATE_KV, `rate:upload:${session.user.id}`, UPLOAD_RATE_LIMIT_MAX, UPLOAD_RATE_LIMIT_WINDOW);
    if (!rateLimit.allowed) return c.json(APIErrors.badRequest(`上传过于频繁，请 ${rateLimit.retryAfter} 秒后重试`), 429);

    const extValidation = validateFileExtension(file);
    if (!extValidation.valid) return c.json(APIErrors.badRequest(extValidation.error || "Invalid file"), 400);

    const ext = extValidation.ext;
    const key = `locations/${Date.now()}.${ext}`;
    const result = await uploadImageFile(c, file, key);
    if ("error" in result) return c.json(result.error, result.status);
    return c.json(result.data);
  } catch (error) {
    logger.error("Location image upload error:", error);
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

    // 速率限制
    const rateLimit = await checkRateLimit(c.env.GOMATE_KV, `rate:upload:${session.user.id}`, UPLOAD_RATE_LIMIT_MAX, UPLOAD_RATE_LIMIT_WINDOW);
    if (!rateLimit.allowed) return c.json(APIErrors.badRequest(`上传过于频繁，请 ${rateLimit.retryAfter} 秒后重试`), 429);

    const extValidation = validateFileExtension(file);
    if (!extValidation.valid) return c.json(APIErrors.badRequest(extValidation.error || "Invalid file"), 400);

    const ext = extValidation.ext;
    const key = `stories/${session.user.id}-${Date.now()}.${ext}`;
    const result = await uploadImageFile(c, file, key);
    if ("error" in result) return c.json(result.error, result.status);
    return c.json(result.data);
  } catch (error) {
    logger.error("Story image upload error:", error);
    return c.json(APIErrors.internalError("Failed to upload story image"), 500);
  }
});

/**
 * POST /upload/activity-post
 * 上传活动动态图片（需要登录）
 */
upload.post("/activity-post", async (c) => {
  try {
    const authInstance = createAuth(c.env);
    const session = await authInstance.api.getSession({ headers: c.req.raw.headers });
    if (!session) return c.json(APIErrors.unauthorized("请先登录"), 401);

    const formData = await c.req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return c.json(APIErrors.badRequest("No file provided"), 400);

    // 速率限制
    const rateLimit = await checkRateLimit(c.env.GOMATE_KV, `rate:upload:${session.user.id}`, UPLOAD_RATE_LIMIT_MAX, UPLOAD_RATE_LIMIT_WINDOW);
    if (!rateLimit.allowed) return c.json(APIErrors.badRequest(`上传过于频繁，请 ${rateLimit.retryAfter} 秒后重试`), 429);

    const extValidation = validateFileExtension(file);
    if (!extValidation.valid) return c.json(APIErrors.badRequest(extValidation.error || "Invalid file"), 400);

    const ext = extValidation.ext;
    const key = `activity-posts/${session.user.id}-${Date.now()}.${ext}`;
    const result = await uploadImageFile(c, file, key);
    if ("error" in result) return c.json(result.error, result.status);
    return c.json(result.data);
  } catch (error) {
    logger.error("Activity post image upload error:", error);
    return c.json(APIErrors.internalError("Failed to upload activity post image"), 500);
  }
});

export { upload as uploadRoute };
