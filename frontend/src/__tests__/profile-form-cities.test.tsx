import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { City } from "../lib/types";
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

const city = (index: number): City => ({
  id: `city-${index}`,
  adcode: `${index}`,
  name: `城市 ${index}`,
  level: "city",
  isHot: false,
});

describe("useProfileForm city loading", () => {
  it("loads every city page instead of stopping at the first 100 records", async () => {
    fetchCurrentUser.mockResolvedValue({
      id: "user-1",
      name: "Victor",
      email: "victor@example.com",
    });
    fetchPublicAPI
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ cities: [city(1)], pagination: { hasMore: true } }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ cities: [city(101)], pagination: { hasMore: false } }), { status: 200 }),
      );

    const { result } = renderHook(() => useProfileForm());

    await waitFor(() => expect(result.current.cities).toHaveLength(2));

    expect(fetchPublicAPI).toHaveBeenNthCalledWith(1, "/cities?page=1&pageSize=100");
    expect(fetchPublicAPI).toHaveBeenNthCalledWith(2, "/cities?page=2&pageSize=100");
    expect(result.current.cities.at(-1)?.id).toBe("city-101");
  });
});
