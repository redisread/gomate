"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { copy } from "@/lib/copy";
import { PosterContent } from "./poster-content";
import { LocationPosterContent } from "./location-poster-content";

const API_BASE =
  (import.meta.env.PUBLIC_API_URL as string) || "http://localhost:8799";

/** Load an image as base64 data URL via API proxy to avoid CORS issues */
async function loadImageAsDataUrl(url: string): Promise<string> {
  const proxyUrl = `${API_BASE}/proxy-image?url=${encodeURIComponent(url)}`;
  const resp = await fetch(proxyUrl);
  if (!resp.ok) throw new Error("proxy fetch failed");
  const blob = await resp.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

interface SharePosterModalProps {
  type: "team" | "location";
  title: string;
  subtitle?: string;
  url: string;
  imageUrl?: string;
  locationName?: string;
  description?: string;
  leaderName?: string;
  membersInfo?: string;
  tags?: string[];
  meta?: string;
  onClose: () => void;
  onToast?: (opts: { type: "success" | "error"; message: string }) => void;
}

export function SharePosterModal({
  type,
  title,
  subtitle,
  url,
  imageUrl,
  locationName,
  description,
  leaderName,
  membersInfo,
  tags,
  meta,
  onClose,
  onToast,
}: SharePosterModalProps) {
  const posterRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [coverDataUrl, setCoverDataUrl] = useState<string | null | undefined>(
    undefined
  );
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

  const [fontReady, setFontReady] = useState(false);

  // Load Zpix pixel font
  useEffect(() => {
    const ZPIX_URL =
      "https://cdn.jsdelivr.net/gh/SolidZORO/zpix-pixel-font@master/website/zpix.woff2";
    const font = new FontFace("Zpix", `url(${ZPIX_URL})`, {
      style: "normal",
      weight: "normal",
    });
    font
      .load()
      .then((loaded) => {
        document.fonts.add(loaded);
        setFontReady(true);
      })
      .catch(() => setFontReady(true)); // fallback to monospace if font fails
  }, []);

  // Pre-load cover image as data URL to avoid CORS in html-to-image
  useEffect(() => {
    // 方案三：改进状态管理 - 使用 undefined 表示"尚未开始加载"，null 表示"已加载但无图片"
    if (!imageUrl) {
      // 没有图片URL，直接标记为 null（已确定无图片）
      setCoverDataUrl(null);
      return;
    }
    // 有图片URL，设置为 undefined 表示正在加载
    setCoverDataUrl(undefined);
    loadImageAsDataUrl(imageUrl)
      .then(setCoverDataUrl)
      .catch(() => setCoverDataUrl(null)); // 加载失败也标记为 null
  }, [imageUrl]);

  const generateImage = useCallback(async (): Promise<Blob | null> => {
    const node = posterRef.current;
    if (!node) return null;

    try {
      const dataUrl = await toPng(node, {
        pixelRatio: 2,
        cacheBust: true,
      });
      const res = await fetch(dataUrl);
      return res.blob();
    } catch {
      return null;
    }
  }, []);

  async function handleDownload() {
    setIsGenerating(true);
    try {
      const blob = await generateImage();
      if (!blob) {
        showToast({ type: "error", message: copy.share.generatePosterFailed });
        return;
      }
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = "gomate-share.png";
      a.click();
      URL.revokeObjectURL(objectUrl);
      showToast({ type: "success", message: copy.share.posterDownloaded });
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(url);
      showToast({ type: "success", message: copy.share.linkCopied });
    } catch {
      showToast({ type: "error", message: copy.share.copyFailed });
    }
  }

  // 方案三：改进加载状态判断 - undefined 表示"正在加载"，null 表示"已加载但无图片"
  // 只有当 coverDataUrl 既不是 undefined 也不是 null 时，才表示图片加载完成
  const isImageLoading = coverDataUrl === undefined;
  const hasCoverImage = coverDataUrl !== undefined && coverDataUrl !== null;

  // 整体加载状态：图片未加载完成 或 字体未准备好的
  const isLoading = isImageLoading || !fontReady;

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
          <span className="text-sm font-semibold text-stone-800">
            {type === "team" ? copy.share.title : copy.share.locationTitle}
          </span>
          <button
            onClick={onClose}
            className="text-lg leading-none text-stone-400 transition-colors hover:text-stone-600"
            aria-label="关闭"
          >
            ✕
          </button>
        </div>

        <div className="relative px-4 pt-2">
          <div
            ref={posterRef}
            className={`overflow-hidden rounded-xl shadow ${
              type === "location" ? "" : "border border-stone-200"
            }`}
          >
            {!isLoading &&
              (type === "location" ? (
                <LocationPosterContent
                  title={title}
                  subtitle={subtitle}
                  url={url}
                  coverImageDataUrl={hasCoverImage ? coverDataUrl : undefined}
                  description={description}
                  tags={tags}
                  meta={meta}
                />
              ) : (
                <PosterContent
                  type={type}
                  title={title}
                  subtitle={subtitle}
                  url={url}
                  coverImageDataUrl={hasCoverImage ? coverDataUrl : undefined}
                  locationName={locationName}
                  description={description}
                  leaderName={leaderName}
                  membersInfo={membersInfo}
                  tags={tags}
                  meta={meta}
                />
              ))}
          </div>
          {(isLoading || isGenerating) && (
            <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/60">
              <span className="text-sm text-stone-400">
                {copy.common.loading}
              </span>
            </div>
          )}
        </div>

        <div className="mt-4 flex gap-3 px-4 pb-4">
          <button
            onClick={handleDownload}
            disabled={isLoading || isGenerating}
            className="flex-1 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-600 disabled:opacity-50"
          >
            {copy.share.downloadQRCode}
          </button>
          <button
            onClick={handleCopyLink}
            className="flex-1 rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:border-stone-400"
          >
            {copy.share.copyLink}
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
