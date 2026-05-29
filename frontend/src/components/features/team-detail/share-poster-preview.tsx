"use client";

import * as React from "react";
import { useI18n } from "@/hooks/useI18n";
import { Link2, X, CheckCircle, Download, Loader2, Share2 } from "lucide-react";
import { API_BASE } from "@/lib/api";

interface SharePosterPreviewProps {
  open: boolean;
  teamId: string;
  teamTitle: string;
  onClose: () => void;
}

export function SharePosterPreview({
  open,
  teamId,
  teamTitle,
  onClose,
}: SharePosterPreviewProps) {
  const { t } = useI18n(["teams", "common"]);
  const [copied, setCopied] = React.useState(false);
  const [isGenerating, setIsGenerating] = React.useState(false);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(`https://gomate.live/teams/${teamId}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore
    }
  };

  const handleSaveImage = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch(`${API_BASE}/share-image/team/${teamId}?download=1`);
      if (!response.ok) throw new Error("Failed to generate poster");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      // iOS Safari special handling
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      if (isIOS) {
        const newWindow = window.open();
        if (newWindow) {
          newWindow.document.write(`
            <html>
              <head><title>长按保存图片</title></head>
              <body style="margin:0;display:flex;justify-content:center;align-items:center;background:#000;">
                <img src="${url}" style="max-width:100%;max-height:100vh;" />
              </body>
            </html>
          `);
        }
      } else {
        const link = document.createElement("a");
        link.href = url;
        link.download = `gomate-team-${Date.now()}.png`;
        link.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error("Failed to save image:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!open) return null;

  const posterUrl = `${API_BASE}/share-image/team/${teamId}`;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Modal */}
        <div
          className="bg-card rounded-2xl max-w-[420px] w-full max-h-[90vh] overflow-y-auto shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Share2 className="w-5 h-5 text-amber-600" />
              <h3 className="text-lg font-semibold text-foreground">
                {t("teams.shareTeam")}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* Poster Preview */}
          <div className="p-4 flex flex-col items-center bg-gradient-to-b from-amber-50/50 to-background">
            {isGenerating ? (
              <div className="w-[280px] h-[498px] bg-muted rounded-2xl flex flex-col items-center justify-center shadow-lg">
                <Loader2 className="w-10 h-10 animate-spin text-amber-600 mb-4" />
                <p className="text-sm text-muted-foreground">
                  {t("teams.generatingPoster")}
                </p>
              </div>
            ) : (
              <div className="relative">
                <img
                  src={posterUrl}
                  alt="Team Poster"
                  className="w-[280px] rounded-2xl shadow-2xl"
                  loading="lazy"
                />
                <div className="absolute -bottom-3 -right-3 w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center shadow-lg">
                  <CheckCircle className="w-4 h-4 text-white" />
                </div>
              </div>
            )}

            <div className="mt-4 text-center">
              <p className="text-xs text-muted-foreground">
                {t("teams.saveImageHint")}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="p-4 space-y-3 border-t border-border">
            <button
              onClick={handleSaveImage}
              disabled={isGenerating}
              className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-amber-600 text-white rounded-xl font-medium hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-amber-200/50"
            >
              <Download className="w-5 h-5" />
              {t("teams.saveToAlbum")}
            </button>

            <button
              onClick={handleCopyLink}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-colors ${
                copied
                  ? "bg-green-100 text-green-700"
                  : "border border-border text-foreground hover:bg-muted"
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

            <button
              onClick={onClose}
              className="w-full py-3 text-muted-foreground hover:bg-muted rounded-xl transition-colors"
            >
              {t("teams.close")}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
