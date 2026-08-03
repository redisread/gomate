import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useTeams } from "./use-teams";

vi.mock("@/lib/api", () => ({
  fetchPublicAPI: vi.fn(),
}));

describe("useTeams", () => {
  it("counts a partially specified custom date range as an active filter", () => {
    const { result } = renderHook(() =>
      useTeams({
        teams: [],
        pagination: { page: 1, pageSize: 12, total: 0, totalPages: 0 },
        availableTags: [],
      }),
    );

    act(() => {
      result.current.setStartDate("2026-08-08");
    });

    expect(result.current.activeFiltersCount).toBe(1);
  });
});
