import { getEmailField, type EmailLocale } from "./email-i18n";
import { sendEmail, type EmailEnvironment } from "./email-transport";

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>'"]/gu,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      })[character]!,
  );
}

/** Send the ownership challenge required before an email identity can sign in. */
export async function sendEmailVerificationEmail(
  email: string,
  verificationUrl: string,
  name: string,
  env: EmailEnvironment,
  locale: EmailLocale = "zh-CN",
): Promise<{ success: boolean; error?: string }> {
  return sendEmail(env, () => {
    const parsedUrl = new URL(verificationUrl);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      throw new Error("Invalid verification URL protocol");
    }
    const safeName = escapeHtml(name);
    const safeUrl = escapeHtml(parsedUrl.toString());

    return {
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
    };
  });
}

/**
 * 发送密码重置邮件
 */
export async function sendPasswordResetEmail(
  email: string,
  resetUrl: string,
  name: string | undefined,
  env: EmailEnvironment,
  locale: EmailLocale = "zh-CN",
): Promise<{ success: boolean; error?: string }> {
  return sendEmail(env, () => {
    const parsedUrl = new URL(resetUrl);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      throw new Error("Invalid password reset URL protocol");
    }
    const safeName = name ? escapeHtml(name) : "";
    const safeUrl = escapeHtml(parsedUrl.toString());
    const nameStr = safeName ? `，${safeName}` : "";
    const greeting = getEmailField(locale, "passwordReset", "greeting", {
      name: nameStr,
    });

    return {
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
    };
  });
}

/**
 * 发送欢迎邮件
 */
export async function sendWelcomeEmail(
  email: string,
  name: string,
  env: EmailEnvironment,
  locale: EmailLocale = "zh-CN",
): Promise<{ success: boolean; error?: string }> {
  return sendEmail(env, () => {
    const safeName = escapeHtml(name);

    return {
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
    };
  });
}

/** One feedback email; transport errors are returned without automatic retries. */
export async function sendFeedbackEmail(
  data: import("@/contracts/feedback").FeedbackInput,
  env: EmailEnvironment,
  locale: EmailLocale = "zh-CN",
): Promise<{ success: boolean; error?: string }> {
  return sendEmail(
    env,
    () => ({
      to: "support@gomate.live",
      replyTo: data.email,
      subject: getEmailField(locale, "feedback", "title"),
      html: `<div><h2>${getEmailField(locale, "feedback", "title")}</h2><p>${escapeHtml(data.email)}</p><p style="white-space:pre-wrap">${escapeHtml(data.content)}</p></div>`,
    }),
    { idempotencyKey: `feedback/${data.requestId}` },
  );
}
