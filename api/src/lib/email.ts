import { Resend } from "resend";
import { getEmailField, EmailLocale } from "./email-i18n";

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
    console.warn("[Email] RESEND_API_KEY not configured");
    return { success: false, error: "Email service not configured" };
  }

  try {
    const resend = new Resend(apiKey);
    const fromEmail = env.RESEND_FROM_EMAIL || "GoMate <noreply@gomate.live>";
    const nameStr = name ? `，${name}` : "";
    const greeting = getEmailField(locale, "passwordReset", "greeting", { name: nameStr });

    await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: getEmailField(locale, "passwordReset", "subject"),
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>${getEmailField(locale, "passwordReset", "title")}</h2>
          <p>${greeting}</p>
          <p>${getEmailField(locale, "passwordReset", "body")}</p>
          <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#22c55e;color:#fff;text-decoration:none;border-radius:6px;margin:16px 0;">${getEmailField(locale, "passwordReset", "btnText")}</a>
          <p>${getEmailField(locale, "passwordReset", "expiryNote")}</p>
          <p>${getEmailField(locale, "passwordReset", "ignoreNote")}</p>
        </div>
      `,
    });

    return { success: true };
  } catch (error) {
    console.error("[Email] Failed to send password reset email:", error);
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

    await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: getEmailField(locale, "welcome", "subject"),
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>${getEmailField(locale, "welcome", "title")}</h2>
          <p>${getEmailField(locale, "welcome", "greeting", { name })}</p>
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
    });

    return { success: true };
  } catch (error) {
    console.error("[Email] Failed to send welcome email:", error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * 发送联系表单邮件
 */
export async function sendContactFormEmail(
  data: { name: string; email: string; subject: string; message: string },
  env: { RESEND_API_KEY?: string; RESEND_FROM_EMAIL?: string },
  locale: EmailLocale = "zh-CN",
): Promise<{ success: boolean; error?: string }> {
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) return { success: false, error: "Email service not configured" };

  try {
    const resend = new Resend(apiKey);
    const fromEmail = env.RESEND_FROM_EMAIL || "GoMate <noreply@gomate.live>";

    await resend.emails.send({
      from: fromEmail,
      to: "support@gomate.live",
      replyTo: data.email,
      subject: getEmailField(locale, "contactForm", "subject", { subject: data.subject }),
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>${getEmailField(locale, "contactForm", "title")}</h2>
          <p><strong>${getEmailField(locale, "contactForm", "nameLabel")}</strong>${data.name}</p>
          <p><strong>${getEmailField(locale, "contactForm", "emailLabel")}</strong>${data.email}</p>
          <p><strong>${getEmailField(locale, "contactForm", "subjectLabel")}</strong>${data.subject}</p>
          <p><strong>${getEmailField(locale, "contactForm", "contentLabel")}</strong></p>
          <p style="white-space: pre-wrap;">${data.message}</p>
        </div>
      `,
    });

    return { success: true };
  } catch (error) {
    console.error("[Email] Failed to send contact form email:", error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * 发送队伍加入申请通知邮件给队长
 */
export async function sendTeamJoinApplicationEmail(
  data: {
    leaderEmail: string;
    leaderName: string;
    applicantName: string;
    teamTitle: string;
    locationName: string;
    teamUrl: string;
  },
  env: { RESEND_API_KEY?: string; RESEND_FROM_EMAIL?: string },
  locale: EmailLocale = "zh-CN",
): Promise<{ success: boolean; error?: string }> {
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) return { success: false, error: "Email service not configured" };

  try {
    const resend = new Resend(apiKey);
    const fromEmail = env.RESEND_FROM_EMAIL || "GoMate <noreply@gomate.live>";
    const vars = {
      leaderName: data.leaderName,
      applicantName: data.applicantName,
      teamTitle: data.teamTitle,
      locationName: data.locationName,
    };

    await resend.emails.send({
      from: fromEmail,
      to: data.leaderEmail,
      subject: getEmailField(locale, "teamJoinApplication", "subject", vars),
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #16a34a;">${getEmailField(locale, "teamJoinApplication", "title")}</h2>
          <p>${getEmailField(locale, "teamJoinApplication", "greeting", vars)}</p>
          <p>${getEmailField(locale, "teamJoinApplication", "body", vars)}</p>
          <p>${getEmailField(locale, "teamJoinApplication", "prompt")}</p>
          <a href="${data.teamUrl}" style="display:inline-block;padding:12px 24px;background:#16a34a;color:#fff;text-decoration:none;border-radius:6px;margin:16px 0;">${getEmailField(locale, "teamJoinApplication", "viewApplicationBtn")}</a>
          <p style="color:#6b7280;font-size:14px;">${getEmailField(locale, "teamJoinApplication", "signature")}</p>
        </div>
      `,
    });

    return { success: true };
  } catch (error) {
    console.error("[Email] Failed to send team join application email:", error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * 发送用户反馈邮件（功能建议 / Bug 反馈）
 */
export async function sendFeedbackEmail(
  data: {
    type: "suggestion" | "bug";
    name: string;
    email: string;
    content: string;
    device?: string;
    browser?: string;
    steps?: string;
    pageUrl?: string;
  },
  env: { RESEND_API_KEY?: string; RESEND_FROM_EMAIL?: string },
  locale: EmailLocale = "zh-CN",
): Promise<{ success: boolean; error?: string }> {
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) return { success: false, error: "Email service not configured" };

  try {
    const resend = new Resend(apiKey);
    const fromEmail = env.RESEND_FROM_EMAIL || "GoMate <noreply@gomate.live>";
    const isBug = data.type === "bug";

    const subject = getEmailField(locale, "feedback", isBug ? "bugSubject" : "suggestionSubject", { name: data.name });
    const title = getEmailField(locale, "feedback", isBug ? "bugTitle" : "suggestionTitle");
    const nameLabel = getEmailField(locale, "feedback", "nameLabel");
    const emailLabel = getEmailField(locale, "feedback", "emailLabel");

    // 构建邮件内容
    let htmlContent = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: ${isBug ? "#dc2626" : "#059669"};">
          ${title}
        </h2>
        <p><strong>${nameLabel}</strong>${data.name}</p>
        <p><strong>${emailLabel}</strong>${data.email}</p>
    `;

    if (isBug) {
      htmlContent += `
        <hr style="margin: 16px 0; border: none; border-top: 1px solid #e5e7eb;" />
        <h3>${getEmailField(locale, "feedback", "bugDetailsTitle")}</h3>
        ${data.device ? `<p><strong>${getEmailField(locale, "feedback", "deviceLabel")}</strong>${data.device}</p>` : ""}
        ${data.browser ? `<p><strong>${getEmailField(locale, "feedback", "browserLabel")}</strong>${data.browser}</p>` : ""}
        ${data.pageUrl ? `<p><strong>${getEmailField(locale, "feedback", "pageUrlLabel")}</strong><a href="${data.pageUrl}">${data.pageUrl}</a></p>` : ""}
      `;
    }

    htmlContent += `
      <hr style="margin: 16px 0; border: none; border-top: 1px solid #e5e7eb;" />
      <h3>${getEmailField(locale, "feedback", isBug ? "bugDescriptionTitle" : "suggestionDescriptionTitle")}</h3>
      <p style="white-space: pre-wrap; background: #f9fafb; padding: 12px; border-radius: 6px;">${data.content}</p>
    `;

    if (data.steps) {
      htmlContent += `
        <h3>${getEmailField(locale, "feedback", "stepsTitle")}</h3>
        <p style="white-space: pre-wrap; background: #fef3c7; padding: 12px; border-radius: 6px;">${data.steps}</p>
      `;
    }

    htmlContent += `</div>`;

    await resend.emails.send({
      from: fromEmail,
      to: "support@gomate.live",
      replyTo: data.email,
      subject,
      html: htmlContent,
    });

    return { success: true };
  } catch (error) {
    console.error("[Email] Failed to send feedback email:", error);
    return { success: false, error: (error as Error).message };
  }
}
