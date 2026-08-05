import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Location } from "../lib/types";
import { HomeLocationStack } from "../components/features/home/home-location-stack";

vi.mock("@/hooks/useI18n", () => ({
  useI18n: () => ({
    t: (key: string) => key,
    locale: "zh-CN",
    loading: false,
    getNsData: () => null,
  }),
}));

const locations = ["麦理浩径", "香港", "澳门", "南山"].map((name, index) => ({
  id: `location-${index}`,
  name,
  slug: name,
  description: `${name}适合周末出发`,
  address: `香港 · ${name}`,
  cityId: "hong-kong",
  cityName: "香港",
  coverImage: `/images/${index}.jpg`,
  images: [],
  coordinates: { lat: 22.3, lng: 114.1 },
  bestSeason: [],
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
} as unknown as Location));

describe("HomeLocationStack", () => {
  it("展示最多三张重叠地点卡片并链接到详情", () => {
    render(<HomeLocationStack locations={locations} />);

    expect(screen.getByTestId("home-location-stack")).toBeInTheDocument();
    expect(screen.getAllByTestId("home-location-stack-card")).toHaveLength(3);
    expect(screen.getByRole("link", { name: /麦理浩径/ })).toHaveAttribute(
      "href",
      "/locations/location-0",
    );
    expect(screen.getAllByTestId("home-location-stack-card")[1]).toHaveClass(
      "lg:z-30",
    );
    expect(screen.queryByText("南山")).not.toBeInTheDocument();
  });

  it("没有地点时显示占位状态", () => {
    render(<HomeLocationStack locations={[]} />);

    expect(screen.getByTestId("home-location-stack-empty")).toBeInTheDocument();
    expect(screen.queryByTestId("home-location-stack-card")).not.toBeInTheDocument();
  });
});
