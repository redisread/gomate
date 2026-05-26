"use client";

import * as React from "react";
import { useI18n } from "@/hooks/useI18n";
import { Link2, X, CheckCircle } from "lucide-react";

interface SharePosterPreviewProps {
  open: boolean;
  teamTitle?: string;
  teamUrl?: string;
  onClose: () => void;
}

export function SharePosterPreview({
  open,
  teamTitle,
  teamUrl,
  onClose,
}: SharePosterPreviewProps) {
  const { t } = useI18n(["teams", "common"]);
  const [copied, setCopied] = React.useState(false);

  if (!open) return null;

  const handleCopyLink = async () => {
    if (!teamUrl) return;
    try {
      await navigator.clipboard.writeText(teamUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore error
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Modal */}
        <div
          className="bg-card rounded-2xl max-w-sm w-full p-6 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-foreground">
              {t("teams.shareTeam")}
            </h3>
            <button
              onClick={onClose}
              className="p-1 hover:bg-muted rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* Placeholder for Poster (Phase 2) */}
          <div className="bg-muted rounded-xl p-8 mb-6 text-center">
            <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-amber-100 flex items-center justify-center">
              <span className="text-2xl">📋</span>
            </div>
            <p className="text-sm text-muted-foreground mb-1">
              {teamTitle || t("teams.teamInfo")}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("teams.posterComingSoon")}
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            {/* Copy Link */}
            <button
              onClick={handleCopyLink}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-colors ${
                copied
                  ? "bg-green-100 text-green-700"
                  : "bg-amber-600 text-white hover:bg-amber-700"
              }`}
            >
              {copied ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  {t("teams.linkCopied")}
                </>
              ) : (
                <>
                  <Link2 className="w-4 h-4" />
                  {t("teams.copyLink")}
                </>
              )}
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="w-full py-3 text-muted-foreground hover:bg-muted rounded-xl transition-colors"
            >
              {t("common.close")}
            </button>
          </div>

          {/* Hint */}
          <p className="mt-4 text-xs text-center text-muted-foreground">
            {t("teams.shareHint")}
          </p>
        </div>
      </div>
    </>
  );
}
