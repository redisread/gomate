import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LoginClient } from "./login-client";

const mocks = vi.hoisted(() => ({ signInEmail: vi.fn() }));

vi.mock("@/hooks/useI18n", () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));
vi.mock("@/lib/auth-client", () => ({
  signIn: { email: mocks.signInEmail },
}));

function submitLogin() {
  fireEvent.change(screen.getByTestId("login-email"), {
    target: { value: "admin@example.test" },
  });
  fireEvent.change(screen.getByTestId("login-password"), {
    target: { value: "password" },
  });
  fireEvent.click(screen.getByTestId("login-submit"));
}

describe("LoginClient return path", () => {
  beforeEach(() => {
    mocks.signInEmail.mockReset();
    window.history.replaceState({}, "", "/login");
  });

  it("returns to a validated administrator path after successful login", async () => {
    const navigate = vi.fn();
    window.history.replaceState(
      {},
      "",
      "/login?returnTo=%2Fadmin%2Flocations%2Fnew%3Fsource%3Dnavbar",
    );
    mocks.signInEmail.mockResolvedValue({ data: {}, error: null });
    render(<LoginClient onNavigate={navigate} />);

    submitLogin();

    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith(
        "/admin/locations/new?source=navbar",
      ),
    );
  });

  it("falls back to home when the return path is unsafe", async () => {
    const navigate = vi.fn();
    window.history.replaceState(
      {},
      "",
      "/login?returnTo=https%3A%2F%2Fevil.example%2Fadmin",
    );
    mocks.signInEmail.mockResolvedValue({ data: {}, error: null });
    render(<LoginClient onNavigate={navigate} />);

    submitLogin();

    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/"));
  });

  it("keeps the user on the login form when authentication fails", async () => {
    const navigate = vi.fn();
    mocks.signInEmail.mockResolvedValue({
      data: null,
      error: { message: "invalid credentials" },
    });
    render(<LoginClient onNavigate={navigate} />);

    submitLogin();

    expect(await screen.findByText("auth.loginError")).toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();
    expect(screen.getByTestId("login-submit")).not.toBeDisabled();
  });
});
