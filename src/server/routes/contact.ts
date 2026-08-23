import { Hono } from "hono";
import { logger } from "../lib/logger";
import { z } from "zod";
import { sendContactFormEmail } from "../lib/email";
import type { Env } from "../lib/auth";
import type { EmailLocale } from "../lib/email-i18n";
import { APIErrors } from "../lib/api-errors";
import { validateRequest } from "../lib/validation";

const contact = new Hono<{ Bindings: Env }>();

const contactSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email("请输入有效的邮箱地址"),
  subject: z.string().min(1).max(200),
  message: z.string().min(1).max(5000),
});

/**
 * POST /contact
 * 提交联系表单
 */
contact.post("/", async (c) => {
  try {
    const input = await validateRequest(
      c,
      "json",
      contactSchema,
      "输入无效",
      "issues",
    );
    if (input instanceof Response) return input;
    const { name, email, subject, message } = input;

    // 提取用户 locale
    const cookie = c.req.raw.headers.get("Cookie") || "";
    const localeMatch = cookie.match(/gomate_locale=(zh-CN|en|ja)/);
    const locale: EmailLocale = localeMatch
      ? (localeMatch[1] as EmailLocale)
      : "zh-CN";

    const result = await sendContactFormEmail(
      {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        subject: subject.trim(),
        message: message.trim(),
      },
      c.env,
      locale,
    );

    if (!result.success) {
      logger.error("contact_email_delivery_failed", result.error);
      return c.json(APIErrors.internalError("发送失败，请稍后重试"), 500);
    }

    return c.json({
      success: true,
      message: "您的建议已成功提交，我们会尽快查看并回复。",
    });
  } catch (error) {
    logger.error("contact_request_failed", error);
    return c.json(APIErrors.internalError("服务器错误，请稍后重试"), 500);
  }
});

export { contact as contactRoute };
