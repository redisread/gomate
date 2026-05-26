"use client";

import * as React from "react";
import { useI18n } from "@/hooks/useI18n";
import { ImagePlus, Link2, X } from "lucide-react";

interface ShareOptionsSheetProps {
  open: boolean;
  onClose: () => void;
  onGeneratePoster: () => void;
  onCopyLink: () => void;
}

export function ShareOptionsSheet({
  open,
  onClose,
  onGeneratePoster,
  onCopyLink,
}: ShareOptionsSheetProps) {
  const { t } = useI18n(["teams", "common"]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-50 transition-opacity"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 bg-background z-50 rounded-t-2xl"
        style={{
          paddingBottom: "env(safe-area-inset-bottom)",
          animation: "slideUp 0.2s ease"
        }}
      >
        <div className="p-4 space-y-3">
          {/* Handle */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">
              {t("teams.shareOptions")}
            </span>
            <button
              onClick={onClose}
              className="p-1 hover:bg-muted rounded-full transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Generate Poster - Primary */}
          <button
            onClick={onGeneratePoster}
            className="w-full flex items-center gap-3 px-4 py-4 bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition-colors"
          >
            <ImagePlus className="w-5 h-5" />
            <div className="flex flex-col items-start">
              <span className="font-semibold">{t("teams.generatePoster")}</span>
              <span className="text-xs text-amber-100">{t("teams.generatePosterDesc")}</span>
            </div>
          </button>

          {/* Copy Link - Secondary */}
          <button
            onClick={onCopyLink}
            className="w-full flex items-center gap-3 px-4 py-3 text-foreground hover:bg-muted rounded-xl transition-colors"
          >
            <Link2 className="w-5 h-5 text-muted-foreground" />
            <span>{t("teams.copyLink")}</span>
          </button>

          {/* Cancel */}
          <button
            onClick={onClose}
            className="w-full py-3 text-muted-foreground hover:bg-muted rounded-xl transition-colors"
          >
            {t("common.cancel")}
          </button>
        </div>
      </div>
    </>
  );
}
