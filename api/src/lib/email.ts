import { Resend } from "resend";

/**
 * 发送密码重置邮件
 */
export async function sendPasswordResetEmail(
  email: string,
  resetUrl: string,
  name: string | undefined,
  env: { RESEND_API_KEY?: string; RESEND_FROM_EMAIL?: string }
): Promise<{ success: boolean; error?: string }> {
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[Email] RESEND_API_KEY not configured");
    return { success: false, error: "Email service not configured" };
  }

  try {
    const resend = new Resend(apiKey);
    const fromEmail = env.RESEND_FROM_EMAIL || "GoMate <noreply@gomate.live>";

    await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: "重置您的 GoMate 密码",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>重置密码</h2>
          <p>您好${name ? `，${name}` : ""}，</p>
          <p>我们收到了重置您 GoMate 账号密码的请求。请点击下方按钮重置密码：</p>
          <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#22c55e;color:#fff;text-decoration:none;border-radius:6px;margin:16px 0;">重置密码</a>
          <p>此链接将在 1 小时后失效。</p>
          <p>如果您没有申请重置密码，请忽略此邮件。</p>
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
  env: { RESEND_API_KEY?: string; RESEND_FROM_EMAIL?: string }
): Promise<{ success: boolean; error?: string }> {
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) return { success: false, error: "Email service not configured" };

  try {
    const resend = new Resend(apiKey);
    const fromEmail = env.RESEND_FROM_EMAIL || "GoMate <noreply@gomate.live>";

    await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: "欢迎加入 GoMate！",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>欢迎加入 GoMate！</h2>
          <p>你好，${name}！</p>
          <p>感谢您注册 GoMate，一个专注于深圳徒步场景的组队平台。</p>
          <p>现在您可以：</p>
          <ul>
            <li>浏览深圳周边的热门徒步路线</li>
            <li>创建或加入徒步队伍</li>
            <li>与志同道合的徒步爱好者一起出发</li>
          </ul>
          <p>祝您徒步愉快！</p>
          <p>GoMate 团队</p>
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
  env: { RESEND_API_KEY?: string; RESEND_FROM_EMAIL?: string }
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
      subject: `[GoMate 用户反馈] ${data.subject}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>用户反馈</h2>
          <p><strong>姓名：</strong>${data.name}</p>
          <p><strong>邮箱：</strong>${data.email}</p>
          <p><strong>主题：</strong>${data.subject}</p>
          <p><strong>内容：</strong></p>
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
  env: { RESEND_API_KEY?: string; RESEND_FROM_EMAIL?: string }
): Promise<{ success: boolean; error?: string }> {
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) return { success: false, error: "Email service not configured" };

  try {
    const resend = new Resend(apiKey);
    const fromEmail = env.RESEND_FROM_EMAIL || "GoMate <noreply@gomate.live>";
    const typeLabel = data.type === "suggestion" ? "建议" : "Bug";
    const subject = `[GoMate ${typeLabel}反馈] 来自 ${data.name}`;

    // 构建邮件内容
    let htmlContent = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: ${data.type === "bug" ? "#dc2626" : "#059669"};">
          ${data.type === "bug" ? "🐛 Bug 反馈" : "💡 功能建议"}
        </h2>
        <p><strong>姓名：</strong>${data.name}</p>
        <p><strong>邮箱：</strong>${data.email}</p>
    `;

    if (data.type === "bug") {
      htmlContent += `
        <hr style="margin: 16px 0; border: none; border-top: 1px solid #e5e7eb;" />
        <h3>问题详情</h3>
        ${data.device ? `<p><strong>设备类型：</strong>${data.device}</p>` : ""}
        ${data.browser ? `<p><strong>浏览器：</strong>${data.browser}</p>` : ""}
        ${data.pageUrl ? `<p><strong>问题页面：</strong><a href="${data.pageUrl}">${data.pageUrl}</a></p>` : ""}
      `;
    }

    htmlContent += `
      <hr style="margin: 16px 0; border: none; border-top: 1px solid #e5e7eb;" />
      <h3>${data.type === "bug" ? "问题描述" : "建议内容"}</h3>
      <p style="white-space: pre-wrap; background: #f9fafb; padding: 12px; border-radius: 6px;">${data.content}</p>
    `;

    if (data.steps) {
      htmlContent += `
        <h3>复现步骤</h3>
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
