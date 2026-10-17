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
import { resolveAdminAccess, type AdminIdentity } from "./admin-access";

export { createRoute, z } from "@hono/zod-openapi";
export type { RouteHandler, RouteConfig } from "@hono/zod-openapi";
export type ApiEnv = {
  Bindings: Env;
  Variables: {
    admin: AdminIdentity;
    session: NonNullable<Awaited<ReturnType<typeof getActiveSession>>>;
  };
};
export type ValidationDetails = "issues" | "flatten" | "none";
export type ValidationErrorFactory = (
  message: string,
  details?: unknown,
) => APIError;

export const apiErrorSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});

export function jsonResponse<S extends z.ZodType>(
  schema: S,
  description: string,
) {
  return { description, content: { "application/json": { schema } } };
}

type ErrorStatus = ClientErrorStatusCode | ServerErrorStatusCode;
export function errorResponses<const Codes extends readonly ErrorStatus[]>(
  ...codes: Codes
) {
  // This assertion describes the keys produced by Object.fromEntries; no handler response is cast.
  return Object.fromEntries(
    codes.map((code) => [code, jsonResponse(apiErrorSchema, `HTTP ${code}`)]),
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
          const key = String(typeof first === "object" ? first.key : first);
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
    const access = await resolveAdminAccess(c.env, c.req.raw.headers);
    if (access.kind === "unauthenticated")
      return c.json(APIErrors.unauthorized(unauthenticatedMessage), 401);
    if (access.kind === "forbidden")
      return c.json(APIErrors.forbidden(forbiddenMessage), 403);
    c.set("admin", access.admin);
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
