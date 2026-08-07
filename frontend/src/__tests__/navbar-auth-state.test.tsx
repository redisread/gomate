import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Navbar } from "../components/layout/navbar";

const fetchCurrentUserMock = vi.fn();

vi.mock("@/lib/api", () => ({
  fetchCurrentUser: (...args: unknown[]) => fetchCurrentUserMock(...args),
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: { signOut: vi.fn() },
}));

vi.mock("@/hooks/useMessages", () => ({
  useUnreadCount: () => ({ count: 0 }),
}));

vi.mock("@/hooks/useI18n", () => ({
  useI18n: () => ({
    t: (key: string) => key,
    locale: "zh-CN",
    loading: false,
    getNsData: () => null,
  }),
}));

vi.mock("../components/layout/locale-toggle", () => ({ LocaleToggle: () => null }));
vi.mock("../components/theme-toggle", () => ({ ThemeToggle: () => null }));

describe("Navbar auth state", () => {
  beforeEach(() => fetchCurrentUserMock.mockReset());

  it("does not flash guest actions while authentication is loading", async () => {
    let resolveUser: ((user: null) => void) | undefined;
    fetchCurrentUserMock.mockReturnValue(new Promise<null>((resolve) => { resolveUser = resolve; }));

    render(<Navbar />);

    expect(screen.getByTestId("nav-auth-loading")).toBeInTheDocument();
    expect(screen.queryByTestId("nav-login")).not.toBeInTheDocument();
    expect(screen.queryByTestId("nav-register")).not.toBeInTheDocument();

    await act(async () => resolveUser?.(null));
  });

  it("shows guest actions after authentication resolves without a user", async () => {
    fetchCurrentUserMock.mockResolvedValue(null);

    await act(async () => {
      render(<Navbar />);
    });

    expect(await screen.findByTestId("nav-login")).toBeInTheDocument();
    expect(screen.getByTestId("nav-register")).toBeInTheDocument();
  });
});
