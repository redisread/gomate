import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
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
vi.mock("@/components/layout/navbar", () => ({
  Navbar: () => <nav>Navbar</nav>,
}));
vi.mock("@/components/layout/footer", () => ({
  Footer: () => <footer>Footer</footer>,
}));
vi.mock("@/components/features/location-detail/location-intro-card", () => ({
  LocationIntroCard: () => <section>Location intro</section>,
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
    location.coverImageUrl = null;
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        observe() {}
        disconnect() {}
        unobserve() {}
      },
    );
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

  it("renders initial detail immediately and skips the duplicate detail request", async () => {
    render(<LocationDetailClient locationId="location-1" {...({ initialLocation: location } as object)} />);
    expect(screen.getByRole("heading", { name: "梧桐山", level: 1 })).toBeVisible();
    await act(async () => { await Promise.resolve(); });
    expect(fetchMock.mock.calls.filter(([path]) => path === "/locations/location-1")).toHaveLength(0);
  });

  it("shows a team request failure instead of an empty invitation", async () => {
    const original = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation((path: string) =>
      path.startsWith("/teams?")
        ? Promise.resolve({ ok: false, json: async () => ({ success: false }) })
        : original(path),
    );
    render(<LocationDetailClient locationId="location-1" />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "locationDetail.teamsLoadFailed",
    );
    expect(
      screen.queryByText("locations.detailNoTeamsDesc"),
    ).not.toBeInTheDocument();
  });

  it("recovers the location after a failed request without retaining the error", async () => {
    const original = fetchMock.getMockImplementation()!;
    let fail = true;
    fetchMock.mockImplementation((path: string) =>
      path === "/locations/location-1" && fail
        ? Promise.resolve({ ok: false })
        : original(path),
    );
    render(<LocationDetailClient locationId="location-1" />);
    expect(
      await screen.findByRole("heading", {
        name: "locationDetail.locationLoadFailed",
      }),
    ).toBeInTheDocument();
    fail = false;
    fireEvent.click(screen.getByRole("button", { name: "common.retry" }));
    expect(
      await screen.findByRole("heading", { name: "梧桐山" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("locationDetail.locationLoadFailed"),
    ).not.toBeInTheDocument();
  });

  it("offers retry when the location request times out", async () => {
    const timeout = new AbortController();
    const timeoutSpy = vi
      .spyOn(AbortSignal, "timeout")
      .mockReturnValue(timeout.signal);
    const original = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation((path: string, options: RequestInit) =>
      path === "/locations/location-1"
        ? new Promise((_resolve, reject) =>
            options.signal!.addEventListener("abort", () =>
              reject(new DOMException("timeout", "TimeoutError")),
            ),
          )
        : original(path),
    );
    render(<LocationDetailClient locationId="location-1" />);
    await act(async () => timeout.abort());
    expect(
      screen.getByRole("heading", {
        name: "locationDetail.locationLoadFailed",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "common.retry" }),
    ).toBeInTheDocument();
    expect(timeoutSpy).toHaveBeenCalledWith(15_000);
    timeoutSpy.mockRestore();
  });

  it("opens an accessible image dialog and restores focus on Escape", async () => {
    location.coverImageUrl = "/cover.jpg";
    render(<LocationDetailClient locationId="location-1" />);
    const open = await screen.findByRole("button", {
      name: /locationDetail.viewLargeImage/,
    });
    open.focus();
    fireEvent.click(open);
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
    expect(
      screen.getByRole("button", { name: "locationDetail.closeImage" }),
    ).toHaveFocus();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(open).toHaveFocus();
    location.coverImageUrl = null;
  });

  it("renders the Location page without decision information or its map action", async () => {
    render(<LocationDetailClient locationId="location-1" />);

    expect(
      await screen.findByRole("heading", { name: "梧桐山" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Location intro")).toBeInTheDocument();
    expect(screen.queryByText("Route info")).not.toBeInTheDocument();
    expect(
      screen.queryByText("locationDetail.decision.title"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", {
        name: "locationDetail.transport.openInMap",
      }),
    ).not.toBeInTheDocument();
  });
});
