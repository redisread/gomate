import type { OpenAPIHono } from "@hono/zod-openapi";
import { Scalar } from "@scalar/hono-api-reference";
import type { Context } from "hono";
import type { WorkerEnv } from "../env";
import { adminAccessErrorResponse, requireAdmin } from "./admin-access";
import { APIErrors } from "./api-errors";
import { apiErrorSchema } from "./openapi";

export const SCALAR_ASSET_PATH = "/generated/scalar-1.75.0/standalone.js";
type DocumentationApp = OpenAPIHono<{ Bindings: WorkerEnv }>;
type Document = ReturnType<DocumentationApp["getOpenAPI31Document"]>;
const methods = [
  "get",
  "post",
  "put",
  "patch",
  "delete",
  "head",
  "options",
  "trace",
] as const;

/** Filter operations first, then retain only components reachable from this audience. */
export function audienceDocument(
  document: Document,
  audience: "public" | "admin",
): Document {
  const result = structuredClone(document);
  for (const [path, item] of Object.entries(result.paths ?? {})) {
    if (!item) continue;
    for (const method of methods) {
      const operation = item[method];
      if (!operation) continue;
      const visibility = operation["x-audience"];
      if (
        !["public", "admin", "platform", "excluded"].includes(
          String(visibility),
        )
      )
        throw new Error(`Unclassified API operation: ${method} ${path}`);
      if (
        visibility === "excluded" ||
        (visibility === "admin" && audience === "public")
      ) {
        delete item[method];
      }
    }
    if (!methods.some((method) => item[method])) delete result.paths![path];
  }

  const components = result.components;
  delete result.components;
  const reachable = new Set<string>();
  const visit = (value: unknown): void => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    for (const [key, child] of Object.entries(value)) {
      if (
        key === "$ref" &&
        typeof child === "string" &&
        child.startsWith("#/components/")
      ) {
        if (reachable.has(child)) continue;
        reachable.add(child);
        const [, , group, name] = child.split("/");
        const entries = components?.[group as keyof typeof components];
        if (!entries || !(name in entries))
          throw new Error(`Unresolved OpenAPI reference: ${child}`);
        visit(entries[name as keyof typeof entries]);
      } else if (key === "security" && Array.isArray(child)) {
        for (const requirement of child) {
          for (const name of Object.keys(requirement)) {
            reachable.add(`#/components/securitySchemes/${name}`);
          }
        }
      } else visit(child);
    }
  };
  visit(result);
  const retained: Record<string, Record<string, unknown>> = {};
  for (const [group, entries] of Object.entries(components ?? {})) {
    for (const [name, value] of Object.entries(entries)) {
      if (reachable.has(`#/components/${group}/${name}`)) {
        (retained[group] ??= {})[name] = value;
      }
    }
  }
  result.components = retained;
  return result;
}

export function registerDocumentation(app: DocumentationApp) {
  app.openAPIRegistry.register("ApiError", apiErrorSchema);
  app.openAPIRegistry.registerComponent("securitySchemes", "cookieAuth", {
    type: "apiKey",
    in: "cookie",
    name: "better-auth.session_token",
  });
  app.openAPIRegistry.registerComponent("securitySchemes", "secureCookieAuth", {
    type: "apiKey",
    in: "cookie",
    name: "__Secure-better-auth.session_token",
  });
  const documents = new Map<"public" | "admin", Document>();
  function document(audience: "public" | "admin") {
    const cached = documents.get(audience);
    if (cached) return cached;
    const generated = app.getOpenAPI31Document({
      openapi: "3.1.0",
      info: {
        title: audience === "admin" ? "GoMate Admin API" : "GoMate API",
        version: "1.0.0",
        description:
          "同源 Cookie 认证；文档不改变接口权限。列表使用各操作声明的分页规则。",
      },
      servers: [{ url: "/api" }],
    });
    // These responses come from the common HTTP boundary, before any route handler.
    for (const item of Object.values(generated.paths ?? {})) {
      for (const method of ["post", "put", "patch", "delete"] as const) {
        const operation = item?.[method];
        if (!operation) continue;
        const content = {
          "application/json": {
            schema: { $ref: "#/components/schemas/ApiError" },
          },
        };
        operation.responses ??= {};
        operation.responses[403] ??= {
          description: "Cross-origin Cookie write rejected",
          content,
        };
        operation.responses[503] ??= {
          description: "Writes are protected (WRITE_MODE or Preview policy)",
          content,
          headers: {
            "Retry-After": {
              description: "Retry delay in seconds for WRITE_PROTECTED",
              schema: { type: "string", example: "60" },
            },
          },
        };
      }
    }
    const filtered = audienceDocument(generated, audience);
    documents.set(audience, filtered);
    return filtered;
  }

  async function access(c: Context<{ Bindings: WorkerEnv }>, admin: boolean) {
    if (c.env.API_DOCS_ENABLED !== "true")
      return c.json(APIErrors.notFound(), 404);
    if (!admin) return;
    c.header("Cache-Control", "private, no-store");
    try {
      await requireAdmin(c);
    } catch (error) {
      const denied = adminAccessErrorResponse(c, error);
      if (denied) return denied;
      throw error;
    }
  }

  for (const audience of ["public", "admin"] as const) {
    const prefix = audience === "admin" ? "/admin" : "";
    app.get(`${prefix}/openapi.json`, async (c) => {
      const denied = await access(c, audience === "admin");
      if (denied) return denied;
      c.header(
        "Cache-Control",
        audience === "admin" ? "private, no-store" : "no-cache",
      );
      return c.json(document(audience));
    });
    app.get(`${prefix}/docs`, async (c, next) => {
      const denied = await access(c, audience === "admin");
      if (denied) return denied;
      c.header("Cache-Control", "private, no-store");
      const hostname = new URL(c.req.url).hostname;
      const local = ["localhost", "127.0.0.1", "[::1]"].includes(hostname);
      return Scalar<{ Bindings: WorkerEnv }>({
        url: `/api${prefix}/openapi.json`,
        cdn: SCALAR_ASSET_PATH,
        pageTitle:
          audience === "admin" ? "GoMate 管理员 API 文档" : "GoMate API 文档",
        hideTestRequestButton: !local,
        hideClientButton: true,
        persistAuth: false,
        withDefaultFonts: false,
        proxyUrl: "",
      })(c, next);
    });
  }
}
