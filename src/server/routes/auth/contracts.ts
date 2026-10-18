import type { OpenAPIHono } from "@hono/zod-openapi";
import type { Env } from "../../lib/auth";
import {
  createRoute,
  z,
  jsonResponse,
  errorResponses,
  apiErrorSchema,
} from "../../lib/openapi";
import {
  BrowserSignInSchema,
  BrowserSessionSchema,
  AuthProviderErrorSchema,
  SignOutSchema,
} from "@/contracts/auth-api";
import {
  forgotPasswordSchema,
  signUpEmailSchema,
  signInEmailSchema,
  verificationEmailSchema,
  emailConfirmationSchema,
  passwordResetSchema,
  googleSignInSchema,
} from "./schemas";

// Controlled readers above enforce 16 KiB before JSON parsing. Registry-only
// contracts deliberately do not install Hono's eager body validator.
const authError = jsonResponse(
  z.union([apiErrorSchema, AuthProviderErrorSchema]),
  "认证失败；可能为统一业务错误或认证供应商错误，见下方结构。",
);

const acknowledgment = z.object({ success: z.literal(true) });

const authContracts = {
  forgotPassword: createRoute({
    method: "post",
    path: "/forgot-password",
    operationId: "forgotPassword",
    summary: "申请密码重置邮件",
    tags: ["认证"],
    "x-audience": "public",
    description:
      "无需登录。JSON 请求体上限 16 KiB，受邮件发送限频约束。接受请求后返回统一确认，不泄露邮箱是否存在。邮件中的 token 置于 URL fragment，重置时应通过 POST body 提交。",
    request: {
      body: {
        required: true,
        content: { "application/json": { schema: forgotPasswordSchema } },
      },
    },
    responses: {
      200: jsonResponse(
        acknowledgment.extend({ message: z.string() }),
        "请求已受理，不表示邮箱一定存在。",
      ),
      ...errorResponses(400, 413, 415, 429, 500, 503),
    },
  }),
  signUp: createRoute({
    description:
      "无需登录。JSON 请求体上限 16 KiB，受注册限频约束。返回固定成功确认以避免账号枚举；新账号只有在用户与密码凭证持久化完成后才确认成功。注册不返回会话 token。",
    method: "post",
    path: "/sign-up/email",
    operationId: "signUpEmail",
    summary: "使用邮箱注册",
    tags: ["认证"],
    "x-audience": "public",
    request: {
      body: {
        required: true,
        content: { "application/json": { schema: signUpEmailSchema } },
      },
    },
    responses: {
      200: jsonResponse(acknowledgment, "注册请求确认，不返回会话 token。"),
      ...errorResponses(400, 413, 415, 429, 500, 503),
    },
  }),
  signIn: createRoute({
    description:
      "无需预先登录。JSON 请求体上限 16 KiB，受登录限频约束。成功后由同源 HttpOnly Cookie 保存会话，响应只返回浏览器所需用户和跳转信息，不包含会话 token。",
    method: "post",
    path: "/sign-in/email",
    operationId: "signInEmail",
    summary: "使用邮箱登录",
    tags: ["认证"],
    "x-audience": "public",
    request: {
      body: {
        required: true,
        content: { "application/json": { schema: signInEmailSchema } },
      },
    },
    responses: {
      200: jsonResponse(
        BrowserSignInSchema,
        "登录成功，会话 token 仅通过 HttpOnly Cookie 设置。",
      ),
      ...errorResponses(400, 401, 413, 415, 429, 500, 503),
    },
  }),
  verification: createRoute({
    description:
      "无需预先登录。JSON 请求体上限 16 KiB，受邮件发送限频约束。验证链接只在 fragment 中携带 token；客户端读取并清除 fragment 后调用确认接口。部分错误由认证供应商返回，格式见响应 Schema。",
    method: "post",
    path: "/send-verification-email",
    operationId: "sendVerificationEmail",
    summary: "申请邮箱验证邮件",
    tags: ["认证"],
    "x-audience": "public",
    request: {
      body: {
        required: true,
        content: { "application/json": { schema: verificationEmailSchema } },
      },
    },
    responses: {
      200: jsonResponse(
        z.object({ status: z.boolean() }),
        "验证邮件请求已受理。",
      ),
      ...errorResponses(413, 415, 429, 503),
      400: authError,
      403: authError,
      500: authError,
    },
  }),
  confirm: createRoute({
    method: "post",
    path: "/confirm-email",
    operationId: "confirmEmail",
    summary: "确认邮箱验证",
    tags: ["认证"],
    "x-audience": "public",
    description:
      "无需预先登录。将邮件链接 fragment 中的 token 放入 JSON body，禁止通过路径或查询参数提交。JSON 请求体上限 16 KiB；无效或过期 token 无法完成验证。",
    request: {
      body: {
        required: true,
        content: { "application/json": { schema: emailConfirmationSchema } },
      },
    },
    responses: {
      200: jsonResponse(acknowledgment, "邮箱验证成功。"),
      ...errorResponses(400, 413, 415, 429, 500, 503),
    },
  }),
  reset: createRoute({
    description:
      "无需预先登录。提交邮件 fragment 中的 token 和新密码，JSON 请求体上限 16 KiB。不要把 token 放入路径、查询参数或日志；成功后返回 success 确认。",
    method: "post",
    path: "/reset-password",
    operationId: "resetPassword",
    summary: "重置登录密码",
    tags: ["认证"],
    "x-audience": "public",
    request: {
      body: {
        required: true,
        content: { "application/json": { schema: passwordResetSchema } },
      },
    },
    responses: {
      200: jsonResponse(acknowledgment, "密码重置成功。"),
      ...errorResponses(400, 413, 415, 429, 500, 503),
    },
  }),
  signOut: createRoute({
    description:
      "通过浏览器的同源 Cookie 注销当前会话。请求体可省略；可选注销参数由 Better Auth 校验。此操作受同源写保护约束，不等于删除账号。",
    method: "post",
    path: "/sign-out",
    operationId: "signOut",
    summary: "退出当前会话",
    request: {
      body: {
        required: false,
        description: "可选注销参数，由 Better Auth 负责校验。",
        content: {
          "application/json": {
            schema: z.object({
              callbackURL: z.string().optional(),
              disableRedirect: z.boolean().optional(),
              state: z.string().optional(),
            }),
          },
        },
      },
    },
    tags: ["认证"],
    "x-audience": "public",
    responses: {
      200: jsonResponse(SignOutSchema, "当前会话已注销。"),
      400: authError,
      500: authError,
      ...errorResponses(403, 503),
    },
  }),
  social: createRoute({
    method: "post",
    path: "/sign-in/social",
    operationId: "signInGoogle",
    summary: "发起 Google 登录",
    tags: ["认证"],
    "x-audience": "public",
    description:
      "仅在环境已配置并开放 Google 登录时可用。只接受 google 供应商，callbackURL 必须为允许的本站页面；JSON 上限 16 KiB，并执行同源校验与登录限频。响应返回 OAuth 跳转地址，Preview 不开放此流程。",
    request: {
      body: {
        required: true,
        content: { "application/json": { schema: googleSignInSchema } },
      },
    },
    responses: {
      200: jsonResponse(
        z.object({ url: z.string(), redirect: z.boolean() }),
        "OAuth 跳转地址及是否跳转的标识。",
      ),
      400: authError,
      500: authError,
      ...errorResponses(403, 404, 413, 415, 429, 503),
    },
  }),
  callback: createRoute({
    description:
      "供 Google OAuth 重定向调用，由 Better Auth 校验 state 与 Cookie 并交换授权码。成功或失败均重定向到本站页面，不回显供应商错误详情。仅正式 APP_URL 且允许写入时开放。",
    method: "get",
    path: "/callback/google",
    operationId: "googleCallback",
    summary: "处理 Google 登录回调",
    tags: ["认证"],
    "x-audience": "public",
    request: {
      query: z
        .object({
          code: z.string().optional(),
          state: z.string().optional(),
          error: z.string().optional(),
          error_description: z.string().optional(),
        })
        .passthrough(),
    },
    responses: {
      302: {
        description: "重定向到本站页面或登录错误页。",
        headers: {
          Location: {
            schema: { type: "string" },
            description: "本站的回跳地址。",
          },
        },
      },
    },
  }),
};

