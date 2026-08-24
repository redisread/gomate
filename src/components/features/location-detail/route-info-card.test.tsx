import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Location } from "@/lib/types";
import { RouteInfoCard } from "./route-info-card";

vi.mock("@/hooks/useI18n", () => ({
  useI18n: () => ({
    t: (key: string) => key,
    locale: "zh-CN",
    loading: false,
    getNsData: () => null,
  }),
}));

const location: Location = {
  id: "location-route-notes",
  regionId: "region-sz",
  name: "梧桐山",
  slug: "wutong-mountain",
  supportedActivityTypes: ["hiking"],
  status: "published",
  subtitle: null,
  description: "深圳第一高峰",
  address: "深圳市罗湖区",
  latitude: 22.58,
  longitude: 114.2,
  coverImageUrl: null,
  images: [],
  extra: {
    hiking: {
      tips: ["早点出发"],
      warnings: ["雨天路滑"],
      gearEssential: ["登山鞋"],
      gearOptional: ["登山杖"],
    } as unknown as NonNullable<Location["extra"]["hiking"]>,
  },
  createdAt: "2026-08-16T00:00:00.000Z",
  updatedAt: "2026-08-16T00:00:00.000Z",
};

describe("RouteInfoCard", () => {
  it("keeps route guidance but does not render legacy location equipment", () => {
    render(<RouteInfoCard location={location} />);

    expect(screen.getByText("早点出发")).toBeInTheDocument();
    expect(screen.getByText("雨天路滑")).toBeInTheDocument();
    expect(screen.queryByText("common.recommendedGear")).not.toBeInTheDocument();
    expect(screen.queryByText("登山鞋")).not.toBeInTheDocument();
    expect(screen.queryByText("登山杖")).not.toBeInTheDocument();
  });
});
