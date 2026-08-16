import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { VerifyEmailClient } from "@/components/features/verify-email-client";

vi.mock("@/hooks/useI18n", () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

describe("VerifyEmailClient", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/verify-email#token=private-token");
    vi.stubGlobal("fetch", vi.fn(async () => new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "content-type": "application/json" } },
    )));
  });

  it("requires an explicit confirmation before moving the fragment token into a body-only request", async () => {
    render(<VerifyEmailClient />);

    expect(fetch).not.toHaveBeenCalled();
    expect(window.location.hash).toBe("");
    expect(window.location.href).not.toContain("private-token");

    fireEvent.click(screen.getByRole("button", {
      name: "auth.verificationConfirm",
    }));
    await waitFor(() => expect(fetch).toHaveBeenCalledOnce());
    expect(fetch).toHaveBeenCalledWith("/api/auth/confirm-email", expect.objectContaining({
      method: "POST",
      credentials: "include",
      body: JSON.stringify({ token: "private-token" }),
    }));
  });

  it("rejects and scrubs a legacy query token without sending it", async () => {
    window.history.replaceState(
      {},
      "",
      "/verify-email?source=email&token=legacy-query-secret",
    );

    render(<VerifyEmailClient />);

    await waitFor(() => {
      expect(screen.getByText("auth.verificationInvalid")).toBeInTheDocument();
    });
    expect(window.location.search).toBe("?source=email");
    expect(window.location.href).not.toContain("legacy-query-secret");
    expect(fetch).not.toHaveBeenCalled();
  });
});
