"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "@/hooks/useI18n";
import { usePosterPreset } from "@/hooks/use-poster-preset";
import { useShareImage } from "@/hooks/use-share-image";
import { PosterPresetSelector } from "./poster-preset-selector";
import { CheckCircle, Loader2, ImageIcon, Link2, X, Download, RefreshCw } from "lucide-react";

interface SharePosterModalProps {
  type: "team" | "location";
  id: string;
  title: string;
  url: string;
  onClose: () => void;
  onToast?: (opts: { type: "success" | "error"; message: string }) => void;
}

type ActionFeedback = { type: "success" | "error"; message: string };

function isIOSDevice() {
  if (typeof navigator === "undefined") return false;

  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1)
  );
}

async function copyText(text: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Clipboard permissions can be denied in embedded browsers. Continue
      // with the synchronous fallback below.
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, text.length);

  let copied = false;
  try {
    const execCommand = (
      document as Document & { execCommand?: (command: string) => boolean }
    ).execCommand;
    copied = execCommand ? execCommand.call(document, "copy") : false;
  } finally {
    textarea.remove();
  }

  if (!copied) {
    throw new Error("Clipboard is unavailable");
  }
}

/**
 * Phase 4: 分享海报弹窗
 * 使用后端 API 生成图片，替代 html-to-image
 */
