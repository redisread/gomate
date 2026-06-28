"use client";

import * as React from "react";
import { ArrowLeft } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { useStoryForm } from "./use-story-form";

interface StoryEditClientProps {
  storyId: string;
}

export function StoryEditClient({ storyId }: StoryEditClientProps) {
  const { t } = useI18n(["content", "common"]);
  const { story, currentUser, isLoading, error, canEdit } = useStoryForm(storyId);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-amber-50/30 to-white">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
      </div>
    );
  }

  if (error || !story) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-amber-50/30 to-white">
        <p className="text-muted-foreground">{error || t("content.discover.storyNotFound")}</p>
      </div>
    );
  }

  if (!canEdit) {
    window.location.href = `/discover/${storyId}`;
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/30 to-white">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-border/60 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <a href={`/discover/${storyId}`} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" />
              {t("common.back")}
            </a>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-foreground">{t("content.discover.editStory")}</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Form (placeholder for #80) */}
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground italic">{t("content.discover.editFormPlaceholder")}</p>
          </div>

          {/* Right Column - Preview (placeholder for #80) */}
          <div className="hidden lg:block">
            <div className="sticky top-20 rounded-xl border border-border/60 bg-white p-6">
              <p className="text-sm text-muted-foreground italic">{t("content.discover.editPreviewPlaceholder")}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
