import { Resend } from "resend";
import { getEmailField, type EmailLocale } from "./email-i18n";
import { withTimeout } from "./timeout";
import { logger } from "./logger";

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/gu, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[character]!);
}

/** Send the ownership challenge required before an email identity can sign in. */
export async function sendEmailVerificationEmail(
  email: string,
  verificationUrl: string,
  name: string,
  env: { RESEND_API_KEY?: string; RESEND_FROM_EMAIL?: string },
  locale: EmailLocale = "zh-CN",
): Promise<{ success: boolean; error?: string }> {
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) {
    logger.warn("email_provider_not_configured");
    return { success: false, error: "Email service not configured" };
  }

  try {
    const parsedUrl = new URL(verificationUrl);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      throw new Error("Invalid verification URL protocol");
    }
    const resend = new Resend(apiKey);
    const fromEmail = env.RESEND_FROM_EMAIL || "GoMate <noreply@gomate.live>";
    const safeName = escapeHtml(name);
    const safeUrl = escapeHtml(parsedUrl.toString());

    await withTimeout(
      () => resend.emails.send({
        from: fromEmail,
        to: email,
        subject: getEmailField(locale, "emailVerification", "subject"),
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>${getEmailField(locale, "emailVerification", "title")}</h2>
            <p>${getEmailField(locale, "emailVerification", "greeting", { name: safeName })}</p>
            <p>${getEmailField(locale, "emailVerification", "body")}</p>
            <a href="${safeUrl}" style="display:inline-block;padding:12px 24px;background:#22c55e;color:#fff;text-decoration:none;border-radius:6px;margin:16px 0;">${getEmailField(locale, "emailVerification", "btnText")}</a>
            <p>${getEmailField(locale, "emailVerification", "expiryNote")}</p>
            <p>${getEmailField(locale, "emailVerification", "ignoreNote")}</p>
          </div>
        `,
      }),
      10000,
      "Send email verification timeout",
    );

    return { success: true };
  } catch (error) {
    logger.error("email_verification_send_failed", error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * 发送密码重置邮件
 */
export async function sendPasswordResetEmail(
  email: string,
  resetUrl: string,
  name: string | undefined,
  env: { RESEND_API_KEY?: string; RESEND_FROM_EMAIL?: string },
  locale: EmailLocale = "zh-CN",
): Promise<{ success: boolean; error?: string }> {
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) {
    logger.warn("email_provider_not_configured");
    return { success: false, error: "Email service not configured" };
  }

  try {
    const parsedUrl = new URL(resetUrl);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      throw new Error("Invalid password reset URL protocol");
    }
    const resend = new Resend(apiKey);
    const fromEmail = env.RESEND_FROM_EMAIL || "GoMate <noreply@gomate.live>";
    const safeName = name ? escapeHtml(name) : "";
    const safeUrl = escapeHtml(parsedUrl.toString());
    const nameStr = safeName ? `，${safeName}` : "";
    const greeting = getEmailField(locale, "passwordReset", "greeting", { name: nameStr });

    await withTimeout(
      () => resend.emails.send({
        from: fromEmail,
        to: email,
        subject: getEmailField(locale, "passwordReset", "subject"),
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>${getEmailField(locale, "passwordReset", "title")}</h2>
            <p>${greeting}</p>
            <p>${getEmailField(locale, "passwordReset", "body")}</p>
            <a href="${safeUrl}" style="display:inline-block;padding:12px 24px;background:#22c55e;color:#fff;text-decoration:none;border-radius:6px;margin:16px 0;">${getEmailField(locale, "passwordReset", "btnText")}</a>
            <p>${getEmailField(locale, "passwordReset", "expiryNote")}</p>
            <p>${getEmailField(locale, "passwordReset", "ignoreNote")}</p>
          </div>
        `,
      }),
      10000,
      "Send password reset email timeout"
    );

    return { success: true };
  } catch (error) {
    logger.error("email_password_reset_send_failed", error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * 发送欢迎邮件
 */
export async function sendWelcomeEmail(
  email: string,
  name: string,
  env: { RESEND_API_KEY?: string; RESEND_FROM_EMAIL?: string },
  locale: EmailLocale = "zh-CN",
): Promise<{ success: boolean; error?: string }> {
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) return { success: false, error: "Email service not configured" };

  try {
    const resend = new Resend(apiKey);
    const fromEmail = env.RESEND_FROM_EMAIL || "GoMate <noreply@gomate.live>";
    const safeName = escapeHtml(name);

    await withTimeout(
      () => resend.emails.send({
        from: fromEmail,
        to: email,
        subject: getEmailField(locale, "welcome", "subject"),
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>${getEmailField(locale, "welcome", "title")}</h2>
            <p>${getEmailField(locale, "welcome", "greeting", { name: safeName })}</p>
            <p>${getEmailField(locale, "welcome", "body")}</p>
            <p>${getEmailField(locale, "welcome", "featuresTitle")}</p>
            <ul>
              <li>${getEmailField(locale, "welcome", "feature1")}</li>
              <li>${getEmailField(locale, "welcome", "feature2")}</li>
              <li>${getEmailField(locale, "welcome", "feature3")}</li>
            </ul>
            <p>${getEmailField(locale, "welcome", "closing")}</p>
            <p>${getEmailField(locale, "welcome", "signature")}</p>
          </div>
        `,
      }),
      10000,
      "Send welcome email timeout"
    );

    return { success: true };
  } catch (error) {
    logger.error("email_welcome_send_failed", error);
    return { success: false, error: (error as Error).message };
  }
}

/** One feedback email; transport errors are returned without automatic retries. */
export async function sendFeedbackEmail(
  data: import("@/contracts/feedback").FeedbackInput,
  env: { RESEND_API_KEY?: string; RESEND_FROM_EMAIL?: string },
  locale: EmailLocale = "zh-CN",
): Promise<{ success: boolean; error?: string }> {
  if (!env.RESEND_API_KEY)
    return { success: false, error: "Email service not configured" };
  try {
    const resend = new Resend(env.RESEND_API_KEY);
    const result = await withTimeout(
      () =>
        resend.emails.send({
          from: env.RESEND_FROM_EMAIL || "GoMate <noreply@gomate.live>",
          to: "support@gomate.live",
          replyTo: data.email,
          subject: getEmailField(locale, "feedback", "title"),
          html: `<div><h2>${getEmailField(locale, "feedback", "title")}</h2><p>${escapeHtml(data.email)}</p><p style="white-space:pre-wrap">${escapeHtml(data.content)}</p></div>`,
        }, { idempotencyKey: `feedback/${data.requestId}` }),
      10000,
      "Feedback email timeout",
    );
    if (result.error)
      return { success: false, error: "Email provider rejected feedback" };
    return { success: true };
  } catch (error) {
    logger.error("email_feedback_send_failed", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    return { success: false, error: "Email delivery unavailable" };
  }
}
