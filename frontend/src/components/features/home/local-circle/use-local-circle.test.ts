import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { fetchAPI, fetchCurrentUser, fetchPublicAPI } from "@/lib/api";
import { useLocalCircle } from "./use-local-circle";

vi.mock("@/lib/api", () => ({
  fetchAPI: vi.fn(),
  fetchCurrentUser: vi.fn(),
  fetchPublicAPI: vi.fn(),
}));

describe("useLocalCircle", () => {
  beforeEach(() => {
    vi.mocked(fetchAPI).mockReset();
    vi.mocked(fetchCurrentUser).mockReset();
    vi.mocked(fetchPublicAPI).mockReset();
  });

  it("keeps the session cookie path for personalized neighbor teams", async () => {
    vi.mocked(fetchCurrentUser).mockResolvedValue({
      id: "member",
      extra: { city: "region-shenzhen" },
    } as never);
    vi.mocked(fetchAPI).mockResolvedValue(new Response(JSON.stringify({
      regionId: "region-shenzhen",
      regionName: "深圳",
      topLocations: [],
      neighborTeams: [{ teamId: "team-neighbor" }],
    }), { status: 200 }));

    const { result } = renderHook(() => useLocalCircle());
    await waitFor(() => expect(result.current.status).toBe("ready"));

    expect(fetchAPI).toHaveBeenCalledWith(
      "/local-circle/home?regionId=region-shenzhen",
    );
    expect(fetchPublicAPI).not.toHaveBeenCalled();
    expect(result.current).toMatchObject({
      status: "ready",
      loggedIn: true,
      data: { neighborTeams: [{ teamId: "team-neighbor" }] },
    });
  });
});
