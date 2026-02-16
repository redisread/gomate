import { Resend } from "resend";

/**
 * Resend Email Service
 *
 * Handles all email communications for GoMate:
 * - Verification emails
 * - Welcome emails
 * - Team application notifications
 * - Application result notifications
 * - Team success notifications
 */

// Resend client configuration
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || "noreply@gomate.app";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://gomate.app";

// Validate configuration
if (!RESEND_API_KEY) {
  console.warn(
    "RESEND_API_KEY is not configured. Email sending will be disabled."
  );
}

// Initialize Resend client
export const resend = new Resend(RESEND_API_KEY);

// Email sending options
export interface EmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  react?: React.ReactElement;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
  }>;
}

// Email send result
export interface EmailResult {
  success: boolean;
  data?: { id: string };
  error?: string;
}

/**
 * Send an email using Resend
 */
export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  if (!RESEND_API_KEY) {
    console.warn("Email not sent: RESEND_API_KEY is not configured");
    return {
      success: false,
      error: "Email service is not configured",
    };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: RESEND_FROM_EMAIL,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      react: options.react,
      attachments: options.attachments,
    });

    if (error) {
      console.error("Resend email error:", error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      data: data || undefined,
    };
  } catch (error) {
    console.error("Failed to send email:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Unknown error sending email",
    };
  }
}

/**
 * Send verification email
 */
export async function sendVerificationEmail(
  to: string,
  name: string,
  verificationUrl: string
): Promise<EmailResult> {
  const subject = "验证您的邮箱 - GoMate";

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #111; font-size: 24px; margin: 0;">GoMate</h1>
      </div>
      <div style="background: #fff; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <h2 style="color: #111; font-size: 20px; margin: 0 0 16px;">验证您的邮箱</h2>
        <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
          您好 ${name}，<br><br>
          感谢您注册 GoMate！请点击下方按钮验证您的邮箱地址：
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${verificationUrl}" style="display: inline-block; background: #000; color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 500;">
            验证邮箱
          </a>
        </div>
        <p style="color: #888; font-size: 14px; line-height: 1.6; margin: 0;">
          或者复制以下链接到浏览器：<br>
          <a href="${verificationUrl}" style="color: #555; word-break: break-all;">${verificationUrl}</a>
        </p>
        <p style="color: #888; font-size: 12px; margin-top: 32px; padding-top: 24px; border-top: 1px solid #eee;">
          此链接将在 24 小时后过期。如果您没有注册 GoMate，请忽略此邮件。
        </p>
      </div>
    </div>
  `;

  return sendEmail({
    to,
    subject,
    html,
  });
}

/**
 * Send welcome email
 */
export async function sendWelcomeEmail(
  to: string,
  name: string
): Promise<EmailResult> {
  const subject = "欢迎来到 GoMate！";

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #111; font-size: 24px; margin: 0;">GoMate</h1>
      </div>
      <div style="background: #fff; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <h2 style="color: #111; font-size: 20px; margin: 0 0 16px;">欢迎加入 GoMate！</h2>
        <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
          您好 ${name}，<br><br>
          欢迎加入 GoMate！我们很高兴您能在这里找到志同道合的伙伴，一起探索精彩的目的地。
        </p>
        <div style="background: #f8f8f8; border-radius: 8px; padding: 20px; margin: 24px 0;">
          <h3 style="color: #111; font-size: 16px; margin: 0 0 12px;">您可以：</h3>
          <ul style="color: #555; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
            <li>创建或加入感兴趣的地点组队</li>
            <li>与志同道合的伙伴交流</li>
            <li>发现新的旅行目的地</li>
            <li>分享您的旅行经历</li>
          </ul>
        </div>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${APP_URL}/explore" style="display: inline-block; background: #000; color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 500;">
            开始探索
          </a>
        </div>
        <p style="color: #888; font-size: 12px; margin-top: 32px; padding-top: 24px; border-top: 1px solid #eee;">
          如果您有任何问题，请随时联系我们的支持团队。
        </p>
      </div>
    </div>
  `;

  return sendEmail({
    to,
    subject,
    html,
  });
}

