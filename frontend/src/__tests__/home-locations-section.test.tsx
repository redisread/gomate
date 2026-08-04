import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HomeLocationsSection } from "../components/features/home/home-locations-section";
import type { Location } from "../lib/types";

vi.mock("@/hooks/useI18n", () => ({
  useI18n: () => ({
    t: (key: string) => key,
    locale: "zh-CN",
    loading: false,
    getNsData: () => null,
  }),
}));

const location: Location = {
  id: "loc-1",
  name: "梧桐山",
  slug: "wutong-mountain",
  description: "深圳经典徒步路线",
  cityId: "city-sz",
  cityName: "深圳",
  bestSeason: [],
  coverImage: "",
  images: [],
  coordinates: { lat: 22.6, lng: 114.2 },
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("HomeLocationsSection", () => {
  it("renders each homepage location as a link to its detail page", () => {
    render(
      <HomeLocationsSection
        data={{
          locations: [location],
          isLoading: false,
          userCity: null,
          cityMatch: null,
        } as unknown as Parameters<typeof HomeLocationsSection>[0]["data"]}
      />,
    );

    const locationLinks = screen.getAllByRole("link", { name: /梧桐山/ });
    expect(locationLinks.length).toBeGreaterThan(0);
    expect(locationLinks.every((link) => link.getAttribute("href") === "/locations/loc-1")).toBe(true);
  });

  it("renders an actionable empty state when no locations are available", () => {
    render(
      <HomeLocationsSection
        data={{
          locations: [],
          isLoading: false,
          userCity: null,
          cityMatch: null,
        } as unknown as Parameters<typeof HomeLocationsSection>[0]["data"]}
      />,
    );

    expect(screen.getByText("home.discoveryEmpty.title")).toBeTruthy();
    expect(screen.getByRole("link", { name: /common\.exploreLocations/ })).toHaveAttribute("href", "/locations");
  });
});
