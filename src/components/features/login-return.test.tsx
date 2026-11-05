import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { RegisterClient } from "./register-client";
import { VerifyEmailClient } from "./verify-email-client";
import { LoginClient } from "./login-client";

const mocks = vi.hoisted(() => ({
  signInEmail: vi.fn(),
  signUpEmail: vi.fn(),
  sendVerificationEmail: vi.fn(),
  fetchAPI: vi.fn(),
}));

vi.mock("@/hooks/useI18n", () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));
vi.mock("@/lib/auth-client", () => ({
  signIn: { email: mocks.signInEmail },
  signUp: { email: mocks.signUpEmail },
  sendVerificationEmail: mocks.sendVerificationEmail,
}));

vi.mock("@/lib/api", () => ({ fetchAPI: mocks.fetchAPI }));

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

describe("activity intent across authentication", () => {
  const returnTo = "/en/teams/create?locationId=lake";
  it("keeps the destination when moving from login to registration", () => {
    render(<LoginClient returnTo={returnTo} />);
    const link = screen.getByRole("link", { name: /auth.registerNow/ });
    expect(
      new URL(link.getAttribute("href")!, location.origin).searchParams.get(
        "returnTo",
      ),
    ).toBe(returnTo);
  });
  it("carries the destination in initial and repeated verification requests", async () => {
    mocks.signUpEmail.mockResolvedValue({ error: null });
    mocks.sendVerificationEmail.mockResolvedValue({ error: null });
    render(<RegisterClient returnTo={returnTo} />);
    fireEvent.change(screen.getByTestId("register-name"), {
      target: { value: "Member" },
    });
    fireEvent.change(screen.getByTestId("register-email"), {
      target: { value: "member@example.test" },
    });
    for (const id of ["register-password", "register-confirm-password"]) {
      fireEvent.change(screen.getByTestId(id), {
        target: { value: "password123" },
      });
    }
    fireEvent.click(screen.getByTestId("register-submit"));
    await screen.findByText("auth.registerSuccess");
    expect(mocks.signUpEmail).toHaveBeenCalledWith(
      expect.objectContaining({ callbackURL: returnTo }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "auth.verificationResend" }),
    );
    await waitFor(() =>
      expect(mocks.sendVerificationEmail).toHaveBeenCalledWith(
        expect.objectContaining({ callbackURL: returnTo }),
      ),
    );
    expect(
      new URL(
        screen
          .getByRole("link", { name: "auth.goLogin" })
          .getAttribute("href")!,
        location.origin,
      ).searchParams.get("returnTo"),
    ).toBe(returnTo);
  });
  it("recovers an email-link destination in a fresh tab without storing its token", async () => {
    window.history.replaceState(
      {},
      "",
      "/verify-email#" +
        new URLSearchParams({ token: "private-challenge", returnTo }),
    );
    mocks.fetchAPI.mockResolvedValue({ ok: true });
    render(<VerifyEmailClient />);
    fireEvent.click(
      await screen.findByRole("button", { name: "auth.verificationConfirm" }),
    );
    const login = await screen.findByRole("link", { name: "auth.goLogin" });
    expect(
      new URL(login.getAttribute("href")!, location.origin).searchParams.get(
        "returnTo",
      ),
    ).toBe(returnTo);
    expect(window.location.href).not.toContain("private-challenge");
    expect(mocks.fetchAPI).toHaveBeenCalledWith(
      "/auth/confirm-email",
      expect.objectContaining({
        body: JSON.stringify({ token: "private-challenge" }),
      }),
    );
  });
});
