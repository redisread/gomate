import { Hono } from "hono";
import { logger } from "../../lib/logger";
import { eq } from "drizzle-orm";
import { createAuth } from "../../lib/auth";
import { createDb } from "../../db";
import * as schema from "../../db/schema";
import type { Env } from "../../lib/auth";
import { APIErrors } from "../../lib/api-errors";
import { sanitizeUser, validateUserExtra } from "./utils";

const mutations = new Hono<{ Bindings: Env }>();

/**
 * PATCH /users/update
 * 更新用户信息（需登录，只能修改自己的资料）
 */
mutations.patch("/update", async (c) => {
  try {
    const authInstance = createAuth(c.env);
    const session = await authInstance.api.getSession({ headers: c.req.raw.headers });
    if (!session) return c.json(APIErrors.unauthorized("请先登录"), 401);

    const db = createDb(c.env.DB);
    const body = await c.req.json<{
      userId?: string; name?: string; nickname?: string; bio?: string;
      level?: string; image?: string; wechat?: string; gender?: string;
      birthday?: string | number; extra?: unknown; city?: string | null;
    }>();
    const { userId, name, nickname, bio, level, image, wechat, gender, birthday, extra, city } = body;

    if (!userId) return c.json(APIErrors.badRequest("User ID is required"), 400);

    const normalizedCity = city === undefined ? undefined : city || null;
    if (normalizedCity) {
      const cityExists = await db
        .select({ id: schema.cities.id })
        .from(schema.cities)
        .where(eq(schema.cities.id, normalizedCity))
        .limit(1);
      if (!cityExists.length) return c.json(APIErrors.badRequest("城市不存在"), 400);
    }

    const updateData: Partial<typeof schema.users.$inferInsert> = {};
    if (name !== undefined) updateData.name = name;
    if (nickname !== undefined) updateData.nickname = nickname;
    if (bio !== undefined) updateData.bio = bio;
    if (level !== undefined) updateData.level = level;
    if (image !== undefined) updateData.image = image;
    if (wechat !== undefined) updateData.wechat = wechat;
    if (gender !== undefined) updateData.gender = gender;
    if (birthday !== undefined) {
      updateData.birthday = birthday === null ? null : new Date(birthday as number);
    }
    // #181: city = cityId（CitySelect 产出），非城市名；格式一致性见 schema.ts users.city 注释
    // （防休眠 2.0：绕过 CitySelect 的写入也必须存 cityId，否则 neighbor query u.city=userCity 相等失效）
    if (normalizedCity !== undefined) updateData.city = normalizedCity; // CR N2：空串归一 NULL，避免 city="" 落库
    if (extra !== undefined) {
      if (!validateUserExtra(extra)) return c.json(APIErrors.badRequest("Invalid extra field format"), 400);
      updateData.extra = JSON.stringify(extra);
    }
    updateData.updatedAt = new Date();

    // 支持 email 或 id 查找用户
    let targetUserId = userId;
    const byEmail = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.email, userId))
      .limit(1);
    if (byEmail.length > 0) targetUserId = byEmail[0].id;

    // 鉴权：只允许修改自己的资料（管理员除外）
    if (targetUserId !== session.user.id) {
      const sessionUser = await db
        .select({ role: schema.users.role })
        .from(schema.users)
        .where(eq(schema.users.id, session.user.id))
        .limit(1);
      if (!sessionUser.length || sessionUser[0].role !== "admin") {
        return c.json(APIErrors.forbidden("无权限修改他人资料"), 403);
      }
    }

    const existing = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.id, targetUserId))
      .limit(1);
    if (!existing.length) return c.json(APIErrors.notFound(`User not found: ${targetUserId}`), 404);

    await db.update(schema.users).set(updateData).where(eq(schema.users.id, targetUserId));

    // 读取更新后的完整用户数据
    const updatedRows = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, targetUserId))
      .limit(1);
    const updatedUser = updatedRows[0];

    return c.json({ success: true, user: sanitizeUser(updatedUser) });
  } catch (error) {
    logger.error("User update error:", error);
    return c.json(APIErrors.internalError("Failed to update user"), 500);
  }
});

export default mutations;
