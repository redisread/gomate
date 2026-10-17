import type { MiddlewareHandler } from "hono";
import {
  createApiApp,
  createRoute,
  errorResponses,
  jsonResponse,
  legacyJsonBody,
  validationHook,
  z,
  type ApiEnv,
} from "../lib/openapi";

import { APIErrors } from "../lib/api-errors";
import { sendFeedbackEmail } from "../lib/email";
import { getRequestLocale } from "@/contracts/locale";
import { FeedbackInputSchema } from "@/contracts/feedback";
import { logger } from "../lib/logger";

const feedback = createApiApp();

const protectFeedback: MiddlewareHandler<ApiEnv> = async (c, next) => {
  const clientIp = (c.req.header("CF-Connecting-IP") || "unknown")
    .trim()
    .slice(0, 64);
  try {
    const hash = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(`feedback:${clientIp}`),
    );
    const key = Array.from(new Uint8Array(hash), (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");
    const decision = await c.env.AUTH_EMAIL_RATE_LIMITER.limit({ key });
    if (!decision.success) {
      c.header("Retry-After", "60");
      return c.json(APIErrors.rateLimited(), 429);
    }
  } catch {
    logger.error("feedback_rate_limiter_failed");
    return c.json(
      APIErrors.serviceUnavailable("Feedback protection unavailable"),
      503,
    );
  }
  await next();
};

// Read actual bytes rather than trusting a supplied Content-Length.
const boundFeedbackBody: MiddlewareHandler<ApiEnv> = async (c, next) => {
  const reader = c.req.raw.body?.getReader();
  if (!reader) return next();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 32768) {
        await reader.cancel().catch(() => undefined);
        return c.json(
          APIErrors.badRequest("Feedback body exceeds 32 KiB"),
          413,
        );
      }
      chunks.push(value);
    }
  } catch {
    return c.json(APIErrors.badRequest("Could not read feedback"), 400);
  } finally {
    reader.releaseLock();
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  c.req.raw = new Request(c.req.raw, { body });
  await next();
};

/**
 * POST /feedback
 * 提交用户反馈（功能建议 / Bug 反馈）
 */
feedback.openapi(
  createRoute({
    method: "post",
    path: "/",
    operationId: "feedbackSubmit",
    tags: ["feedback"],
    summary: "Submit feedback",
    "x-audience": "public",
    middleware: [
      protectFeedback,
      boundFeedbackBody,
      legacyJsonBody("输入无效"),
    ],
    request: {
      body: {
        required: true,
        content: { "application/json": { schema: FeedbackInputSchema } },
      },
    },
    responses: {
      200: jsonResponse(
        z.object({ success: z.literal(true), message: z.string() }),
        "Success",
      ),
      ...errorResponses(400, 413, 429, 500, 403, 503),
    },
  }),
  async (c) => {
    try {
      const input = c.req.valid("json");
      const result = await sendFeedbackEmail(
        input,
        c.env,
        getRequestLocale(c.req.raw.headers),
      );

      if (!result.success) {
        logger.error("feedback_email_delivery_failed");
        return c.json(APIErrors.internalError("发送失败，请稍后重试"), 500);
      }

      return c.json(
        {
          success: true as const,
          message: "感谢您的反馈！我们会认真查看每一条反馈，持续改进产品。",
        },
        200,
      );
    } catch (error) {
      logger.error("feedback_request_failed", {
        errorType: error instanceof Error ? error.name : "UnknownError",
      });
      return c.json(APIErrors.internalError("服务器错误，请稍后重试"), 500);
    }
  },
  validationHook("输入无效", "issues"),
);

export { feedback as feedbackRoute };
