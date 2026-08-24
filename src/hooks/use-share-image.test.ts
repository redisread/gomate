import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PosterPresetId } from "@/contracts/share-image";
import { useShareImage } from "./use-share-image";

vi.mock("@/i18n", () => ({ getLocale: () => "zh-CN" }));
vi.mock("@/lib/api", () => ({ API_BASE: "https://api.example.com" }));

function svgResponse(body: string) {
  return new Response(body, { headers: { "content-type": "image/svg+xml" } });
}

describe("useShareImage", () => {
  beforeEach(() => {
    Object.defineProperties(URL, {
      createObjectURL: { configurable: true, value: vi.fn(() => "blob:poster") },
      revokeObjectURL: { configurable: true, value: vi.fn() },
    });
  });

  afterEach(() => vi.restoreAllMocks());

  it("requests the selected preset with the shared render version", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(svgResponse("<svg />"));
    const { result } = renderHook(() =>
      useShareImage({ type: "location", id: "location-1", preset: "ridge" }),
    );

    await act(async () => void (await result.current.generateImage()));

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/share-image/location/location-1?locale=zh-CN&preset=ridge&v=v3",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("keeps the newest preview when an older request finishes last", async () => {
    let resolveDusk!: (response: Response) => void;
    let resolveJournal!: (response: Response) => void;
    vi.spyOn(globalThis, "fetch")
      .mockImplementationOnce(() => new Promise((resolve) => { resolveDusk = resolve; }))
      .mockImplementationOnce(() => new Promise((resolve) => { resolveJournal = resolve; }));
    vi.mocked(URL.createObjectURL).mockReturnValue("blob:journal");

    const { result, rerender } = renderHook(
      ({ preset }: { preset: PosterPresetId }) =>
        useShareImage({ type: "team", id: "team-1", preset }),
      { initialProps: { preset: "dusk" as PosterPresetId } },
    );

    let firstRequest!: Promise<unknown>;
    act(() => { firstRequest = result.current.generateImage(); });
    rerender({ preset: "journal" });
    let secondRequest!: Promise<unknown>;
    act(() => { secondRequest = result.current.generateImage(); });

    await act(async () => {
      resolveJournal(svgResponse("<svg>journal</svg>"));
      await secondRequest;
    });
    expect(result.current.imageUrl).toBe("blob:journal");

    await act(async () => {
      resolveDusk(svgResponse("<svg>dusk</svg>"));
      await firstRequest;
    });
    await waitFor(() => expect(result.current.imageUrl).toBe("blob:journal"));
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
  });

  it("revokes every cached Blob URL on cleanup", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(svgResponse("<svg />"));
    const { result } = renderHook(() =>
      useShareImage({ type: "team", id: "team-1", preset: "dusk" }),
    );

    await act(async () => void (await result.current.generateImage()));
    act(() => result.current.cleanup());

    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:poster");
    expect(result.current.imageUrl).toBeNull();
  });
});
