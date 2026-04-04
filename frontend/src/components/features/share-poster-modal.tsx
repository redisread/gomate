"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { copy } from "@/lib/copy";

const API_BASE =
  (import.meta.env.PUBLIC_API_URL as string) || "http://localhost:8799";

/** 通过 API 代理加载图片，绕过 Canvas CORS 污染 */
async function loadImageForCanvas(url: string): Promise<HTMLImageElement> {
  const proxyUrl = `${API_BASE}/proxy-image?url=${encodeURIComponent(url)}`;
  const resp = await fetch(proxyUrl);
  if (!resp.ok) throw new Error("proxy fetch failed");
  const blob = await resp.blob();
  const objectUrl = URL.createObjectURL(blob);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("image load failed"));
    };
    img.src = objectUrl;
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

const CANVAS_WIDTH = 375;
const CANVAS_HEIGHT = 520;
const COVER_HEIGHT = 160;
const QR_SIZE = 100;

function drawMultilineText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number
): number {
  const words = text.split("");
  let line = "";
  let lineCount = 0;
  let currentY = y;

  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i];
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && line !== "") {
      if (lineCount === maxLines - 1) {
        let truncated = line;
        while (ctx.measureText(truncated + "…").width > maxWidth && truncated.length > 0) {
          truncated = truncated.slice(0, -1);
        }
        ctx.fillText(truncated + "…", x, currentY);
        return currentY + lineHeight;
      }
      ctx.fillText(line, x, currentY);
      line = words[i];
      currentY += lineHeight;
      lineCount++;
    } else {
      line = testLine;
    }
  }
  if (line) {
    ctx.fillText(line, x, currentY);
    currentY += lineHeight;
  }
  return currentY;
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let cancelled = false;

    async function drawPoster() {
      if (!ctx || !canvas) return;
      setIsDrawing(true);

      try {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        let coverImg: HTMLImageElement | null = null;
        if (imageUrl) {
          try {
            coverImg = await loadImageForCanvas(imageUrl);
          } catch {
            coverImg = null;
          }
        }

        if (cancelled) return;

        if (coverImg) {
          ctx.drawImage(coverImg, 0, 0, CANVAS_WIDTH, COVER_HEIGHT);
          const gradient = ctx.createLinearGradient(0, COVER_HEIGHT - 60, 0, COVER_HEIGHT);
          gradient.addColorStop(0, "rgba(0,0,0,0)");
          gradient.addColorStop(1, "rgba(0,0,0,0.6)");
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, CANVAS_WIDTH, COVER_HEIGHT);
        } else {
          const gradient = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, COVER_HEIGHT);
          if (type === "team") {
            gradient.addColorStop(0, "#f59e0b");
            gradient.addColorStop(1, "#d97706");
          } else {
            gradient.addColorStop(0, "#78716c");
            gradient.addColorStop(1, "#57534e");
          }
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, CANVAS_WIDTH, COVER_HEIGHT);
        }

        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.font = "bold 12px sans-serif";
        ctx.textAlign = "right";
        ctx.fillText("GoMate", CANVAS_WIDTH - 16, 24);

        let infoY = COVER_HEIGHT + 24;

        if (locationName) {
          ctx.fillStyle = "#78716c";
          ctx.font = "13px sans-serif";
          ctx.textAlign = "left";
          ctx.fillText("📍 " + locationName, 20, infoY);
          infoY += 24;
        }

        ctx.fillStyle = "#1c1917";
        ctx.font = "bold 20px sans-serif";
        ctx.textAlign = "left";
        const titleEndY = drawMultilineText(ctx, title, 20, infoY, CANVAS_WIDTH - 40, 28, 2);
        infoY = titleEndY + 8;

        if (description) {
          ctx.fillStyle = "#78716c";
          ctx.font = "13px sans-serif";
          ctx.textAlign = "left";
          const descEndY = drawMultilineText(ctx, description, 20, infoY, CANVAS_WIDTH - 40, 18, 2);
          infoY = descEndY + 6;
        }

        const infoLineY = infoY;
        ctx.fillStyle = "#57534e";
        ctx.font = "13px sans-serif";
        ctx.textAlign = "left";

        let infoParts: string[] = [];
        if (leaderName) infoParts.push("👤 " + leaderName);
        if (membersInfo) infoParts.push("👥 " + membersInfo);
        if (infoParts.length > 0) {
          ctx.fillText(infoParts.join("  ·  "), 20, infoLineY);
          infoY = infoLineY + 20;
        }

        if (tags && tags.length > 0) {
          const tagsText = tags.slice(0, 4).join(" | ");
          ctx.fillStyle = "#a8a29e";
          ctx.font = "12px sans-serif";
          ctx.fillText("🏷️ " + tagsText, 20, infoY);
          infoY += 16;
        }

        if (subtitle) {
          ctx.fillStyle = "#a8a29e";
          ctx.font = "12px sans-serif";
          ctx.fillText(subtitle, 20, infoY);
          infoY += 16;
        }

        if (meta) {
          ctx.fillStyle = "#a8a29e";
          ctx.font = "12px sans-serif";
          ctx.fillText(meta, 20, infoY);
          infoY += 16;
        }

        ctx.strokeStyle = "#e7e5e4";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(20, CANVAS_HEIGHT - 56);
        ctx.lineTo(CANVAS_WIDTH - 20, CANVAS_HEIGHT - 56);
        ctx.stroke();

        ctx.fillStyle = "#a8a29e";
        ctx.font = "11px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("gomate.live", CANVAS_WIDTH / 2, CANVAS_HEIGHT - 38);

        const qrDataUrl = await QRCode.toDataURL(url, {
          width: QR_SIZE,
          margin: 1,
          color: { dark: "#1c1917", light: "#ffffff" },
        });

        if (cancelled) return;

        const qrImg = new Image();
        await new Promise<void>((resolve, reject) => {
          qrImg.onload = () => resolve();
          qrImg.onerror = reject;
          qrImg.src = qrDataUrl;
        });

        if (cancelled) return;

        const availableHeight = CANVAS_HEIGHT - infoY - 16 - QR_SIZE - 24 - 56;
        const qrY = infoY + 16 + Math.max(0, availableHeight / 2);
        const qrX = (CANVAS_WIDTH - QR_SIZE) / 2;

        ctx.fillStyle = "#ffffff";
        ctx.shadowColor = "rgba(0,0,0,0.08)";
        ctx.shadowBlur = 12;
        const padding = 8;
        ctx.beginPath();
        const rx = qrX - padding;
        const ry = qrY - padding;
        const rw = QR_SIZE + padding * 2;
        const rh = QR_SIZE + padding * 2;
        const radius = 8;
        ctx.moveTo(rx + radius, ry);
        ctx.lineTo(rx + rw - radius, ry);
        ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + radius);
        ctx.lineTo(rx + rw, ry + rh - radius);
        ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - radius, ry + rh);
        ctx.lineTo(rx + radius, ry + rh);
        ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - radius);
        ctx.lineTo(rx, ry + radius);
        ctx.quadraticCurveTo(rx, ry, rx + radius, ry);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.drawImage(qrImg, qrX, qrY, QR_SIZE, QR_SIZE);

        const scanText = type === "team" ? copy.share.scanToJoin : copy.share.scanToViewLocation;
        ctx.fillStyle = "#78716c";
        ctx.font = "12px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(scanText, CANVAS_WIDTH / 2, qrY + QR_SIZE + 18);
      } catch {
        showToast({ type: "error", message: copy.share.generatePosterFailed });
      } finally {
        if (!cancelled) setIsDrawing(false);
      }
    }

    drawPoster();

    return () => {
      cancelled = true;
    };
  }, [type, title, subtitle, url, imageUrl, locationName, description, leaderName, membersInfo, tags, meta]);

  function handleDownload() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
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
    }, "image/png");
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(url);
      showToast({ type: "success", message: copy.share.linkCopied });
    } catch {
      showToast({ type: "error", message: copy.share.copyFailed });
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-sm w-full mx-4 mt-8 mb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <span className="font-semibold text-stone-800 text-sm">
            {type === "team" ? copy.share.title : copy.share.locationTitle}
          </span>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 transition-colors text-lg leading-none"
            aria-label="关闭"
          >
            ✕
          </button>
        </div>

        <div className="px-4 pt-2 relative">
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="block mx-auto border rounded-xl shadow"
            style={{ width: "100%", maxWidth: CANVAS_WIDTH }}
          />
          {isDrawing && (
            <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/60">
              <span className="text-stone-400 text-sm">{copy.common.loading}</span>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-4 px-4 pb-4">
          <button
            onClick={handleDownload}
            disabled={isDrawing}
            className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors"
          >
            {copy.share.downloadQRCode}
          </button>
          <button
            onClick={handleCopyLink}
            className="flex-1 border border-stone-300 hover:border-stone-400 text-stone-700 font-medium py-2 px-4 rounded-lg text-sm transition-colors"
          >
            {copy.share.copyLink}
          </button>
        </div>

        {internalToast && (
          <div
            className={`mx-4 mb-4 px-3 py-2 rounded-lg text-sm text-center transition-opacity ${
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