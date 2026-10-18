import { firstQueryStringSchema } from "@/contracts/input-formats";
import { TimelineTeamsResponseSchema } from "@/contracts/public-responses";
import { createDb } from "../../db";
import { APIErrors } from "../../lib/api-errors";
import {
  decodeContentCursor,
  type ContentCursor,
} from "../../lib/content-cursor";
import {
  cookieSecurity,
  createApiApp,
  createRoute,
  errorResponses,
  jsonResponse,
  sessionMiddleware,
  validationHook,
  z,
} from "../../lib/openapi";
import {
  buildCreatedTeamsPageQuery,
  buildJoinedTeamsPageQuery,
  toTimelinePage,
} from "./timeline-query";
const timeline = createApiApp();
const timelineQuerySchema = z.object({
  limit: firstQueryStringSchema.describe("每页条数，1–50 的整数，默认 10。"),
  cursor: firstQueryStringSchema.describe(
    "上一页的 nextCursor，原样传回以继续读取。",
  ),
  page: firstQueryStringSchema.describe("不支持此参数，传入时返回 400。"),
  pageSize: firstQueryStringSchema.describe("不支持此参数，传入时返回 400。"),
});

function parseCursorPage(c: {
  req: { query: (name: string) => string | undefined };
}):
  | { ok: true; limit: number; cursor: ContentCursor | null }
  | { ok: false; message: string } {
  if (
    c.req.query("page") !== undefined ||
    c.req.query("pageSize") !== undefined
  ) {
    return {
      ok: false,
      message: "page pagination is not supported; use cursor",
    };
  }
  const rawLimit = c.req.query("limit");
  if (rawLimit !== undefined && !/^[1-9]\d*$/u.test(rawLimit)) {
    return { ok: false, message: "limit must be an integer between 1 and 50" };
  }
  const limit = rawLimit === undefined ? 10 : Number(rawLimit);
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 50) {
    return { ok: false, message: "limit must be an integer between 1 and 50" };
  }
  const encodedCursor = c.req.query("cursor");
  const cursor =
    encodedCursor === undefined ? null : decodeContentCursor(encodedCursor);
  if (encodedCursor !== undefined && !cursor) {
    return { ok: false, message: "Invalid timeline cursor" };
  }
  return { ok: true, limit, cursor };
}

timeline.openapi(
  createRoute({
    description:
      "需要登录，仅查询当前用户作为队长的队伍。limit 默认 10、范围 1–50，使用 cursor 继续读取；不支持 page/pageSize，nextCursor 为 null 表示结束。",
    method: "get",
    path: "/me/created-teams",
    operationId: "usersCreatedTeams",
    tags: ["用户"],
    summary: "分页读取我创建的队伍",
    "x-audience": "public",
    security: cookieSecurity,
    middleware: [sessionMiddleware()],
    request: { query: timelineQuerySchema },
    responses: {
      200: jsonResponse(
        TimelineTeamsResponseSchema,
        "请求成功，响应字段见下方结构。",
      ),
      ...errorResponses(400, 401, 500),
    },
  }),
  async (c) => {
    const userId = c.get("session").user.id;
    const page = parseCursorPage(c);
    if (!page.ok) return c.json(APIErrors.badRequest(page.message), 400);
    const db = createDb(c.env.DB);
    const rows = await buildCreatedTeamsPageQuery(
      db,
      userId,
      page.cursor,
      page.limit + 1,
    );
    return c.json(toTimelinePage(rows, page.limit), 200);
  },
  validationHook("Invalid input", "issues"),
);

timeline.openapi(
  createRoute({
    description:
      "需要登录，仅查询当前用户尚未离开的成员关系对应队伍。limit 默认 10、范围 1–50，使用 cursor 分页；不包含已离队的历史成员关系。",
    method: "get",
    path: "/me/joined-teams",
    operationId: "usersJoinedTeams",
    tags: ["用户"],
    summary: "分页读取我加入的队伍",
    "x-audience": "public",
    security: cookieSecurity,
    middleware: [sessionMiddleware()],
    request: { query: timelineQuerySchema },
    responses: {
      200: jsonResponse(
        TimelineTeamsResponseSchema,
        "请求成功，响应字段见下方结构。",
      ),
      ...errorResponses(400, 401, 500),
    },
  }),
  async (c) => {
    const userId = c.get("session").user.id;
    const page = parseCursorPage(c);
    if (!page.ok) return c.json(APIErrors.badRequest(page.message), 400);
    const db = createDb(c.env.DB);
    const rows = await buildJoinedTeamsPageQuery(
      db,
      userId,
      page.cursor,
      page.limit + 1,
    );
    return c.json(toTimelinePage(rows, page.limit), 200);
  },
  validationHook("Invalid input", "issues"),
);

export default timeline;
