import { act, fireEvent, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useMapExploration } from "./use-map-exploration";

const scrollDescriptor = Object.getOwnPropertyDescriptor(window, "scrollY")!;
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  Object.defineProperty(window, "scrollY", scrollDescriptor);
  document.documentElement.style.overflowAnchor = "";
  window.history.replaceState({}, "", "/");
});

it("keeps the return position through late layout changes and releases it on user input", async () => {
  let position = 0;
  Object.defineProperty(window, "scrollY", {
    configurable: true,
    get: () => position,
  });
  vi.spyOn(window, "scrollTo").mockImplementation((options: ScrollToOptions | number) => {
    if (typeof options === "object") position = options.top ?? 0;
  });
  let resized: (() => void) | undefined;
  const disconnect = vi.fn();
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(callback: () => void) {
        resized = callback;
      }
      observe() {}
      disconnect = disconnect;
    },
  );
  window.history.replaceState(
    { gomateMapReturn: { url: "/", y: 200 } },
    "",
    "/",
  );
  const points: [] = [];
  const { unmount } = renderHook(() => useMapExploration(points, true));
  await waitFor(() => expect(position).toBe(200));
  position = 80;
  act(() => resized?.());
  await waitFor(() => expect(position).toBe(200));
  fireEvent.wheel(window);
  position = 300;
  act(() => resized?.());
  await act(async () => {
    await new Promise(requestAnimationFrame);
  });
  expect(position).toBe(300);
  expect(disconnect).toHaveBeenCalled();
  expect(document.documentElement.style.overflowAnchor).toBe("");
  unmount();
});
