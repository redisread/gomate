import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useHomeData } from "../components/features/home/use-home-data";

const fetchPublicAPI = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api", () => ({ fetchPublicAPI }));
vi.mock("@/hooks/use-locations", () => ({
  useLocations: () => ({ locations: [] }),
}));
vi.mock("@/hooks/use-animations", () => ({ useAnimateIn: () => ({}) }));

afterEach(() => vi.restoreAllMocks());

it("requests a fresh rolling seven-day window on mount and region change", async () => {
  const now = Date.parse("2026-09-23T12:34:56.789+08:00");
  vi.spyOn(Date, "now").mockReturnValue(now);
  fetchPublicAPI.mockResolvedValue({
    json: async () => ({ success: true, teams: [] }),
  });
  const { rerender } = renderHook(
    ({ region }) => useHomeData(undefined, region),
    {
      initialProps: { region: "" },
    },
  );
  await waitFor(() => expect(fetchPublicAPI).toHaveBeenCalledTimes(1));
  let params = new URL(fetchPublicAPI.mock.calls[0][0], "https://gomate.test")
    .searchParams;
  expect(params.get("startDateFrom")).toBe(new Date(now).toISOString());
  expect(params.get("startDateTo")).toBe(
    new Date(now + 7 * 86400000).toISOString(),
  );
  expect(params.get("recruitmentStatus")).toBe("open");
  expect(params.get("limit")).toBe("4");

  vi.mocked(Date.now).mockReturnValue(now + 3600000);
  rerender({ region: "region-1" });
  await waitFor(() => expect(fetchPublicAPI).toHaveBeenCalledTimes(2));
  params = new URL(fetchPublicAPI.mock.calls[1][0], "https://gomate.test")
    .searchParams;
  expect(params.get("startDateFrom")).toBe(
    new Date(now + 3600000).toISOString(),
  );
  expect(params.get("regionId")).toBe("region-1");
});
