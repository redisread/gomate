import { PublicUserResponseSchema } from "@/contracts/public-responses";
import { and, eq, isNull } from "drizzle-orm";
import { createDb } from "../../db";
import * as schema from "../../db/schema";
import { APIErrors } from "../../lib/api-errors";
import {
  createApiApp,
  createRoute,
  errorResponses,
  jsonResponse,
  validationHook,
  z,
} from "../../lib/openapi";
import { getUserStats, getUserOngoingTeams, toPublicUser } from "./utils";
const publicProfile = createApiApp();
publicProfile.openapi(
  createRoute({
    description:
      "无需登录。按用户 ID 返回公开资料及进行中的队伍，不返回邮箱、私密联系方式或完整账号资料；用户不存在或不可公开访问时返回 404。",
    method: "get",
    path: "/{id}",
    operationId: "usersGet",
    tags: ["用户"],
    summary: "读取用户公开资料",
    "x-audience": "public",
    request: { params: z.object({ id: z.string() }) },
    responses: {
      200: jsonResponse(
        PublicUserResponseSchema,
        "请求成功，响应字段见下方结构。",
      ),
      ...errorResponses(400, 404, 500),
    },
  }),
  async (c) => {
    const id = c.req.valid("param").id;
    const db = createDb(c.env.DB);
    const [user] = await db
      .select()
      .from(schema.users)
      .where(
        and(
          eq(schema.users.id, id),
          eq(schema.users.status, "active"),
          eq(schema.users.emailVerified, true),
          isNull(schema.users.deletedAt),
        ),
      )
      .limit(1);
    if (!user) {
      return c.json(APIErrors.notFound("User not found"), 404);
    }
    const [stats, ongoingTeams] = await Promise.all([
      getUserStats(db, id),
      getUserOngoingTeams(db, id),
    ]);
    return c.json(
      {
        success: true as const,
        user: { ...toPublicUser(user), stats },
        ongoingTeams,
      },
      200,
    );
  },
  validationHook("Invalid input", "issues"),
);

export default publicProfile;
