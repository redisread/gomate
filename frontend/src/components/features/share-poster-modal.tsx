"use client";

import { useState } from "react";
import { API_BASE } from "@/lib/api";
import { useI18n } from "@/hooks/useI18n";

interface SharePosterModalProps {
  type: "team" | "location";
  id: string;
  title: string;
  onClose: () => void;
  onToast?: (opts: { type: "success" | "error"; message: string }) => void;
}

export function SharePosterModal({
  type,
  id,
  title,
  onClose,
  onToast,
}: SharePosterModalProps) {
  const { t } = useI18n(["common", "share"]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [internalToast, setInternalToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  function showToast(opts: { type: "success" | "error"; message: string }) {
    if (onToast) {
      onToast(opts);
    } else {
      setInternalToast(opts);
      setTimeout(() => setInternalToast(null), 2000);
    }
  }

  async function handleDownload() {
    setIsGenerating(true);
    try {
      const endpoint =
        type === "team"
          ? `${API_BASE}/share-image/team/${id}?download=1`
          : `${API_BASE}/share-image/location/${id}?download=1`;

      const resp = await fetch(endpoint);

      if (!resp.ok) {
        throw new Error("Failed to generate poster");
      }

      const blob = await resp.blob();
      const objectUrl = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = "gomate-share.png";
      a.click();

      URL.revokeObjectURL(objectUrl);
      showToast({ type: "success", message: t("share.posterDownloaded") });
    } catch {
      showToast({ type: "error", message: t("share.generatePosterFailed") });
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleCopyLink() {
    try {
      const url =
        type === "team"
          ? `https://gomate.live/teams/${id}`
          : `https://gomate.live/locations/${id}`;
      await navigator.clipboard.writeText(url);
      showToast({ type: "success", message: t("share.linkCopied") });
    } catch {
      showToast({ type: "error", message: t("share.copyFailed") });
    }
  }

  // 预览图 URL
  const previewUrl =
    type === "team"
      ? `${API_BASE}/share-image/team/${id}`
      : `${API_BASE}/share-image/location/${id}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={onClose}
    >
      <div
        className="mx-4 mt-8 mb-8 w-full max-w-sm rounded-2xl bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <span className="text-sm font-semibold text-foreground">
            {type === "team" ? t("share.title") : t("share.locationTitle")}
          </span>
          <button
            onClick={onClose}
            className="text-lg leading-none text-stone-400 dark:text-stone-500 transition-colors hover:text-stone-600"
            aria-label={t("common.wechat.close")}
          >
            ✕
          </button>
        </div>

        <div className="relative px-4 pt-2">
          <div className="overflow-hidden rounded-xl shadow border border-stone-200 dark:border-stone-700">
            <img
              src={previewUrl}
              alt="Share poster"
              className="w-full h-auto"
              loading="lazy"
            />
          </div>
          {isGenerating && (
            <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-muted/60">
              <span className="text-sm text-stone-400 dark:text-stone-500">
                {t("common.loading")}
              </span>
            </div>
          )}
        </div>

        <div className="mt-4 flex gap-3 px-4 pb-4">
          <button
            onClick={handleDownload}
            disabled={isGenerating}
            className="flex-1 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-600 disabled:opacity-50"
          >
            {t("share.downloadQRCode")}
          </button>
          <button
            onClick={handleCopyLink}
            className="flex-1 rounded-lg border border-stone-300 dark:border-stone-600 px-4 py-2 text-sm font-medium text-stone-700 dark:text-stone-300 transition-colors hover:border-stone-400 dark:hover:border-stone-500"
          >
            {t("share.copyLink")}
          </button>
        </div>

        {internalToast && (
          <div
            className={`mx-4 mb-4 rounded-lg px-3 py-2 text-center text-sm transition-opacity ${
              internalToast.type === "success"
                ? "bg-green-50 text-green-700"
                : "bg-red-50 text-red-700"
            }`}
          >
            {internalToast.message}
          </div>
        )}
      </div>
    </div>
  );
}
