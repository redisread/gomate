import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Location } from "../lib/types";
import { HomeLocationsSection } from "../components/features/home/home-locations-section";

vi.mock("@/hooks/useI18n", () => ({
  useI18n: () => ({
    t: (key: string) => key,
    locale: "zh-CN",
    loading: false,
    getNsData: () => null,
  }),
}));

const locations = ["天山", "白云山", "海珠湖", "帽峰山"].map((name, index) => ({
  id: `location-${index}`,
  name,
  slug: name,
  description: `${name}适合周末出发`,
  address: `广州 · ${name}`,
  cityId: "guangzhou",
  cityName: "广州",
  coverImage: `/images/${index}.jpg`,
  images: [],
  coordinates: { lat: 23.1, lng: 113.3 },
  bestSeason: [],
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
} as unknown as Location));

describe("HomeLocationsSection", () => {
  it("展示最多三个地点卡片并链接到地点详情", () => {
    render(<HomeLocationsSection locations={locations} />);

    expect(screen.getByTestId("home-featured-locations")).toBeInTheDocument();
    expect(screen.getAllByTestId("home-location-card")).toHaveLength(3);
    expect(screen.getByRole("link", { name: /天山/ })).toHaveAttribute(
      "href",
      "/locations/location-0",
    );
    expect(screen.getAllByTestId("home-location-card")[0]).toHaveClass(
      "-rotate-[4deg]",
    );
    expect(screen.getAllByTestId("home-location-card")[1]).toHaveClass(
      "-ml-10",
    );
    expect(screen.queryByText("帽峰山")).not.toBeInTheDocument();
  });
});
