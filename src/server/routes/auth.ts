import { APIErrors } from "../lib/api-errors";
import { logger } from "../lib/logger";
import { Hono, type Context } from "hono";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { createAuth, type Env } from "../lib/auth";
import { createDb } from "../db";
import * as schema from "../db/schema";
import { enforceActiveSession } from "../lib/session-policy";
import { sendPasswordResetEmail } from "../lib/email";
import {
  InvalidPasswordResetTokenError,
  issuePasswordResetChallenge,
  passwordResetClientUrl,
  resetPasswordWithChallenge,
} from "../lib/password-reset";

const auth = new Hono<{ Bindings: Env }>();

const forgotPasswordSchema = z
  .object({
    email: z
      .string()
      .trim()
      .max(254, "邮箱地址不能超过 254 个字符")
      .email("请输入有效的邮箱地址")
      .transform((value) => value.toLocaleLowerCase("en-US")),
  })
  .strict();

const AUTH_RATE_LIMIT_WINDOW_SECONDS = 60;
const MAX_AUTH_JSON_BYTES = 16 * 1024;
const GENERIC_FORGOT_PASSWORD_RESPONSE = {
  success: true as const,
  message: "如果该邮箱已注册，重置密码邮件已发送",
};
const GENERIC_SIGN_UP_RESPONSE = { success: true as const };
const GENERIC_SIGN_IN_ERROR = APIErrors.unauthorized("邮箱或密码错误");

const signUpEmailSchema = z
  .object({
    email: z.string().trim().max(254).email().transform((value) =>
      value.toLocaleLowerCase("en-US")
    ),
    password: z.string().min(8).max(128),
    name: z.string().trim().min(1).max(100),
    callbackURL: z.string().max(2_048).optional(),
  })
  .strict();

const signInEmailSchema = z
  .object({
    email: z.string().trim().max(254).email().transform((value) =>
      value.toLocaleLowerCase("en-US")
    ),
    password: z.string().min(1).max(128),
    callbackURL: z.string().max(2_048).optional(),
    rememberMe: z.boolean().optional(),
  })
  .strict();

const verificationEmailSchema = z
  .object({
    email: z.string().trim().max(254).email().transform((value) =>
      value.toLocaleLowerCase("en-US")
    ),
    callbackURL: z.string().max(2_048).optional(),
  })
  .strict();

const emailConfirmationSchema = z
  .object({
    token: z.string().trim().min(1).max(4_096),
  })
  .strict();

const passwordResetSchema = z
  .object({
    newPassword: z.string().min(8).max(128),
    token: z.string().trim().min(1).max(4_096),
  })
  .strict();

type AuthContext = Context<{ Bindings: Env }>;

function getExecutionContext(
  c: AuthContext,
): { waitUntil(promise: Promise<unknown>): void } | undefined {
  try {
    return c.executionCtx;
  } catch {
    return undefined;
  }
}

async function readBoundedJson<T>(
  c: AuthContext,
  schema: z.ZodType<T>,
): Promise<{ data: T } | { response: Response }> {
  const contentType = c.req.header("content-type")
    ?.split(";", 1)[0]
    ?.trim()
    .toLowerCase();
  if (contentType !== "application/json") {
    return {
      response: c.json(
        APIErrors.badRequest("Authentication requests require application/json"),
        415,
      ),
    };
  }

  const contentLength = c.req.header("content-length");
  if (contentLength) {
    const declared = Number(contentLength);
    if (!Number.isSafeInteger(declared) || declared < 0) {
      return { response: c.json(APIErrors.badRequest("Invalid Content-Length"), 400) };
    }
    if (declared > MAX_AUTH_JSON_BYTES) {
      return { response: c.json(APIErrors.badRequest("Authentication payload is too large"), 413) };
    }
  }

  const reader = c.req.raw.body?.getReader();
  if (!reader) {
    return { response: c.json(APIErrors.validationError("Invalid authentication payload"), 400) };
  }
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_AUTH_JSON_BYTES) {
      return { response: c.json(APIErrors.badRequest("Authentication payload is too large"), 413) };
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  let raw: unknown;
  try {
    raw = JSON.parse(
      new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(bytes),
    );
  } catch {
    return { response: c.json(APIErrors.validationError("Invalid authentication payload"), 400) };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { response: c.json(APIErrors.validationError("Invalid authentication payload"), 400) };
  }
  return { data: parsed.data };
}

