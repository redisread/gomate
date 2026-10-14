import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GoogleSignIn } from "./google-sign-in";
const mocks = vi.hoisted(() => ({ social: vi.fn() }));
vi.mock("@/hooks/useI18n", () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));
vi.mock("@/lib/auth-client", () => ({ signIn: { social: mocks.social } }));
describe("Google sign-in", () => {
  beforeEach(() => {
    mocks.social.mockReset();
    window.history.replaceState({}, "", "/login");
  });
  it("is absent when Google is not configured", () => {
    render(<GoogleSignIn enabled={false} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
  it("preserves the shared team destination and locks the button while redirecting", async () => {
    window.history.replaceState({}, "", "/login?redirect=%2Fteams%2Fteam-1");
    mocks.social.mockResolvedValue({ data: { redirect: true }, error: null });
    render(<GoogleSignIn enabled />);
    fireEvent.click(
      screen.getByRole("button", { name: "auth.googleContinue" }),
    );
    await waitFor(() =>
      expect(mocks.social).toHaveBeenCalledWith({
        provider: "google",
        callbackURL: "/teams/team-1",
      }),
    );
    expect(screen.getByRole("button")).toBeDisabled();
  });
  it("shows a retryable error without displaying provider internals", async () => {
    mocks.social.mockResolvedValue({
      error: { message: "secret provider failure" },
    });
    render(<GoogleSignIn enabled />);
    fireEvent.click(screen.getByRole("button"));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "auth.googleError",
    );
    expect(screen.getByRole("button")).not.toBeDisabled();
    expect(
      screen.queryByText("secret provider failure"),
    ).not.toBeInTheDocument();
  });
  it("shows authorization cancellation with a usable retry button", async () => {
    window.history.replaceState(
      {},
      "",
      "/login?oauthError=1&error=arbitrary_provider_text",
    );
    render(<GoogleSignIn enabled />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "auth.googleError",
    );
    expect(screen.getByRole("button")).not.toBeDisabled();
  });
});