export function SharePosterModal({
  type,
  id,
  title,
  url,
  onClose,
  onToast,
}: SharePosterModalProps) {
  const { t } = useI18n(["common", "share"]);
  const [preset, setPreset, isPresetReady] = usePosterPreset();
  const { isLoading, imageUrl, error, generateImage } = useShareImage({
    type,
    id,
    preset,
  });
  const [actionFeedback, setActionFeedback] = useState<ActionFeedback | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback(
    (opts: { type: "success" | "error"; message: string }) => {
      if (onToast) {
        onToast(opts);
      }
    },
    [onToast]
  );

  const notifyAction = useCallback(
    (feedback: ActionFeedback) => {
      showToast(feedback);
      if (onToast) return;

      if (feedbackTimerRef.current) {
        clearTimeout(feedbackTimerRef.current);
      }
      setActionFeedback(feedback);
      feedbackTimerRef.current = setTimeout(() => {
        setActionFeedback(null);
        feedbackTimerRef.current = null;
      }, 2500);
    },
    [onToast, showToast]
  );

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) {
        clearTimeout(feedbackTimerRef.current);
      }
    };
  }, []);

  // Generate on open and whenever the selected preset changes.
  useEffect(() => {
    if (isPresetReady) void generateImage();
  }, [generateImage, isPresetReady]);

  const handleDownload = async () => {
    if (!imageUrl || isDownloading) return;

    setIsDownloading(true);

    try {
      if (
        isIOSDevice() &&
        typeof File !== "undefined" &&
        typeof navigator.share === "function" &&
        typeof navigator.canShare === "function"
      ) {
        try {
          const response = await fetch(imageUrl);
          const blob = await response.blob();
          const file = new File(
            [blob],
            `gomate-${type}-${id.slice(0, 8)}-${Date.now()}.svg`,
            { type: blob.type || "image/svg+xml" },
          );

          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              title,
              files: [file],
            });
            notifyAction({ type: "success", message: t("share.posterDownloaded") });
            return;
          }
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") {
            return;
          }
          // Fall through to the regular download attempt if native sharing
          // is unavailable or rejected by the host browser.
        }
      }

      // Use the same user-initiated download flow on iOS as on other browsers.
      // iOS may still choose to preview the blob instead of saving it, but the
      // download is now attempted and the user is not silently redirected to
      // a new tab.
      const link = document.createElement("a");
      link.href = imageUrl;
      link.download = `gomate-${type}-${id.slice(0, 8)}-${Date.now()}.svg`;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      link.remove();
      notifyAction({ type: "success", message: t("share.posterDownloaded") });
    } catch {
      notifyAction({ type: "error", message: t("share.downloadFailed") });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopyLink = async () => {
    if (isCopying) return;

    setIsCopying(true);
    try {
      await copyText(url);
      notifyAction({ type: "success", message: t("share.linkCopied") });
    } catch {
      notifyAction({ type: "error", message: t("share.copyFailed") });
    } finally {
      setIsCopying(false);
    }
  };

  const handleRetry = () => {
    void generateImage();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={onClose}
    >
      <div
        className="flex max-h-[calc(100dvh-2rem)] w-full max-w-sm flex-col rounded-2xl bg-white"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-poster-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-2">
          <span id="share-poster-title" className="text-base font-semibold text-foreground">
            {type === "team" ? t("share.title") : t("share.locationTitle")}
          </span>
          <button
            onClick={onClose}
            className="-me-2 flex size-11 items-center justify-center rounded-full text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600"
            aria-label={t("common.wechat.close")}
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="relative min-h-0 flex-1 overflow-y-auto px-4 pt-2">
          {/* Poster Preview - 根据海报类型动态适配长宽比 */}
          <div
            data-testid="share-poster-preview"
            className="mx-auto w-full overflow-hidden rounded-xl border border-stone-200 shadow"
            style={type === "location"
              ? { aspectRatio: "375 / 584" }
              : { aspectRatio: "375 / 468" }}
          >
            {imageUrl ? (
              <div className="relative size-full">
                <img
                  src={imageUrl}
                  alt={type === "team" ? t("share.title") : t("share.locationTitle")}
                  className="size-full object-contain"
                />
                {isLoading && (
                  <div className="absolute inset-x-0 top-0 flex items-center justify-center gap-2 bg-white/90 py-2 text-xs text-stone-600" role="status">
                    <Loader2 className="size-3.5 animate-spin text-amber-600" />
                    {t("share.generating")}
                  </div>
                )}
              </div>
            ) : isLoading ? (
              <div className="w-full h-full bg-muted flex flex-col items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-amber-600 mb-2" />
                <span className="text-sm text-stone-500">
                  {t("share.generating")}
                </span>
              </div>
            ) : error ? (
              <div className="w-full h-full bg-muted flex flex-col items-center justify-center p-4">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-2">
                  <X className="w-6 h-6 text-red-500" />
                </div>
                <span className="text-sm text-red-500 mb-1" role="alert">
                  {t("share.generateFailed")}
                </span>
                <button
                  onClick={handleRetry}
                  className="mt-3 flex min-h-11 items-center gap-1 rounded-lg bg-amber-600 px-3 py-1.5 text-sm text-white hover:bg-amber-700"
                >
                  <RefreshCw className="w-3 h-3" />
                  {t("common.retry")}
                </button>
              </div>
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <ImageIcon className="w-8 h-8 text-stone-300" />
              </div>
            )}
          </div>
          <div className="mx-auto mt-4 w-full">
            <PosterPresetSelector value={preset} onChange={setPreset} />
          </div>
        </div>

        {actionFeedback && (
          <div
            role={actionFeedback.type === "error" ? "alert" : "status"}
            aria-live="polite"
            className={`mx-4 mt-3 flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm ${
              actionFeedback.type === "error"
                ? "bg-red-50 text-red-700"
                : "bg-amber-50 text-amber-700"
            }`}
          >
            {actionFeedback.type === "success" ? (
              <CheckCircle className="size-4" />
            ) : (
              <X className="size-4" />
            )}
            <span>{actionFeedback.message}</span>
          </div>
        )}

        <div
          data-testid="share-poster-actions"
          className="mt-4 flex flex-shrink-0 gap-3 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
        >
          <button
            onClick={handleDownload}
            disabled={isLoading || !imageUrl || isDownloading}
            className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-600 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {t("share.download")}
          </button>
          <button
            onClick={handleCopyLink}
            disabled={isCopying}
            className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:border-stone-400"
          >
            <Link2 className="w-4 h-4" />
            {t("share.copyLink")}
          </button>
        </div>
      </div>
    </div>
  );
}