export function registerAuthContracts(auth: OpenAPIHono<{ Bindings: Env }>) {
  for (const [name, contract] of Object.entries(authContracts))
    auth.openAPIRegistry.registerPath({
      ...contract,
      "x-validation-mode": ["signOut", "callback"].includes(name)
        ? "provider-controlled"
        : "bounded-json",
    });

  for (const method of ["get", "post"] as const)
    auth.openAPIRegistry.registerPath(
      createRoute({
        method,
        path: "/get-session",
        operationId: method === "get" ? "getSession" : "postSession",
        summary: "读取当前浏览器会话",
        tags: ["认证"],
        "x-audience": "public",
        "x-validation-mode": "provider-controlled",
        description:
          "强制回源读取当前会话；无有效会话时返回 null。响应不包含会话 token、IP 地址或 User-Agent。GET 和 POST 返回相同数据结构，但 POST 仍受全局写保护约束。",
        security: [{}, { cookieAuth: [] }, { secureCookieAuth: [] }],
        responses: {
          200: jsonResponse(
            BrowserSessionSchema,
            "当前浏览器会话，无有效会话时为 null。",
          ),
          400: authError,
          401: authError,
          500: authError,
          ...errorResponses(
            403,
            ...(method === "post" ? ([503] as const) : []),
          ),
        },
      }),
    );
}

export const authProvidersContract = createRoute({
  description:
    "无需登录。返回 google 布尔值，表示当前环境是否开放 Google 登录；不返回客户端密钥等凭据。响应禁止缓存，Preview 不开放 Google 登录。",
  method: "get",
  path: "/providers",
  operationId: "getAuthProviders",
  summary: "读取可用登录方式",
  tags: ["认证"],
  "x-audience": "public",
  responses: {
    200: jsonResponse(
      z.object({ google: z.boolean() }),
      "当前环境可用的登录方式。",
    ),
  },
});
