import { APIErrors } from "../../lib/api-errors";
import { logger } from "../../lib/logger";
import { createAuth } from "../../lib/auth";
import { sendPasswordResetEmail } from "../../lib/email";
import {
  InvalidPasswordResetTokenError,
  issuePasswordResetChallenge,
  passwordResetClientUrl,
  resetPasswordWithChallenge,
} from "../../lib/password-reset";
import {
  forgotPasswordSchema,
  verificationEmailSchema,
  emailConfirmationSchema,
  passwordResetSchema,
} from "./schemas";
import {
  type AuthContext,
  getExecutionContext,
  readBoundedJson,
  enforceNativeRateLimit,
  normalizedJsonRequest,
  noStoreResponse,
} from "./request";

const GENERIC_FORGOT_PASSWORD_RESPONSE = {
  success: true as const,
  message: "如果该邮箱已注册，重置密码邮件已发送",
};

/**
 * POST /auth/forgot-password
 * 发送密码重置邮件（自定义实现，需在 Better Auth 通配符之前注册）
 */
export async function handleForgotPassword(c: AuthContext) {
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
        if (!result.success)
          logger.error("password_reset_email_delivery_failed");
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
}

export async function handleVerificationEmail(c: AuthContext) {
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

export async function handleEmailConfirmation(c: AuthContext) {
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

export async function handlePasswordReset(c: AuthContext) {
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
