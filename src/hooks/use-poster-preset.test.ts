import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { usePosterPreset } from "./use-poster-preset";

describe("usePosterPreset", () => {
  beforeEach(() => localStorage.clear());

  it("falls back to dusk when the stored value is missing or invalid", () => {
    localStorage.setItem("gomate.poster-preset", "custom-css");

    const { result } = renderHook(() => usePosterPreset());

    expect(result.current[0]).toBe("dusk");
  });

  it("shares a validated preference on this device", () => {
    const { result } = renderHook(() => usePosterPreset());

    act(() => result.current[1]("journal"));

    expect(result.current[0]).toBe("journal");
    expect(localStorage.getItem("gomate.poster-preset")).toBe("journal");
  });
});
