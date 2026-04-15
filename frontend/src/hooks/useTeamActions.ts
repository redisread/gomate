import { useState, useCallback } from "react";
import { fetchAPI } from "@/lib/api";
import { useToast } from "./useToast";
import { useI18n } from "@/hooks/useI18n";

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
  const { t } = useI18n(["teams"]);

  /**
   * 申请加入队伍
   */
  const joinTeam = useCallback(
    async (message: string = ""): Promise<JoinTeamResult> => {
      if (!teamId) return { success: false, error: t("teams.toast.networkError") };

      setIsJoining(true);
      try {
        const res = await fetchAPI(`/api/teams/${teamId}/join`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message }),
        });

        const data = await res.json();

        if (data.success) {
          showToast({ type: "success", message: t("teams.toast.joinSuccess") });
          onSuccess?.();
          return { success: true };
        } else {
          const errorMsg = data.error || t("teams.toast.networkError");

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
        const errorMsg = t("teams.toast.networkError");
        showToast({ type: "error", message: errorMsg });
        return { success: false, error: errorMsg };
      } finally {
        setIsJoining(false);
      }
    },
    [teamId, onSuccess, showToast, t]
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
        showToast({ type: "success", message: t("teams.toast.leaveSuccess") });
        onSuccess?.();
        return true;
      } else {
        showToast({ type: "error", message: data.error || t("teams.toast.leaveFailed") });
        return false;
      }
    } catch (err) {
      showToast({ type: "error", message: t("teams.toast.networkError") });
      return false;
    } finally {
      setIsLeaving(false);
    }
  }, [teamId, onSuccess, showToast, t]);

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
          showToast({ type: "success", message: t("teams.toast.approveSuccess") });
          onSuccess?.();
          return true;
        } else {
          showToast({ type: "error", message: data.error || t("teams.toast.approveFailed") });
          return false;
        }
      } catch (err) {
        showToast({ type: "error", message: t("teams.toast.networkError") });
        return false;
      } finally {
        setIsApproving(null);
      }
    },
    [teamId, onSuccess, showToast, t]
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
          showToast({ type: "success", message: t("teams.toast.rejectSuccess") });
          onSuccess?.();
          return true;
        } else {
          showToast({ type: "error", message: data.error || t("teams.toast.rejectFailed") });
          return false;
        }
      } catch (err) {
        showToast({ type: "error", message: t("teams.toast.networkError") });
        return false;
      } finally {
        setIsRejecting(null);
      }
    },
    [teamId, onSuccess, showToast, t]
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
          showToast({ type: "success", message: t("teams.toast.formSuccess") });
          onSuccess?.();
          return true;
        } else {
          showToast({ type: "error", message: data.error || t("teams.toast.formFailed") });
          return false;
        }
      } catch (err) {
        showToast({ type: "error", message: t("teams.toast.networkError") });
        return false;
      } finally {
        setIsForming(false);
      }
    },
    [teamId, onSuccess, showToast, t]
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
          showToast({ type: "success", message: t("teams.toast.updateSuccess") });
          onSuccess?.();
          return true;
        } else {
          showToast({ type: "error", message: result.error || t("teams.toast.updateFailed") });
          return false;
        }
      } catch (err) {
        showToast({ type: "error", message: t("teams.toast.networkError") });
        return false;
      }
    },
    [teamId, onSuccess, showToast, t]
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
          showToast({ type: "success", message: t("teams.toast.wechatSaved2") });
          return true;
        } else {
          showToast({ type: "error", message: t("teams.toast.wechatSaveFailed") });
          return false;
        }
      } catch (err) {
        showToast({ type: "error", message: t("teams.toast.networkError") });
        return false;
      } finally {
        setIsSavingWechat(false);
      }
    },
    [showToast, t]
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
