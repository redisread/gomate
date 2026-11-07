interface ResendMessage {
  from: string;
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

/** Single-attempt transport for https://resend.com/docs/api-reference/emails/send-email. */
export async function sendResendEmail(
  apiKey: string,
  message: ResendMessage,
  options?: { idempotencyKey: string },
): Promise<{ error: boolean }> {
  const headers = new Headers({
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "User-Agent": "gomate/0.1.0",
  });
  if (options?.idempotencyKey) headers.set("Idempotency-Key", options.idempotencyKey);
  try {
    const { replyTo, ...fields } = message;
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers,
      body: JSON.stringify({ ...fields, reply_to: replyTo }),
    });
    if (!response.ok) {
      await response.body?.cancel();
      return { error: true };
    }
    await response.json();
    return { error: false };
  } catch {
    return { error: true };
  }
}
