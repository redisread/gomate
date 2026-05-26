"use client";

import * as React from "react";
import { toPng } from "html-to-image";
import { useI18n } from "@/hooks/useI18n";
import type { Team } from "@/lib/types";
import { ShareOptionsSheet } from "./share-options-sheet";
import { SharePosterPreview } from "./share-poster-preview";

interface UseShareTeamOptions {
  team: Team | null;
  location?: { name?: string; coverImage?: string } | null;
}

export function useShareTeam({ team, location }: UseShareTeamOptions) {
  const { t } = useI18n(["teams", "common"]);
  const [showOptions, setShowOptions] = React.useState(false);
  const [showPreview, setShowPreview] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [isGenerating, setIsGenerating] = React.useState(false);

  // Phase 1: 仅复制链接
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

  // Phase 2: 生成海报（预留）
  const handleGeneratePoster = React.useCallback(async () => {
    setShowOptions(false);
    setShowPreview(true);
    // Phase 2: 这里会调用海报生成逻辑
    setIsGenerating(true);
    // 模拟生成过程
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsGenerating(false);
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
    isGenerating,
    handleCopyLink,
    handleGeneratePoster,
    openShare,
    closeShare,
    setShowOptions,
    setShowPreview,
  };
}
