/**
 * POST /v1/locations — Create a new location.
 *
 * Auth: session cookie or x-api-key.
 * Idempotency-Key: required (400 if missing). Uses Bob's idempotencyMiddleware.
 * Actor: session.user.id, actorApiKeyId set if via API key (#219).
 */
import { Hono } from "hono";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { createAuth } from "../../../lib/auth";
import { createDb } from "../../../db";
import * as schema from "../../../db/schema";
import type { Env } from "../../../lib/auth";
import { APIErrors } from "../../../lib/api-errors";
import { generateId } from "../../../lib/id";
import { idempotencyMiddleware } from "../../../lib/idempotency";
import { resolveAuditActor } from "../../../lib/audit";

const writeLocations = new Hono<{ Bindings: Env }>();

const createLocationSchema = z.object({
  name: z.string().min(1, "地点名称不能为空").max(200),
  slug: z.string().max(200).optional(),
  type: z.string().max(50).optional(),
  subtitle: z.string().max(500).optional(),
  description: z.string().min(1, "地点描述不能为空").max(5000),
  address: z.string().max(500).optional(),
  cityId: z.string().min(1, "城市ID不能为空"),
  cityName: z.string().max(100).optional(),
  bestSeason: z.array(z.string()).optional(),
  coverImage: z.string().url("封面图片必须是有效URL"),
  images: z.array(z.string().url()).optional(),
  coordinates: z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }).optional(),
  extra: z.record(z.unknown()).nullable().optional(),
  parkingAvailable: z.boolean().nullable().optional(),
  parkingInfo: z.string().max(100).optional(),
});

writeLocations.post("/", idempotencyMiddleware, async (c) => {
  try {
    // 1. Authenticate
    const auth = createAuth(c.env);
    const session = await auth.api.getSession({ headers: c.req.raw.headers }).catch(() => null);
    if (!session) {
      return c.json(APIErrors.unauthorized("请先登录"), 401);
    }
    const audit = await resolveAuditActor(c);
    const actorApiKeyId = audit.apiKeyId;

    // 2. Parse body
    const body = await c.req.json().catch(() => null);
    if (!body) {
      return c.json(APIErrors.validationError("请求体无效"), 400);
    }
    const parsed = createLocationSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(APIErrors.validationError("输入无效", parsed.error.errors), 400);
    }
    const data = parsed.data;

    const db = createDb(c.env.DB);

    // 3. Verify city exists
    const city = await db.query.cities.findFirst({ where: eq(schema.cities.id, data.cityId) });
    if (!city) {
      return c.json(APIErrors.notFound("城市不存在"), 404);
    }

    // 4. Create location
    const id = generateId();
    const slug = data.slug ?? data.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const now = new Date();

    await db.insert(schema.locations).values({
      id,
      name: data.name,
      slug,
      type: data.type ?? null,
      subtitle: data.subtitle ?? null,
      description: data.description,
      address: data.address ?? null,
      cityId: data.cityId,
      cityName: data.cityName ?? city.name,
      bestSeason: JSON.stringify(data.bestSeason ?? []),
      coverImage: data.coverImage,
      images: JSON.stringify(data.images ?? []),
      coordinates: JSON.stringify(data.coordinates ?? { lat: 0, lng: 0 }),
      extra: data.extra ? JSON.stringify(data.extra) : null,
      parkingAvailable: data.parkingAvailable ?? null,
      parkingInfo: data.parkingInfo ?? null,
      createdAt: now,
      updatedAt: now,
      actorApiKeyId: actorApiKeyId ?? null,
    });

    return c.json({ success: true, location: { id, slug }, actorType: audit.actorType }, 201);
  } catch (error) {
    console.error("[v1/locations POST] error:", error);
    return c.json(APIErrors.internalError("创建地点失败"), 500);
  }
});

export { writeLocations };
