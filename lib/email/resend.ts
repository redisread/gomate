import { Resend } from "resend";

// Resend API Key - 从环境变量读取
const RESEND_API_KEY = process.env.RESEND_API_KEY;

// 发件人邮箱配置（使用 Resend 提供的默认域名或自定义域名）
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "GoMate <onboarding@resend.dev>";

// 应用名称
const APP_NAME = "GoMate";

/**
 * 创建 Resend 客户端
 */
function createResendClient() {
  if (!RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured");
  }
  return new Resend(RESEND_API_KEY);
}

/**
 * 发送重置密码邮件
 * @param to 收件人邮箱
 * @param resetUrl 重置密码链接
 * @param userName 用户名（可选）
 */
export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string,
  userName?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const resend = createResendClient();

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: `重置您的 ${APP_NAME} 密码`,
      html: getPasswordResetTemplate(resetUrl, userName),
      text: getPasswordResetText(resetUrl, userName),
    });

    if (error) {
      console.error("Resend email error:", error);
      return { success: false, error: error.message };
    }

    console.log("Password reset email sent:", data?.id);
    return { success: true };
  } catch (error) {
    console.error("Send password reset email error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "发送邮件失败",
    };
  }
}

/**
 * 发送欢迎邮件
 * @param to 收件人邮箱
 * @param userName 用户名
 */
export async function sendWelcomeEmail(
  to: string,
  userName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const resend = createResendClient();

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: `欢迎来到 ${APP_NAME}！`,
      html: getWelcomeTemplate(userName),
      text: getWelcomeText(userName),
    });

    if (error) {
      console.error("Resend email error:", error);
      return { success: false, error: error.message };
    }

    console.log("Welcome email sent:", data?.id);
    return { success: true };
  } catch (error) {
    console.error("Send welcome email error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "发送邮件失败",
    };
  }
}

/**
 * 密码重置邮件 HTML 模板
 */
