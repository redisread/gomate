import { act, render, screen, waitFor, within } from "@testing-library/react";
import * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProfileClient } from "../components/features/profile-client";

const fetchCurrentUserMock = vi.fn();
const fetchAPIMock = vi.fn();
const fetchSelectableRegionsMock = vi.fn();

vi.mock("@/lib/api", () => ({
  fetchCurrentUser: (...args: unknown[]) => fetchCurrentUserMock(...args),
  fetchAPI: (...args: unknown[]) => fetchAPIMock(...args),
}));

vi.mock("@/lib/regions", () => ({
  fetchSelectableRegions: (...args: unknown[]) => fetchSelectableRegionsMock(...args),
}));

vi.mock("@/hooks/useI18n", () => ({
  useI18n: () => ({
    t: (key: string) => key,
    locale: "zh-CN",
    loading: false,
    getNsData: () => null,
  }),
}));

vi.mock("@/components/layout/navbar", () => ({ Navbar: () => <div data-testid="navbar" /> }));
vi.mock("@/components/layout/footer", () => ({ Footer: () => <div data-testid="footer" /> }));

const user = {
  id: "user-1",
  name: "Victor",
  nickname: "Victor",
  email: "victor@example.com",
  image: null,
  bio: "Weekend hiker",
  gender: "male",
  birthday: "1998-10-22",
  extra: {
    level: "beginner",
    city: "region-1",
    completedHikes: 0,
  },
};

function jsonResponse(data: unknown) {
  return { json: vi.fn().mockResolvedValue(data) };
}

describe("ProfileClient layout", () => {
  beforeEach(() => {
    fetchCurrentUserMock.mockReset();
    fetchAPIMock.mockReset();
    fetchSelectableRegionsMock.mockReset();
    fetchCurrentUserMock.mockResolvedValue(user);
    fetchSelectableRegionsMock.mockResolvedValue([{ id: "region-1", name: "Shenzhen" }]);
  });

  it("keeps the profile loading state until team totals are known", async () => {
    let resolveCreated: ((value: unknown) => void) | undefined;
    let resolveJoined: ((value: unknown) => void) | undefined;

    fetchAPIMock.mockImplementation((path: string) => {
      if (path === "/users/me/created-teams") {
        return new Promise((resolve) => { resolveCreated = resolve; });
      }
      return new Promise((resolve) => { resolveJoined = resolve; });
    });

    render(<ProfileClient />);

    await waitFor(() => expect(fetchAPIMock).toHaveBeenCalledTimes(2));
    expect(screen.getByTestId("profile-skeleton")).toBeInTheDocument();
    expect(screen.queryByText("profile.noTeamsTitle")).not.toBeInTheDocument();

    await act(async () => {
      resolveCreated?.(jsonResponse({ success: true, teams: [] }));
      resolveJoined?.(jsonResponse({ success: true, teams: [] }));
    });

    expect(await screen.findByTestId("profile-header")).toBeInTheDocument();
    expect(screen.getByText("profile.noTeamsTitle")).toBeInTheDocument();
  });

  it("groups identity details before a compact three-column stats row", async () => {
    fetchAPIMock
      .mockResolvedValueOnce(jsonResponse({ success: true, teams: [] }))
      .mockResolvedValueOnce(jsonResponse({ success: true, teams: [] }));

    render(<ProfileClient />);

    const header = await screen.findByTestId("profile-header");
    expect(within(header).getByRole("heading", { level: 1, name: "Victor" })).toBeInTheDocument();
    expect(within(header).getByText("Shenzhen")).toBeInTheDocument();
    expect(within(header).getByRole("link", { name: "profile.editProfileBtn" })).toHaveClass("min-h-11");

    const stats = screen.getByTestId("profile-stats");
    expect(stats).toHaveClass("grid-cols-3");
    expect(within(stats).getByRole("link", { name: /profile.statCreatedLabel/ })).toHaveAttribute("href", "/my-teams?tab=created");
    expect(within(stats).getByRole("link", { name: /profile.statJoinedLabel/ })).toHaveAttribute("href", "/my-teams?tab=joined");
    expect(within(stats).getByRole("link", { name: /profile.statCompletedLabel/ })).toHaveAttribute("href", "/my-teams?tab=history");

    expect(screen.queryByRole("button", { name: "profile.logoutBtn" })).not.toBeInTheDocument();
    expect(screen.queryByTestId("footer")).not.toBeInTheDocument();
  });
});
