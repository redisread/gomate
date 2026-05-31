"use client";

import * as React from "react";
import { useState } from "react";
import { useI18n } from "@/hooks/useI18n";
import { Link2, X, CheckCircle, Download, Loader2, Share2, RefreshCw } from "lucide-react";
import { useShareImage } from "@/hooks/use-share-image";

interface SharePosterPreviewProps {
  open: boolean;
  teamId: string;
  teamTitle: string;
  onClose: () => void;
}

/**
 * 队伍分享预览弹窗
 * Phase 4: 使用后端 API 生成图片，替代 html-to-image
 */
export function SharePosterPreview({
  open,
  teamId,
  teamTitle,
  onClose,
}: SharePosterPreviewProps) {
  const { t } = useI18n(["teams", "common"]);
  const [copied, setCopied] = useState(false);
  const [showRetry, setShowRetry] = useState(false);
  const teamUrl = typeof window !== "undefined" ? `${window.location.origin}/teams/${teamId}` : "";

  const {
    isLoading,
    error,
    imageUrl,
    generateImage,
    downloadImage,
    getDownloadUrl,
    cleanup,
  } = useShareImage({
    type: "team",
    id: teamId,
  });

  // 打开时自动生成
  React.useEffect(() => {
    if (open && !imageUrl) {
      generateImage();
    }
  }, [open, imageUrl, generateImage]);

  // 关闭时清理
  React.useEffect(() => {
    if (!open) {
      cleanup();
      setShowRetry(false);
    }
  }, [open, cleanup]);

  // 错误时显示重试按钮
  React.useEffect(() => {
    if (error) {
      setShowRetry(true);
    }
  }, [error]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(teamUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore
    }
  };

  const handleSaveImage = async () => {
    if (!imageUrl) return;

    try {
      // iOS Safari special handling
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

      if (isIOS) {
        // Open image in new tab for iOS (user can long press to save)
        const newWindow = window.open();
        if (newWindow) {
          newWindow.document.write(`
            <html>
              <head><title>长按保存图片</title></head>
              <body style="margin:0;display:flex;justify-content:center;align-items:center;background:#000;">
                <img src="${imageUrl}" style="max-width:100%;max-height:100vh;" />
              </body>
            </html>
          `);
        }
      } else {
        // Standard download for Android/PC
        const success = await downloadImage(`gomate-team-${teamId.slice(0, 8)}.png`);
        if (success) {
          // Show success toast
        }
      }
    } catch (err) {
      console.error("Failed to save image:", err);
    }
  };

  const handleRetry = () => {
    setShowRetry(false);
    generateImage(true); // 强制刷新
  };

  if (!open) return null;

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
            {/* Display generated poster */}
            {isLoading ? (
              <div className="w-[280px] h-[350px] bg-muted rounded-2xl flex flex-col items-center justify-center shadow-lg">
                <Loader2 className="w-10 h-10 animate-spin text-amber-600 mb-4" />
                <p className="text-sm text-muted-foreground">
                  {t("teams.generatingPoster")}
                </p>
                <p className="text-xs text-muted-foreground/70 mt-2">
                  {t("teams.posterGeneratingDesc")}
                </p>
              </div>
            ) : imageUrl ? (
              <div className="relative">
                <img
                  src={imageUrl}
                  alt="Team Poster"
                  className="w-[280px] rounded-2xl shadow-2xl"
                />
                {/* Decorative corner */}
                <div className="absolute -bottom-3 -right-3 w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center shadow-lg">
                  <CheckCircle className="w-4 h-4 text-white" />
                </div>
              </div>
            ) : error ? (
              <div className="w-[280px] h-[350px] bg-muted rounded-2xl flex flex-col items-center justify-center p-6">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-3">
                  <X className="w-6 h-6 text-red-500" />
                </div>
                <p className="text-sm text-red-500 mb-2">{error}</p>
                <p className="text-xs text-muted-foreground mb-4">
                  {t("teams.posterGenerateFallback")}
                </p>
                {showRetry && (
                  <button
                    onClick={handleRetry}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-700 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    {t("common.retry")}
                  </button>
                )}
              </div>
            ) : null}

            {/* Hint */}
            <div className="mt-4 text-center">
              <p className="text-xs text-muted-foreground">
                {t("teams.saveImageHint")}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="p-4 space-y-3 border-t border-border">
            {/* Save Image - Primary */}
            <button
              onClick={handleSaveImage}
              disabled={!imageUrl || isLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-amber-600 text-white rounded-xl font-medium hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-amber-200/50"
            >
              <Download className="w-5 h-5" />
              {t("teams.saveToAlbum")}
            </button>

            {/* Copy Link - Secondary */}
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

            {/* Close */}
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
