import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useLocations, useLocationTags } from "./use-locations";

const mocks = vi.hoisted(() => ({ fetchPublicAPI: vi.fn() }));
vi.mock("@/lib/api", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/api")>(),
  fetchPublicAPI: mocks.fetchPublicAPI,
}));

describe("location catalog error responses", () => {
  beforeEach(() => {
    mocks.fetchPublicAPI.mockReset();
    mocks.fetchPublicAPI.mockResolvedValue(Response.json({
      success: false,
      error: { code: "SERVICE_UNAVAILABLE", message: "Catalog unavailable" },
    }, { status: 503 }));
  });

  it("preserves the API error message when the location list fails", async () => {
    const { result } = renderHook(() => useLocations());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error?.message).toBe("Catalog unavailable");
    expect(result.current.locations).toEqual([]);
  });

  it("preserves the API error message when tags fail", async () => {
    const { result } = renderHook(() => useLocationTags());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error?.message).toBe("Catalog unavailable");
    expect(result.current.tags).toEqual([]);
  });
});
