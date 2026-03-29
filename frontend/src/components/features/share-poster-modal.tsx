"use client";

import { useEffect, useRef, useState } from "react";
import { copy } from "@/lib/copy";

interface PoiItem {
  name: string;
  roleType?: string;
}

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
  /** 地点类型专用：标签列表 */
  tags?: string[];
  /** 地点类型专用：简介描述 */
  description?: string;
  /** 地点类型专用：打卡点列表 */
  pois?: PoiItem[];
}

const CANVAS_WIDTH = 375;
const CANVAS_HEIGHT = 780;
const IMAGE_WIDTH = 343;
const IMAGE_HEIGHT = 193; // 16:9
const PADDING = 24;

/** 主题配置 - GoMate 品牌色 */
const THEME = {
  light: {
    bg: "#ffffff",
    title: "#1a1a1a",
    subtitle: "#666666",
    text: "#333333",
    address: "#666666",
    addressIcon: "#d97706", // amber-600
    accent: "#d97706", // amber-600
    accentGradient: ["#d97706", "#f59e0b"], // amber-600 to amber-500
    buttonText: "#ffffff",
    border: "#e5e5e5",
    brand: "#1a1a1a",
    shadow: "rgba(0,0,0,0.08)",
    tagBg: "#fef3c7", // amber-100
    tagText: "#92400e", // amber-700
    poiBadgeBg: "#f3f4f6", // gray-100
    poiBadgeText: "#6b7280", // gray-500
  },
  dark: {
    bg: "#1c1917", // stone-900
    title: "#ffffff",
    subtitle: "#a0a0a0",
    text: "#d0d0d0",
    address: "#a0a0a0",
    addressIcon: "#f59e0b", // amber-500
    accent: "#d97706", // amber-600
    accentGradient: ["#d97706", "#f59e0b"], // amber-600 to amber-500
    buttonText: "#ffffff",
    border: "#2a2a3e",
    brand: "#ffffff",
    shadow: "rgba(0,0,0,0.3)",
    tagBg: "#451a03", // amber-950
    tagText: "#fbbf24", // amber-400
    poiBadgeBg: "#374151", // gray-700
    poiBadgeText: "#9ca3af", // gray-400
  },
};

/** 绘制圆角矩形路径 */
function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/** 绘制定位图标 */
function drawLocationIcon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 24, size / 24);
  ctx.fillStyle = color;

  // 外圆
  ctx.beginPath();
  ctx.arc(12, 10, 6, 0, Math.PI * 2);
  ctx.fill();

  // 内部白色小圆
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(12, 10, 3, 0, Math.PI * 2);
  ctx.fill();

  // 底部定位标记尖角
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(12, 20);
  ctx.lineTo(8, 14);
  ctx.lineTo(16, 14);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

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
        while (ctx.measureText(truncated + "...").width > maxWidth && truncated.length > 0) {
          truncated = truncated.slice(0, -1);
        }
        ctx.fillText(truncated + "...", x, currentY);
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

