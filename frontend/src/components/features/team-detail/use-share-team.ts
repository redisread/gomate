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

export function useShareTeam({ team }: UseShareTeamOptions) {
  const { t } = useI18n(["teams", "common"]);
  const [showOptions, setShowOptions] = React.useState(false);
  const [showPreview, setShowPreview] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

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
    handleCopyLink,
    handleGeneratePoster,
    openShare,
    closeShare,
    setShowOptions,
    setShowPreview,
  };
}
