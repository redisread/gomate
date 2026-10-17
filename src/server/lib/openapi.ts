import { OpenAPIHono, z } from "@hono/zod-openapi";
import type {
  Context,
  Env as HonoEnv,
  MiddlewareHandler,
  ValidationTargets,
} from "hono";
import type {
  ClientErrorStatusCode,
  ServerErrorStatusCode,
} from "hono/utils/http-status";
import { APIErrors, type APIError } from "./api-errors";
import { normalizeValidationIssues } from "./validation-issues";
import type { Env } from "./auth";
import { getActiveSession } from "./active-session";
import {
  requireAdmin,
  AdminAccessError,
  type AdminIdentity,
} from "./admin-access";

export { createRoute, z } from "@hono/zod-openapi";
export type { RouteHandler, RouteConfig } from "@hono/zod-openapi";
export type ApiEnv = {
  Bindings: Env;
  Variables: {
    admin: AdminIdentity;
    session: NonNullable<Awaited<ReturnType<typeof getActiveSession>>>;
  };
};
/** HTTP 与 HTTPS 部署沿用 Better Auth 的 Cookie 名称；两种方案择一认证。 */
export const cookieSecurity: Record<string, string[]>[] = [
  { cookieAuth: [] },
  { secureCookieAuth: [] },
];

export type ValidationDetails = "issues" | "flatten" | "none";
export type ValidationErrorFactory = (
  message: string,
  details?: unknown,
) => APIError;

export const apiErrorSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string().describe("稳定的业务错误码，用于客户端判断错误类别。"),
    message: z
      .string()
      .describe("错误诊断信息，不作为稳定协议或客户端翻译键。"),
    details: z
      .unknown()
      .optional()
      .describe(
        "可选错误详情，可能为字段校验问题或包含 reason 的对象；结构随操作而异。",
      ),
  }),
});

export function jsonResponse<S extends z.ZodType>(
  schema: S,
  description: string,
) {
  return { description, content: { "application/json": { schema } } };
}

type ErrorStatus = ClientErrorStatusCode | ServerErrorStatusCode;
// 仅文档说明；不改变运行时错误码、消息或 HTTP 状态。
const errorDescriptions: Partial<Record<ErrorStatus, string>> = {
  400: "请求参数、格式或业务输入不合法，详情见 error。",
  401: "缺少有效会话，或账号已失效，请重新登录。",
  403: "当前身份无权执行操作，或写请求未通过同源校验。",
  404: "资源不存在、不可见或当前环境未开放该入口。",
  409: "当前状态、唯一性或并发更新发生冲突，请先重新读取资源。",
  413: "请求体或上传文件超过此接口允许的大小。",
  415: "不支持该请求媒体类型，请检查 Content-Type。",
  422: "数据违反业务或关联约束，无法完成操作。",
  429: "请求过于频繁，请稍后再试。",
  500: "服务端处理失败，请保留错误码以便排查。",
  503: "服务或依赖暂不可用，也可能处于写保护状态。",
};
export function errorResponses<const Codes extends readonly ErrorStatus[]>(
  ...codes: Codes
) {
  // This assertion describes the keys produced by Object.fromEntries; no handler response is cast.
  return Object.fromEntries(
    codes.map((code) => [
      code,
      jsonResponse(
        apiErrorSchema,
        errorDescriptions[code] ?? `请求失败（HTTP ${code}），详情见 error。`,
      ),
    ]),
  ) as {
    [Code in Codes[number]]: ReturnType<
      typeof jsonResponse<typeof apiErrorSchema>
    >;
  };
}

type ValidationResult = {
  target: keyof ValidationTargets;
  success: boolean;
  error?: z.ZodError;
};
export function validationHook(
  message: string,
  details: ValidationDetails = "issues",
  errorFactory: ValidationErrorFactory = APIErrors.validationError,
) {
  return (result: ValidationResult, c: Context) => {
    if (result.success || !result.error) return;
    // zod-validator provides original data, but OpenAPI's public Hook type omits it.
    // Recover it without an assertion or rereading the body when available.
    const input: unknown = "data" in result ? result.data : undefined;
    const issues = normalizeValidationIssues(result.error.issues, input);
    let output: unknown;
    if (details === "issues") output = issues;
    if (details === "flatten") {
      const formErrors: string[] = [];
      const fieldErrors: Record<string, string[]> = Object.create(null);
      for (const issue of issues) {
        const first = issue.path?.[0];
        if (first === undefined) formErrors.push(issue.message);
        else {
          const key = String(first);
          (fieldErrors[key] ??= []).push(issue.message);
        }
      }
      output = { formErrors, fieldErrors };
    }
    return c.json(errorFactory(message, output), 400);
  };
}

export function createApiApp<E extends HonoEnv = ApiEnv>() {
  return new OpenAPIHono<E>({ defaultHook: validationHook("Invalid input") });
}

/** Ordinary JSON routes historically accept omitted/text media types. Never use for bounded auth/upload readers. */
export function legacyJsonBody(
  malformedMessage: string,
  errorFactory: ValidationErrorFactory = APIErrors.validationError,
): MiddlewareHandler {
  return async (c, next) => {
    const contentType = c.req.header("content-type")?.toLowerCase() ?? "";
    const honoJsonType =
      /^application\/([a-z-.]+\+)?json(;\s*[a-zA-Z0-9-]+=([^;]+))*$/i;
    if (contentType !== "application/json") {
      const headers = new Headers(c.req.raw.headers);
      headers.set("content-type", "application/json");
      c.req.raw = new Request(c.req.raw, { headers });
    }
    // Legacy json-like but invalid media types used to validate an empty object.
    // Cache that value and give the generated validator a canonical media type.
    if (contentType.includes("json") && !honoJsonType.test(contentType)) {
      c.req.bodyCache.json = Promise.resolve({});
    } else {
      try {
        await c.req.json();
      } catch {
        return c.json(errorFactory(malformedMessage), 400);
      }
    }
    await next();
  };
}

export function adminMiddleware(
  unauthenticatedMessage = "Authentication required",
  forbiddenMessage = "Administrator access required",
): MiddlewareHandler<ApiEnv> {
  return async (c, next) => {
    try {
      c.set("admin", await requireAdmin(c));
    } catch (error) {
      if (!(error instanceof AdminAccessError)) throw error;
      return error.kind === "unauthenticated"
        ? c.json(APIErrors.unauthorized(unauthenticatedMessage), 401)
        : c.json(APIErrors.forbidden(forbiddenMessage), 403);
    }
    await next();
  };
}

export function sessionMiddleware(
  message = "Unauthorized",
): MiddlewareHandler<ApiEnv> {
  return async (c, next) => {
    const session = await getActiveSession(c.env, c.req.raw.headers);
    if (!session) return c.json(APIErrors.unauthorized(message), 401);
    c.set("session", session);
    await next();
  };
}
