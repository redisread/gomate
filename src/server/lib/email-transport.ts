import { Resend } from "resend";
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
  if (!env.RESEND_API_KEY) {
    logger.warn("email_provider_not_configured");
    return { success: false, error: "Email service not configured" };
  }

  try {
    const message = buildMessage();
    const resend = new Resend(env.RESEND_API_KEY);
    const result = await withTimeout(
      () =>
        resend.emails.send(
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
