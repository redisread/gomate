import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChinaMap } from "../components/features/home/china-map";

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
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ text: async () => provinceSvg }));
    mockFetchAPI.mockResolvedValue({
      json: async () => ({
        provinces: [{ province: "广东省", count: 1 }],
        points: [
          {
            id: "loc-gd",
            name: "梧桐山",
            slug: "wutong-shan",
            cityName: "深圳",
            province: "广东省",
            lat: 22.6,
            lng: 114.2,
          },
          {
            id: "loc-sc",
            name: "四姑娘山",
            slug: "siguniang",
            cityName: "阿坝",
            province: "四川省",
            lat: 31.0,
            lng: 102.8,
          },
        ],
      }),
    });

    render(<ChinaMap />);

    const guangdong = await screen.findByRole("button", { name: "广东省" });
    fireEvent.click(guangdong);

    expect(window.location.search).toContain("mapProvince=%E5%B9%BF%E4%B8%9C%E7%9C%81");
    expect(screen.getByText(/中国 \/ 广东省/)).toBeInTheDocument();
    expect(screen.getByLabelText("梧桐山")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByLabelText("四姑娘山")).not.toBeInTheDocument();
    });
  });
});
