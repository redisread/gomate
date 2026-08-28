import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Location } from "@/lib/types";
import { LocationIntroCard } from "./location-intro-card";

vi.mock("@/hooks/useI18n", () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));
vi.mock("@/lib/open-external", () => ({ openExternalLink: vi.fn() }));

const baseLocation: Location = {
  id: "location-1",
  regionId: "region-sz",
  name: "梧桐山",
  slug: "wutong-mountain",
  supportedActivityTypes: ["hiking"],
  status: "published",
  subtitle: null,
  description: "深圳第一高峰",
  address: "深圳市罗湖区",
  latitude: null,
  longitude: null,
  coverImageUrl: null,
  images: [],
  extra: {},
  createdAt: "2026-08-16T00:00:00.000Z",
  updatedAt: "2026-08-16T00:00:00.000Z",
  tags: [],
};

describe("LocationIntroCard", () => {
  afterEach(() => cleanup());

  it("keeps the address visible and hides navigation without coordinates", () => {
    render(<LocationIntroCard location={baseLocation} address={baseLocation.address!} />);

    expect(screen.getByText("深圳市罗湖区")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "locations.navigateTooltip" })).not.toBeInTheDocument();
  });
});
