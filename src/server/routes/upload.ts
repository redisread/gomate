import { and, eq, isNull } from "drizzle-orm";
import { Hono, type Context } from "hono";
import { z } from "zod";

import { createDb } from "../db";
import * as schema from "../db/schema";
import { getActiveSession } from "../lib/active-session";
import { APIErrors } from "../lib/api-errors";
import type { Env } from "../lib/auth";
import {
  isOwnedAvatarKey,
  ownedAvatarKeyFromStoredValue,
} from "../lib/avatar-media";
import { generateId } from "../lib/id";
import { logger } from "../lib/logger";
import {
  deleteR2ObjectsWithRetry,
  getR2PublicBaseUrl,
} from "../lib/r2-media";
import { validateRequest, validateValue } from "../lib/validation";

const upload = new Hono<{ Bindings: Env }>();
type UploadContext = Context<{ Bindings: Env }>;

const MAX_FILE_SIZE = 5 * 1024 * 1024;
// Keep total buffering bounded while allowing normal multipart framing.
const MAX_MULTIPART_BODY_SIZE = MAX_FILE_SIZE + 64 * 1024;
const uploadFormSchema = z.object({ file: z.instanceof(File) }).strict();
const avatarKeyQuerySchema = z
  .object({ key: z.string().trim().min(1) })
  .passthrough();

type ImageFormat = "jpeg" | "png" | "gif" | "webp";

const MIME_FORMAT: Record<string, ImageFormat> = {
  "image/jpeg": "jpeg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
};

const EXT_FORMAT: Record<string, ImageFormat> = {
  jpg: "jpeg",
  jpeg: "jpeg",
  png: "png",
  gif: "gif",
  webp: "webp",
};

class UploadRequestError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 413,
  ) {
    super(message);
    this.name = "UploadRequestError";
  }
}

function detectedImageFormat(buffer: ArrayBuffer): ImageFormat | null {
  const bytes = new Uint8Array(buffer);
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "png";
  }
  if (
    bytes.length >= 6 &&
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38 &&
    (bytes[4] === 0x37 || bytes[4] === 0x39) &&
    bytes[5] === 0x61
  ) {
    return "gif";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "webp";
  }
  return null;
}

function fileExtension(file: File): string | null {
  const match = file.name.match(/\.([A-Za-z0-9]+)$/u);
  return match?.[1]?.toLowerCase() ?? null;
}

async function validatedImage(file: File) {
  const ext = fileExtension(file);
  const mimeFormat = MIME_FORMAT[file.type];
  const extensionFormat = ext ? EXT_FORMAT[ext] : undefined;
  if (!ext || !extensionFormat) {
    throw new UploadRequestError(
      "Invalid file extension. Allowed: jpg, jpeg, png, gif, webp",
      400,
    );
  }
  if (!mimeFormat) {
    throw new UploadRequestError(
      "Invalid file type. Allowed: JPEG, PNG, GIF, WebP",
      400,
    );
  }
  if (mimeFormat !== extensionFormat) {
    throw new UploadRequestError(
      `MIME type ${file.type} does not match extension .${ext}`,
      400,
    );
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new UploadRequestError("File too large. Maximum size: 5MB", 413);
  }

  const buffer = await file.arrayBuffer();
  const contentFormat = detectedImageFormat(buffer);
  if (!contentFormat || contentFormat !== mimeFormat) {
    throw new UploadRequestError(
      "File extension, MIME type, and image content must describe the same format",
      400,
    );
  }
  return { buffer, ext };
}

async function boundedFormData(request: Request): Promise<FormData> {
  const contentLength = request.headers.get("content-length");
  if (contentLength !== null) {
    if (!/^\d+$/u.test(contentLength)) {
      throw new UploadRequestError("Invalid Content-Length", 400);
    }
    if (Number(contentLength) > MAX_MULTIPART_BODY_SIZE) {
      throw new UploadRequestError("Multipart body too large", 413);
    }
  }

  const reader = request.body?.getReader();
  if (!reader) throw new UploadRequestError("No multipart body provided", 400);
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_MULTIPART_BODY_SIZE) {
      // Stop reading immediately. Returning the 413 releases the unread
      // request body at the runtime boundary without spending Worker CPU on
      // an attacker-controlled chunked remainder. Explicit reader.cancel()
      // makes Node's native FormData producer enqueue into a closed stream.
      throw new UploadRequestError("Multipart body too large", 413);
    }
    chunks.push(value);
  }

  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return await new Request(request.url, {
      method: request.method,
      headers: request.headers,
      body,
    }).formData();
  } catch {
    throw new UploadRequestError("Invalid multipart body", 400);
  }
}

function storageConfiguration(c: UploadContext) {
  const publicBaseUrl = getR2PublicBaseUrl(c.env);
  if (!c.env.R2 || !publicBaseUrl) return null;
  return { bucket: c.env.R2, publicBaseUrl };
}

