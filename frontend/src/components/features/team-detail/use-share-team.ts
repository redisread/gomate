"use client";

import * as React from "react";
import { useI18n } from "@/hooks/useI18n";
import type { Team } from "@/lib/types";
import { ShareOptionsSheet } from "./share-options-sheet";
import { SharePosterPreview } from "./share-poster-preview";

interface UseShareTeamOptions {
  team: Team | null;
  location?: { name?: string; coverImage?: string } | null;
}

/**
 * Phase 4: 队伍分享 Hook
 * 使用后端 API 生成图片
 */
export function useShareTeam({ team, location }: UseShareTeamOptions) {
  const { t } = useI18n(["teams", "common"]);
  const [showOptions, setShowOptions] = React.useState(false);
  const [showPreview, setShowPreview] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  // 复制链接
  const handleCopyLink = React.useCallback(async () => {
    if (!team) return;
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore
    }
  }, [team]);

  // 生成海报 - 现在只是打开预览弹窗，实际生成在 SharePosterPreview 组件中
  const handleGeneratePoster = React.useCallback(async () => {
    setShowOptions(false);
    setShowPreview(true);
  }, []);

  const openShare = React.useCallback(() => {
    setShowOptions(true);
  }, []);

  const closeShare = React.useCallback(() => {
    setShowOptions(false);
    setShowPreview(false);
  }, []);

  return {
    showOptions,
    showPreview,
    copied,
    isGenerating: false, // Phase 4: 生成状态在组件内部管理
    handleCopyLink,
    handleGeneratePoster,
    openShare,
    closeShare,
    setShowOptions,
    setShowPreview,
  };
}
