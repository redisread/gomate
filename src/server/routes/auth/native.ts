import {
  NativeSessionSchema as sessionSchema,
  NativeExchangeSchema as requestSchema,
  NativeChallengeSchema as challengeSchema,
  NativeAppleSignInSchema as appleSchema,
  NativeProvidersSchema,
  NativeStartResponseSchema,
} from "@/contracts/native-auth";
import type { Handler } from "hono";
import type { Env } from "../../lib/auth";
import type { RouteConfig } from "../../lib/openapi";
import { symmetricEncrypt } from "better-auth/crypto";
import {
  createApiApp,
  createRoute,
  errorResponses,
  jsonResponse,
  z,
} from "../../lib/openapi";
import { createAuth } from "../../lib/auth";
import { APIErrors } from "../../lib/api-errors";
import { isGoogleAuthAvailable } from "../../lib/google-auth";
import { isAppleConfigured, exchangeAppleCode } from "../../lib/apple-auth";
import {
  createNativeRequest,
  consumeNativeRequest,
} from "../../lib/native-auth";
import { signInEmailSchema } from "./schemas";
import {
  enforceNativeRateLimit,
  getExecutionContext,
  readBoundedJson,
  type AuthContext,
} from "./request";

const native = createApiApp<{ Bindings: Env }>();
function registerNative(
  route: RouteConfig,
  handler: Handler<{ Bindings: Env }>,
) {
  native.on(route.method.toUpperCase(), route.path, handler);
  native.openAPIRegistry.registerPath(route);
}
native.use("*", async (c, next) => {
  c.header("Cache-Control", "no-store");
  c.header("Referrer-Policy", "no-referrer");
  if (
    new URL(c.req.url).origin !== new URL(c.env.APP_URL).origin ||
    c.env.WRITE_MODE !== "open"
  ) {
    return c.json(APIErrors.writeProtected(), 503);
  }
  const origin = c.req.header("origin");
  if (origin && origin !== new URL(c.env.APP_URL).origin)
    return c.json(APIErrors.forbidden("Invalid native origin"), 403);
  if (c.req.method === "POST" && c.req.header("cookie"))
    return c.json(
      APIErrors.forbidden("Native requests cannot use cookies"),
      403,
    );
  await next();
});

