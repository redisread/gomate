import { afterEach, describe, expect, it, vi } from "vitest";
import { sendResendEmail } from "./resend-http";

const message = {
  from: "GoMate <noreply@gomate.test>",
  to: "member@example.test",
  subject: "Hello",
  html: "<p>Hello</p>",
};
afterEach(() => vi.unstubAllGlobals());

describe("Resend HTTP send", () => {
  it("serializes only the supported fields and supplies bearer authentication", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('{"id":"mail"}'));
    vi.stubGlobal("fetch", fetch);
    expect(await sendResendEmail("test-key", { ...message, replyTo: "reply@example.test" }, { idempotencyKey: "feedback/id" })).toEqual({ error: false });
    expect(fetch).toHaveBeenCalledOnce();
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.method).toBe("POST");
    const headers = new Headers(init.headers);
    expect(headers.get("authorization")).toBe("Bearer test-key");
    expect(headers.get("content-type")).toBe("application/json");
    expect(headers.get("user-agent")).toBe("gomate/0.1.0");
    expect(headers.get("idempotency-key")).toBe("feedback/id");
    expect(JSON.parse(init.body)).toEqual({ ...message, reply_to: "reply@example.test" });
  });

  it("omits absent reply-to and idempotency fields", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('{"id":"mail"}'));
    vi.stubGlobal("fetch", fetch);
    expect(await sendResendEmail("test-key", message)).toEqual({ error: false });
    const [, init] = fetch.mock.calls[0];
    expect(new Headers(init.headers).has("idempotency-key")).toBe(false);
    expect(JSON.parse(init.body)).toEqual(message);
  });

  it.each([400, 422, 429, 500])("returns rejection without retrying HTTP %s", async (status) => {
    const fetch = vi.fn().mockResolvedValue(new Response("private provider detail", { status }));
    vi.stubGlobal("fetch", fetch);
    expect(await sendResendEmail("test-key", message)).toEqual({ error: true });
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("treats a malformed success body as failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("invalid json")));
    expect(await sendResendEmail("test-key", message)).toEqual({ error: true });
  });

  it("returns a safe failure after a network error without retrying", async () => {
    const fetch = vi.fn().mockRejectedValue(new Error("private network detail"));
    vi.stubGlobal("fetch", fetch);
    expect(await sendResendEmail("test-key", message)).toEqual({ error: true });
    expect(fetch).toHaveBeenCalledOnce();
  });
});