/**
 * Send team application notification (to team owner)
 */
export async function sendTeamApplicationNotification(
  to: string,
  teamOwnerName: string,
  applicantName: string,
  locationName: string,
  teamTitle: string,
  applicationMessage: string,
  reviewUrl: string
): Promise<EmailResult> {
  const subject = `有人申请加入您的队伍 - ${teamTitle}`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #111; font-size: 24px; margin: 0;">GoMate</h1>
      </div>
      <div style="background: #fff; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <h2 style="color: #111; font-size: 20px; margin: 0 0 16px;">新的组队申请</h2>
        <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
          您好 ${teamOwnerName}，<br><br>
          <strong>${applicantName}</strong> 申请加入您在 <strong>${locationName}</strong> 的队伍。
        </p>
        <div style="background: #f8f8f8; border-radius: 8px; padding: 20px; margin: 24px 0;">
          <p style="color: #111; font-size: 14px; margin: 0 0 8px;"><strong>队伍：</strong>${teamTitle}</p>
          <p style="color: #111; font-size: 14px; margin: 0 0 8px;"><strong>地点：</strong>${locationName}</p>
          <p style="color: #111; font-size: 14px; margin: 0;"><strong>申请人：</strong>${applicantName}</p>
        </div>
        ${applicationMessage ? `
        <div style="background: #f0f7ff; border-left: 4px solid #0066ff; padding: 16px; margin: 24px 0;">
          <p style="color: #555; font-size: 14px; line-height: 1.6; margin: 0; font-style: italic;">
            "${applicationMessage}"
          </p>
        </div>
        ` : ""}
        <div style="text-align: center; margin: 32px 0;">
          <a href="${reviewUrl}" style="display: inline-block; background: #000; color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 500;">
            查看申请
          </a>
        </div>
        <p style="color: #888; font-size: 12px; margin-top: 32px; padding-top: 24px; border-top: 1px solid #eee;">
          请及时处理申请，申请人正在等待您的回复。
        </p>
      </div>
    </div>
  `;

  return sendEmail({
    to,
    subject,
    html,
  });
}

/**
 * Send application result notification (to applicant)
 */
export async function sendApplicationResultNotification(
  to: string,
  applicantName: string,
  locationName: string,
  teamTitle: string,
  isApproved: boolean,
  teamUrl: string,
  rejectionReason?: string
): Promise<EmailResult> {
  const subject = isApproved
    ? `您的申请已通过 - ${teamTitle}`
    : `您的申请未通过 - ${teamTitle}`;

  const html = isApproved
    ? `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #111; font-size: 24px; margin: 0;">GoMate</h1>
      </div>
      <div style="background: #fff; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; width: 64px; height: 64px; background: #22c55e; border-radius: 50%; line-height: 64px; color: #fff; font-size: 32px;">✓</div>
        </div>
        <h2 style="color: #111; font-size: 20px; margin: 0 0 16px; text-align: center;">申请已通过！</h2>
        <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 24px; text-align: center;">
          恭喜 ${applicantName}！<br>
          您已成功加入 <strong>${locationName}</strong> 的队伍。
        </p>
        <div style="background: #f8f8f8; border-radius: 8px; padding: 20px; margin: 24px 0;">
          <p style="color: #111; font-size: 14px; margin: 0 0 8px;"><strong>队伍：</strong>${teamTitle}</p>
          <p style="color: #111; font-size: 14px; margin: 0;"><strong>地点：</strong>${locationName}</p>
        </div>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${teamUrl}" style="display: inline-block; background: #000; color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 500;">
            查看队伍
          </a>
        </div>
        <p style="color: #888; font-size: 12px; margin-top: 32px; padding-top: 24px; border-top: 1px solid #eee; text-align: center;">
          祝您旅途愉快！
        </p>
      </div>
    </div>
  `
    : `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #111; font-size: 24px; margin: 0;">GoMate</h1>
      </div>
      <div style="background: #fff; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; width: 64px; height: 64px; background: #ef4444; border-radius: 50%; line-height: 64px; color: #fff; font-size: 32px;">✕</div>
        </div>
        <h2 style="color: #111; font-size: 20px; margin: 0 0 16px; text-align: center;">申请未通过</h2>
        <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 24px; text-align: center;">
          您好 ${applicantName}，<br>
          很抱歉，您申请加入 <strong>${locationName}</strong> 队伍的请求未被通过。
        </p>
        <div style="background: #f8f8f8; border-radius: 8px; padding: 20px; margin: 24px 0;">
          <p style="color: #111; font-size: 14px; margin: 0 0 8px;"><strong>队伍：</strong>${teamTitle}</p>
          <p style="color: #111; font-size: 14px; margin: 0;"><strong>地点：</strong>${locationName}</p>
        </div>
        ${rejectionReason ? `
        <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 24px 0;">
          <p style="color: #555; font-size: 14px; line-height: 1.6; margin: 0;">
            <strong>原因：</strong>${rejectionReason}
          </p>
        </div>
        ` : ""}
        <div style="text-align: center; margin: 32px 0;">
          <a href="${APP_URL}/explore" style="display: inline-block; background: #000; color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 500;">
            探索其他队伍
          </a>
        </div>
        <p style="color: #888; font-size: 12px; margin-top: 32px; padding-top: 24px; border-top: 1px solid #eee; text-align: center;">
          不要灰心，还有很多其他精彩的队伍等着您！
        </p>
      </div>
    </div>
  `;

  return sendEmail({
    to,
    subject,
    html,
  });
}

/**
 * Send team success notification (when team is full or confirmed)
 */
export async function sendTeamSuccessNotification(
  to: string,
  memberName: string,
  locationName: string,
  teamTitle: string,
  teamUrl: string,
  memberCount: number
): Promise<EmailResult> {
  const subject = `队伍组建成功！ - ${teamTitle}`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #111; font-size: 24px; margin: 0;">GoMate</h1>
      </div>
      <div style="background: #fff; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; width: 64px; height: 64px; background: #8b5cf6; border-radius: 50%; line-height: 64px; color: #fff; font-size: 32px;">🎉</div>
        </div>
        <h2 style="color: #111; font-size: 20px; margin: 0 0 16px; text-align: center;">队伍组建成功！</h2>
        <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 24px; text-align: center;">
          恭喜 ${memberName}！<br>
          您的队伍 <strong>${teamTitle}</strong> 已成功组建。
        </p>
        <div style="background: #f8f8f8; border-radius: 8px; padding: 20px; margin: 24px 0;">
          <p style="color: #111; font-size: 14px; margin: 0 0 8px;"><strong>队伍：</strong>${teamTitle}</p>
          <p style="color: #111; font-size: 14px; margin: 0 0 8px;"><strong>地点：</strong>${locationName}</p>
          <p style="color: #111; font-size: 14px; margin: 0;"><strong>成员数：</strong>${memberCount} 人</p>
        </div>
        <div style="background: #f0fdf4; border-radius: 8px; padding: 20px; margin: 24px 0;">
          <p style="color: #166534; font-size: 14px; line-height: 1.6; margin: 0;">
            <strong>下一步：</strong><br>
            1. 在队伍页面查看所有成员信息<br>
            2. 通过内置聊天功能协调行程<br>
            3. 准备出发，享受旅程！
          </p>
        </div>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${teamUrl}" style="display: inline-block; background: #000; color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 500;">
            进入队伍
          </a>
        </div>
        <p style="color: #888; font-size: 12px; margin-top: 32px; padding-top: 24px; border-top: 1px solid #eee; text-align: center;">
          祝您旅途愉快，收获美好回忆！
        </p>
      </div>
    </div>
  `;

  return sendEmail({
    to,
    subject,
    html,
  });
}