function authRequest(c: AuthContext, path: string, body: unknown): Request {
  const headers = new Headers(c.req.raw.headers);
  headers.delete("content-length");
  headers.delete("authorization");
  headers.delete("cookie");
  headers.set("content-type", "application/json");
  headers.set("origin", new URL(c.env.APP_URL).origin);
  return new Request(new URL(`/api/auth${path}`, c.env.APP_URL), {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

async function tokenResponse(c: AuthContext, response: Response) {
  if (!response.ok)
    return c.json(APIErrors.unauthorized("Unable to sign in"), 401);
  const data = (await response.json()) as { token?: string };
  if (!data.token)
    return c.json(APIErrors.internalError("Invalid session response"), 500);
  return c.json({ token: data.token }, 200);
}

registerNative(
  createRoute({
    method: "get",
    path: "/providers",
    operationId: "nativeProviders",
    tags: ["认证"],
    summary: "读取原生登录方式",
    description:
      "返回当前正式或本地环境已配置的原生登录方式，写保护期间拒绝原生认证。",
    "x-audience": "public",
    responses: {
      200: jsonResponse(NativeProvidersSchema, "当前环境可用的原生登录方式。"),
      ...errorResponses(503),
    },
  }),
  (c) =>
    c.json(
      {
        google: isGoogleAuthAvailable(c.req.raw, c.env),
        apple: isAppleConfigured(c.env),
      },
      200,
    ),
);

registerNative(
  createRoute({
    method: "post",
    path: "/sign-in/email",
    operationId: "nativeEmailSignIn",
    tags: ["认证"],
    summary: "原生邮箱登录",
    description:
      "原生客户端提交邮箱密码，经限流及验证后获取会话凭据，拒绝 Cookie 请求。",
    "x-audience": "public",
    request: {
      body: {
        required: true,
        content: { "application/json": { schema: signInEmailSchema } },
      },
    },
    responses: {
      200: jsonResponse(
        sessionSchema,
        "会话凭据仅返回给原生客户端并存入安全存储。",
      ),
      ...errorResponses(400, 401, 403, 429, 503),
    },
  }),
  async (c) => {
    const parsed = await readBoundedJson(c, signInEmailSchema);
    if ("response" in parsed) return parsed.response;
    const limited = await enforceNativeRateLimit(
      c,
      c.env.AUTH_SIGN_IN_RATE_LIMITER,
      "sign_in",
      parsed.data.email,
    );
    if (limited) return limited;
    return tokenResponse(
      c,
      await createAuth(c.env, getExecutionContext(c)).handler(
        authRequest(c, "/sign-in/email", parsed.data),
      ),
    );
  },
);

registerNative(
  createRoute({
    method: "post",
    path: "/google/start",
    operationId: "nativeGoogleStart",
    tags: ["认证"],
    summary: "开始原生 Google 认证",
    description:
      "接收 SHA256 PKCE challenge，创建五分钟有效的登录请求，返回系统浏览器入口。",
    "x-audience": "public",
    request: {
      body: {
        required: true,
        content: { "application/json": { schema: challengeSchema } },
      },
    },
    responses: {
      200: jsonResponse(
        NativeStartResponseSchema,
        "使用系统认证窗口打开 URL，保留本机 verifier。",
      ),
      ...errorResponses(400, 404, 429, 503),
    },
  }),
  async (c) => {
    if (!isGoogleAuthAvailable(c.req.raw, c.env))
      return c.json(APIErrors.notFound("Google unavailable"), 404);
    const parsed = await readBoundedJson(c, challengeSchema);
    if ("response" in parsed) return parsed.response;
    const limited = await enforceNativeRateLimit(
      c,
      c.env.AUTH_SIGN_IN_RATE_LIMITER,
      "native_google_start",
    );
    if (limited) return limited;
    const requestId = await createNativeRequest(c.env, parsed.data.challenge);
    return c.json(
      {
        requestId,
        url: new URL(
          `/api/auth/native/google/authorize?request=${requestId}`,
          c.env.APP_URL,
        ).href,
      },
      200,
    );
  },
);

registerNative(
  createRoute({
    method: "get",
    path: "/google/authorize",
    operationId: "nativeGoogleAuthorize",
    tags: ["认证"],
    summary: "打开 Google 系统认证",
    description:
      "使用已创建的请求 ID 开始 Google OAuth，服务端将该请求绑定到 OAuth state。",
    "x-audience": "public",
    request: { query: z.object({ request: z.uuid() }) },
    responses: {
      302: { description: "跳转到 Google 授权页。" },
      ...errorResponses(400, 401, 404, 503),
    },
  }),
  async (c) => {
    if (!isGoogleAuthAvailable(c.req.raw, c.env))
      return c.json(APIErrors.notFound("Google unavailable"), 404);
    const id = c.req.query("request");
    if (!z.uuid().safeParse(id).success)
      return c.json(APIErrors.badRequest("Invalid request"), 400);
    const pending = await c.env.DB.prepare(
      "SELECT id FROM verifications WHERE identifier=? AND expires_at>? AND json_extract(value,'$.userId') IS NULL",
    )
      .bind(`native:${id}`, Date.now())
      .first();
    if (!pending) return c.json(APIErrors.badRequest("Request expired"), 400);
    const response = await createAuth(c.env, getExecutionContext(c)).handler(
      authRequest(c, "/sign-in/social", {
        provider: "google",
        callbackURL: `${c.env.APP_URL}/api/auth/native/google/complete?request=${id}`,
        errorCallbackURL: `${c.env.APP_URL}/api/auth/native/google/failed`,
      }),
    );
    if (!response.ok)
      return c.json(
        APIErrors.unauthorized("Unable to start Google sign-in"),
        401,
      );
    const payload = (await response.json()) as { url: string };
    const headers = new Headers({
      location: payload.url,
      "cache-control": "no-store",
      "referrer-policy": "no-referrer",
    });
    for (const cookie of response.headers.getSetCookie())
      headers.append("set-cookie", cookie);
    return new Response(null, { status: 302, headers });
  },
);

registerNative(
  createRoute({
    method: "get",
    path: "/google/failed",
    operationId: "nativeGoogleFailed",
    tags: ["认证"],
    summary: "返回原生认证失败状态",
    description:
      "将认证失败结果通过固定回跳地址交给 App，客户端取消当前登录流程并允许用户重新发起认证。",
    "x-audience": "public",
    responses: {
      302: { description: "固定 App 回跳地址。" },
      ...errorResponses(503),
    },
  }),
  (c) => c.redirect("gomate://auth/callback#error=authentication_failed"),
);

registerNative(
  createRoute({
    method: "post",
    path: "/exchange",
    operationId: "nativeExchange",
    tags: ["认证"],
    summary: "兑换一次性原生登录请求",
    description:
      "同时校验请求 ID、仅从 Google 回调获得的随机 code 与 PKCE verifier，原子消费后创建会话。",
    "x-audience": "public",
    request: {
      body: {
        required: true,
        content: { "application/json": { schema: requestSchema } },
      },
    },
    responses: {
      200: jsonResponse(
        sessionSchema,
        "PKCE 校验成功后创建可撤销会话，请求只可使用一次。",
      ),
      ...errorResponses(400, 401, 429, 503),
    },
  }),
  async (c) => {
    const parsed = await readBoundedJson(c, requestSchema);
    if ("response" in parsed) return parsed.response;
    const limited = await enforceNativeRateLimit(
      c,
      c.env.AUTH_SIGN_IN_RATE_LIMITER,
      "native_exchange",
    );
    if (limited) return limited;
    const userId = await consumeNativeRequest(
      c.env,
      parsed.data.requestId,
      parsed.data.verifier,
      parsed.data.code,
    );
    if (!userId)
      return c.json(APIErrors.unauthorized("Invalid native request"), 401);
    const context = await createAuth(c.env).$context;
    const session = await context.internalAdapter.createSession(userId);
    if (!session)
      return c.json(APIErrors.unauthorized("Account unavailable"), 401);
    return c.json({ token: session.token }, 200);
  },
);

registerNative(
  createRoute({
    method: "post",
    path: "/sign-in/apple",
    operationId: "nativeAppleSignIn",
    tags: ["认证"],
    summary: "原生 Apple 登录",
    description:
      "服务端兑换一次性 Apple 授权码，由认证库验证签名、audience 和 nonce，并与账号写入一起保存加密撤销凭据。",
    "x-audience": "public",
    request: {
      body: {
        required: true,
        content: { "application/json": { schema: appleSchema } },
      },
    },
    responses: {
      200: jsonResponse(
        sessionSchema,
        "校验 Apple 授权码和 nonce 后创建会话。",
      ),
      ...errorResponses(400, 401, 404, 429, 503),
    },
  }),
  async (c) => {
    if (!isAppleConfigured(c.env))
      return c.json(APIErrors.notFound("Apple unavailable"), 404);
    const parsed = await readBoundedJson(c, appleSchema);
    if ("response" in parsed) return parsed.response;
    const limited = await enforceNativeRateLimit(
      c,
      c.env.AUTH_SIGN_IN_RATE_LIMITER,
      "native_apple",
    );
    if (limited) return limited;
    try {
      const tokens = await exchangeAppleCode(c.env, parsed.data.code);
      const encrypted = await symmetricEncrypt({
        key: c.env.BETTER_AUTH_SECRET,
        data: tokens.refreshToken,
      });
      const auth = createAuth(c.env, getExecutionContext(c), encrypted);
      const response = await auth.handler(
        authRequest(c, "/sign-in/social", {
          provider: "apple",
          idToken: {
            token: tokens.idToken,
            nonce: parsed.data.nonce,
            accessToken: tokens.accessToken,
            user: {
              name: {
                firstName: parsed.data.firstName,
                lastName: parsed.data.lastName,
              },
            },
          },
        }),
      );
      if (!response.ok)
        return c.json(APIErrors.unauthorized("Unable to sign in"), 401);
      const result = (await response.json()) as {
        token: string;
        user: { id: string };
      };
      return c.json({ token: result.token }, 200);
    } catch {
      return c.json(
        APIErrors.unauthorized("Unable to sign in with Apple"),
        401,
      );
    }
  },
);

export { native as nativeAuthRoute };
