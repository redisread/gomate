import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HomeHero } from "../components/features/home/home-hero";

const fetchUser = vi.fn();
vi.mock("@/lib/api", () => ({
  fetchCurrentUser: () => fetchUser(),
  refreshCurrentUser: () => fetchUser(),
}));

vi.mock("@/hooks/useI18n", () => ({
  useI18n: () => ({
    t: (key: string) => key,
    locale: "zh-CN",
    loading: false,
    getNsData: () => null,
  }),
}));

vi.mock("../components/features/home/home-random-discovery", () => ({
  HomeRandomDiscovery: () => <div data-testid="home-random-discovery" />,
}));

describe("HomeHero", () => {
  beforeEach(() => { fetchUser.mockReset().mockResolvedValue(null); });

  const data = { locations: [], animate: {} } as never;

  it("hides guest prompts while loading and after authentication", async () => {
    fetchUser.mockResolvedValue({ id: "member" });
    render(<HomeHero data={data} />);
    expect(screen.queryByText("home.guestHero.loginPrompt")).not.toBeInTheDocument();
    expect(screen.queryByText("home.guestHero.noLoginRequired")).not.toBeInTheDocument();
    await waitFor(() => expect(fetchUser).toHaveBeenCalled());
    expect(screen.getByText("home.guestHero.memberDescription")).toBeInTheDocument();
  });

  it("shows original prompts only for confirmed guests", async () => {
    render(<HomeHero data={data} />);
    expect(await screen.findByText("home.guestHero.loginPrompt")).toHaveAttribute("href", "/login?redirect=/teams");
    expect(screen.getByText("home.guestHero.noLoginRequired")).toBeInTheDocument();
    expect(screen.getByText("home.guestHero.description")).toBeInTheDocument();
  });

  it("does not treat a failed session lookup as a guest", async () => {
    fetchUser.mockRejectedValue(new Error("unavailable"));
    render(<HomeHero data={data} />);
    await waitFor(() => expect(fetchUser).toHaveBeenCalled());
    expect(screen.queryByText("home.guestHero.loginPrompt")).not.toBeInTheDocument();
  });

  it("refreshes guest copy after returning from another tab", async () => {
    render(<HomeHero data={data} />);
    await screen.findByText("home.guestHero.loginPrompt");
    fetchUser.mockResolvedValue({ id: "member" });
    await act(async () => document.dispatchEvent(new Event("visibilitychange")));
    expect(screen.queryByText("home.guestHero.loginPrompt")).not.toBeInTheDocument();
    fetchUser.mockResolvedValue(null);
    await act(async () => window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true })));
    expect(screen.getByText("home.guestHero.loginPrompt")).toBeInTheDocument();
  });

  it("does not render the homepage search form", () => {
    render(
      <HomeHero
        data={
          {
            locations: [],
            teams: [],
            preloadImages: [],
            animate: {
              badge: "",
              title: "",
              subtitle: "",
              search: "",
              cta: "",
              stats: "",
            },
          } as never
        }
      />,
    );

    expect(screen.queryByRole("search")).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText("common.searchPlaceholder")).not.toBeInTheDocument();
    expect(screen.getByTestId("home-random-discovery")).toBeInTheDocument();
    expect(screen.queryByTestId("home-location-stack")).not.toBeInTheDocument();
  });

  it("keeps random discovery visible without recruiting teams", () => {
    render(
      <HomeHero
        data={
          {
            locations: [{ id: "location-1", name: "梧桐山" }],
            teams: [],
            preloadImages: [],
            animate: { badge: "", title: "", subtitle: "", search: "", cta: "", stats: "" },
          } as never
        }
      />,
    );

    expect(screen.getByTestId("home-random-discovery")).toBeInTheDocument();
    expect(screen.queryByTestId("home-departure-stack")).not.toBeInTheDocument();
  });
});
