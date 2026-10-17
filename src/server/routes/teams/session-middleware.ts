import type { MiddlewareHandler } from "hono";
import { getActiveSession } from "../../lib/active-session";
import { APIErrors, type APIError } from "../../lib/api-errors";
import type { ApiEnv } from "../../lib/openapi";

/** Keep authorization and its existing error mapping ahead of body validation. */
export function teamSessionMiddleware(
  onFailure: (error: unknown) => APIError,
): MiddlewareHandler<ApiEnv> {
  return async (c, next) => {
    try {
      const session = await getActiveSession(c.env, c.req.raw.headers);
      if (!session) return c.json(APIErrors.unauthorized("请先登录"), 401);
      c.set("session", session);
    } catch (error) {
      return c.json(onFailure(error), 500);
    }
    await next();
  };
}
