import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchPublicAPI } from "./api";
import { fetchSelectableRegions } from "./regions";

vi.mock("./api", () => ({ fetchPublicAPI: vi.fn() }));

describe("fetchSelectableRegions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("loads the complete enabled city-level Region collection", async () => {
    const controller = new AbortController();
    vi.mocked(fetchPublicAPI).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        regions: [{ id: "region-sz", name: "深圳", level: "city", serviceEnabled: true }],
      }),
    } as Response);

    await expect(fetchSelectableRegions({ signal: controller.signal })).resolves.toMatchObject([
      { id: "region-sz" },
    ]);
    expect(fetchPublicAPI).toHaveBeenCalledWith(
      "/regions?countryCode=CN&level=city&serviceEnabled=true",
      { signal: controller.signal },
    );
  });

  it("rejects a non-success envelope", async () => {
    vi.mocked(fetchPublicAPI).mockResolvedValue({
      ok: true,
      json: async () => ({ success: false }),
    } as Response);

    await expect(fetchSelectableRegions()).rejects.toThrow("Failed to load Regions");
  });
});
