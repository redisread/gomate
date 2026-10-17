import { RegionSchema } from "@/contracts";
import { and, asc, eq } from "drizzle-orm";
import {
  createApiApp,
  createRoute,
  errorResponses,
  jsonResponse,
  validationHook,
  z,
} from "../lib/openapi";

import { createDb } from "../db";
import { region } from "../db/schema";
import { APIErrors } from "../lib/api-errors";
import { logger } from "../lib/logger";

const querySchema = z.object({
  countryCode: z
    .string()
    .regex(/^[A-Za-z]{2}$/)
    .transform((value) => value.toUpperCase())
    .default("CN")
    .describe("两位国家代码，归一化为大写，默认 CN。"),
  level: z
    .enum(["province", "city", "district", "other"])
    .default("city")
    .describe("地区层级，默认 city；可选 province、city、district、other。"),
  serviceEnabled: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .prefault("true")
    .describe("是否启用服务，默认 true；查询参数使用字符串 true 或 false。"),
  parentId: z
    .string()
    .trim()
    .min(1)
    .max(128)
    .optional()
    .describe("可选父级地区 ID，仅返回其直接子级。"),
});

const regionsRoute = createApiApp();

regionsRoute.openapi(
  createRoute({
    description:
      "无需登录。默认查询中国已启用服务的城市（countryCode=CN、level=city、serviceEnabled=true），可按父级地区筛选。国家代码归一化为大写，结果按 sortOrder 和 ID 升序排列。",
    method: "get",
    path: "/",
    operationId: "regionsList",
    tags: ["地区"],
    summary: "查询服务地区",
    "x-audience": "public",
    request: { query: querySchema },
    responses: {
      200: jsonResponse(
        z.object({ success: z.literal(true), regions: z.array(RegionSchema) }),
        "请求成功，响应字段见下方结构。",
      ),
      ...errorResponses(400, 500),
    },
  }),
  async (c) => {
    const parsed = c.req.valid("query");
    try {
      const db = createDb(c.env.DB);
      const filters = [
        eq(region.countryCode, parsed.countryCode),
        eq(region.level, parsed.level),
        eq(region.serviceEnabled, parsed.serviceEnabled),
      ];
      if (parsed.parentId) {
        filters.push(eq(region.parentId, parsed.parentId));
      }

      const regions = await db
        .select({
          id: region.id,
          countryCode: region.countryCode,
          parentId: region.parentId,
          name: region.name,
          nameEn: region.nameEn,
          slug: region.slug,
          code: region.code,
          level: region.level,
          timezone: region.timezone,
          centerLatitude: region.centerLatitude,
          centerLongitude: region.centerLongitude,
          serviceEnabled: region.serviceEnabled,
          isHot: region.isHot,
          sortOrder: region.sortOrder,
        })
        .from(region)
        .where(and(...filters))
        .orderBy(asc(region.sortOrder), asc(region.id));

      return c.json({ success: true as const, regions }, 200);
    } catch (error) {
      logger.error("regions_list_failed", {
        errorType: error instanceof Error ? error.name : "UnknownError",
      });
      return c.json(APIErrors.internalError("Failed to list regions"), 500);
    }
  },
  validationHook("Invalid region filters", "flatten"),
);

export { regionsRoute };
