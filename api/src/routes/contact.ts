import { Hono } from "hono";
import { sendContactFormEmail } from "../lib/email";
import type { Env } from "../lib/auth";
import type { EmailLocale } from "../lib/email-i18n";

const contact = new Hono<{ Bindings: Env }>();

/**
 * POST /contact
 * 提交联系表单
 */
contact.post("/", async (c) => {
  try {
    const body = await c.req.json<{
      name?: string; email?: string; subject?: string; message?: string;
    }>();
    const { name, email, subject, message } = body;

    if (!name || !email || !subject || !message) {
      return c.json({ error: "请填写所有必填字段" }, 400);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return c.json({ error: "请输入有效的邮箱地址" }, 400);
    }

    if (name.length > 100) return c.json({ error: "姓名长度不能超过 100 个字符" }, 400);
    if (subject.length > 200) return c.json({ error: "主题长度不能超过 200 个字符" }, 400);
    if (message.length > 5000) return c.json({ error: "建议内容不能超过 5000 个字符" }, 400);

    // 提取用户 locale
    const cookie = c.req.raw.headers.get("Cookie") || "";
    const localeMatch = cookie.match(/gomate_locale=(zh-CN|en|ja)/);
    const locale: EmailLocale = localeMatch ? (localeMatch[1] as EmailLocale) : "zh-CN";

    const result = await sendContactFormEmail(
      { name: name.trim(), email: email.trim().toLowerCase(), subject: subject.trim(), message: message.trim() },
      c.env,
      locale
    );

    if (!result.success) {
      console.error("Failed to send contact email:", result.error);
      return c.json({ error: "发送失败，请稍后重试" }, 500);
    }

    return c.json({ success: true, message: "您的建议已成功提交，我们会尽快查看并回复。" });
  } catch (error) {
    console.error("Contact API error:", error);
    return c.json({ error: "服务器错误，请稍后重试" }, 500);
  }
});

export { contact as contactRoute };
