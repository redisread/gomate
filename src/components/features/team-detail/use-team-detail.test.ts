import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import type { Team } from "@/lib/types";
import { useTeamDetail, useToast } from "./use-team-detail";

const api = vi.hoisted(() => vi.fn());
const user = vi.hoisted(() => vi.fn());
const t = vi.hoisted(() => (key: string) => key);
vi.mock("@/lib/api", () => ({ fetchAPI: api, fetchCurrentUser: user, getApiErrorMessage: () => "error" }));
vi.mock("@/hooks/useI18n", () => ({ useI18n: () => ({ t }) }));
const team = { id: "team", title: "SSR team", participants: [], maxParticipants: 8, activeParticipantCount: 1 } as unknown as Team;
beforeEach(() => { api.mockReset(); user.mockReset(); });

it("shows SSR content while identity is pending, without repeating the detail request", async () => {
  let resolve!: (value: null) => void;
  user.mockReturnValue(new Promise((done) => { resolve = done; }));
  const { result } = renderHook(() => useTeamDetail("team", team));
  expect(result.current.team?.title).toBe("SSR team");
  expect(result.current.loading).toBe(false);
  expect(result.current.statusLoading).toBe(true);
  await act(async () => resolve(null));
  await waitFor(() => expect(result.current.statusLoading).toBe(false));
  expect(api).not.toHaveBeenCalled();
});

it("still reads authoritative membership for an authenticated viewer", async () => {
  user.mockResolvedValue({ id: "viewer" });
  api.mockResolvedValue({ json: async () => ({ success: true, status: "member" }) });
  const { result } = renderHook(() => useTeamDetail("team", team));
  await waitFor(() => expect(result.current.isMember).toBe(true));
  expect(api.mock.calls.map(([url]) => url)).toEqual(["/teams/team/my-status"]);
});

it("a previous toast cannot dismiss a newer message", () => {
  vi.useFakeTimers();
  try {
    const { result, unmount } = renderHook(useToast);
    act(() => result.current.show({ type: "success", message: "first" }));
    act(() => vi.advanceTimersByTime(2400));
    act(() => result.current.show({ type: "error", message: "second" }));
    act(() => vi.advanceTimersByTime(400));
    expect(result.current.toast?.message).toBe("second");
    expect(result.current.exiting).toBe(false);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  } finally { vi.useRealTimers(); }
});

it("retries identity after an identity failure instead of treating it as signed out", async () => {
  user.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce({ id: "viewer" });
  api.mockResolvedValue({ ok: true, json: async () => ({ success: true, status: "member" }) });
  const { result } = renderHook(() => useTeamDetail("team", team));
  await waitFor(() => expect(result.current.statusLoadFailed).toBe(true));
  await act(async () => { await result.current.retryStatus(); });
  expect(user).toHaveBeenCalledTimes(2);
  expect(result.current.isMember).toBe(true);
  expect(result.current.statusLoadFailed).toBe(false);
});

it("keeps existing team content when a post-action refresh fails", async () => {
  user.mockResolvedValue(null);
  const { result } = renderHook(() => useTeamDetail("team", team));
  await waitFor(() => expect(result.current.statusLoading).toBe(false));
  api.mockRejectedValueOnce(new Error("offline"));
  await act(async () => { await result.current.loadTeam(); });
  expect(result.current.team).toBe(team);
  expect(result.current.error).toBeNull();
  expect(result.current.refreshError).toBe("teams.loadFailed");
});
