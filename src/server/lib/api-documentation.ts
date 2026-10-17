import docsZh from "../../../public/locales/zh-CN/apiDocs.json";
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

/** 先按受众过滤操作，再保留可达组件，避免公开规范泄露管理员专用结构。 */
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
            if (!components?.securitySchemes?.[name])
              throw new Error(`Unresolved OpenAPI security scheme: ${name}`);
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
        title:
          audience === "admin" ? "GoMate 管理员 API 文档" : "GoMate API 文档",
        version: "1.0.0",
        description: [
          "GoMate 接口文档当前统一使用简体中文，所有接口路径均以 `/api` 为前缀。字段名、枚举值与 operationId 是稳定协议标识，不随文档语言变化。",
          "### 认证与权限\n浏览器使用同源 HttpOnly Cookie 会话，无需手工填写 token。公开文档也包含需登录的产品接口；管理员接口每次从数据库复核有效账号和管理员角色。文档可见不代表有权执行接口。",
          "### 请求与响应\n除上传使用 multipart/form-data 外，声明了 JSON 请求体的接口应发送 application/json。时间通常为 ISO 8601 字符串，带时区；具体格式、必填与可空约束以各字段 Schema 为准。成功响应并非统一包裹在 data 中，请按各操作结构解析。",
          "### 分页\n多数列表使用 limit 与不透明 cursor，客户端原样传回 nextCursor，为 null 时结束。更换筛选条件后从第一页开始。各接口的默认值、上限和排序不同；标签目录仍使用 page/pageSize，不能套用 cursor。",
          "### 错误与重试\n业务错误通常为 { success: false, error: { code, message, details? } }；部分认证响应使用供应商结构。按 code、HTTP 状态及已知 details.reason 分支处理，不依赖 message 文案。400 表示输入不合法，401 表示需要有效登录，403 表示权限或来源不允许，404 表示资源不存在或不可见，409 表示状态或并发冲突。遇到写入响应丢失应先查询结果；是否可以安全重试取决于各操作的幂等约定。",
          "### 写保护\n携带 Cookie 的写请求必须通过同源校验。WRITE_MODE=protected 或 Preview 策略可阻止写入，返回 503、WRITE_PROTECTED 和 Retry-After: 60；等待不代表恢复写入权限。Preview 只额外开放邮箱登录和注销，不开放业务写入。",
          "### 文档使用\n仅本地页面显示请求执行按钮，生产及 Preview 隐藏执行入口。文档由路由和共享 Schema 自动生成，不另行维护协议副本。",
        ].join("\n\n"),
      },
      servers: [{ url: "/api" }],
    });
    // 全局写保护先于业务路由执行，因此统一补充错误响应而不重复声明到每个接口。
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
          description: "携带 Cookie 的写请求未通过同源校验。",
          content,
        };
        const protectedResponse = operation.responses[503];
        if (!protectedResponse || !("$ref" in protectedResponse)) {
          operation.responses[503] = {
            ...(protectedResponse ?? { content }),
            description: `${protectedResponse?.description ?? "服务暂不可用。"} WRITE_MODE 或 Preview 策略可能禁止写入，错误码为 WRITE_PROTECTED。`,
            headers: {
              ...protectedResponse?.headers,
              "Retry-After": {
                description:
                  "写保护响应的建议等待秒数；恢复写入仍取决于环境策略。",
                schema: { type: "string", example: "60" },
              },
            },
          };
        }
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
      // 文档目前固定中文；后续完整支持多语言时再一起切换标题、正文及缓存键。
      return Scalar<{ Bindings: WorkerEnv }>({
        url: `/api${prefix}/openapi.json`,
        cdn: SCALAR_ASSET_PATH,
        localization: { locale: "zh-CN" },
        modelsSectionLabel: "数据模型",
        pageTitle:
          audience === "admin" ? docsZh.adminTitle : docsZh.publicTitle,
        hideTestRequestButton: !local,
        hideClientButton: true,
        persistAuth: false,
        withDefaultFonts: false,
        showDeveloperTools: "never",
        agent: { disabled: true },
        mcp: { disabled: true },
        proxyUrl: "",
      })(c, next);
    });
  }
}
