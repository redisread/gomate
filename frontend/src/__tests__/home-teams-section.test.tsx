import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HomeTeamsSection } from "../components/features/home/home-teams-section";

vi.mock("@/hooks/useI18n", () => ({
  useI18n: () => ({
    t: (key: string) => key,
    locale: "zh-CN",
    loading: false,
    getNsData: () => null,
  }),
}));

const emptyData = {
  teams: [],
  teamsLoading: false,
  teamsRef: undefined,
  teamsInView: true,
} as unknown as Parameters<typeof HomeTeamsSection>[0]["data"];

describe("HomeTeamsSection", () => {
  it("renders an actionable empty state for guests", () => {
    render(<HomeTeamsSection data={emptyData} />);

    expect(screen.getByText("home.teamsEmpty.guestTitle")).toBeTruthy();
    expect(screen.getByRole("link", { name: /common\.exploreCreate/ })).toHaveAttribute("href", "/teams/create");
  });

  it("uses member-specific copy for logged-in users", () => {
    render(<HomeTeamsSection data={emptyData} isMember />);

    expect(screen.getByText("home.teamsEmpty.memberTitle")).toBeTruthy();
  });
});