async function privateRateLimitKey(scope: string, kind: string, value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${scope}\n${kind}\n${value}`),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
}

async function enforceNativeRateLimit(
  c: AuthContext,
  limiter: RateLimit,
  scope: string,
  email?: string,
): Promise<Response | null> {
  const clientIp = (c.req.header("CF-Connecting-IP") || "unknown")
    .trim()
    .slice(0, 64);
  try {
    const keys = await Promise.all([
      privateRateLimitKey(scope, "ip", clientIp),
      ...(email ? [privateRateLimitKey(scope, "email", email)] : []),
    ]);
    const decisions = await Promise.all(
      keys.map((key) => limiter.limit({ key })),
    );
    if (decisions.every(({ success }) => success)) return null;
  } catch (error) {
    logger.error("auth_rate_limiter_failed", {
      errorType: error instanceof Error ? error.name : "UnknownRateLimitError",
    });
    return c.json(APIErrors.serviceUnavailable("Authentication protection unavailable"), 503);
  }

  c.header("Retry-After", String(AUTH_RATE_LIMIT_WINDOW_SECONDS));
  return c.json(APIErrors.rateLimited("请求过于频繁，请稍后重试"), 429);
}

export function normalizeBetterAuthUrl(input: string): string {
  const url = new URL(input);
  const authMarker = url.pathname.match(/\/auth(?=\/|$)/u);
  const endpointPath = authMarker?.index === undefined
    ? url.pathname
    : url.pathname.slice(authMarker.index + authMarker[0].length);
  url.pathname = `/api/auth${endpointPath.startsWith("/") ? endpointPath : `/${endpointPath}`}`;
  return url.toString();
}

function normalizedJsonRequest(c: AuthContext, data: unknown): Request {
  const headers = new Headers(c.req.raw.headers);
  headers.delete("content-length");
  headers.set("content-type", "application/json");
  return new Request(normalizeBetterAuthUrl(c.req.raw.url), {
    method: c.req.raw.method,
    headers,
    body: JSON.stringify(data),
    signal: c.req.raw.signal,
  });
}

function noStoreResponse(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "no-store");
  headers.set("Pragma", "no-cache");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function noStoreJsonResponse(
  response: Response,
  payload: unknown,
): Response {
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  headers.set("content-type", "application/json; charset=UTF-8");
  headers.set("Cache-Control", "no-store");
  headers.set("Pragma", "no-cache");
  return new Response(JSON.stringify(payload), {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function authErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  const candidate = error as {
    code?: unknown;
    body?: { code?: unknown; error?: { code?: unknown } };
  };
  const code = candidate.code ?? candidate.body?.code ?? candidate.body?.error?.code;
  return typeof code === "string" && /^[A-Z][A-Z0-9_]{0,63}$/u.test(code)
    ? code
    : undefined;
}

async function responseErrorCode(response: Response): Promise<string | undefined> {
  const payload = await response.clone().json().catch(() => null) as {
    code?: unknown;
    error?: { code?: unknown };
  } | null;
  const code = payload?.code ?? payload?.error?.code;
  return typeof code === "string" && /^[A-Z][A-Z0-9_]{0,63}$/u.test(code)
    ? code
    : undefined;
}

function signUpInternalError(c: AuthContext): Response {
  c.header("Cache-Control", "no-store");
  c.header("Pragma", "no-cache");
  return c.json(APIErrors.internalError("Unable to create account"), 500);
}

async function verifySignUpPersistence(
  c: AuthContext,
  email: string,
  response: Response,
): Promise<boolean> {
  const payload = await response.clone().json().catch(() => null) as {
    user?: { id?: unknown; email?: unknown };
  } | null;
  const responseUserId = typeof payload?.user?.id === "string"
    ? payload.user.id
    : undefined;
  const responseEmail = typeof payload?.user?.email === "string"
    ? payload.user.email.toLocaleLowerCase("en-US")
    : undefined;
  if (!responseUserId || responseEmail !== email) return false;

  const db = createDb(c.env.DB);
  const persistedUser = (await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .limit(1))[0];
  if (!persistedUser) return false;

  // Better Auth intentionally returns a synthetic user for duplicate sign-up
  // attempts. That response is valid only when the real user already exists;
  // it must not turn an unpersisted first registration into a 200 response.
  if (persistedUser.id !== responseUserId) return true;

  const credentialAccount = (await db
    .select({ id: schema.accounts.id })
    .from(schema.accounts)
    .where(and(
      eq(schema.accounts.userId, persistedUser.id),
      eq(schema.accounts.issuer, "local:credential"),
      eq(schema.accounts.accountId, persistedUser.id),
    ))
    .limit(1))[0];
  return Boolean(credentialAccount);
}

async function browserSafeSignInResponse(
  c: AuthContext,
  response: Response,
): Promise<Response> {
  const payload = await response.clone().json().catch(() => null) as
    | Record<string, unknown>
    | null;
  if (!payload || Array.isArray(payload)) {
    logger.error("auth_sign_in_response_invalid");
    return c.json(APIErrors.internalError("Unable to sign in"), 500, {
      "Cache-Control": "no-store",
      Pragma: "no-cache",
    });
  }
  const { token: _browserExposedToken, ...safePayload } = payload;
  return noStoreJsonResponse(response, safePayload);
}

/**
 * POST /auth/forgot-password
 * 发送密码重置邮件（自定义实现，需在 Better Auth 通配符之前注册）
 */
auth.post("/forgot-password", async (c) => {
  try {
    const parsed = await readBoundedJson(c, forgotPasswordSchema);
    if ("response" in parsed) return parsed.response;
    const { email } = parsed.data;
    const limited = await enforceNativeRateLimit(
      c,
      c.env.AUTH_EMAIL_RATE_LIMITER,
      "forgot_password",
      email,
    );
    if (limited) return limited;

    // Everything that differs between an existing and unknown email stays
    // outside the response critical path. In Workers the promise is attached
    // immediately after issuePasswordResetChallenge reaches its first D1 await.
    const task = issuePasswordResetChallenge(c.env.DB, email)
      .then(async (issued) => {
        if (!issued) return;
        const result = await sendPasswordResetEmail(
          issued.email,
          passwordResetClientUrl(c.env.APP_URL, issued.token),
          issued.displayName,
          c.env,
        );
        if (!result.success) logger.error("password_reset_email_delivery_failed");
      })
      .catch((error) => {
        // The stable event carries no email, token, SQL or adapter message.
        logger.error("password_reset_background_failed", {
          errorType: error instanceof Error ? error.name : "UnknownAuthError",
        });
      });
    const executionContext = getExecutionContext(c);
    if (executionContext) executionContext.waitUntil(task);
    else await task;

    c.header("Cache-Control", "no-store");
    return c.json(GENERIC_FORGOT_PASSWORD_RESPONSE);
  } catch (error) {
    logger.error("auth_forgot_password_failed", {
      errorType: error instanceof Error ? error.name : "UnknownAuthError",
    });
    return c.json(APIErrors.internalError("发送重置邮件失败，请稍后重试"), 500);
  }
});

/**
 * POST /auth/sign-up/email
 * Better Auth owns account creation, while all profile/media/authorization
 * fields remain application-owned and must never be accepted from this input.
 */
async function handleEmailSignUp(c: AuthContext) {
  const parsed = await readBoundedJson(c, signUpEmailSchema);
  if ("response" in parsed) return parsed.response;
  const limited = await enforceNativeRateLimit(
    c,
    c.env.AUTH_SIGN_UP_RATE_LIMITER,
    "sign_up",
    parsed.data.email,
  );
  if (limited) return limited;
  let response: Response;
  try {
    response = await createAuth(c.env, getExecutionContext(c)).handler(
      normalizedJsonRequest(c, parsed.data),
    );
  } catch (error) {
    logger.error("auth_sign_up_failed", {
      errorCode: authErrorCode(error),
      errorType: error instanceof Error ? error.name : "UnknownAuthError",
    });
    return signUpInternalError(c);
  }

  if (!response.ok) {
    const errorCode = await responseErrorCode(response);
    logger.error("auth_sign_up_failed", {
      errorCode: errorCode ?? `HTTP_${response.status}`,
      errorType: "BetterAuthResponseError",
    });
    if (response.status >= 500 || errorCode === "FAILED_TO_CREATE_USER") {
      return signUpInternalError(c);
    }
    c.header("Cache-Control", "no-store");
    c.header("Pragma", "no-cache");
    return c.json(APIErrors.validationError("Unable to create account"), 400);
  }

  try {
    if (!await verifySignUpPersistence(c, parsed.data.email, response)) {
      logger.error("auth_sign_up_persistence_failed", {
        errorType: "AuthPersistenceError",
      });
      return signUpInternalError(c);
    }
  } catch (error) {
    logger.error("auth_sign_up_persistence_failed", {
      errorType: error instanceof Error ? error.name : "UnknownDatabaseError",
    });
    return signUpInternalError(c);
  }

  // Better Auth intentionally synthesizes a user for duplicate registrations.
  // Keep the fixed acknowledgement only after the persistence postcondition
  // has been checked, so a false 200 can never hide a missing account row.
  c.header("Cache-Control", "no-store");
  return c.json(GENERIC_SIGN_UP_RESPONSE, 200);
}

auth.post("/sign-up/email", handleEmailSignUp);

async function handleEmailSignIn(c: AuthContext) {
  const parsed = await readBoundedJson(c, signInEmailSchema);
  if ("response" in parsed) return parsed.response;
  const limited = await enforceNativeRateLimit(
    c,
    c.env.AUTH_SIGN_IN_RATE_LIMITER,
    "sign_in",
    parsed.data.email,
  );
  if (limited) return limited;
  const response = await createAuth(c.env, getExecutionContext(c)).handler(
    normalizedJsonRequest(c, parsed.data),
  );
  if (response.ok) return browserSafeSignInResponse(c, response);

  // A correct password for a newly-created, unverified account and invalid
  // credentials for an existing account must be indistinguishable. Returning
  // Better Auth's raw 403/401 variants would undo the generic sign-up boundary.
  c.header("Cache-Control", "no-store");
  return c.json(GENERIC_SIGN_IN_ERROR, 401);
}

auth.post("/sign-in/email", handleEmailSignIn);

async function handleVerificationEmail(c: AuthContext) {
  const parsed = await readBoundedJson(c, verificationEmailSchema);
  if ("response" in parsed) return parsed.response;
  const limited = await enforceNativeRateLimit(
    c,
    c.env.AUTH_EMAIL_RATE_LIMITER,
    "verification_email",
    parsed.data.email,
  );
  if (limited) return limited;
  return noStoreResponse(
    await createAuth(c.env, getExecutionContext(c)).handler(
      normalizedJsonRequest(c, parsed.data),
    ),
  );
}

auth.post("/send-verification-email", handleVerificationEmail);

async function handleEmailConfirmation(c: AuthContext) {
  const parsed = await readBoundedJson(c, emailConfirmationSchema);
  if ("response" in parsed) return parsed.response;
  const limited = await enforceNativeRateLimit(
    c,
    c.env.AUTH_EMAIL_RATE_LIMITER,
    "confirm_email",
  );
  if (limited) return limited;

  const internalUrl = new URL("/api/auth/verify-email", c.env.APP_URL);
  internalUrl.searchParams.set("token", parsed.data.token);
  const headers = new Headers(c.req.raw.headers);
  headers.delete("content-length");
  headers.delete("content-type");
  headers.delete("cookie");
  const response = await createAuth(c.env, getExecutionContext(c)).handler(
    new Request(internalUrl, { method: "GET", headers }),
  );
  if (!response.ok) {
    return c.json(
      APIErrors.badRequest("Invalid or expired verification link"),
      400,
    );
  }
  c.header("Cache-Control", "no-store");
  return c.json({ success: true as const });
}

auth.post("/confirm-email", handleEmailConfirmation);

async function handlePasswordReset(c: AuthContext) {
  const parsed = await readBoundedJson(c, passwordResetSchema);
  if ("response" in parsed) return parsed.response;
  const limited = await enforceNativeRateLimit(
    c,
    c.env.AUTH_EMAIL_RATE_LIMITER,
    "reset_password_confirm",
  );
  if (limited) return limited;
  try {
    await resetPasswordWithChallenge(
      c.env.DB,
      parsed.data.token,
      parsed.data.newPassword,
    );
    c.header("Cache-Control", "no-store");
    return c.json({ success: true as const });
  } catch (error) {
    c.header("Cache-Control", "no-store");
    if (error instanceof InvalidPasswordResetTokenError) {
      return c.json(APIErrors.badRequest("Invalid or expired reset link"), 400);
    }
    logger.error("password_reset_commit_failed", {
      errorType: error instanceof Error ? error.name : "UnknownDatabaseError",
    });
    return c.json(APIErrors.internalError("Unable to reset password"), 500);
  }
}

auth.post("/reset-password", handlePasswordReset);

function handleSignOut(c: AuthContext) {
  return createAuth(c.env, getExecutionContext(c)).handler(c.req.raw)
    .then(noStoreResponse);
}

auth.post("/sign-out", handleSignOut);

async function handleGetSession(c: AuthContext) {
  const authInstance = createAuth(c.env, getExecutionContext(c));
  const response = await authInstance.api.getSession({
    headers: c.req.raw.headers,
    query: { disableCookieCache: true },
    asResponse: true,
  });
  if (!response.ok) return noStoreResponse(response);
  const session = await response.clone().json().catch(() => null) as
    | {
        session?: Record<string, unknown>;
        user?: { id?: string };
      }
    | null;
  if (!session?.user?.id) return noStoreResponse(response);
  if (await enforceActiveSession(c.env, { user: { id: session.user.id } })) {
    const sessionRecord = session.session;
    if (!sessionRecord) return noStoreJsonResponse(response, session);
    const {
      token: _browserExposedToken,
      ipAddress: _browserExposedIp,
      userAgent: _browserExposedUserAgent,
      ...safeSession
    } = sessionRecord;
    return noStoreJsonResponse(response, {
      ...session,
      session: safeSession,
    });
  }
  return c.json(null, 200, {
    "Cache-Control": "no-store",
    Pragma: "no-cache",
  });
}

auth.on(["GET", "POST"], "/get-session", handleGetSession);

/**
 * Profile changes use PATCH /api/users/me and avatar changes use
 * /api/upload/avatar so their validation, ownership, and cleanup stay atomic.
 */
function unavailableAuthEndpoint(c: AuthContext) {
  return c.json(APIErrors.notFound("Authentication endpoint not found"), 404);
}

function normalizedAuthPath(url: string): string {
  const pathname = new URL(url).pathname;
  let decoded = pathname;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    // Leave malformed escapes untouched; Better Auth cannot match them either.
  }
  return decoded.replace(/\/{2,}/gu, "/").replace(/\/+$/u, "");
}

auth.post("/update-user", unavailableAuthEndpoint);
auth.post("/request-password-reset", unavailableAuthEndpoint);
auth.on(["GET", "POST"], "/verify-email", unavailableAuthEndpoint);

/**
 * ALL /auth/*
 * Canonicalize guarded paths, then deny every Better Auth capability the
 * product does not explicitly expose.
 */
auth.all("/*", async (c) => {
  const path = normalizedAuthPath(c.req.url);
  if (c.req.method === "POST" && path === "/api/auth/sign-up/email") {
    return handleEmailSignUp(c);
  }
  if (c.req.method === "POST" && path === "/api/auth/sign-in/email") {
    return handleEmailSignIn(c);
  }
  if (c.req.method === "POST" && path === "/api/auth/send-verification-email") {
    return handleVerificationEmail(c);
  }
  if (c.req.method === "POST" && path === "/api/auth/confirm-email") {
    return handleEmailConfirmation(c);
  }
  if (c.req.method === "POST" && path === "/api/auth/reset-password") {
    return handlePasswordReset(c);
  }
  if (c.req.method === "POST" && path === "/api/auth/sign-out") {
    return handleSignOut(c);
  }
  if (["GET", "POST"].includes(c.req.method) && path === "/api/auth/get-session") {
    return handleGetSession(c);
  }
  return unavailableAuthEndpoint(c);
});

export { auth as authRoute };