function getPasswordResetTemplate(resetUrl: string, userName?: string): string {
  const greeting = userName ? `您好，${userName}` : "您好";

  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>重置密码 - ${APP_NAME}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #44403c;
      background-color: #fafaf9;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    .card {
      background-color: #ffffff;
      border-radius: 12px;
      padding: 40px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    .logo {
      text-align: center;
      margin-bottom: 32px;
    }
    .logo-text {
      font-size: 24px;
      font-weight: 700;
      color: #1c1917;
      text-decoration: none;
    }
    .title {
      font-size: 20px;
      font-weight: 600;
      color: #1c1917;
      margin-bottom: 16px;
      text-align: center;
    }
    .content {
      font-size: 16px;
      color: #57534e;
      margin-bottom: 24px;
    }
    .button-container {
      text-align: center;
      margin: 32px 0;
    }
    .button {
      display: inline-block;
      background-color: #1c1917;
      color: #ffffff;
      text-decoration: none;
      padding: 12px 32px;
      border-radius: 8px;
      font-weight: 500;
      font-size: 16px;
    }
    .button:hover {
      background-color: #292524;
    }
    .link-fallback {
      font-size: 14px;
      color: #78716c;
      margin-top: 16px;
      word-break: break-all;
    }
    .divider {
      border-top: 1px solid #e7e5e4;
      margin: 32px 0;
    }
    .footer {
      font-size: 14px;
      color: #a8a29e;
      text-align: center;
    }
    .warning {
      background-color: #fef3c7;
      border: 1px solid #fde68a;
      border-radius: 8px;
      padding: 16px;
      margin-top: 24px;
      font-size: 14px;
      color: #92400e;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="logo">
        <span class="logo-text">${APP_NAME}</span>
      </div>
      <h1 class="title">重置您的密码</h1>
      <div class="content">
        <p>${greeting}，</p>
        <p>我们收到了您重置密码的请求。点击下方按钮设置新密码：</p>
      </div>
      <div class="button-container">
        <a href="${resetUrl}" class="button">重置密码</a>
      </div>
      <p class="link-fallback">
        如果按钮无法点击，请复制以下链接到浏览器地址栏：<br>
        ${resetUrl}
      </p>
      <div class="warning">
        <strong>安全提示：</strong>此链接将在 1 小时后失效。如果您没有请求重置密码，请忽略此邮件。
      </div>
      <div class="divider"></div>
      <div class="footer">
        <p>此邮件由 ${APP_NAME} 系统自动发送，请勿回复。</p>
        <p>&copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * 密码重置邮件纯文本模板
 */
function getPasswordResetText(resetUrl: string, userName?: string): string {
  const greeting = userName ? `您好，${userName}` : "您好";

  return `
${greeting}，

我们收到了您重置密码的请求。请访问以下链接设置新密码：

${resetUrl}

此链接将在 1 小时后失效。如果您没有请求重置密码，请忽略此邮件。

---
此邮件由 ${APP_NAME} 系统自动发送，请勿回复。
&copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.
  `.trim();
}

/**
 * 欢迎邮件 HTML 模板
 */
function getWelcomeTemplate(userName: string): string {
  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>欢迎加入 ${APP_NAME}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #44403c;
      background-color: #fafaf9;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    .card {
      background-color: #ffffff;
      border-radius: 12px;
      padding: 40px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    .logo {
      text-align: center;
      margin-bottom: 32px;
    }
    .logo-text {
      font-size: 24px;
      font-weight: 700;
      color: #1c1917;
      text-decoration: none;
    }
    .title {
      font-size: 20px;
      font-weight: 600;
      color: #1c1917;
      margin-bottom: 16px;
      text-align: center;
    }
    .content {
      font-size: 16px;
      color: #57534e;
      margin-bottom: 24px;
    }
    .button-container {
      text-align: center;
      margin: 32px 0;
    }
    .button {
      display: inline-block;
      background-color: #1c1917;
      color: #ffffff;
      text-decoration: none;
      padding: 12px 32px;
      border-radius: 8px;
      font-weight: 500;
      font-size: 16px;
    }
    .features {
      background-color: #f5f5f4;
      border-radius: 8px;
      padding: 24px;
      margin: 24px 0;
    }
    .feature-item {
      display: flex;
      align-items: flex-start;
      margin-bottom: 16px;
    }
    .feature-item:last-child {
      margin-bottom: 0;
    }
    .feature-icon {
      width: 24px;
      height: 24px;
      background-color: #1c1917;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 14px;
      margin-right: 12px;
      flex-shrink: 0;
    }
    .divider {
      border-top: 1px solid #e7e5e4;
      margin: 32px 0;
    }
    .footer {
      font-size: 14px;
      color: #a8a29e;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="logo">
        <span class="logo-text">${APP_NAME}</span>
      </div>
      <h1 class="title">欢迎加入 ${APP_NAME}！</h1>
      <div class="content">
        <p>您好 ${userName}，</p>
        <p>感谢您注册 ${APP_NAME}！我们很高兴您能加入我们的户外社区。</p>
      </div>
      <div class="features">
        <div class="feature-item">
          <span class="feature-icon">✓</span>
          <span>发现深圳周边最佳徒步路线</span>
        </div>
        <div class="feature-item">
          <span class="feature-icon">✓</span>
          <span>与志同道合的伙伴组队同行</span>
        </div>
        <div class="feature-item">
          <span class="feature-icon">✓</span>
          <span>记录每一次精彩的户外之旅</span>
        </div>
      </div>
      <div class="button-container">
        <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:8787"}/locations" class="button">开始探索</a>
      </div>
      <div class="divider"></div>
      <div class="footer">
        <p>如有任何问题，欢迎随时联系我们。</p>
        <p>&copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * 欢迎邮件纯文本模板
 */
function getWelcomeText(userName: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:8787";

  return `
您好 ${userName}，

欢迎加入 ${APP_NAME}！感谢您注册我们的平台。

在 ${APP_NAME}，您可以：
- 发现深圳周边最佳徒步路线
- 与志同道合的伙伴组队同行
- 记录每一次精彩的户外之旅

立即开始探索：${appUrl}/locations

如有任何问题，欢迎随时联系我们。

---
&copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.
  `.trim();
}
