"use client";

import { useCallback, useEffect, useState } from "react";
import { API_BASE } from "@/lib/api";
import { useI18n } from "@/hooks/useI18n";
import { getLocale } from "@/i18n";
import { readShareImageBlob } from "@/lib/share-image-client";
import { Loader2, ImageIcon, Link2, X, Download, RefreshCw } from "lucide-react";

interface SharePosterModalProps {
  type: "team" | "location";
  id: string;
  title: string;
  url: string;
  onClose: () => void;
  onToast?: (opts: { type: "success" | "error"; message: string }) => void;
}

/**
 * Phase 4: 分享海报弹窗
 * 使用后端 API 生成图片，替代 html-to-image
 */
export function SharePosterModal({
  type,
  id,
  title: _title,
  url,
  onClose,
  onToast,
}: SharePosterModalProps) {
  const { t } = useI18n(["common", "share"]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showRetry, setShowRetry] = useState(false);

  const showToast = useCallback(
    (opts: { type: "success" | "error"; message: string }) => {
      if (onToast) {
        onToast(opts);
      }
    },
    [onToast]
  );

  /**
   * 生成分享图片
   */
  const generateImage = useCallback(
    async (refresh = false): Promise<string | null> => {
      setIsGenerating(true);
      setError(null);
      setShowRetry(false);

      try {
        // 把当前语言传给后端，让海报文案跟随用户语言
      const locale = getLocale();
      const qs = new URLSearchParams({ locale });
      if (refresh) qs.set("refresh", "1");
      const endpoint =
          type === "location"
            ? `${API_BASE}/share-image/location/${id}?${qs.toString()}`
            : `${API_BASE}/share-image/team/${id}?${qs.toString()}`;

        const response = await fetch(endpoint);

        const blob = await readShareImageBlob(response);
        const url = URL.createObjectURL(blob);
        setImageUrl((previousUrl) => {
          if (previousUrl) URL.revokeObjectURL(previousUrl);
          return url;
        });
        return url;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to generate image";
        setError(message);
        setShowRetry(true);
        return null;
      } finally {
        setIsGenerating(false);
      }
    },
    [type, id]
  );

  // 打开时自动生成
  useEffect(() => {
    if (!imageUrl) {
      generateImage();
    }
  }, [imageUrl, generateImage]);

  // imageUrl 变化时 revoke 旧的 blob URL，组件卸载时也 revoke
  useEffect(() => {
    return () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [imageUrl]);

  const handleDownload = async () => {
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
        const link = document.createElement("a");
        link.href = imageUrl;
        link.download = `gomate-${type}-${id.slice(0, 8)}-${Date.now()}.png`;
        link.click();
      }

      showToast({ type: "success", message: t("share.posterDownloaded") });
    } catch {
      showToast({ type: "error", message: t("share.downloadFailed") });
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      showToast({ type: "success", message: t("share.linkCopied") });
    } catch {
      showToast({ type: "error", message: t("share.copyFailed") });
    }
  };

  const handleRetry = () => {
    generateImage(true);
  };

  const isLoading = isGenerating;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={onClose}
    >
      <div
        className="mx-4 my-4 flex max-h-[calc(100dvh-2rem)] w-full max-w-sm flex-col rounded-2xl bg-white"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-poster-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <span id="share-poster-title" className="text-sm font-semibold text-foreground">
            {type === "team" ? t("share.title") : t("share.locationTitle")}
          </span>
          <button
            onClick={onClose}
            className="text-lg leading-none text-stone-400 transition-colors hover:text-stone-600"
            aria-label={t("common.wechat.close")}
          >
            ✕
          </button>
        </div>

        <div className="relative min-h-0 flex-1 overflow-y-auto px-4 pt-2">
          {/* Poster Preview - 根据海报类型动态适配长宽比 */}
          <div
            className="overflow-hidden rounded-xl shadow border border-stone-200"
            style={type === "location"
              ? { aspectRatio: "375 / 584", maxHeight: "min(60dvh, 584px)" }
              : { aspectRatio: "375 / 468", maxHeight: "min(55dvh, 468px)" }}
          >
            {isLoading ? (
              <div className="w-full h-full bg-muted flex flex-col items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-amber-600 mb-2" />
                <span className="text-sm text-stone-500">
                  {t("share.generating")}
                </span>
              </div>
            ) : imageUrl ? (
              <img
                src={imageUrl}
                alt="Share Poster"
                className="w-full h-full object-contain"
              />
            ) : error ? (
              <div className="w-full h-full bg-muted flex flex-col items-center justify-center p-4">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-2">
                  <X className="w-6 h-6 text-red-500" />
                </div>
                <span className="text-sm text-red-500 mb-1" role="alert">
                  {t("share.generateFailed")}
                </span>
                {showRetry && (
                  <button
                    onClick={handleRetry}
                    className="mt-3 flex items-center gap-1 px-3 py-1.5 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-700"
                  >
                    <RefreshCw className="w-3 h-3" />
                    {t("common.retry")}
                  </button>
                )}
              </div>
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <ImageIcon className="w-8 h-8 text-stone-300" />
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 flex gap-3 px-4 pb-4 flex-shrink-0 pb-[env(safe-area-inset-bottom)]">
          <button
            onClick={handleDownload}
            disabled={isLoading || !imageUrl}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-600 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {t("share.download")}
          </button>
          <button
            onClick={handleCopyLink}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:border-stone-400"
          >
            <Link2 className="w-4 h-4" />
            {t("share.copyLink")}
          </button>
        </div>
      </div>
    </div>
  );
}
