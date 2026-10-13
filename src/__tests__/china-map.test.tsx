import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChinaMap } from "../components/features/home/china-map";
import {
  getMapMarkerRadius,
  getMapTransform,
  transformMapPoint,
} from "../lib/china-map";

vi.mock("@/hooks/useI18n", () => ({
  useI18n: () => ({
    t: (key: string, vars?: Record<string, string | number>) => {
      if (!vars) return key;
      return `${key}[${Object.entries(vars).map(([name, value]) => `${name}=${value}`).join(",")}]`;
    },
    locale: "zh-CN",
    loading: false,
    getNsData: () => null,
  }),
}));

const mockFetchAPI = vi.fn();
vi.mock("@/lib/api", () => ({
  fetchAPI: (path: string) => mockFetchAPI(path),
}));

const provinceSvg = `
  <svg>
    <path data-name="广东省" d="M 500 500 L 540 500 L 540 540 L 500 540 Z" />
    <path data-name="四川省" d="M 380 370 L 420 370 L 420 410 L 380 410 Z" />
  </svg>
`;

describe("ChinaMap", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    Reflect.deleteProperty(SVGElement.prototype, "getBBox");
    window.history.replaceState({}, "", "/");
  });

  it("clicking a province focuses the map and writes a restorable URL state", async () => {
    const historyBack = vi.spyOn(window.history, "back").mockImplementation(() => undefined);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, text: async () => provinceSvg }));
    mockFetchAPI.mockImplementation(async (path: string) => ({
      ok: true, json: async () => path.startsWith("/regions") ? ({
        success: true,
        regions: [
          { id: "province-gd", name: "广东省" },
          { id: "province-sc", name: "四川省" },
        ],
      }) : ({
        success: true,
        regions: [
          { region: { id: "region-sz", parentId: "province-gd", name: "深圳" }, count: 1 },
          { region: { id: "region-ab", parentId: "province-sc", name: "阿坝" }, count: 1 },
        ],
        points: [
          {
            id: "loc-gd",
            name: "梧桐山",
            slug: "wutong-shan",
            region: { id: "region-sz", parentId: "province-gd", name: "深圳" },
            latitude: 22.6,
            longitude: 114.2,
          },
          {
            id: "loc-sc",
            name: "四姑娘山",
            slug: "siguniang",
            region: { id: "region-ab", parentId: "province-sc", name: "阿坝" },
            latitude: 31.0,
            longitude: 102.8,
          },
        ],
      }),
    }));
    Object.defineProperty(SVGElement.prototype, "getBBox", {
      configurable: true,
      value(this: SVGElement) {
        return this.getAttribute("aria-label") === "广东省"
          ? { x: 500, y: 500, width: 40, height: 40 }
          : { x: 380, y: 370, width: 40, height: 40 };
      },
    });

    render(<ChinaMap />);

    const guangdong = await screen.findByRole("button", { name: "广东省" });
    expect(mockFetchAPI).toHaveBeenCalledWith(
      "/regions?countryCode=CN&level=province&serviceEnabled=false",
    );
    fireEvent.click(guangdong);

    expect(window.location.search).toContain("mapProvince=%E5%B9%BF%E4%B8%9C%E7%9C%81");
    expect(screen.getByRole("button", { name: "广东省" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("梧桐山")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId("map-content")).toHaveAttribute(
        "transform",
        "matrix(4.5 0 0 4.5 -1940 -2024)",
      );
    });

    const point = await screen.findByRole("button", { name: "梧桐山" });
    expect(point).toHaveClass("h-11", "w-11");
    fireEvent.focus(point);
    fireEvent.click(point);
    expect(screen.getByRole("link", { name: "home.discoveryMap.viewLocation" })).toHaveAttribute("href", "/locations/loc-gd");
    fireEvent.blur(point);
    expect(screen.getByRole("link", { name: "home.discoveryMap.viewLocation" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "四姑娘山" })).not.toBeInTheDocument();

    fireEvent.click(guangdong);

    expect(historyBack).not.toHaveBeenCalled();
    expect(window.location.search).toContain("mapProvince=");
    fireEvent.click(screen.getByRole("button", { name: "home.mapBackToChina" }));
    expect(window.location.search).not.toContain("mapProvince=");
    expect(window.location.search).not.toContain("mapLocation=");
    expect(guangdong).toHaveFocus();
  });

  it("calculates marker radii in the map's unscaled coordinate space", () => {
    expect(getMapMarkerRadius(5, 1)).toBe(5);
    expect(getMapMarkerRadius(5, 3)).toBeCloseTo(5 / 3);
  });

  it("zooms a small province closer while keeping it inside the focused safe area", () => {
    const transform = getMapTransform("广东省", {
      x: 500,
      y: 500,
      width: 40,
      height: 40,
    });

    expect(transform.scale).toBe(4.5);
    expect(transformMapPoint({ x: 520, y: 520 }, transform)).toEqual({
      x: 400,
      y: 316,
    });
  });

  it("fits a large province without clipping it behind the focused controls", () => {
    const transform = getMapTransform("新疆维吾尔自治区", {
      x: 100,
      y: 100,
      width: 600,
      height: 400,
    });

    expect(transform.scale).toBeCloseTo(1.1);
    expect(transformMapPoint({ x: 400, y: 300 }, transform)).toEqual({
      x: 400,
      y: 316,
    });
  });
});

