import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useRandomLocation } from "./use-random-location";
const api = vi.fn();
vi.mock("@/lib/api", () => ({
  fetchPublicAPI: (...args: unknown[]) => api(...args),
}));
const payload = (id: string) => ({
  ok: true,
  json: async () => ({
    success: true,
    location: { id, name: id, city: "City", coverImageUrl: null },
    total: 20,
  }),
});
beforeEach(() => {
  vi.useFakeTimers();
  api.mockReset();
  sessionStorage.clear();
  vi.stubGlobal("matchMedia", () => ({
    matches: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
it("guards repeated clicks synchronously and keeps only ten most recent unique results", async () => {
  let release!: (value: unknown) => void;
  api.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        release = resolve;
      }),
  );
  const { result } = renderHook(useRandomLocation);
  let pending!: Promise<void>;
  act(() => {
    pending = result.current.draw();
    void result.current.draw();
  });
  expect(api).toHaveBeenCalledTimes(1);
  await act(async () => {
    release(payload("a"));
    await pending;
  });
  for (let i = 0; i < 12; i++) {
    api.mockResolvedValueOnce(payload(String(i)));
    await act(async () => {
      await result.current.draw();
    });
  }
  expect(
    JSON.parse(sessionStorage.getItem("gomate.random-locations.v1")!),
  ).toEqual(["2", "3", "4", "5", "6", "7", "8", "9", "10", "11"]);
  const query = new URL(
    api.mock.calls.at(-1)![0],
    "https://example.test",
  ).searchParams.get("recent");
  expect(query?.split(",")).toEqual([
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
  ]);
});
it("preserves the last result on timeout and permits retry", async () => {
  api.mockResolvedValueOnce(payload("a"));
  const { result } = renderHook(useRandomLocation);
  await act(async () => {
    await result.current.draw();
  });
  api.mockImplementationOnce(
    (_path, options) =>
      new Promise((_resolve, reject) =>
        options.signal.addEventListener("abort", () =>
          reject(new Error("timeout")),
        ),
      ),
  );
  act(() => {
    void result.current.draw();
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(8000);
  });
  expect(result.current.failed).toBe(true);
  expect(result.current.busy).toBe(false);
  expect(result.current.result?.location?.id).toBe("a");
  api.mockResolvedValueOnce(payload("b"));
  await act(async () => {
    await result.current.draw();
  });
  expect(result.current.result?.location?.id).toBe("b");
});
it("aborts in-flight requests on unmount without recording unseen results", async () => {
  let release!: (value: unknown) => void;
  api.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        release = resolve;
      }),
  );
  const { result, unmount } = renderHook(useRandomLocation);
  let pending!: Promise<void>;
  act(() => {
    pending = result.current.draw();
  });
  const signal = api.mock.calls[0][1].signal;
  unmount();
  expect(signal.aborted).toBe(true);
  await act(async () => {
    release(payload("late"));
    await pending;
  });
  expect(sessionStorage.getItem("gomate.random-locations.v1")).toBeNull();
});

it("shows a ready result without spending time on a reveal delay", async () => {
  vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  api.mockResolvedValueOnce(payload("ready"));
  const { result } = renderHook(useRandomLocation);
  await act(async () => {
    void result.current.draw();
    await Promise.resolve();
    await Promise.resolve();
  });
  expect(result.current.result?.location?.id).toBe("ready");
  expect(result.current.busy).toBe(false);
});
