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
    expect(screen.getByTestId("home-location-stack")).toBeInTheDocument();
  });
});