function mockMapData() {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, text: async () => provinceSvg }));
  mockFetchAPI.mockImplementation(async (path: string) => ({
    ok: true, json: async () => path.startsWith("/regions") ? {
      success: true, regions: [{ id: "province-gd", name: "广东省" }],
    } : {
      success: true,
      regions: [{ region: { id: "region-sz", parentId: "province-gd", name: "深圳" }, count: 2 }],
      points: [
        { id: "loc-1", name: "梧桐山", region: { id: "region-sz", parentId: "province-gd", name: "深圳" }, latitude: 22.6, longitude: 114.2 },
        { id: "loc-2", name: "塘朗山", region: { id: "region-sz", parentId: "province-gd", name: "深圳" }, latitude: 22.7, longitude: 114.0 },
      ],
    },
  }));
  Object.defineProperty(SVGElement.prototype, "getBBox", {
    configurable: true, value: () => ({ x: 500, y: 500, width: 40, height: 40 }),
  });
}

describe("map exploration continuity", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    Reflect.deleteProperty(SVGElement.prototype, "getBBox");
    window.history.replaceState({}, "", "/");
  });

  it("previews a location, keeps selection when hover leaves, and replaces consecutive selections", async () => {
    mockMapData();
    render(<ChinaMap />);
    const point = await screen.findByRole("button", { name: "梧桐山" });
    fireEvent.click(point);
    expect(screen.getByRole("link", { name: "home.discoveryMap.viewLocation" })).toHaveAttribute("href", "/locations/loc-1");
    const historyLength = window.history.length;
    fireEvent.mouseLeave(point);
    expect(screen.getByRole("link", { name: "home.discoveryMap.viewLocation" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "塘朗山" }));
    expect(window.history.length).toBe(historyLength);
    expect(window.location.search).toContain("mapLocation=loc-2");
    expect(screen.getByRole("link", { name: "home.discoveryMap.viewLocation" })).toHaveAttribute("href", "/locations/loc-2");
  });

  it("restores a shared location and clears only an unavailable location", async () => {
    mockMapData();
    window.history.replaceState({}, "", "/?q=keep&mapProvince=广东省&mapLocation=loc-1#map");
    render(<ChinaMap />);
    expect(await screen.findByRole("link", { name: "home.discoveryMap.viewLocation" })).toHaveAttribute("href", "/locations/loc-1");
    window.history.replaceState({}, "", "/?q=keep&mapProvince=广东省&mapLocation=removed#map");
    fireEvent(window, new PopStateEvent("popstate"));
    expect(await screen.findByText("home.discoveryMap.locationUnavailable")).toBeInTheDocument();
    expect(window.location.search).toContain("mapProvince=");
    expect(window.location.search).toContain("q=keep");
    expect(window.location.search).not.toContain("mapLocation=");
  });

  it("does not mistake SVG loading failure for an empty province and retries", async () => {
    mockMapData();
    vi.mocked(fetch).mockRejectedValueOnce(new Error("offline"));
    window.history.replaceState({}, "", "/?mapProvince=广东省");
    render(<ChinaMap />);
    expect(await screen.findByRole("button", { name: "home.discoveryMap.retry" })).toBeInTheDocument();
    expect(screen.queryByText(/home.mapFocusedEmptyTitle/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "home.discoveryMap.retry" }));
    expect(await screen.findByRole("button", { name: "梧桐山" })).toBeInTheDocument();
  });
});
