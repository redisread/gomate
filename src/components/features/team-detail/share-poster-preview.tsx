"use client";

import * as React from "react";
import { useState, useRef, useCallback } from "react";
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
 * 队伍分享预览弹窗（底部 Sheet 版）
 * Phase 5: 移动端优化 - 底部 Sheet + 手势关闭 + navigator.share
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

  // 手势相关状态
  const [isDragging, setIsDragging] = useState(false);
  const [translateY, setTranslateY] = useState(0);
  const startYRef = useRef(0);
  const currentYRef = useRef(0);
  const sheetRef = useRef<HTMLDivElement>(null);

  const {
    isLoading,
    error,
    imageUrl,
    generateImage,
    downloadImage,
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
      setTranslateY(0);
    }
  }, [open, cleanup]);

  // 错误时显示重试按钮
  React.useEffect(() => {
    if (error) {
      setShowRetry(true);
    }
  }, [error]);

  // 处理分享/保存
  const handleShareOrSave = async () => {
    if (!imageUrl) return;

    try {
      // 尝试使用原生分享 API（Android 优先）
      const canShare = typeof navigator !== "undefined" && navigator.share;
      const canWriteFiles = typeof navigator !== "undefined" && "canShare" in navigator;

      if (canShare && canWriteFiles) {
        // 获取图片 blob
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const file = new File([blob], `gomate-team-${teamId.slice(0, 8)}.svg`, { type: "image/svg+xml" });

        // 检查是否可以分享文件
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: teamTitle,
            text: "加入我的队伍，一起出发！",
            url: teamUrl,
            files: [file],
          });
          return;
        }
      }

      // 降级到保存图片
      await handleSaveImage();
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }
      // 用户取消分享或分享失败，尝试保存
      console.log("Share failed, falling back to save:", err);
      await handleSaveImage();
    }
  };

  const handleSaveImage = async () => {
    if (!imageUrl) return;

    try {
      // iOS Safari special handling
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

      if (isIOS) {
        // Open image in new tab for iOS (user can long press to save)
        // eslint-disable-next-line no-restricted-properties -- iOS Safari requires blank window for image saving
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
        await downloadImage(`gomate-team-${teamId.slice(0, 8)}.svg`);
      }
    } catch (err) {
      console.error("Failed to save image:", err);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(teamUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore
    }
  };

  const handleRetry = () => {
    setShowRetry(false);
    generateImage(true); // 强制刷新
  };

  // 手势处理 - 开始拖动
  const handleTouchStart = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    startYRef.current = clientY;
    currentYRef.current = clientY;
    setIsDragging(true);
  }, []);

  // 手势处理 - 拖动中
  const handleTouchMove = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!isDragging) return;

    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    currentYRef.current = clientY;
    const deltaY = clientY - startYRef.current;

    // 只允许向下拖动
    if (deltaY > 0) {
      setTranslateY(deltaY);
    }
  }, [isDragging]);

  // 手势处理 - 结束拖动
  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return;

    setIsDragging(false);
    const deltaY = currentYRef.current - startYRef.current;

    // 如果拖动超过 100px 或速度较快，关闭弹窗
    if (deltaY > 100) {
      onClose();
    } else {
      // 否则回弹
      setTranslateY(0);
    }
  }, [isDragging, onClose]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-50"
        onClick={onClose}
        style={{ animation: "fadeIn 0.2s ease-out" }}
      />

      {/* Bottom Sheet */}
      <div
        ref={sheetRef}
        className="fixed bottom-0 left-0 right-0 z-50 max-h-[100dvh] overflow-y-auto rounded-t-2xl bg-white shadow-2xl"
        style={{
          transform: `translateY(${translateY}px)`,
          transition: isDragging ? "none" : "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          animation: "slideUp 0.3s ease-out",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - 可拖动区域指示 */}
        <div
          className="border-b border-border p-4"
          style={{ touchAction: "none" }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleTouchStart}
          onMouseMove={handleTouchMove}
          onMouseUp={handleTouchEnd}
          onMouseLeave={handleTouchEnd}
        >
          {/* 拖动指示条 */}
          <div className="flex justify-center mb-3">
            <div className="w-12 h-1 bg-gray-300 rounded-full" />
          </div>
          <div className="flex items-center justify-between">
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
        </div>

        {/* Poster Preview */}
        <div className="p-4 flex flex-col items-center bg-gradient-to-b from-amber-50/50 to-background">
          {/* Display generated poster */}
          {isLoading ? (
            <div
              className="flex w-full max-w-[280px] flex-col items-center justify-center rounded-2xl bg-muted shadow-lg"
              style={{ aspectRatio: "375 / 468", maxHeight: "min(55dvh, 350px)" }}
            >
              <Loader2 className="w-10 h-10 animate-spin text-amber-600 mb-4" />
              <p className="text-sm text-muted-foreground">
                {t("teams.generatingPoster")}
              </p>
              <p className="text-xs text-muted-foreground/70 mt-2">
                {t("teams.posterGeneratingDesc")}
              </p>
            </div>
          ) : imageUrl ? (
            <div
              className="relative w-full max-w-[280px] overflow-hidden rounded-2xl"
              style={{ aspectRatio: "375 / 468", maxHeight: "min(55dvh, 350px)" }}
            >
              <img
                src={imageUrl}
                alt="Team Poster"
                className="block h-full w-full object-contain shadow-2xl"
              />
              {/* Decorative corner */}
              <div className="absolute -bottom-3 -right-3 w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center shadow-lg">
                <CheckCircle className="w-4 h-4 text-white" />
              </div>
            </div>
          ) : error ? (
            <div
              className="flex w-full max-w-[280px] flex-col items-center justify-center rounded-2xl bg-muted p-6"
              style={{ aspectRatio: "375 / 468", maxHeight: "min(55dvh, 350px)" }}
            >
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-3">
                <X className="w-6 h-6 text-red-500" />
              </div>
              <p className="text-sm text-red-500 mb-2" role="alert">
                {t("teams.posterGenerateError")}
              </p>
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
        <div
          className="p-4 space-y-3"
          style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}
        >
          {/* Save Image - Primary */}
          <button
            onClick={handleShareOrSave}
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

          {/* Cancel */}
          <button
            onClick={onClose}
            className="w-full py-3 text-muted-foreground hover:bg-muted rounded-xl transition-colors border border-border"
          >
            {t("common.cancel")}
          </button>
        </div>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
