import { and, eq } from "drizzle-orm";
import { APIErrors } from "../../lib/api-errors";
import { logger } from "../../lib/logger";
import { createAuth } from "../../lib/auth";
import { createDb } from "../../db";
import * as schema from "../../db/schema";
import { signUpEmailSchema, signInEmailSchema } from "./schemas";
import {
  type AuthContext,
  getExecutionContext,
  readBoundedJson,
  enforceNativeRateLimit,
  normalizedJsonRequest,
  noStoreJsonResponse,
} from "./request";

const GENERIC_SIGN_UP_RESPONSE = { success: true as const };

const GENERIC_SIGN_IN_ERROR = APIErrors.unauthorized("邮箱或密码错误");

function authErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  const candidate = error as {
    code?: unknown;
    body?: { code?: unknown; error?: { code?: unknown } };
  };
  const code =
    candidate.code ?? candidate.body?.code ?? candidate.body?.error?.code;
  return typeof code === "string" && /^[A-Z][A-Z0-9_]{0,63}$/u.test(code)
    ? code
    : undefined;
}

async function responseErrorCode(
  response: Response,
): Promise<string | undefined> {
  const payload = (await response
    .clone()
    .json()
    .catch(() => null)) as {
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
  const payload = (await response
    .clone()
    .json()
    .catch(() => null)) as {
    user?: { id?: unknown; email?: unknown };
  } | null;
  const responseUserId =
    typeof payload?.user?.id === "string" ? payload.user.id : undefined;
  const responseEmail =
    typeof payload?.user?.email === "string"
      ? payload.user.email.toLocaleLowerCase("en-US")
      : undefined;
  if (!responseUserId || responseEmail !== email) return false;

  const db = createDb(c.env.DB);
  const persistedUser = (
    await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1)
  )[0];
  if (!persistedUser) return false;

  // Better Auth intentionally returns a synthetic user for duplicate sign-up
  // attempts. That response is valid only when the real user already exists;
  // it must not turn an unpersisted first registration into a 200 response.
  if (persistedUser.id !== responseUserId) return true;

  const credentialAccount = (
    await db
      .select({ id: schema.accounts.id })
      .from(schema.accounts)
      .where(
        and(
          eq(schema.accounts.userId, persistedUser.id),
          eq(schema.accounts.issuer, "local:credential"),
          eq(schema.accounts.accountId, persistedUser.id),
        ),
      )
      .limit(1)
  )[0];
  return Boolean(credentialAccount);
}

async function browserSafeSignInResponse(
  c: AuthContext,
  response: Response,
): Promise<Response> {
  const payload = (await response
    .clone()
    .json()
    .catch(() => null)) as Record<string, unknown> | null;
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
 * POST /auth/sign-up/email
 * Better Auth owns account creation, while all profile/media/authorization
 * fields remain application-owned and must never be accepted from this input.
 */
export async function handleEmailSignUp(c: AuthContext) {
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
    if (!(await verifySignUpPersistence(c, parsed.data.email, response))) {
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

export async function handleEmailSignIn(c: AuthContext) {
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
