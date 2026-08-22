import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTeamChecklistForm } from "../components/features/team-detail/use-team-checklist-form";

/**
 * task #166（T3）CR B2：spec §5「pre-submit + 3s debounce」
 *
 * 覆盖：
 * - 3s 内连续编辑 → 计时器被重置，只 flush 一次（最终状态）
 * - unmount 时 timer 仍在排队 → 同步 flush 一次以保留最近一次编辑
 */

// 这个项目的 vitest jsdom 不挂 global localStorage —— 我们用内存 store
const store = new Map<string, string>();
beforeEach(() => {
  store.clear();
  vi.useFakeTimers();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: () => null,
    length: 0,
  });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const t = (key: string) => key;
const DRAFT_KEY = "team-checklist-draft-t1";
const readDraft = () => {
  const raw = localStorage.getItem(DRAFT_KEY);
  return raw ? JSON.parse(raw) : null;
};

describe("useTeamChecklistForm · draft debounce (CR B2)", () => {
  it("3s 内连续 setField：计时器重置，最终只 flush 一次", async () => {
    const { result } = renderHook(() =>
      useTeamChecklistForm({ teamId: "t1", initialChecklist: null, t }),
    );

    // 第 1 次编辑：1s 后
    act(() => {
      vi.advanceTimersByTime(1000);
      result.current.setField("meetingPointName", "A");
    });
    // 第 2 次编辑：再 2s（累计 3s 还未到第 2 个 3s 窗口）
    act(() => {
      vi.advanceTimersByTime(2000);
      result.current.setField("meetingPointName", "AB");
    });
    // 此时从第一次编辑算起恰好 3s，但第 2 次编辑重置了 timer 所以还没 flush
    expect(readDraft()).toBeNull();

    // 再推进 1s，第 2 次编辑累计 1s 还没到，仍未 flush
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(readDraft()).toBeNull();

    // 再推进 2s，第 2 次编辑累计 3s，flush 一次，最终值是 AB
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(readDraft()?.meetingPointName).toBe("AB");
  });

  it("停止编辑 3s 后写入一次；再编辑再等 3s 再次 flush", async () => {
    const { result } = renderHook(() =>
      useTeamChecklistForm({ teamId: "t1", initialChecklist: null, t }),
    );

    act(() => {
      result.current.setField("meetingPointName", "first");
    });
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(readDraft()?.meetingPointName).toBe("first");

    act(() => {
      result.current.setField("meetingPointName", "second");
    });
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(readDraft()?.meetingPointName).toBe("second");
  });

  it("unmount 时 timer 仍在排队 → 同步 flush 一次（保留最近一次编辑）", () => {
    const { result, unmount } = renderHook(() =>
      useTeamChecklistForm({ teamId: "t1", initialChecklist: null, t }),
    );

    act(() => {
      result.current.setField("meetingPointName", "in-flight");
    });
    // 不推进时间，直接 unmount —— timer 还没 fire
    expect(readDraft()).toBeNull();

    act(() => {
      unmount();
    });
    // cleanup 里同步 flush，应该立刻写入
    expect(readDraft()?.meetingPointName).toBe("in-flight");
  });

  it("unmount 时 timer 已 fire 过（无排队）→ 仍按 last-known-good 写一次", () => {
    const { result, unmount } = renderHook(() =>
      useTeamChecklistForm({ teamId: "t1", initialChecklist: null, t }),
    );

    act(() => {
      result.current.setField("meetingPointName", "stable");
    });
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    const beforeUnmount = readDraft();
    expect(beforeUnmount?.meetingPointName).toBe("stable");

    // unmount 时 last-known-good 总是写入 —— 与未 fire 路径行为一致
    act(() => {
      unmount();
    });
    expect(readDraft()?.meetingPointName).toBe("stable");
  });
});