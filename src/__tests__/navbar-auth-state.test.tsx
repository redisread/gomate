import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Navbar } from "../components/layout/navbar";

const fetchCurrentUserMock = vi.fn();
const refreshCurrentUserMock = vi.fn();

vi.mock("@/lib/api", () => ({
  fetchCurrentUser: (...args: unknown[]) => fetchCurrentUserMock(...args),
  refreshCurrentUser: (...args: unknown[]) => refreshCurrentUserMock(...args),
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
  beforeEach(() => {
    fetchCurrentUserMock.mockReset();
    refreshCurrentUserMock.mockReset();
  });

  it("does not flash guest actions while authentication is loading", async () => {
    let resolveUser: ((user: null) => void) | undefined;
    fetchCurrentUserMock.mockReturnValue(new Promise<null>((resolve) => { resolveUser = resolve; }));
    const renderAdminQuickAction = vi.fn(() => <button>Quick action</button>);

    render(<Navbar renderAdminQuickAction={renderAdminQuickAction} />);

    expect(screen.getByTestId("nav-auth-loading")).toBeInTheDocument();
    expect(screen.queryByTestId("nav-login")).not.toBeInTheDocument();
    expect(screen.queryByTestId("nav-register")).not.toBeInTheDocument();
    expect(screen.queryByTestId("nav-admin")).not.toBeInTheDocument();
    expect(renderAdminQuickAction).not.toHaveBeenCalled();

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

  it("refreshes the user menu when the page is shown again after login", async () => {
    fetchCurrentUserMock.mockResolvedValue(null);
    refreshCurrentUserMock.mockResolvedValue({
      id: "user-1",
      name: "Test User",
      nickname: "Tester",
      email: "test@example.com",
      image: null,
      extra: {},
    });

    render(<Navbar />);
    expect(await screen.findByTestId("nav-login")).toBeInTheDocument();

    await act(async () => {
      const event = new Event("pageshow");
      Object.defineProperty(event, "persisted", { value: true });
      window.dispatchEvent(event);
    });

    expect(await screen.findByTestId("nav-create-team")).toBeInTheDocument();
    expect(screen.queryByTestId("nav-login")).not.toBeInTheDocument();
    expect(refreshCurrentUserMock).toHaveBeenCalledTimes(1);
  });

  it("refreshes the user menu when the tab becomes visible again", async () => {
    fetchCurrentUserMock.mockResolvedValue(null);
    refreshCurrentUserMock.mockResolvedValue({
      id: "user-1",
      name: "Test User",
      nickname: "Tester",
      email: "test@example.com",
      image: null,
      extra: {},
    });

    render(<Navbar />);
    expect(await screen.findByTestId("nav-login")).toBeInTheDocument();

    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(await screen.findByTestId("nav-create-team")).toBeInTheDocument();
    expect(refreshCurrentUserMock).toHaveBeenCalledTimes(1);
  });

  it("shows real admin capabilities only after the admin role resolves", async () => {
    const renderAdminQuickAction = vi.fn(() => (
      <button type="button" data-testid="injected-admin-quick-action">
        Quick action
      </button>
    ));
    fetchCurrentUserMock.mockResolvedValue({
      id: "admin-1",
      name: "Admin",
      nickname: null,
      email: "admin@example.com",
      image: null,
      role: "admin",
      extra: {},
    });

    render(<Navbar renderAdminQuickAction={renderAdminQuickAction} />);

    const adminLink = await screen.findByTestId("nav-admin");
    expect(adminLink).toHaveAttribute("href", "/admin");
    expect(screen.getByTestId("injected-admin-quick-action")).toBeInTheDocument();
    expect(renderAdminQuickAction).toHaveBeenCalled();
  });

  it("does not call the quick action renderer for a regular user", async () => {
    const renderAdminQuickAction = vi.fn(() => <button>Quick action</button>);
    fetchCurrentUserMock.mockResolvedValue({
      id: "user-1",
      name: "User",
      nickname: null,
      email: "user@example.com",
      image: null,
      role: "user",
      extra: {},
    });

    render(<Navbar renderAdminQuickAction={renderAdminQuickAction} />);

    expect(await screen.findByTestId("nav-create-team")).toBeInTheDocument();
    expect(screen.queryByTestId("nav-admin")).not.toBeInTheDocument();
    expect(renderAdminQuickAction).not.toHaveBeenCalled();
  });

  it("does not render an empty quick action entry when no consumer exists", async () => {
    fetchCurrentUserMock.mockResolvedValue({
      id: "admin-1",
      name: "Admin",
      nickname: null,
      email: "admin@example.com",
      image: null,
      role: "admin",
      extra: {},
    });

    render(<Navbar />);

    expect(await screen.findByTestId("nav-admin")).toHaveAttribute(
      "href",
      "/admin",
    );
    expect(
      screen.queryByTestId("injected-admin-quick-action"),
    ).not.toBeInTheDocument();
  });
});
