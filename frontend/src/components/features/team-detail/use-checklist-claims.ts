"use client";

/**
 * task #165（P0-A T2）：分工认领 hook —— optimistic UI + 409 静默重试
 *
 * spec §3.6：
 * - 队员点认领 → 立即更新（optimistic），失败回滚 + toast
 * - 409 静默 refetch + 重跑（用户视角只感知「重试后成功/失败」）
 * - 每人对同一 assignment 只能认领一次（server 去重）
 * - 已认领后按钮变为「取消认领」，仅自己可见/可点
 *
 * API：
 * - POST   /api/teams/:teamId/checklist/assignments/:assignmentId/claim
 * - DELETE /api/teams/:teamId/checklist/assignments/:assignmentId/claim
 */

import * as React from "react";
import { fetchAPI } from "@/lib/api";
import type { TeamChecklist, ActionbookAssignment } from "@gomate/types";

type ClaimAction = "claim" | "unclaim";

interface UseChecklistClaimsOpts {
  teamId: string;
  currentUserId: string | null;
  initialChecklist: TeamChecklist | undefined;
  /** 认领 / 取消认领结果通知，用于 toast 反馈 */
  onError: (message: string) => void;
  /** 完整重取 team 数据（409 静默失败或非幂等失败时使用） */
  refetch: () => Promise<void>;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

interface UseChecklistClaimsReturn {
  /** 当前视图使用的 checklist（含 optimistic 局部覆盖） */
  checklist: TeamChecklist | undefined;
  /** 认领 / 取消认领 */
  toggleClaim: (assignment: ActionbookAssignment) => Promise<void>;
  /** 该 assignment 当前是否处于 pending（用于按钮 loading） */
  isPending: (assignmentId: string) => boolean;
}

/** 把某个 assignment 的 assigneeIds 换掉，其他保持不变 */
function replaceAssignment(
  checklist: TeamChecklist | undefined,
  assignmentId: string,
  updater: (a: ActionbookAssignment) => ActionbookAssignment,
): TeamChecklist | undefined {
  if (!checklist?.assignments) return checklist;
  const next = checklist.assignments.map((a) => (a.id === assignmentId ? updater(a) : a));
  return { ...checklist, assignments: next };
}

export function useChecklistClaims({
  teamId,
  currentUserId,
  initialChecklist,
  onError,
  refetch,
  t,
}: UseChecklistClaimsOpts): UseChecklistClaimsReturn {
  const [override, setOverride] = React.useState<TeamChecklist | undefined>(undefined);
  const [pending, setPending] = React.useState<Set<string>>(() => new Set());

  // 每次 initialChecklist 变化就重置 override —— server 数据到位后 optimistic 让位
  React.useEffect(() => {
    setOverride(undefined);
  }, [initialChecklist]);

  const view = override ?? initialChecklist;

  const isPending = React.useCallback((id: string) => pending.has(id), [pending]);

  const toggleClaim = React.useCallback(
    async (assignment: ActionbookAssignment) => {
      if (!currentUserId) {
        onError(t("teams.actionbook.claim.loginRequired"));
        return;
      }
      if (pending.has(assignment.id)) return;

      const action: ClaimAction = assignment.assigneeIds.includes(currentUserId) ? "unclaim" : "claim";

      // optimistic 局部更新
      const optimistic = replaceAssignment(view, assignment.id, (a) => {
        if (action === "claim") {
          if (a.assigneeIds.includes(currentUserId)) return a;
          return { ...a, assigneeIds: [...a.assigneeIds, currentUserId] };
        }
        return { ...a, assigneeIds: a.assigneeIds.filter((u) => u !== currentUserId) };
      });
      setOverride(optimistic);
      setPending((prev) => {
        const next = new Set(prev);
        next.add(assignment.id);
        return next;
      });

      const path = `/api/teams/${teamId}/checklist/assignments/${assignment.id}/claim`;
      const method = action === "claim" ? "POST" : "DELETE";
      try {
        let res = await fetchAPI(path, { method });
        // spec §3.6 + Jeff 前置约定：409 静默 refetch + 重跑一次
        if (res.status === 409) {
          await refetch();
          res = await fetchAPI(path, { method });
        }
        if (res.status === 204) {
          // DELETE 幂等 204 —— 不需要 body
          return;
        }
        if (res.ok) {
          const data = await res.json().catch(() => null);
          // server 回来的 assignment 是权威版本；同步一下（避免 assigneeIds 顺序漂移）
          if (data?.success && data.assignment) {
            setOverride((prev) =>
              replaceAssignment(prev ?? initialChecklist, assignment.id, () => data.assignment as ActionbookAssignment),
            );
          }
          return;
        }
        // 非 ok：回滚 + toast，refetch 拿最新
        const data = await res.json().catch(() => null);
        const message =
          data?.error ||
          (action === "claim" ? t("teams.actionbook.claim.failed") : t("teams.actionbook.claim.unclaimFailed"));
        onError(message);
        setOverride(undefined);
        await refetch();
      } catch {
        onError(t("teams.actionbook.claim.networkError"));
        setOverride(undefined);
        await refetch();
      } finally {
        setPending((prev) => {
          if (!prev.has(assignment.id)) return prev;
          const next = new Set(prev);
          next.delete(assignment.id);
          return next;
        });
      }
    },
    [currentUserId, view, teamId, pending, onError, refetch, t, initialChecklist],
  );

  return { checklist: view, toggleClaim, isPending };
}
