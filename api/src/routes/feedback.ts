import { Hono } from "hono";
import { sendFeedbackEmail } from "../lib/email";
import type { Env } from "../lib/auth";
import type { EmailLocale } from "../lib/email-i18n";

const feedback = new Hono<{ Bindings: Env }>();

/**
 * POST /feedback
 * 提交用户反馈（功能建议 / Bug 反馈）
 */
feedback.post("/", async (c) => {
  try {
    const body = await c.req.json<{
      type: "suggestion" | "bug";
      name?: string;
      email?: string;
      content?: string;
      device?: string;
      browser?: string;
      steps?: string;
      pageUrl?: string;
    }>();

    const { type, name, email, content, device, browser, steps, pageUrl } = body;

    // 基础校验
    if (!name || !email || !content) {
      return c.json({ error: "请填写所有必填字段" }, 400);
    }

    if (!type || !["suggestion", "bug"].includes(type)) {
      return c.json({ error: "反馈类型无效" }, 400);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return c.json({ error: "请输入有效的邮箱地址" }, 400);
    }

    // 长度校验
    if (name.length > 100) return c.json({ error: "姓名长度不能超过 100 个字符" }, 400);
    if (content.length > 5000) return c.json({ error: "内容长度不能超过 5000 个字符" }, 400);
    if (steps && steps.length > 2000) return c.json({ error: "复现步骤不能超过 2000 个字符" }, 400);
    if (pageUrl && pageUrl.length > 500) return c.json({ error: "页面 URL 不能超过 500 个字符" }, 400);

    // 提取用户 locale
    const cookie = c.req.raw.headers.get("Cookie") || "";
    const localeMatch = cookie.match(/gomate_locale=(zh-CN|en|ja)/);
    const locale: EmailLocale = localeMatch ? (localeMatch[1] as EmailLocale) : "zh-CN";

    // 发送邮件
    const result = await sendFeedbackEmail(
      {
        type,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        content: content.trim(),
        device: device?.trim(),
        browser: browser?.trim(),
        steps: steps?.trim(),
        pageUrl: pageUrl?.trim(),
      },
      c.env,
      locale
    );

    if (!result.success) {
      console.error("Failed to send feedback email:", result.error);
      return c.json({ error: "发送失败，请稍后重试" }, 500);
    }

    return c.json({
      success: true,
      message: "感谢您的反馈！我们会认真查看每一条反馈，持续改进产品。"
    });
  } catch (error) {
    console.error("Feedback API error:", error);
    return c.json({ error: "服务器错误，请稍后重试" }, 500);
  }
});

export { feedback as feedbackRoute };