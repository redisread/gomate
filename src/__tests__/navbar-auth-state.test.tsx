import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminQuickActionDialog } from "../components/admin/admin-quick-action";
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

vi.mock("../components/layout/locale-toggle", () => ({
  LocaleToggle: () => null,
}));
vi.mock("../components/theme-toggle", () => ({ ThemeToggle: () => null }));

describe("Navbar auth state", () => {
  beforeEach(() => {
    fetchCurrentUserMock.mockReset();
    refreshCurrentUserMock.mockReset();
  });

  it("does not flash guest actions while authentication is loading", async () => {
    let resolveUser: ((user: null) => void) | undefined;
    fetchCurrentUserMock.mockReturnValue(
      new Promise<null>((resolve) => {
        resolveUser = resolve;
      }),
    );
    const renderAdminQuickAction = vi.fn(() => <button>Quick action</button>);

    render(
      <Navbar
        adminQuickActionLabel="Quick action"
        renderAdminQuickAction={renderAdminQuickAction}
      />,
    );

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

    render(
      <Navbar
        adminQuickActionLabel="Quick action"
        renderAdminQuickAction={renderAdminQuickAction}
      />,
    );

    await screen.findByTestId("nav-create-team");
    expect(screen.getByTestId("nav-admin")).not.toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: /Admin/ }));
    const adminLink = await screen.findByTestId("nav-admin");
    expect(adminLink).toHaveAttribute("href", "/admin");
    expect(
      screen.getByTestId("injected-admin-quick-action"),
    ).toBeInTheDocument();
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

    render(
      <Navbar
        adminQuickActionLabel="Quick action"
        renderAdminQuickAction={renderAdminQuickAction}
      />,
    );

    expect(await screen.findByTestId("nav-create-team")).toBeInTheDocument();
    expect(screen.queryByTestId("nav-admin")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /User/ }));
    expect(screen.queryByTestId("nav-admin")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("nav-mobile-menu-toggle"));
    expect(screen.queryByTestId("nav-admin-mobile")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Quick action" }),
    ).not.toBeInTheDocument();
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

    await screen.findByTestId("nav-create-team");
    fireEvent.click(screen.getByRole("button", { name: /Admin/ }));
    expect(await screen.findByTestId("nav-admin")).toHaveAttribute(
      "href",
      "/admin",
    );
    expect(
      screen.queryByTestId("injected-admin-quick-action"),
    ).not.toBeInTheDocument();
  });
  it.each([false, true])(
    "groups admin actions and returns focus after quick entry (mobile=%s)",
    async (mobile) => {
      fetchCurrentUserMock.mockResolvedValue({
        id: "admin-1",
        name: "Admin",
        role: "admin",
      });
      render(
        <Navbar
          adminQuickActionLabel="Quick action"
          renderAdminQuickAction={(props) => (
            <AdminQuickActionDialog
              {...props}
                  title="Quick entry"
              closeLabel="Close"
            >
              <input aria-label="Location name" />
            </AdminQuickActionDialog>
          )}
        />,
      );
      await screen.findByTestId("nav-create-team");
      const trigger = mobile
        ? screen.getByTestId("nav-mobile-menu-toggle")
        : screen.getByRole("button", { name: /Admin/ });
      fireEvent.click(trigger);
      const adminLink = screen.getByTestId(
        mobile ? "nav-admin-mobile" : "nav-admin",
      );
      const group = adminLink.parentElement!;
      const labels = (mobile ? within(group).getAllByRole("link").concat(within(group).getAllByRole("button")) : within(group).getAllByRole("menuitem"))
        .sort((a, b) =>
          a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING
            ? -1
            : 1,
        )
        .map((element) => element.textContent);
      expect(labels.slice(labels.indexOf("nav.profile"))).toEqual([
        "nav.profile",
        "nav.myTeams",
        "nav.admin",
        "Quick action",
        "nav.logout",
      ]);
      fireEvent.click(screen.getByRole(mobile ? "button" : "menuitem", { name: "Quick action" }));
      expect(
        screen.getByRole("dialog", { name: "Quick entry" }),
      ).toBeInTheDocument();
      if (mobile) await waitFor(() => expect(screen.queryByTestId("nav-admin-mobile")).not.toBeInTheDocument());
      else expect(screen.getByTestId("nav-admin")).not.toBeVisible();
      fireEvent.keyDown(document, { key: "Escape" });
      await act(async () => {});
      await waitFor(() => expect(screen.queryByRole("dialog", { hidden: true })).not.toBeInTheDocument());
      expect(trigger).toHaveFocus();
      expect(document.body.style.overflow).toBe("");
    },
  );
});
