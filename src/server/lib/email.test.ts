import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  send: vi.fn(async (_payload: { html: string }) => ({
    data: { id: "mail-id" },
    error: null,
  })),
}));

vi.mock("resend", () => ({
  Resend: class {
    readonly emails = { send: mocks.send };
  },
}));

const { sendPasswordResetEmail, sendWelcomeEmail } = await import("./email");

describe("email HTML ownership boundaries", () => {
  beforeEach(() => {
    mocks.send.mockClear();
  });

  it("escapes profile names and password-reset URLs before HTML interpolation", async () => {
    const result = await sendPasswordResetEmail(
      "member@example.test",
      "https://gomate.test/reset-password#token=a&source=\"mail\"",
      '<a href="https://evil.example">Victim & Co</a>',
      { RESEND_API_KEY: "test-key" },
    );

    expect(result.success).toBe(true);
    const html = mocks.send.mock.calls[0]?.[0]?.html as string;
    expect(html).not.toContain('<a href="https://evil.example">');
    expect(html).toContain("&lt;a href=&quot;https://evil.example&quot;&gt;");
    expect(html).toContain("Victim &amp; Co");
    expect(html).toContain(
      "https://gomate.test/reset-password#token=a&amp;source=%22mail%22",
    );
  });

  it("rejects non-HTTP reset links before contacting the provider", async () => {
    const result = await sendPasswordResetEmail(
      "member@example.test",
      "javascript:alert(1)",
      "Member",
      { RESEND_API_KEY: "test-key" },
    );

    expect(result.success).toBe(false);
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("escapes the profile name in welcome mail", async () => {
    const result = await sendWelcomeEmail(
      "member@example.test",
      "<img src=x onerror=alert(1)>",
      { RESEND_API_KEY: "test-key" },
    );

    expect(result.success).toBe(true);
    const html = mocks.send.mock.calls[0]?.[0]?.html as string;
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
  });
});
