import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchPublicAPI } from "./api";
import { fetchAllCities } from "./cities";

vi.mock("./api", () => ({ fetchPublicAPI: vi.fn() }));

describe("fetchAllCities", () => {
  beforeEach(() => vi.clearAllMocks());

  it("loads every city page", async () => {
    vi.mocked(fetchPublicAPI)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          cities: [{ id: "sz", adcode: "440300", name: "深圳", level: "city", isHot: true }],
          pagination: { hasMore: true },
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          cities: [{ id: "hz", adcode: "441300", name: "惠州", level: "city", isHot: false }],
          pagination: { hasMore: false },
        }),
      } as Response);

    await expect(fetchAllCities()).resolves.toMatchObject([{ id: "sz" }, { id: "hz" }]);
    expect(fetchPublicAPI).toHaveBeenNthCalledWith(1, "/cities?level=city&page=1&pageSize=100", { signal: undefined });
    expect(fetchPublicAPI).toHaveBeenNthCalledWith(2, "/cities?level=city&page=2&pageSize=100", { signal: undefined });
  });
});