/** 绘制标签列表 */
function drawTags(
  ctx: CanvasRenderingContext2D,
  tags: string[],
  theme: "light" | "dark",
  startY: number
): number {
  const colors = THEME[theme];
  const tagHeight = 24;
  const tagPadding = 8;
  const tagSpacing = 8;
  const maxWidth = CANVAS_WIDTH - PADDING * 2;

  let currentX = PADDING;
  let currentY = startY;
  let tagsDrawn = 0;

  ctx.font = "12px sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";

  for (const tag of tags.slice(0, 4)) {
    const metrics = ctx.measureText(tag);
    const tagWidth = metrics.width + tagPadding * 2;

    // 检查是否超出宽度
    if (currentX + tagWidth > PADDING + maxWidth && currentX > PADDING) {
      // 换行（但限制为单行，所以直接跳出）
      break;
    }

    // 绘制标签背景
    ctx.fillStyle = colors.tagBg;
    roundRectPath(ctx, currentX, currentY, tagWidth, tagHeight, 12);
    ctx.fill();

    // 绘制标签文字
    ctx.fillStyle = colors.tagText;
    ctx.fillText(tag, currentX + tagPadding, currentY + tagHeight / 2 + 1);

    currentX += tagWidth + tagSpacing;
    tagsDrawn++;
  }

  // 如果有更多标签，显示 +N
  if (tags.length > 4) {
    const moreText = `+${tags.length - 4}`;
    const moreWidth = ctx.measureText(moreText).width + tagPadding * 2;

    if (currentX + moreWidth <= PADDING + maxWidth) {
      ctx.fillStyle = theme === "light" ? "#e5e7eb" : "#4b5563";
      roundRectPath(ctx, currentX, currentY, moreWidth, tagHeight, 12);
      ctx.fill();
      ctx.fillStyle = theme === "light" ? "#6b7280" : "#9ca3af";
      ctx.fillText(moreText, currentX + tagPadding, currentY + tagHeight / 2 + 1);
    }
  }

  return currentY + tagHeight;
}

/** 绘制打卡点列表 */
function drawPois(
  ctx: CanvasRenderingContext2D,
  pois: PoiItem[],
  theme: "light" | "dark",
  startY: number
): number {
  const colors = THEME[theme];
  const poiItemHeight = 26;
  const maxDisplay = 3;

  // 标题行
  ctx.fillStyle = colors.title;
  ctx.font = "bold 14px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("打卡点", PADDING, startY);

  // 数量徽章
  const badgeText = `${pois.length} 个`;
  ctx.font = "11px sans-serif";
  const badgeWidth = ctx.measureText(badgeText).width + 12;
  ctx.fillStyle = colors.poiBadgeBg;
  roundRectPath(ctx, PADDING + 50, startY - 12, badgeWidth, 20, 10);
  ctx.fill();
  ctx.fillStyle = colors.poiBadgeText;
  ctx.fillText(badgeText, PADDING + 50 + 6, startY + 2);

  // POI 列表
  let currentY = startY + 28;
  const displayCount = Math.min(pois.length, maxDisplay);

  for (let i = 0; i < displayCount; i++) {
    const poi = pois[i];

    // 序号圆点背景
    ctx.fillStyle = colors.accent;
    ctx.beginPath();
    ctx.arc(PADDING + 10, currentY - 6, 10, 0, Math.PI * 2);
    ctx.fill();

    // 序号数字
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(String(i + 1), PADDING + 10, currentY - 2);
    ctx.textAlign = "left";

    // POI 名称
    ctx.fillStyle = colors.text;
    ctx.font = "13px sans-serif";
    ctx.fillText(poi.name, PADDING + 32, currentY);

    currentY += poiItemHeight;
  }

  // 超出提示
  if (pois.length > maxDisplay) {
    ctx.fillStyle = colors.subtitle;
    ctx.font = "12px sans-serif";
    ctx.fillText(`还有 ${pois.length - maxDisplay} 个打卡点...`, PADDING + 32, currentY - 2);
    currentY += poiItemHeight;
  }

  return currentY;
}

