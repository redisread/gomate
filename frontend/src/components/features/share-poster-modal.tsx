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
    if (!imageUrl) {
      setCoverDataUrl(null);
      return;
    }
    loadImageAsDataUrl(imageUrl)
      .then(setCoverDataUrl)
      .catch(() => setCoverDataUrl(null));
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

  // Wait for cover image + font to load before showing poster
  const isLoading = coverDataUrl === undefined || !fontReady;

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
                  coverImageDataUrl={coverDataUrl}
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
                  coverImageDataUrl={coverDataUrl}
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
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50 ${
              type === "location"
                ? "bg-cyan-600 hover:bg-cyan-700"
                : "bg-amber-500 hover:bg-amber-600"
            }`}
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
