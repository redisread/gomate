import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Location } from "@/lib/types";
import { LocationDetailClient } from "@/components/features/location-detail-client";

const fetchMock = vi.hoisted(() => vi.fn());
const translate = vi.hoisted(() => (key: string) => key);

vi.mock("@/lib/api", () => ({ fetchAPI: fetchMock }));
vi.mock("@/hooks/useI18n", () => ({
  useI18n: () => ({
    t: translate,
    locale: "zh-CN",
    loading: false,
    getNsData: () => null,
  }),
}));
vi.mock("@/components/layout/navbar", () => ({ Navbar: () => <nav>Navbar</nav> }));
vi.mock("@/components/layout/footer", () => ({ Footer: () => <footer>Footer</footer> }));
vi.mock("@/components/features/location-detail/location-intro-card", () => ({
  LocationIntroCard: () => <section>Location intro</section>,
}));
vi.mock("@/components/features/location-detail/route-info-card", () => ({
  RouteInfoCard: () => <section>Route info</section>,
}));
vi.mock("@/components/features/location-detail/team-list-section", () => ({
  TeamListSection: () => <section>Team list</section>,
}));
vi.mock("@/components/features/discover/story-recap-feed", () => ({
  LocationStoryRecapFeed: () => <section>Story recap</section>,
}));

const location: Location = {
  id: "location-1",
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
  extra: {},
  createdAt: "2026-08-16T00:00:00.000Z",
  updatedAt: "2026-08-16T00:00:00.000Z",
};

function response(body: unknown): Response {
  return { ok: true, json: async () => body } as Response;
}

describe("Location detail composition", () => {
  beforeEach(() => {
    vi.stubGlobal("IntersectionObserver", class {
      observe() {}
      disconnect() {}
      unobserve() {}
    });
    fetchMock.mockImplementation((path: string) => {
      if (path === "/locations/location-1") {
        return Promise.resolve(response({ success: true, location }));
      }
      if (path.startsWith("/teams?")) {
        return Promise.resolve(response({ success: true, teams: [] }));
      }
      if (path === "/locations?limit=4") {
        return Promise.resolve(response({ success: true, locations: [] }));
      }
      return Promise.resolve(response({ user: null }));
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("renders the Location page without decision information or its map action", async () => {
    render(<LocationDetailClient locationId="location-1" />);

    expect(await screen.findByRole("heading", { name: "梧桐山" })).toBeInTheDocument();
    expect(screen.getByText("Location intro")).toBeInTheDocument();
    expect(screen.getByText("Route info")).toBeInTheDocument();
    expect(screen.queryByText("locationDetail.decision.title")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", {
      name: "locationDetail.transport.openInMap",
    })).not.toBeInTheDocument();
  });
});
