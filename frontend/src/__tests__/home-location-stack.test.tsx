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

const locations: Location[] = ["香港", "麦理浩径", "大理", "牛奶排", "澳门"].map((name, index) => ({
  id: `location-${index}`,
  regionId: "hong-kong",
  name,
  slug: name,
  supportedActivityTypes: ["hiking"],
  status: "published",
  subtitle: null,
  description: `${name}适合周末出发`,
  address: `香港 · ${name}`,
  latitude: 22.3,
  longitude: 114.1,
  coverImageUrl: `/images/${index}.jpg`,
  images: [],
  extra: {},
  createdByUserId: null,
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
  region: {
    id: "hong-kong",
    countryCode: "CN",
    parentId: null,
    name: "香港",
    nameEn: "Hong Kong",
    slug: "hong-kong",
    code: "810000",
    level: "city",
    timezone: "Asia/Hong_Kong",
    centerLatitude: null,
    centerLongitude: null,
    serviceEnabled: true,
    isHot: true,
    sortOrder: 0,
  },
}));

describe("HomeLocationStack", () => {
  it("按牛奶排、大理、香港的顺序展示三张地点卡片并链接到详情", () => {
    render(<HomeLocationStack locations={locations} />);

    expect(screen.getByTestId("home-location-stack")).toBeInTheDocument();
    const cards = screen.getAllByTestId("home-location-stack-card");
    expect(cards).toHaveLength(3);
    expect(cards.map((card) => card.textContent)).toEqual([
      expect.stringContaining("牛奶排"),
      expect.stringContaining("大理"),
      expect.stringContaining("香港"),
    ]);
    expect(screen.getByRole("link", { name: /牛奶排/ })).toHaveAttribute(
      "href",
      "/locations/location-3",
    );
    expect(cards[1]).toHaveClass("lg:z-30");
    expect(screen.queryByText("麦理浩径")).not.toBeInTheDocument();
  });

  it("没有地点时显示占位状态", () => {
    render(<HomeLocationStack locations={[]} />);

    expect(screen.getByTestId("home-location-stack-empty")).toBeInTheDocument();
    expect(screen.queryByTestId("home-location-stack-card")).not.toBeInTheDocument();
  });
});
