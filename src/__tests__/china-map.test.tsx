import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChinaMap } from "../components/features/home/china-map";
import { getMapMarkerRadius } from "../lib/china-map";

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
    window.history.replaceState({}, "", "/");
  });

  it("clicking a province focuses the map and writes a restorable URL state", async () => {
    const historyBack = vi.spyOn(window.history, "back").mockImplementation(() => undefined);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ text: async () => provinceSvg }));
    mockFetchAPI.mockImplementation(async (path: string) => ({
      json: async () => path.startsWith("/regions") ? ({
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

    render(<ChinaMap />);

    const guangdong = await screen.findByRole("button", { name: "广东省" });
    expect(mockFetchAPI).toHaveBeenCalledWith(
      "/regions?countryCode=CN&level=province&serviceEnabled=false",
    );
    fireEvent.click(guangdong);

    expect(window.location.search).toContain("mapProvince=%E5%B9%BF%E4%B8%9C%E7%9C%81");
    expect(screen.getByText(/中国 \/ 广东省/)).toBeInTheDocument();
    expect(screen.getByLabelText("梧桐山")).toBeInTheDocument();

    const marker = document.querySelector('circle[fill="var(--primary)"]');
    expect(Number(marker?.getAttribute("r"))).toBeCloseTo(getMapMarkerRadius(5.5, 3));
    const hitTarget = document.querySelector('circle[fill="transparent"]');
    expect(Number(hitTarget?.getAttribute("r"))).toBe(12);

    await waitFor(() => {
      expect(screen.queryByLabelText("四姑娘山")).not.toBeInTheDocument();
    });

    fireEvent.click(guangdong);

    expect(historyBack).toHaveBeenCalledOnce();
  });

  it("calculates marker radii in the map's unscaled coordinate space", () => {
    expect(getMapMarkerRadius(5, 1)).toBe(5);
    expect(getMapMarkerRadius(5, 3)).toBeCloseTo(5 / 3);
  });
});