export function SharePosterModal({
  type,
  title,
  subtitle,
  url,
  imageUrl,
  meta,
  onClose,
  onToast,
  tags,
  description,
  pois,
}: SharePosterModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  /** 统一 toast 调用 */
  function showToast(opts: { type: "success" | "error"; message: string }) {
    if (onToast) {
      onToast(opts);
    } else {
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
        const colors = THEME[theme];

        // 背景
        ctx.fillStyle = colors.bg;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // 品牌标识（右上角）
        ctx.fillStyle = colors.brand;
        ctx.font = "bold 14px sans-serif";
        ctx.textAlign = "right";
        ctx.fillText("GoMate", CANVAS_WIDTH - PADDING, 40);

        let currentY = 70;

        // 标题
        ctx.fillStyle = colors.title;
        ctx.font = "bold 28px sans-serif";
        ctx.textAlign = "left";
        const titleY = drawMultilineText(ctx, title, PADDING, currentY, CANVAS_WIDTH - PADDING * 2, 36, 2);
        currentY = titleY + 8;

        // 副标题
        if (subtitle) {
          ctx.fillStyle = colors.subtitle;
          ctx.font = "14px sans-serif";
          ctx.fillText(subtitle, PADDING, currentY);
          currentY += 28;
        } else {
          currentY += 16;
        }

        // 封面图片
        if (imageUrl) {
          try {
            const coverImg = new Image();
            await new Promise<void>((resolve, reject) => {
              coverImg.onload = () => resolve();
              coverImg.onerror = reject;
              coverImg.src = imageUrl;
            });

            if (!cancelled) {
              // 绘制阴影
              ctx.save();
              ctx.shadowColor = colors.shadow;
              ctx.shadowBlur = 20;
              ctx.shadowOffsetY = 8;

              // 绘制圆角图片
              const imgX = PADDING;
              const imgY = currentY;
              const radius = 16;

              ctx.beginPath();
              ctx.moveTo(imgX + radius, imgY);
              ctx.lineTo(imgX + IMAGE_WIDTH - radius, imgY);
              ctx.quadraticCurveTo(imgX + IMAGE_WIDTH, imgY, imgX + IMAGE_WIDTH, imgY + radius);
              ctx.lineTo(imgX + IMAGE_WIDTH, imgY + IMAGE_HEIGHT - radius);
              ctx.quadraticCurveTo(imgX + IMAGE_WIDTH, imgY + IMAGE_HEIGHT, imgX + IMAGE_WIDTH - radius, imgY + IMAGE_HEIGHT);
              ctx.lineTo(imgX + radius, imgY + IMAGE_HEIGHT);
              ctx.quadraticCurveTo(imgX, imgY + IMAGE_HEIGHT, imgX, imgY + IMAGE_HEIGHT - radius);
              ctx.lineTo(imgX, imgY + radius);
              ctx.quadraticCurveTo(imgX, imgY, imgX + radius, imgY);
              ctx.closePath();
              ctx.clip();

              // 绘制图片（居中裁剪）
              const scale = Math.max(IMAGE_WIDTH / coverImg.width, IMAGE_HEIGHT / coverImg.height);
              const scaledWidth = coverImg.width * scale;
              const scaledHeight = coverImg.height * scale;
              const offsetX = (IMAGE_WIDTH - scaledWidth) / 2;
              const offsetY = (IMAGE_HEIGHT - scaledHeight) / 2;

              ctx.drawImage(coverImg, imgX + offsetX, imgY + offsetY, scaledWidth, scaledHeight);
              ctx.restore();

              currentY += IMAGE_HEIGHT + 20;
            }
          } catch {
            // 图片加载失败，跳过
            currentY += 16;
          }
        } else {
          // 无图片时显示占位
          ctx.save();
          ctx.fillStyle = theme === "light" ? "#f3f4f6" : "#2a2a3e";
          roundRectPath(ctx, PADDING, currentY, IMAGE_WIDTH, IMAGE_HEIGHT, 16);
          ctx.fill();

          // 占位文字
          ctx.fillStyle = theme === "light" ? "#9ca3af" : "#6b7280";
          ctx.font = "14px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("GoMate", CANVAS_WIDTH / 2, currentY + IMAGE_HEIGHT / 2 + 5);
          ctx.restore();

          currentY += IMAGE_HEIGHT + 20;
        }

        // 标签列表
        if (tags && tags.length > 0) {
          currentY = drawTags(ctx, tags, theme, currentY) + 16;
        }

        // 地址
        if (meta) {
          // 定位图标
          drawLocationIcon(ctx, PADDING, currentY - 10, 20, colors.addressIcon);

          // 地址文字
          ctx.fillStyle = colors.address;
          ctx.font = "14px sans-serif";
          ctx.textAlign = "left";
          drawMultilineText(ctx, meta, PADDING + 28, currentY, CANVAS_WIDTH - PADDING * 2 - 28, 22, 2);
          currentY += 40;
        }

        // 描述
        if (description) {
          ctx.fillStyle = colors.text;
          ctx.font = "15px sans-serif";
          ctx.textAlign = "left";
          const descEndY = drawMultilineText(ctx, description, PADDING, currentY, CANVAS_WIDTH - PADDING * 2, 24, 3);
          currentY = descEndY + 16;
        }

        // 打卡点
        if (pois && pois.length > 0) {
          currentY = drawPois(ctx, pois, theme, currentY) + 16;
        }

        // 底部区域
        const footerY = CANVAS_HEIGHT - 80;

        // 分隔线
        ctx.strokeStyle = colors.border;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(PADDING, footerY - 20);
        ctx.lineTo(CANVAS_WIDTH - PADDING, footerY - 20);
        ctx.stroke();

        // 品牌（左下角）
        ctx.fillStyle = colors.brand;
        ctx.font = "bold 16px sans-serif";
        ctx.textAlign = "left";
        ctx.fillText("GoMate", PADDING, footerY + 20);

        // CTA 按钮（右下角）
        const btnWidth = 100;
        const btnHeight = 40;
        const btnX = CANVAS_WIDTH - PADDING - btnWidth;
        const btnY = footerY - 2;

        // 按钮阴影
        ctx.save();
        ctx.shadowColor = "rgba(217, 119, 6, 0.4)"; // amber-600 with opacity
        ctx.shadowBlur = 12;
        ctx.shadowOffsetY = 4;

        // 按钮渐变背景
        const gradient = ctx.createLinearGradient(btnX, btnY, btnX + btnWidth, btnY + btnHeight);
        gradient.addColorStop(0, colors.accentGradient[0]);
        gradient.addColorStop(1, colors.accentGradient[1]);
        ctx.fillStyle = gradient;

        // 圆角按钮
        roundRectPath(ctx, btnX, btnY, btnWidth, btnHeight, 20);
        ctx.fill();
        ctx.restore();

        // 按钮文字
        ctx.fillStyle = colors.buttonText;
        ctx.font = "bold 14px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(copy.share.viewBtn, btnX + btnWidth / 2, btnY + btnHeight / 2);

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
  }, [type, title, subtitle, url, meta, imageUrl, tags, description, pois, theme]);

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

        {/* 主题切换 */}
        <div className="px-4 pb-2">
          <div className="flex items-center justify-center gap-2 bg-stone-100 rounded-full p-1">
            <button
              onClick={() => setTheme("light")}
              className={`flex-1 py-1.5 px-4 rounded-full text-sm font-medium transition-all ${
                theme === "light"
                  ? "bg-white text-stone-800 shadow-sm"
                  : "text-stone-500 hover:text-stone-700"
              }`}
            >
              {copy.share.themeLight}
            </button>
            <button
              onClick={() => setTheme("dark")}
              className={`flex-1 py-1.5 px-4 rounded-full text-sm font-medium transition-all ${
                theme === "dark"
                  ? "bg-stone-800 text-white shadow-sm"
                  : "text-stone-500 hover:text-stone-700"
              }`}
            >
              {copy.share.themeDark}
            </button>
          </div>
        </div>

        {/* 海报预览 */}
        <div className="px-4 pt-2 relative">
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="block mx-auto border rounded-xl shadow-lg"
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
            className="flex-1 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-medium py-2.5 px-4 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-md shadow-amber-600/20"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {copy.share.downloadQRCode}
          </button>
          <button
            onClick={handleCopyLink}
            className="flex-1 border border-stone-300 hover:border-stone-400 text-stone-700 font-medium py-2.5 px-4 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            {copy.share.copyLink}
          </button>
        </div>
      </div>
    </div>
  );
}
