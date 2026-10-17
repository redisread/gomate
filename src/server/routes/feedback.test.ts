import { beforeEach, describe, expect, it, vi } from "vitest";
import { feedbackRoute } from "./feedback";
import type { Env } from "../lib/auth";
const mocks = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: mocks.send };
  },
}));
const limit = vi.fn();
const env = {
  RESEND_API_KEY: "test",
  AUTH_EMAIL_RATE_LIMITER: { limit },
} as unknown as Env;
const requestId = "b96450a4-f648-4636-a7c1-b9bb3e039790";
const submit = (
  data: unknown = {
    requestId,
    email: "person@example.com",
    content: "Feedback",
  },
) =>
  feedbackRoute.request(
    "/",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: "gomate_locale=en",
        "CF-Connecting-IP": "192.0.2.1",
      },
      body: JSON.stringify({ requestId, ...(data as object) }),
    },
    env,
  );
beforeEach(() => {
  vi.clearAllMocks();
  limit.mockResolvedValue({ success: true });
  mocks.send.mockResolvedValue({ data: { id: "mail" }, error: null });
});
describe("minimal feedback HTTP", () => {
  it("accepts only reply email and content, and safely sends one message", async () => {
    const response = await submit({
      email: " Person@example.com ",
      content: " <script>text</script> ",
    });
    expect(response.status).toBe(200);
    expect(mocks.send).toHaveBeenCalledOnce();
    expect(mocks.send.mock.calls[0][0]).toMatchObject({
      replyTo: "person@example.com",
    });
    expect(mocks.send.mock.calls[0][0].html).toContain(
      "&lt;script&gt;text&lt;/script&gt;",
    );
    expect(mocks.send.mock.calls[0][0].html).not.toContain("<script>");
  });
});

it("rejects repeated submissions before delivery and fails closed if protection is unavailable", async () => {
  limit.mockResolvedValue({ success: false });
  const limited = await submit();
  expect(limited.status).toBe(429);
  expect(limited.headers.get("Retry-After")).toBe("60");
  expect(mocks.send).not.toHaveBeenCalled();
  limit.mockRejectedValue(new Error("Unavailable"));
  expect((await submit()).status).toBe(503);
  expect(mocks.send).not.toHaveBeenCalled();
});

it("rejects blank, oversized and unsupported fields without delivery", async () => {
  for (const data of [
    { email: "bad", content: "Hi" },
    { email: "p@example.com", content: "  " },
    { email: "p@example.com", content: "Hi", device: "old form" },
  ]) {
    expect((await submit(data)).status).toBe(400);
  }
  expect(
    (await submit({ email: "p@example.com", content: "a".repeat(33000) }))
      .status,
  ).toBe(413);
  expect(mocks.send).not.toHaveBeenCalled();
});

it("reports provider rejection without pretending delivery succeeded or retrying", async () => {
  mocks.send.mockResolvedValue({
    data: null,
    error: { message: "sensitive upstream failure" },
  });
  const response = await submit();
  expect(response.status).toBe(500);
  expect(mocks.send).toHaveBeenCalledOnce();
  expect(await response.text()).not.toContain("sensitive upstream failure");
});

it("bounds streamed bytes even with a misleading length and cancels oversized input", async () => {
  const cancel = vi.fn();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array(33000));
    },
    cancel,
  });
  const response = await feedbackRoute.fetch(
    new Request("http://localhost/", {
      method: "POST",
      headers: { "content-length": "1", "content-type": "application/json" },
      body,
      duplex: "half",
    } as RequestInit),
    env,
  );
  expect(response.status).toBe(413);
  expect(cancel).toHaveBeenCalledOnce();
  expect(mocks.send).not.toHaveBeenCalled();
});

it("returns a safe failure on thrown transport errors and never retries", async () => {
  mocks.send.mockRejectedValue(new Error("secret transport detail"));
  const response = await submit();
  expect(response.status).toBe(500);
  expect(await response.text()).not.toContain("secret transport detail");
  expect(mocks.send).toHaveBeenCalledOnce();
});

it("rejects malformed JSON and missing configuration without sending", async () => {
  const malformed = await feedbackRoute.request(
    "/",
    { method: "POST", body: "{" },
    env,
  );
  expect(malformed.status).toBe(400);
  const missing = await feedbackRoute.request(
    "/",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        requestId,
        email: "p@example.com",
        content: "Hi",
      }),
    },
    { AUTH_EMAIL_RATE_LIMITER: { limit } } as unknown as Env,
  );
  expect(missing.status).toBe(500);
  expect(mocks.send).not.toHaveBeenCalled();
});

it("reuses the same provider idempotency key after an ambiguous transport failure", async () => {
  mocks.send.mockRejectedValueOnce(new Error("response lost after acceptance"));
  expect((await submit()).status).toBe(500);
  expect((await submit()).status).toBe(200);
  expect(mocks.send).toHaveBeenCalledTimes(2);
  expect(mocks.send.mock.calls[0][1]).toEqual({
    idempotencyKey: `feedback/${requestId}`,
  });
  expect(mocks.send.mock.calls[1][1]).toEqual(mocks.send.mock.calls[0][1]);
  expect(mocks.send.mock.calls[1][0]).toEqual(mocks.send.mock.calls[0][0]);
});

it("keeps the idempotency key when delivery timed out with an unknown result", async () => {
  vi.useFakeTimers();
  try {
    mocks.send.mockImplementationOnce(() => new Promise(() => undefined));
    const pending = submit();
    await vi.waitFor(() => expect(mocks.send).toHaveBeenCalledOnce());
    await vi.advanceTimersByTimeAsync(10001);
    expect((await pending).status).toBe(500);
    expect((await submit()).status).toBe(200);
    expect(mocks.send.mock.calls[1][1]).toEqual({
      idempotencyKey: `feedback/${requestId}`,
    });
  } finally {
    vi.useRealTimers();
  }
});
