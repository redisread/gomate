import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useChecklistClaims } from "../components/features/team-detail/use-checklist-claims";
import type { TeamChecklist } from "@gomate/types";

/**
 * task #165（T2）：useChecklistClaims 单测
 *
 * 覆盖：
 * - optimistic 立即更新
 * - 成功后不回滚
 * - 失败回滚 + refetch
 * - 409 静默 refetch + 重跑
 * - 幂等 204
 * - 未登录直接失败
 * - pending 状态锁
 */

const mockFetchAPI = vi.fn();
vi.mock("@/lib/api", () => ({
  fetchAPI: (...args: unknown[]) => mockFetchAPI(...args),
}));

const t = (key: string) => key;

const baseChecklist: TeamChecklist = {
  assignments: [
    { id: "a1", task: "带急救包", assigneeIds: [] },
    { id: "a2", task: "开车", assigneeIds: ["u-bob"] },
  ],
};

function makeResponse(status: number, body: unknown = null): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

describe("useChecklistClaims", () => {
  const onError = vi.fn();
  const refetch = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    mockFetchAPI.mockReset();
    onError.mockReset();
    refetch.mockReset().mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("成功认领：optimistic 更新 + server 200 返回权威版本", async () => {
    mockFetchAPI.mockResolvedValueOnce(
      makeResponse(200, {
        success: true,
        assignment: { id: "a1", task: "带急救包", assigneeIds: ["u-me"] },
      }),
    );

    const { result } = renderHook(() =>
      useChecklistClaims({
        teamId: "t1",
        currentUserId: "u-me",
        initialChecklist: baseChecklist,
        onError,
        refetch,
        t,
      }),
    );

    await act(async () => {
      await result.current.toggleClaim(baseChecklist.assignments![0]);
    });

    expect(mockFetchAPI).toHaveBeenCalledWith(
      "/teams/t1/checklist/assignments/a1/claim",
      { method: "POST" },
    );
    expect(result.current.checklist?.assignments?.[0].assigneeIds).toEqual(["u-me"]);
    expect(onError).not.toHaveBeenCalled();
  });

  it("取消认领：DELETE 204 幂等 —— 不解析 body，assigneeIds 移除自己", async () => {
    mockFetchAPI.mockResolvedValueOnce(makeResponse(204));

    const cl: TeamChecklist = {
      assignments: [{ id: "a1", task: "带急救包", assigneeIds: ["u-me"] }],
    };
    const { result } = renderHook(() =>
      useChecklistClaims({
        teamId: "t1",
        currentUserId: "u-me",
        initialChecklist: cl,
        onError,
        refetch,
        t,
      }),
    );

    await act(async () => {
      await result.current.toggleClaim(cl.assignments![0]);
    });

    expect(mockFetchAPI).toHaveBeenCalledWith(
      "/teams/t1/checklist/assignments/a1/claim",
      { method: "DELETE" },
    );
    expect(result.current.checklist?.assignments?.[0].assigneeIds).toEqual([]);
  });

  it("409 静默 refetch + 重跑一次", async () => {
    mockFetchAPI
      .mockResolvedValueOnce(makeResponse(409))
      .mockResolvedValueOnce(
        makeResponse(200, {
          success: true,
          assignment: { id: "a1", task: "带急救包", assigneeIds: ["u-me"] },
        }),
      );

    const { result } = renderHook(() =>
      useChecklistClaims({
        teamId: "t1",
        currentUserId: "u-me",
        initialChecklist: baseChecklist,
        onError,
        refetch,
        t,
      }),
    );

    await act(async () => {
      await result.current.toggleClaim(baseChecklist.assignments![0]);
    });

    expect(refetch).toHaveBeenCalledTimes(1);
    expect(mockFetchAPI).toHaveBeenCalledTimes(2);
    expect(onError).not.toHaveBeenCalled();
    expect(result.current.checklist?.assignments?.[0].assigneeIds).toEqual(["u-me"]);
  });

  it("非 ok（403）→ 回滚 + onError + refetch", async () => {
    mockFetchAPI.mockResolvedValueOnce(makeResponse(403, { error: "仅已加入的成员可认领分工" }));

    const { result } = renderHook(() =>
      useChecklistClaims({
        teamId: "t1",
        currentUserId: "u-me",
        initialChecklist: baseChecklist,
        onError,
        refetch,
        t,
      }),
    );

    await act(async () => {
      await result.current.toggleClaim(baseChecklist.assignments![0]);
    });

    expect(onError).toHaveBeenCalledWith("仅已加入的成员可认领分工");
    expect(refetch).toHaveBeenCalledTimes(1);
    // override 已清空，view 回到 initialChecklist
    expect(result.current.checklist?.assignments?.[0].assigneeIds).toEqual([]);
  });

  it("网络错误 → 回滚 + networkError + refetch", async () => {
    mockFetchAPI.mockRejectedValueOnce(new Error("boom"));

    const { result } = renderHook(() =>
      useChecklistClaims({
        teamId: "t1",
        currentUserId: "u-me",
        initialChecklist: baseChecklist,
        onError,
        refetch,
        t,
      }),
    );

    await act(async () => {
      await result.current.toggleClaim(baseChecklist.assignments![0]);
    });

    expect(onError).toHaveBeenCalledWith("teams.actionbook.claim.networkError");
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("未登录：onError + 不发请求", async () => {
    const { result } = renderHook(() =>
      useChecklistClaims({
        teamId: "t1",
        currentUserId: null,
        initialChecklist: baseChecklist,
        onError,
        refetch,
        t,
      }),
    );

    await act(async () => {
      await result.current.toggleClaim(baseChecklist.assignments![0]);
    });

    expect(onError).toHaveBeenCalledWith("teams.actionbook.claim.loginRequired");
    expect(mockFetchAPI).not.toHaveBeenCalled();
  });

  it("pending 状态：同 assignment 二次点击被吞", async () => {
    // 让 fetch 挂起一会儿
    let resolveIt: (r: Response) => void = () => {};
    mockFetchAPI.mockImplementationOnce(
      () =>
        new Promise<Response>((res) => {
          resolveIt = res;
        }),
    );

    const { result } = renderHook(() =>
      useChecklistClaims({
        teamId: "t1",
        currentUserId: "u-me",
        initialChecklist: baseChecklist,
        onError,
        refetch,
        t,
      }),
    );

    // 第一次触发（未 await）
    let firstDone: Promise<void> | undefined;
    act(() => {
      firstDone = result.current.toggleClaim(baseChecklist.assignments![0]);
    });

    // 第二次触发（应被 pending 吞掉）
    await act(async () => {
      await result.current.toggleClaim(baseChecklist.assignments![0]);
    });

    expect(mockFetchAPI).toHaveBeenCalledTimes(1);

    // 收尾：让第一次完成
    resolveIt(
      makeResponse(200, {
        success: true,
        assignment: { id: "a1", task: "带急救包", assigneeIds: ["u-me"] },
      }),
    );
    await act(async () => {
      await firstDone;
    });
    await waitFor(() => expect(result.current.isPending("a1")).toBe(false));
  });

  it("initialChecklist 变化：override 重置为 undefined，view 跟随最新 server 数据", () => {
    const cl1: TeamChecklist = {
      assignments: [{ id: "a1", task: "带急救包", assigneeIds: [] }],
    };
    const cl2: TeamChecklist = {
      assignments: [
        { id: "a1", task: "带急救包", assigneeIds: ["u-x"] },
        { id: "a3", task: "带炉子", assigneeIds: [] },
      ],
    };

    const { result, rerender } = renderHook(
      ({ cl }: { cl: TeamChecklist }) =>
        useChecklistClaims({
          teamId: "t1",
          currentUserId: "u-me",
          initialChecklist: cl,
          onError,
          refetch,
          t,
        }),
      { initialProps: { cl: cl1 } },
    );

    expect(result.current.checklist).toBe(cl1);
    rerender({ cl: cl2 });
    expect(result.current.checklist).toBe(cl2);
  });
});
