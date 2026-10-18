import { afterEach, describe, expect, it, vi } from "vitest";
import { sendFeedbackEmail } from "./email";

afterEach(() => vi.unstubAllGlobals());

describe("Resend SDK transport contract", () => {
  it("serializes reply-to and idempotency without sending real mail", async () => {
    const request = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ id: "mail-test" }), { status: 200 }),
      );
    vi.stubGlobal("fetch", request);
    const result = await sendFeedbackEmail(
      {
        email: "member@example.test",
        content: "<hello>",
        requestId: "00000000-0000-4000-8000-000000000001",
      },
      { RESEND_API_KEY: "test-only" },
    );
    expect(result).toEqual({ success: true });
    const [url, init] = request.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(new Headers(init.headers).get("idempotency-key")).toBe(
      "feedback/00000000-0000-4000-8000-000000000001",
    );
    expect(JSON.parse(init.body)).toMatchObject({
      reply_to: "member@example.test",
    });
    expect(JSON.parse(init.body).html).toContain("&lt;hello&gt;");
  });

  it("returns a safe failure for a provider rejection", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({
              name: "validation_error",
              message: "private provider detail",
              statusCode: 422,
            }),
            { status: 422 },
          ),
        ),
    );
    expect(
      await sendFeedbackEmail(
        {
          email: "member@example.test",
          content: "hello",
          requestId: "00000000-0000-4000-8000-000000000001",
        },
        { RESEND_API_KEY: "test-only" },
      ),
    ).toEqual({ success: false, error: "Email provider rejected feedback" });
  });
});
