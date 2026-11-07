import { sendResendEmail } from "./resend-http";
import { logger } from "./logger";
import { withTimeout } from "./timeout";

export interface EmailEnvironment {
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
}

interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

/** A timeout leaves delivery uncertain, so this boundary never retries sends. */
export async function sendEmail(
  env: EmailEnvironment,
  buildMessage: () => EmailMessage,
  options?: { idempotencyKey: string },
): Promise<{ success: boolean; error?: string }> {
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) {
    logger.warn("email_provider_not_configured");
    return { success: false, error: "Email service not configured" };
  }

  try {
    const message = buildMessage();
    const result = await withTimeout(
      () =>
        sendResendEmail(
          apiKey,
          {
            ...message,
            from: env.RESEND_FROM_EMAIL || "GoMate <noreply@gomate.live>",
          },
          options,
        ),
      10000,
      "Email delivery timeout",
    );
    if (result.error) {
      logger.error("email_provider_rejected");
      return { success: false, error: "Email provider rejected message" };
    }
    return { success: true };
  } catch {
    logger.error("email_send_failed");
    return { success: false, error: "Email delivery unavailable" };
  }
}
