import {
  createApiApp,
  createRoute,
  errorResponses,
  jsonResponse,
  legacyJsonBody,
  validationHook,
  z,
} from "../lib/openapi";

import { APIErrors } from "../lib/api-errors";
import { sendContactFormEmail } from "../lib/email";
import type { EmailLocale } from "../lib/email-i18n";
import { logger } from "../lib/logger";

const contact = createApiApp();

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
contact.openapi(
  createRoute({
    method: "post",
    path: "/",
    operationId: "contactSubmit",
    tags: ["contact"],
    summary: "Submit contact form",
    "x-audience": "public",
    middleware: [legacyJsonBody("输入无效")],
    request: {
      body: {
        required: true,
        content: { "application/json": { schema: contactSchema } },
      },
    },
    responses: {
      200: jsonResponse(
        z.object({ success: z.literal(true), message: z.string() }),
        "Success",
      ),
      ...errorResponses(400, 500, 403, 503),
    },
  }),
  async (c) => {
    try {
      const input = c.req.valid("json");
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

      return c.json(
        {
          success: true as const,
          message: "您的建议已成功提交，我们会尽快查看并回复。",
        },
        200,
      );
    } catch (error) {
      logger.error("contact_request_failed", error);
      return c.json(APIErrors.internalError("服务器错误，请稍后重试"), 500);
    }
  },
  validationHook("输入无效", "issues"),
);

export { contact as contactRoute };
