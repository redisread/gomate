import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useMapData } from "./use-map-data";

const api = vi.fn();
vi.mock("@/lib/api", () => ({ fetchAPI: (...args: unknown[]) => api(...args) }));
afterEach(() => vi.unstubAllGlobals());

it("waits for both SVG and API data and retries only the failed resource", async () => {
  let resolveSvg!: (response: { ok: boolean; text: () => Promise<string> }) => void;
  const svg = vi.fn().mockImplementationOnce(() => new Promise(resolve => { resolveSvg = resolve; }))
    .mockResolvedValue({ ok: true, text: async () => '<svg><path data-name="广东省" d="M0 0L1 1" /></svg>' });
  vi.stubGlobal("fetch", svg);
  api.mockResolvedValue({ ok: true, json: async () => ({ success: true, regions: [], points: [] }) });
  const { result } = renderHook(useMapData);
  await waitFor(() => expect(result.current.data.status).toBe("ready"));
  expect(result.current.loading).toBe(true);
  await act(async () => resolveSvg({ ok: false, text: async () => "" }));
  expect(result.current.failed).toBe(true);
  const dataRequests = api.mock.calls.length;
  act(() => result.current.retry());
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.failed).toBe(false);
  expect(result.current.map.value).toHaveLength(1);
  expect(api.mock.calls).toHaveLength(dataRequests);
});