function uploadUrl(c: UploadContext, publicBaseUrl: string, key: string) {
  const requestUrl = new URL(c.req.raw.url);
  const isLocal = ["localhost", "127.0.0.1", "[::1]"].includes(
    requestUrl.hostname,
  );
  return isLocal
    ? `${requestUrl.origin}/api/r2/${key}`
    : `${publicBaseUrl}/${key}`;
}

function requestErrorResponse(c: UploadContext, error: UploadRequestError) {
  return c.json(APIErrors.badRequest(error.message), error.status);
}

async function validatedFormFile(
  c: UploadContext,
  formData: FormData,
): Promise<File | Response> {
  const parsed = await validateValue(
    c,
    { file: formData.get("file") },
    uploadFormSchema,
    "No file provided",
    "none",
    "No file provided",
    APIErrors.badRequest,
  );
  return parsed instanceof Response ? parsed : parsed.file;
}

upload.post("/avatar", async (c) => {
  const createdKeys: string[] = [];
  try {
    const session = await getActiveSession(c.env, c.req.raw.headers);
    if (!session) return c.json(APIErrors.unauthorized("请先登录"), 401);

    const storage = storageConfiguration(c);
    if (!storage) {
      return c.json(APIErrors.internalError("R2 storage is not safely configured"), 500);
    }
    const formData = await boundedFormData(c.req.raw);
    const file = await validatedFormFile(c, formData);
    if (file instanceof Response) return file;
    const { buffer, ext } = await validatedImage(file);

    const db = createDb(c.env.DB);
    const [currentUser] = await db
      .select({ image: schema.users.image })
      .from(schema.users)
      .where(eq(schema.users.id, session.user.id))
      .limit(1);
    if (!currentUser) return c.json(APIErrors.unauthorized("请先登录"), 401);

    const objectId = generateId();
    const tempKey = `temp/avatars/${session.user.id}/${objectId}.${ext}`;
    const finalKey = `avatars/${session.user.id}/${objectId}.${ext}`;
    createdKeys.push(tempKey);
    await storage.bucket.put(tempKey, buffer, {
      httpMetadata: { contentType: file.type },
    });
    createdKeys.push(finalKey);
    await storage.bucket.put(finalKey, buffer, {
      httpMetadata: { contentType: file.type },
    });

    const url = uploadUrl(c, storage.publicBaseUrl, finalKey);
    const imageUnchanged = currentUser.image === null
      ? isNull(schema.users.image)
      : eq(schema.users.image, currentUser.image);
    const updated = await db
      .update(schema.users)
      .set({ image: url, updatedAt: new Date() })
      .where(and(
        eq(schema.users.id, session.user.id),
        imageUnchanged,
        eq(schema.users.status, "active"),
        isNull(schema.users.deletedAt),
      ))
      .returning({ image: schema.users.image });
    if (updated.length !== 1) {
      await deleteR2ObjectsWithRetry(storage.bucket, createdKeys);
      return c.json(APIErrors.conflict("Avatar changed concurrently"), 409);
    }

    // From this point D1 owns the final key. Never include it in a generic
    // rollback if deletion of the temporary or previous object later fails.
    createdKeys.length = 0;

    const previousKey = currentUser.image
      ? ownedAvatarKeyFromStoredValue(
          c.env,
          new URL(c.req.raw.url),
          currentUser.image,
          session.user.id,
        )
      : null;
    await deleteR2ObjectsWithRetry(storage.bucket, [
      tempKey,
      ...(previousKey && previousKey !== finalKey ? [previousKey] : []),
    ]).catch((cleanupError: unknown) => {
      logger.error("avatar_media_cleanup_failed", {
        errorType: cleanupError instanceof Error ? cleanupError.name : "UnknownR2Error",
      });
    });

    return c.json({
      success: true,
      key: finalKey,
      url,
      size: file.size,
      type: file.type,
    });
  } catch (error) {
    if (error instanceof UploadRequestError) return requestErrorResponse(c, error);
    if (createdKeys.length > 0 && c.env.R2) {
      await deleteR2ObjectsWithRetry(c.env.R2, createdKeys).catch(() => undefined);
    }
    logger.error("avatar_upload_failed", {
      errorType: error instanceof Error ? error.name : "UnknownUploadError",
    });
    return c.json(APIErrors.internalError("Failed to upload avatar"), 500);
  }
});

