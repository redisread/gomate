"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { copy } from "@/lib/copy";

interface SharePosterModalProps {
  type: "team" | "location";
  title: string;
  subtitle?: string;
  url: string;
  imageUrl?: string;
  meta?: string;
  onClose: () => void;
  /** 可选：注入外部 toast 函数；未提供时使用内置简单提示 */
  onToast?: (opts: { type: "success" | "error"; message: string }) => void;
}

const CANVAS_WIDTH = 375;
const CANVAS_HEIGHT = 580;
const HEADER_HEIGHT = 200;
const QR_SIZE = 120;

/** 绘制多行文字，超出最大行数时末尾加省略号 */
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
        // 最后一行，截断加省略号
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
  meta,
  onClose,
  onToast,
}: SharePosterModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  /** 统一 toast 调用 */
  function showToast(opts: { type: "success" | "error"; message: string }) {
    if (onToast) {
      onToast(opts);
    } else {
      // 内置降级：简单 alert
      if (opts.type === "error") console.error(opts.message);
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
        // ── 背景白色 ──────────────────────────────────────
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // ── 顶部渐变色块 ──────────────────────────────────
        const gradient = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, HEADER_HEIGHT);
        if (type === "team") {
          gradient.addColorStop(0, "#f59e0b");
          gradient.addColorStop(1, "#d97706");
        } else {
          gradient.addColorStop(0, "#78716c");
          gradient.addColorStop(1, "#57534e");
        }
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, CANVAS_WIDTH, HEADER_HEIGHT);

        // ── logo 文字（右上角）────────────────────────────
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.font = "bold 12px sans-serif";
        ctx.textAlign = "right";
        ctx.fillText("GoMate", CANVAS_WIDTH - 16, 24);

        // ── 标题（白色，24px bold，最多2行）──────────────
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 24px sans-serif";
        ctx.textAlign = "left";
        const titleY = drawMultilineText(ctx, title, 20, 60, CANVAS_WIDTH - 40, 34, 2);

        // ── 副标题 ────────────────────────────────────────
        if (subtitle) {
          ctx.fillStyle = "rgba(255,255,255,0.85)";
          ctx.font = "14px sans-serif";
          ctx.textAlign = "left";
          ctx.fillText(subtitle, 20, Math.max(titleY + 4, 130));
        }

        // ── meta 信息区 ───────────────────────────────────
        if (meta) {
          ctx.fillStyle = "#78716c";
          ctx.font = "13px sans-serif";
          ctx.textAlign = "left";
          ctx.fillText(meta, 20, HEADER_HEIGHT + 36);
        }

        // ── 分割线 ────────────────────────────────────────
        ctx.strokeStyle = "#e7e5e4";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(20, CANVAS_HEIGHT - 60);
        ctx.lineTo(CANVAS_WIDTH - 20, CANVAS_HEIGHT - 60);
        ctx.stroke();

        // ── 底部网址小字 ──────────────────────────────────
        ctx.fillStyle = "#a8a29e";
        ctx.font = "11px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("gomate.live", CANVAS_WIDTH / 2, CANVAS_HEIGHT - 40);

        // ── 二维码（居中，距底部留空）────────────────────
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

        const qrX = (CANVAS_WIDTH - QR_SIZE) / 2;
        const qrY = HEADER_HEIGHT + (CANVAS_HEIGHT - HEADER_HEIGHT - 60 - QR_SIZE - 40) / 2 + 20;

        // 二维码背景白色圆角框
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

        // 二维码下方提示文字
        const scanText =
          type === "team" ? copy.share.scanToJoin : copy.share.scanToViewLocation;
        ctx.fillStyle = "#78716c";
        ctx.font = "12px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(scanText, CANVAS_WIDTH / 2, qrY + QR_SIZE + 20);
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
  }, [type, title, subtitle, url, meta]);

  /** 下载海报 PNG */
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

  /** 复制链接 */
  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(url);
      showToast({ type: "success", message: copy.share.linkCopied });
    } catch {
      showToast({ type: "error", message: copy.share.linkCopied });
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
        {/* 标题栏 */}
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

        {/* 海报预览 */}
        <div className="px-4 pt-2">
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

        {/* 按钮区 */}
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
      </div>
    </div>
  );
}
