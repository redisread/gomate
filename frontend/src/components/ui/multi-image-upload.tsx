"use client";

/**
 * MultiImageUpload — 多图上传组件
 *
 * 功能：
 * - 3列网格展示已上传图片缩略图
 * - 每张图片右上角「删除」按钮
 * - 最后一格为「添加图片」按钮，达到上限时隐藏
 * - 支持点击 / 拖拽文件到添加格上传
 * - 上传中显示圆形进度覆盖层
 * - 底部显示「已上传 N/max 张」计数
 * - 最多 max 张（默认 9）
 */

import * as React from "react";
import { Plus, X, AlertCircle, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { API_BASE } from "@/lib/api";
import { copy } from "@/lib/copy";

/* ================================================================
   常量
   ================================================================ */

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPT_TYPES = "image/*";

/* ================================================================
   圆形进度条（与 CoverImageUpload 保持一致）
   ================================================================ */

function CircularProgress({ progress, size = 40, strokeWidth = 3 }: {
  progress: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="rotate-[-90deg]"
      aria-label={`上传进度 ${progress}%`}
    >
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke="#D97706" strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 0.2s ease" }}
      />
    </svg>
  );
}

/* ================================================================
   上传单项状态
   ================================================================ */

interface UploadItem {
  /** 已完成的图片 URL，上传中为空字符串 */
  url: string;
  /** 上传进度 0-100，null 表示已完成 */
  progress: number | null;
  /** 错误信息 */
  error?: string;
  /** 内部 key，用于列表渲染 */
  key: string;
}

/* ================================================================
   Props
   ================================================================ */

interface MultiImageUploadProps {
  /** 当前已保存的图片 URL 数组（受控） */
  values: string[];
  /** 图片列表变更回调 */
  onChange: (urls: string[]) => void;
  /** 最多上传张数，默认 9 */
  max?: number;
  disabled?: boolean;
  /** 当前封面图 URL（用于标记已选） */
  coverImage?: string;
  /** 设为封面回调 */
  onSetCover?: (url: string) => void;
}

/* ================================================================
   工具函数
   ================================================================ */

function genKey() {
  return `img-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function getApiBase(): string {
  return API_BASE;
}

/* ================================================================
   主组件
   ================================================================ */

export function MultiImageUpload({
  values,
  onChange,
  max = 9,
  disabled = false,
  coverImage,
  onSetCover,
}: MultiImageUploadProps) {
  /** 正在上传中的任务列表（上传完成后移除） */
  const [uploadingItems, setUploadingItems] = React.useState<UploadItem[]>([]);
  /** 移动端 tap 激活的图片索引（用于显示操作层） */
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const dragCounterRef = React.useRef(0);
  const [isDraggingOver, setIsDraggingOver] = React.useState(false);

  /** 当前已有图片数 + 正在上传数 */
  const totalCount = values.length + uploadingItems.filter((u) => u.progress !== null).length;
  const canAddMore = totalCount < max && !disabled;

  /* ---- 上传核心逻辑 ---- */
  const uploadFile = React.useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) {
        // 静默跳过非图片，或可以弹提示
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        return;
      }

      const itemKey = genKey();

      // 插入上传中占位
      setUploadingItems((prev) => [
        ...prev,
        { url: "", progress: 0, key: itemKey },
      ]);

      const formData = new FormData();
      formData.append("file", file);

      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100);
          setUploadingItems((prev) =>
            prev.map((u) => (u.key === itemKey ? { ...u, progress: pct } : u))
          );
        }
      });

      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText) as { url?: string };
            if (data.url) {
              // 上传成功：从 uploadingItems 移除，追加到 values
              setUploadingItems((prev) => prev.filter((u) => u.key !== itemKey));
              onChange([...values, data.url]);
            } else {
              setUploadingItems((prev) =>
                prev.map((u) =>
                  u.key === itemKey ? { ...u, progress: null, error: "上传失败" } : u
                )
              );
            }
          } catch {
            setUploadingItems((prev) =>
              prev.map((u) =>
                u.key === itemKey ? { ...u, progress: null, error: "上传失败" } : u
              )
            );
          }
        } else {
          setUploadingItems((prev) =>
            prev.map((u) =>
              u.key === itemKey ? { ...u, progress: null, error: `上传失败（${xhr.status}）` } : u
            )
          );
        }
      });

      xhr.addEventListener("error", () => {
        setUploadingItems((prev) =>
          prev.map((u) =>
            u.key === itemKey ? { ...u, progress: null, error: "网络错误" } : u
          )
        );
      });

      xhr.open("POST", `${getApiBase()}/upload/location`);
      xhr.withCredentials = true;
      xhr.send(formData);
    },
    [values, onChange]
  );

  /* ---- 处理多文件选择 ---- */
  const handleFiles = React.useCallback(
    (files: FileList | null) => {
      if (!files || !canAddMore) return;
      const remaining = max - totalCount;
      const toUpload = Array.from(files).slice(0, remaining);
      toUpload.forEach(uploadFile);
    },
    [canAddMore, max, totalCount, uploadFile]
  );

  /* ---- 删除已上传图片 ---- */
  const handleDelete = (index: number) => {
    const next = [...values];
    next.splice(index, 1);
    onChange(next);
  };

  /* ---- 清除上传失败项 ---- */
  const handleClearError = (key: string) => {
    setUploadingItems((prev) => prev.filter((u) => u.key !== key));
  };

  /* ---- 拖拽事件 ---- */
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current += 1;
    if (canAddMore) setIsDraggingOver(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current === 0) setIsDraggingOver(false);
  };
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current = 0;
    setIsDraggingOver(false);
    if (!canAddMore) return;
    handleFiles(e.dataTransfer.files);
  };

  /* ---- 渲染 ---- */
  return (
    <div className="space-y-3">
      {/* 图片网格 */}
      <div
        className={cn(
          "grid grid-cols-3 gap-2 rounded-xl p-2 transition-all duration-200",
          isDraggingOver && "ring-2 ring-amber-400 bg-amber-50/50"
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => setActiveIndex(null)}
      >
        {/* 已上传图片 */}
        {values.map((url, index) => {
          const isCurrentCover = coverImage === url;
          const isActive = activeIndex === index;
          return (
            <div
              key={url + index}
              className="relative group aspect-square rounded-xl overflow-hidden bg-stone-100 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                if (!disabled) setActiveIndex(isActive ? null : index);
              }}
            >
              <img
                src={url}
                alt={copy.ui.upload.imageAlt.replace("{index}", String(index + 1))}
                className="w-full h-full object-cover"
                draggable={false}
              />
              {/* 封面角标（左上角） */}
              {isCurrentCover && !isActive && (
                <div className="absolute top-1 left-1 bg-amber-500 text-white px-1.5 py-0.5 rounded text-xs font-medium shadow-sm">
                  {copy.ui.upload.currentCover}
                </div>
              )}
              {/* 操作层：桌面 hover 或移动端 tap 激活时显示 */}
              {!disabled && (
                <div
                  className={cn(
                    "absolute inset-0 bg-black/30 transition-opacity duration-150",
                    "flex items-center justify-center",
                    isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  )}
                >
                  {/* 设为封面按钮 */}
                  {!isCurrentCover && onSetCover && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSetCover(url);
                        setActiveIndex(null);
                      }}
                      aria-label={copy.ui.upload.setAsCover}
                      className={cn(
                        "absolute top-1 left-1 w-6 h-6 rounded-full",
                        "flex items-center justify-center",
                        "bg-amber-500 text-white shadow-sm",
                        "hover:bg-amber-600 transition-colors duration-150"
                      )}
                    >
                      <Star className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {/* 删除按钮（右上） */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveIndex(null);
                      handleDelete(index);
                    }}
                    aria-label="删除图片"
                    className={cn(
                      "absolute top-1 right-1 w-6 h-6 rounded-full",
                      "flex items-center justify-center",
                      "bg-black/50 text-white",
                      "hover:bg-red-500 transition-colors duration-150"
                    )}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {/* 上传中 / 错误占位格 */}
        {uploadingItems.map((item) => (
          <div
            key={item.key}
            className="relative aspect-square rounded-xl overflow-hidden bg-stone-100 flex items-center justify-center"
          >
            {item.error ? (
              /* 错误态 */
              <div className="flex flex-col items-center gap-1 p-2 text-center">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <span className="text-[10px] text-red-500 leading-tight">{item.error}</span>
                <button
                  type="button"
                  onClick={() => handleClearError(item.key)}
                  className="text-[10px] underline text-red-400 hover:text-red-600"
                >
                  移除
                </button>
              </div>
            ) : (
              /* 上传中态 */
              <div className="flex flex-col items-center gap-1">
                <CircularProgress progress={item.progress ?? 0} />
                <span className="text-[10px] text-stone-400">{item.progress}%</span>
              </div>
            )}
          </div>
        ))}

        {/* 添加按钮格 */}
        {canAddMore && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            aria-label={copy.ui.upload.addImage}
            className={cn(
              "aspect-square rounded-xl border-2 border-dashed",
              "flex flex-col items-center justify-center gap-1",
              "transition-all duration-150 select-none",
              isDraggingOver
                ? "border-amber-500 bg-amber-50"
                : "border-stone-200 bg-stone-50 hover:border-amber-400 hover:bg-amber-50/50",
              disabled && "opacity-50 cursor-not-allowed pointer-events-none"
            )}
          >
            <Plus className="h-5 w-5 text-stone-400" />
            <span className="text-[10px] text-stone-400">{copy.ui.upload.addImage}</span>
          </button>
        )}
      </div>

      {/* 底部计数 + 提示 */}
      <div className="flex items-center justify-between px-1">
        <p className="text-xs text-stone-400">
          {onSetCover
            ? copy.ui.upload.coverHint
            : copy.ui.upload.dragToSort.replace("{size}", "5")}
        </p>
        <p className={cn(
          "text-xs tabular-nums shrink-0",
          totalCount >= max ? "text-amber-500 font-medium" : "text-stone-400"
        )}>
          {copy.ui.upload.uploadedCount
            .replace("{current}", String(values.length))
            .replace("{max}", String(max))}
        </p>
      </div>

      {/* 隐藏 file input，支持多选 */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT_TYPES}
        multiple
        className="sr-only"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
        disabled={disabled || !canAddMore}
        tabIndex={-1}
        aria-hidden="true"
      />
    </div>
  );
}
