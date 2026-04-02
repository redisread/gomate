import { useState, useCallback } from "react";
import { fetchAPI } from "@/lib/api";
import { useToast } from "./useToast";

interface UseTeamActionsOptions {
  teamId: string;
  onSuccess?: () => void;
}

interface JoinTeamResult {
  success: boolean;
  error?: string;
  needsWechat?: boolean;
}

/**
 * 队伍操作通用 Hook
 * 包含：申请加入、退出队伍、审批申请、组建队伍等操作
 * @example
 * const { joinTeam, isJoining, leaveTeam, approveMember } = useTeamActions({ teamId: "123" });
 */
export function useTeamActions({ teamId, onSuccess }: UseTeamActionsOptions) {
  const [isJoining, setIsJoining] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isApproving, setIsApproving] = useState<string | null>(null);
  const [isRejecting, setIsRejecting] = useState<string | null>(null);
  const [isForming, setIsForming] = useState(false);
  const [isSavingWechat, setIsSavingWechat] = useState(false);

  const { show: showToast } = useToast();

  /**
   * 申请加入队伍
   */
  const joinTeam = useCallback(
    async (message: string = ""): Promise<JoinTeamResult> => {
      if (!teamId) return { success: false, error: "缺少队伍ID" };

      setIsJoining(true);
      try {
        const res = await fetchAPI(`/api/teams/${teamId}/join`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message }),
        });

        const data = await res.json();

        if (data.success) {
          showToast({ type: "success", message: "申请已提交，等待队长审核" });
          onSuccess?.();
          return { success: true };
        } else {
          const errorMsg = data.error || "申请加入失败";

          // 检查是否需要填写微信号
          if (
            errorMsg.includes("微信") ||
            errorMsg.includes("wechat") ||
            errorMsg.includes("微信号")
          ) {
            return { success: false, error: errorMsg, needsWechat: true };
          }

          showToast({ type: "error", message: errorMsg });
          return { success: false, error: errorMsg };
        }
      } catch (err) {
        const errorMsg = "网络错误，请稍后重试";
        showToast({ type: "error", message: errorMsg });
        return { success: false, error: errorMsg };
      } finally {
        setIsJoining(false);
      }
    },
    [teamId, onSuccess, showToast]
  );

  /**
   * 退出队伍
   */
  const leaveTeam = useCallback(async (): Promise<boolean> => {
    if (!teamId) return false;

    setIsLeaving(true);
    try {
      const res = await fetchAPI(`/api/teams/${teamId}/leave`, {
        method: "POST",
      });

      const data = await res.json();

      if (data.success) {
        showToast({ type: "success", message: "已成功退出队伍" });
        onSuccess?.();
        return true;
      } else {
        showToast({ type: "error", message: data.error || "退出失败" });
        return false;
      }
    } catch (err) {
      showToast({ type: "error", message: "网络错误，请稍后重试" });
      return false;
    } finally {
      setIsLeaving(false);
    }
  }, [teamId, onSuccess, showToast]);

  /**
   * 批准成员申请
   */
  const approveMember = useCallback(
    async (userId: string): Promise<boolean> => {
      if (!teamId || !userId) return false;

      setIsApproving(userId);
      try {
        const res = await fetchAPI(
          `/api/teams/${teamId}/members/${userId}/approve`,
          {
            method: "POST",
          }
        );

        const data = await res.json();

        if (data.success) {
          showToast({ type: "success", message: "已通过申请" });
          onSuccess?.();
          return true;
        } else {
          showToast({ type: "error", message: data.error || "审批失败" });
          return false;
        }
      } catch (err) {
        showToast({ type: "error", message: "网络错误，请稍后重试" });
        return false;
      } finally {
        setIsApproving(null);
      }
    },
    [teamId, onSuccess, showToast]
  );

  /**
   * 拒绝成员申请
   */
  const rejectMember = useCallback(
    async (userId: string): Promise<boolean> => {
      if (!teamId || !userId) return false;

      setIsRejecting(userId);
      try {
        const res = await fetchAPI(
          `/api/teams/${teamId}/members/${userId}/reject`,
          {
            method: "POST",
          }
        );

        const data = await res.json();

        if (data.success) {
          showToast({ type: "success", message: "已拒绝申请" });
          onSuccess?.();
          return true;
        } else {
          showToast({ type: "error", message: data.error || "操作失败" });
          return false;
        }
      } catch (err) {
        showToast({ type: "error", message: "网络错误，请稍后重试" });
        return false;
      } finally {
        setIsRejecting(null);
      }
    },
    [teamId, onSuccess, showToast]
  );

  /**
   * 组建队伍
   */
  const formTeam = useCallback(
    async (isUnderfilled: boolean = false): Promise<boolean> => {
      if (!teamId) return false;

      setIsForming(true);
      try {
        const res = await fetchAPI(`/api/teams/${teamId}/form`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isUnderfilled }),
        });

        const data = await res.json();

        if (data.success) {
          showToast({ type: "success", message: "队伍组建成功" });
          onSuccess?.();
          return true;
        } else {
          showToast({ type: "error", message: data.error || "组建失败" });
          return false;
        }
      } catch (err) {
        showToast({ type: "error", message: "网络错误，请稍后重试" });
        return false;
      } finally {
        setIsForming(false);
      }
    },
    [teamId, onSuccess, showToast]
  );

  /**
   * 更新队伍信息
   */
  const updateTeam = useCallback(
    async (data: {
      title?: string;
      description?: string;
      maxMembers?: number;
      time?: string;
    }): Promise<boolean> => {
      if (!teamId) return false;

      try {
        const res = await fetchAPI(`/api/teams/${teamId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        const result = await res.json();

        if (result.success) {
          showToast({ type: "success", message: "队伍信息已更新" });
          onSuccess?.();
          return true;
        } else {
          showToast({ type: "error", message: result.error || "更新失败" });
          return false;
        }
      } catch (err) {
        showToast({ type: "error", message: "网络错误，请稍后重试" });
        return false;
      }
    },
    [teamId, onSuccess, showToast]
  );

  /**
   * 保存微信号
   */
  const saveWechat = useCallback(
    async (wechat: string, userId: string): Promise<boolean> => {
      if (!wechat.trim() || !userId) return false;

      setIsSavingWechat(true);
      try {
        const res = await fetchAPI("/api/user/update", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, wechat: wechat.trim() }),
        });

        const data = await res.json();

        if (data.success || data.user) {
          showToast({ type: "success", message: "微信号已保存" });
          return true;
        } else {
          showToast({ type: "error", message: "保存微信号失败" });
          return false;
        }
      } catch (err) {
        showToast({ type: "error", message: "网络错误，请稍后重试" });
        return false;
      } finally {
        setIsSavingWechat(false);
      }
    },
    [showToast]
  );

  return {
    // 操作函数
    joinTeam,
    leaveTeam,
    approveMember,
    rejectMember,
    formTeam,
    updateTeam,
    saveWechat,

    // 加载状态
    isJoining,
    isLeaving,
    isApproving,
    isRejecting,
    isForming,
    isSavingWechat,

    // 便捷判断
    isActionLoading:
      isJoining ||
      isLeaving ||
      !!isApproving ||
      !!isRejecting ||
      isForming,
  };
}
