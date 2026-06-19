import { Hono } from "hono";
import { z } from "zod";
import { sendFeedbackEmail } from "../lib/email";
import type { Env } from "../lib/auth";
import type { EmailLocale } from "../lib/email-i18n";

const feedback = new Hono<{ Bindings: Env }>();

const feedbackSchema = z.object({
  type: z.enum(["suggestion", "bug"]).optional(),
  name: z.string().min(1).max(100),
  email: z.string().email("请输入有效的邮箱地址"),
  content: z.string().min(1).max(5000),
  device: z.string().optional(),
  browser: z.string().optional(),
  steps: z.string().max(2000).optional(),
  pageUrl: z.string().max(500).optional(),
});

/**
 * POST /feedback
 * 提交用户反馈（功能建议 / Bug 反馈）
 */
feedback.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const parsed = feedbackSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ success: false, error: "输入无效", details: parsed.error.errors }, 400);
    }

    const { type, name, email, content, device, browser, steps, pageUrl } = parsed.data;

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
      return c.json({ success: false, error: "发送失败，请稍后重试" }, 500);
    }

    return c.json({
      success: true,
      message: "感谢您的反馈！我们会认真查看每一条反馈，持续改进产品。"
    });
  } catch (error) {
    console.error("Feedback API error:", error);
    return c.json({ success: false, error: "服务器错误，请稍后重试" }, 500);
  }
});

export { feedback as feedbackRoute };