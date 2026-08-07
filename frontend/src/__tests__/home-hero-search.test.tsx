import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HomeHero } from "../components/features/home/home-hero";

vi.mock("@/hooks/useI18n", () => ({
  useI18n: () => ({
    t: (key: string) => key,
    locale: "zh-CN",
    loading: false,
    getNsData: () => null,
  }),
}));

vi.mock("../components/features/home/home-location-stack", () => ({
  HomeLocationStack: () => <div data-testid="home-location-stack" />,
}));

vi.mock("../components/features/home/home-departure-stack", () => ({
  HomeDepartureStack: () => <div data-testid="home-departure-stack" />,
}));

describe("HomeHero", () => {
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
    expect(screen.getByTestId("home-departure-stack")).toBeInTheDocument();
    expect(screen.queryByTestId("home-location-stack")).not.toBeInTheDocument();
  });

  it("falls back to real locations when no team is recruiting", () => {
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

    expect(screen.getByTestId("home-location-stack")).toBeInTheDocument();
    expect(screen.queryByTestId("home-departure-stack")).not.toBeInTheDocument();
  });
});