upload.delete("/avatar", async (c) => {
  try {
    const session = await getActiveSession(c.env, c.req.raw.headers);
    if (!session) return c.json(APIErrors.unauthorized("请先登录"), 401);

    const query = await validateRequest(
      c,
      "query",
      avatarKeyQuerySchema,
      "Object key is required",
      "none",
      "Object key is required",
      APIErrors.badRequest,
    );
    if (query instanceof Response) return query;
    const { key } = query;
    if (!c.env.R2) {
      return c.json(APIErrors.internalError("R2 storage not configured"), 500);
    }
    if (!isOwnedAvatarKey(key, session.user.id)) {
      return c.json(APIErrors.forbidden("无权删除该文件"), 403);
    }

    const db = createDb(c.env.DB);
    const [userRecord] = await db
      .select({ image: schema.users.image })
      .from(schema.users)
      .where(eq(schema.users.id, session.user.id))
      .limit(1);
    if (!userRecord?.image) {
      return c.json(APIErrors.forbidden("无权删除该文件"), 403);
    }

    const currentKey = ownedAvatarKeyFromStoredValue(
      c.env,
      new URL(c.req.raw.url),
      userRecord.image,
      session.user.id,
    );
    if (currentKey !== key) {
      return c.json(APIErrors.forbidden("无权删除该文件"), 403);
    }

    const cleared = await db
      .update(schema.users)
      .set({ image: null, updatedAt: new Date() })
      .where(and(
        eq(schema.users.id, session.user.id),
        eq(schema.users.image, userRecord.image),
      ))
      .returning({ id: schema.users.id });
    if (cleared.length !== 1) {
      return c.json(APIErrors.forbidden("头像已变化，请刷新后重试"), 403);
    }

    try {
      await deleteR2ObjectsWithRetry(c.env.R2, [key]);
    } catch (error) {
      // Restore the reference only if no concurrent replacement occurred.
      const restored = await db
        .update(schema.users)
        .set({ image: userRecord.image, updatedAt: new Date() })
        .where(and(eq(schema.users.id, session.user.id), isNull(schema.users.image)))
        .returning({ id: schema.users.id });
      if (restored.length === 0) {
        await deleteR2ObjectsWithRetry(c.env.R2, [key]);
      }
      throw error;
    }
    return c.json({ success: true });
  } catch (error) {
    logger.error("avatar_delete_failed", {
      errorType: error instanceof Error ? error.name : "UnknownUploadError",
    });
    return c.json(APIErrors.internalError("Failed to delete avatar"), 500);
  }
});

upload.post("/location", async (c) => {
  let attemptedKey: string | null = null;
  try {
    const session = await getActiveSession(c.env, c.req.raw.headers);
    if (!session) return c.json(APIErrors.unauthorized("请先登录"), 401);

    const db = createDb(c.env.DB);
    const [user] = await db
      .select({ role: schema.users.role })
      .from(schema.users)
      .where(eq(schema.users.id, session.user.id))
      .limit(1);
    if (!user || user.role !== "admin") {
      return c.json(APIErrors.forbidden("无权限访问"), 403);
    }

    const storage = storageConfiguration(c);
    if (!storage) {
      return c.json(APIErrors.internalError("R2 storage is not safely configured"), 500);
    }
    const formData = await boundedFormData(c.req.raw);
    const file = await validatedFormFile(c, formData);
    if (file instanceof Response) return file;
    const { buffer, ext } = await validatedImage(file);
    const key = `temp/locations/${session.user.id}/${generateId()}.${ext}`;
    attemptedKey = key;
    await storage.bucket.put(key, buffer, {
      httpMetadata: { contentType: file.type },
    });
    return c.json({
      success: true,
      key,
      // Location inputs require HTTPS, so always return the canonical R2 URL.
      url: `${storage.publicBaseUrl}/${key}`,
      size: file.size,
      type: file.type,
    });
  } catch (error) {
    if (error instanceof UploadRequestError) return requestErrorResponse(c, error);
    if (attemptedKey && c.env.R2) {
      await deleteR2ObjectsWithRetry(c.env.R2, [attemptedKey]).catch(
        () => undefined,
      );
    }
    logger.error("location_image_upload_failed", {
      errorType: error instanceof Error ? error.name : "UnknownUploadError",
    });
    return c.json(APIErrors.internalError("Failed to upload location image"), 500);
  }
});

upload.post("/story", async (c) => {
  let attemptedKey: string | null = null;
  try {
    const session = await getActiveSession(c.env, c.req.raw.headers);
    if (!session) return c.json(APIErrors.unauthorized("请先登录"), 401);

    const storage = storageConfiguration(c);
    if (!storage) {
      return c.json(APIErrors.internalError("R2 storage is not safely configured"), 500);
    }
    const formData = await boundedFormData(c.req.raw);
    const file = await validatedFormFile(c, formData);
    if (file instanceof Response) return file;
    const { buffer, ext } = await validatedImage(file);
    const key = `temp/stories/${session.user.id}/${generateId()}.${ext}`;
    attemptedKey = key;
    await storage.bucket.put(key, buffer, {
      httpMetadata: { contentType: file.type },
    });
    return c.json({
      success: true,
      key,
      url: uploadUrl(c, storage.publicBaseUrl, key),
      size: file.size,
      type: file.type,
    });
  } catch (error) {
    if (error instanceof UploadRequestError) return requestErrorResponse(c, error);
    if (attemptedKey && c.env.R2) {
      await deleteR2ObjectsWithRetry(c.env.R2, [attemptedKey]).catch(
        () => undefined,
      );
    }
    logger.error("story_image_upload_failed", {
      errorType: error instanceof Error ? error.name : "UnknownUploadError",
    });
    return c.json(APIErrors.internalError("Failed to upload story image"), 500);
  }
});

export { upload as uploadRoute };
