import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ResetPasswordClient } from "@/components/features/reset-password-client";

vi.mock("@/hooks/useI18n", () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));
vi.mock("@/lib/auth-client", () => ({
  authClient: { resetPassword: vi.fn() },
}));

describe("ResetPasswordClient", () => {
  beforeEach(() => {
    window.history.replaceState(
      {},
      "",
      "/reset-password?source=email#token=reset-secret",
    );
  });

  it("reads the reset token from the fragment and immediately removes it", async () => {
    render(<ResetPasswordClient />);

    await waitFor(() => {
      expect(screen.getByText("auth.resetPasswordTitle")).toBeInTheDocument();
    });
    expect(window.location.pathname).toBe("/reset-password");
    expect(window.location.search).toBe("?source=email");
    expect(window.location.hash).toBe("");
    expect(window.location.href).not.toContain("reset-secret");
  });

  it("never consumes a legacy query token and removes it from the address bar", async () => {
    window.history.replaceState(
      {},
      "",
      "/reset-password?source=email&token=legacy-query-secret",
    );

    render(<ResetPasswordClient />);

    await waitFor(() => {
      expect(screen.getByText("auth.invalidResetLink")).toBeInTheDocument();
    });
    expect(window.location.search).toBe("?source=email");
    expect(window.location.href).not.toContain("legacy-query-secret");
  });
});
