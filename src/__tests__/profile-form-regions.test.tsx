import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Region } from "../lib/types";
import { useProfileForm } from "../components/features/profile-edit/use-profile-form";

const { fetchPublicAPI, fetchCurrentUser } = vi.hoisted(() => ({
  fetchPublicAPI: vi.fn(),
  fetchCurrentUser: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  fetchPublicAPI,
  fetchCurrentUser,
  fetchAPI: vi.fn(),
  API_BASE: "https://example.com",
}));

vi.mock("@/hooks/useI18n", () => ({
  useI18n: () => ({
    t: (key: string) => key,
    locale: "zh-CN",
    loading: false,
    getNsData: () => null,
  }),
}));

const region = (index: number): Region => ({
  id: `region-${index}`,
  countryCode: "CN",
  parentId: "province-test",
  name: `地区 ${index}`,
  nameEn: `Region ${index}`,
  slug: `region-${index}`,
  code: `${index}`,
  level: "city",
  timezone: "Asia/Shanghai",
  centerLatitude: null,
  centerLongitude: null,
  serviceEnabled: true,
  isHot: false,
  sortOrder: index,
});

describe("useProfileForm Region loading", () => {
  it("loads the canonical Region envelope", async () => {
    fetchCurrentUser.mockResolvedValue({
      id: "user-1",
      name: "Victor",
      email: "victor@example.com",
      extra: { city: null },
    });
    fetchPublicAPI.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, regions: [region(1), region(2)] }), { status: 200 }),
    );

    const { result } = renderHook(() => useProfileForm());

    await waitFor(() => expect(result.current.regions).toHaveLength(2));

    expect(fetchPublicAPI).toHaveBeenCalledWith(
      "/regions?countryCode=CN&level=city&serviceEnabled=true",
      { signal: undefined },
    );
    expect(result.current.regions.at(-1)?.id).toBe("region-2");
  });
});
