import { Hono } from "hono";
import { eq, and } from "drizzle-orm";
import { createDb } from "../db";
import * as schema from "../db/schema";
import { createAuth, type Env } from "../lib/auth";
import { APIErrors } from "../lib/api-errors";
import { createCitySchema } from "../lib/validation";

const cities = new Hono<{ Bindings: Env }>();

/** 验证管理员权限 */
async function checkAdmin(c: { env: Env; req: { raw: Request } }) {
  const authInstance = createAuth(c.env);
  const session = await authInstance.api.getSession({ headers: c.req.raw.headers });
  if (!session) throw new Error("未登录");
  const db = createDb(c.env.DB);
  const user = await db
    .select({ role: schema.users.role })
    .from(schema.users)
    .where(eq(schema.users.id, session.user.id))
    .then((rows) => rows[0]);
  if (!user || user.role !== "admin") throw new Error("无权限访问");
  return session;
}

/**
 * GET /cities
 * 获取城市列表，支持 ?hot=true 筛选热门城市
 */
cities.get("/", async (c) => {
  try {
    const db = createDb(c.env.DB);
    const hot = c.req.query("hot");
    const province = c.req.query("province");
    const level = c.req.query("level");
    const limit = c.req.query("limit") ? parseInt(c.req.query("limit")!, 10) : undefined;
    const offset = c.req.query("offset") ? parseInt(c.req.query("offset")!, 10) : 0;

    const conditions = [];
    if (hot === "true") conditions.push(eq(schema.cities.isHot, true));
    if (province) conditions.push(eq(schema.cities.province, province));
    if (level) conditions.push(eq(schema.cities.level, level));

    const query = db
      .select()
      .from(schema.cities)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .offset(offset);

    const result = limit ? await query.limit(limit) : await query;

    return c.json({ success: true, cities: result });
  } catch (error) {
    console.error("Get cities error:", error);
    return c.json(APIErrors.internalError("获取城市列表失败"), 500);
  }
});

/**
 * POST /cities
 * 创建城市（需要管理员权限）
 */
cities.post("/", async (c) => {
  try {
    await checkAdmin(c);
    const db = createDb(c.env.DB);
    const body = await c.req.json();

    // Validate input with Zod
    const parsed = createCitySchema.safeParse(body);
    if (!parsed.success) {
      return c.json(APIErrors.validationError("输入验证失败", parsed.error.errors), 400);
    }

    const data = parsed.data;
    const cityId = `city-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    await db.insert(schema.cities).values({
      id: cityId,
      adcode: data.adcode,
      name: data.name,
      level: data.level,
      province: data.province || null,
      isHot: data.isHot ?? false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return c.json({ success: true, cityId });
  } catch (error) {
    const message = (error as Error).message;
    if (message === "未登录") return c.json(APIErrors.unauthorized("未登录"), 401);
    if (message === "无权限访问") return c.json(APIErrors.forbidden("无权限访问"), 403);
    console.error("Create city error:", error);
    return c.json(APIErrors.internalError("创建城市失败"), 500);
  }
});

export { cities as citiesRoute };
