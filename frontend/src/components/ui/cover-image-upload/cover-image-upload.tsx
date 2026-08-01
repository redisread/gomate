"use client";

/**
 * CoverImageUpload — 封面图拖拽上传组件
 *
 * 功能：
 * - 有图片：16:9 预览 + 「更换」「删除」按钮
 * - 无图片：拖拽上传区域（虚线边框）
 * - 拖拽悬停：琥珀色边框 + 淡黄背景 + 提示文案
 * - 点击区域触发文件选择
 * - 「粘贴图片 URL」备选入口（点击展开输入框）
 * - 上传中：圆形进度条 + 百分比
 * - 上传成功：绿色勾 + 文件信息
 * - 错误：红色边框 + 错误说明
 */

import * as React from "react";
import { Upload, Image as ImageIcon, X, Link, Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { API_BASE } from "@/lib/api";
import { useI18n } from "@/hooks/useI18n";
import { CircularProgress } from "./circular-progress";

/* ================================================================
   类型定义
   ================================================================ */

interface CoverImageUploadProps {
  /** 当前图片 URL（受控） */
  value: string;
  /** 图片变更回调，传入新 URL（上传成功）或空字符串（删除） */
  onChange: (url: string) => void;
  /** 禁用所有交互 */
  disabled?: boolean;
}

/** 上传状态机 */
type UploadState =
  | { phase: "idle" }
  | { phase: "uploading"; progress: number }
  | { phase: "success"; fileName: string; fileSize: string }
  | { phase: "error"; message: string };

/* ================================================================
   常量
   ================================================================ */

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPT_TYPES = "image/*";

/** 将字节数格式化为可读字符串 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/* ================================================================
   主组件
   ================================================================ */

export function CoverImageUpload({ value, onChange, disabled = false }: CoverImageUploadProps) {
  const { t } = useI18n(["ui", "common"]);
  /* ---- 状态 ---- */
  const [isDraggingOver, setIsDraggingOver] = React.useState(false);
  const [uploadState, setUploadState] = React.useState<UploadState>({ phase: "idle" });
  const [showUrlInput, setShowUrlInput] = React.useState(false);
  const [urlInputValue, setUrlInputValue] = React.useState("");

  /* ---- 引用 ---- */
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const dropZoneRef = React.useRef<HTMLDivElement>(null);
  const dragCounterRef = React.useRef(0); // 防止子元素 drag leave 触发闪烁

  /* ----------------------------------------------------------------
     上传核心逻辑
  ---------------------------------------------------------------- */

  /**
   * 校验文件后触发上传，通过 XMLHttpRequest 模拟进度
   */
  const uploadFile = React.useCallback(
    async (file: File) => {
      // 类型校验
      if (!file.type.startsWith("image/")) {
        setUploadState({ phase: "error", message: t("ui.upload.invalidType") });
        return;
      }
      // 大小校验
      if (file.size > MAX_FILE_SIZE) {
        setUploadState({ phase: "error", message: t("ui.upload.fileTooLarge", { size: "5" }) });
        return;
      }

      setUploadState({ phase: "uploading", progress: 0 });

      try {
        const formData = new FormData();
        formData.append("file", file);

        // 使用 XMLHttpRequest 获取上传进度事件
        const url = await new Promise<string>((resolve, reject) => {
          const xhr = new XMLHttpRequest();

          xhr.upload.addEventListener("progress", (e) => {
            if (e.lengthComputable) {
              const pct = Math.round((e.loaded / e.total) * 100);
              setUploadState({ phase: "uploading", progress: pct });
            }
          });

          xhr.addEventListener("load", () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const data = JSON.parse(xhr.responseText) as { url?: string; error?: string };
                if (data.url) {
                  resolve(data.url);
                } else {
                  reject(new Error(t("ui.upload.uploadServerError")));
                }
              } catch {
                reject(new Error(t("ui.upload.uploadInvalidResponse")));
              }
            } else {
              reject(new Error(t("ui.upload.uploadHttpError").replace("{status}", String(xhr.status))));
            }
          });

          xhr.addEventListener("error", () => reject(new Error(t("ui.upload.uploadNetworkError"))));
          xhr.addEventListener("abort", () => reject(new Error("上传已取消")));

          // 构建请求地址（复用 API_BASE）
          const apiBase = API_BASE;

          xhr.open("POST", `${apiBase}/upload/location`);
          xhr.withCredentials = true;
          xhr.send(formData);
        });

        onChange(url);
        setUploadState({
          phase: "success",
          fileName: file.name,
          fileSize: formatBytes(file.size),
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : t("ui.upload.uploadUnknownError");
        setUploadState({ phase: "error", message: msg });
      }
    },
    [onChange, t]
  );

  /* ----------------------------------------------------------------
     拖拽事件处理
  ---------------------------------------------------------------- */

  const handleDragEnter = React.useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current += 1;
      if (!disabled) setIsDraggingOver(true);
    },
    [disabled]
  );

  const handleDragLeave = React.useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current === 0) setIsDraggingOver(false);
  }, []);

  const handleDragOver = React.useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = React.useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current = 0;
      setIsDraggingOver(false);

      if (disabled) return;

      const file = e.dataTransfer.files?.[0];
      if (file) uploadFile(file);
    },
    [disabled, uploadFile]
  );

  /* ----------------------------------------------------------------
     文件选择事件
  ---------------------------------------------------------------- */

  const handleFileChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) uploadFile(file);
      // 重置 input，允许重复选择同一文件
      e.target.value = "";
    },
    [uploadFile]
  );

  const handleClickDropZone = React.useCallback(() => {
    if (!disabled) fileInputRef.current?.click();
  }, [disabled]);

  /* ----------------------------------------------------------------
     删除图片
  ---------------------------------------------------------------- */

  const handleDelete = React.useCallback(() => {
    onChange("");
    setUploadState({ phase: "idle" });
    setShowUrlInput(false);
    setUrlInputValue("");
  }, [onChange]);

  /* ----------------------------------------------------------------
     URL 粘贴方式
  ---------------------------------------------------------------- */

  const handleUrlConfirm = React.useCallback(() => {
    const trimmed = urlInputValue.trim();
    if (!trimmed) return;
    onChange(trimmed);
    setUploadState({ phase: "idle" });
    setShowUrlInput(false);
    setUrlInputValue("");
  }, [urlInputValue, onChange]);

  const handleUrlKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") handleUrlConfirm();
      if (e.key === "Escape") {
        setShowUrlInput(false);
        setUrlInputValue("");
      }
    },
    [handleUrlConfirm]
  );

  /* ----------------------------------------------------------------
     派生状态
  ---------------------------------------------------------------- */

  const isUploading = uploadState.phase === "uploading";
  const hasImage = Boolean(value);

  /* ================================================================
     渲染 — 有图片模式
     ================================================================ */

  if (hasImage) {
    return (
      <div className="relative w-full overflow-hidden rounded-xl" style={{ aspectRatio: "16/9" }}>
        {/* 封面预览 */}
        <img
          src={value}
          alt={t("ui.upload.coverHint")}
          className="w-full h-full object-cover"
          draggable={false}
        />

        {/* 上传中遮罩 */}
        {isUploading && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-2"
            style={{ background: "color-mix(in oklab, black 55%, transparent)" }}
          >
            <CircularProgress progress={(uploadState as { phase: "uploading"; progress: number }).progress} />
            <span className="text-white text-sm font-medium">
              {(uploadState as { phase: "uploading"; progress: number }).progress}%
            </span>
          </div>
        )}

        {/* 上传成功提示 */}
        {uploadState.phase === "success" && (
          <div
            className="absolute bottom-0 inset-x-0 flex items-center gap-2 px-4 py-2"
            style={{ background: "color-mix(in oklab, black 45%, transparent)" }}
          >
            <Check className="h-4 w-4 text-green-400 shrink-0" />
            <span className="text-white text-xs truncate">
              {uploadState.fileName}
              <span className="ml-1 opacity-70">·{uploadState.fileSize}</span>
            </span>
          </div>
        )}

        {/* 右上角操作按钮（未上传中时显示） */}
        {!isUploading && (
          <div className="absolute top-2 right-2 flex gap-1.5">
            {/* 更换按钮 */}
            <button
              type="button"
              disabled={disabled}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium",
                "bg-card/90 backdrop-blur-sm text-foreground/80",
                "hover:bg-white hover:text-amber-700 transition-all duration-150",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "shadow-sm"
              )}
            >
              <Upload className="h-3.5 w-3.5" />
              {t("ui.upload.replaceBtn")}
            </button>

            {/* 删除按钮 */}
            <button
              type="button"
              disabled={disabled}
              onClick={handleDelete}
              aria-label={t("ui.upload.deleteCover") || "删除封面图"}
              className={cn(
                "flex items-center justify-center w-7 h-7 rounded-lg",
                "bg-card/90 backdrop-blur-sm text-muted-foreground",
                "hover:bg-red-50 hover:text-red-600 transition-all duration-150",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "shadow-sm"
              )}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* 隐藏 file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT_TYPES}
          className="sr-only"
          onChange={handleFileChange}
          disabled={disabled || isUploading}
          tabIndex={-1}
          aria-hidden="true"
        />
      </div>
    );
  }

  /* ================================================================
     渲染 — 无图片模式（拖拽上传区）
     ================================================================ */

  return (
    <div className="flex flex-col gap-2">
      {/* 拖拽区域 */}
      <div
        ref={dropZoneRef}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={t("ui.upload.uploadCoverHint") || "点击或拖拽上传封面图"}
        aria-disabled={disabled}
        onClick={handleClickDropZone}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleClickDropZone();
          }
        }}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={cn(
          "relative w-full rounded-xl cursor-pointer",
          "border-2 border-dashed transition-all duration-200",
          "flex flex-col items-center justify-center gap-3",
          "select-none outline-none",
          // 焦点环
          "focus-visible:ring-2 focus-visible:ring-amber-500/40 focus-visible:ring-offset-2",
          // 错误状态
          uploadState.phase === "error"
            ? "border-red-400 bg-red-50 dark:bg-red-950/20 dark:border-red-600"
            : isDraggingOver
            ? "border-amber-500 scale-[1.005]"
            : "border-border hover:border-amber-400 transition-colors",
          disabled && "opacity-50 cursor-not-allowed pointer-events-none"
        )}
        style={{
          aspectRatio: "16/9",
          backgroundColor: isDraggingOver
            ? "var(--primary-foreground)"
            : uploadState.phase === "error"
            ? undefined // 已由 Tailwind 处理
            : "var(--background)",
        }}
      >
        {/* 上传中：进度覆盖层 */}
        {isUploading ? (
          <div className="flex flex-col items-center gap-3">
            <CircularProgress
              progress={(uploadState as { phase: "uploading"; progress: number }).progress}
              size={64}
              strokeWidth={5}
            />
            <p className="text-sm font-medium" style={{ color: "var(--primary)" }}>
              {t("ui.upload.uploadProgressText").replace("{progress}", String((uploadState as { phase: "uploading"; progress: number }).progress))}
            </p>
          </div>
        ) : isDraggingOver ? (
          /* 拖拽悬停提示 */
          <div className="flex flex-col items-center gap-2 pointer-events-none">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-full"
              style={{ background: "color-mix(in oklab, var(--primary) 15%, transparent)" }}
            >
              <Upload className="h-6 w-6" style={{ color: "var(--primary)" }} />
            </div>
            <p className="text-sm font-semibold" style={{ color: "var(--primary)" }}>
              {t("ui.upload.dropPrompt")}
            </p>
          </div>
        ) : uploadState.phase === "error" ? (
          /* 错误状态 */
          <div className="flex flex-col items-center gap-2 px-6 text-center">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <p className="text-sm font-medium text-red-600 dark:text-red-400">{t("ui.upload.uploadFailed")}</p>
            <p className="text-xs text-destructive/80">{uploadState.message}</p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setUploadState({ phase: "idle" });
              }}
              className="mt-1 text-xs underline text-destructive hover:text-destructive/80"
            >
              {t("ui.upload.uploadRetry")}
            </button>
          </div>
        ) : (
          /* 默认空状态 */
          <div className="flex flex-col items-center gap-2 px-6 text-center pointer-events-none">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-full"
              style={{ background: "color-mix(in oklab, var(--primary) 10%, transparent)" }}
            >
              <ImageIcon className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {t("ui.upload.dropZoneText")}{" "}
                <span style={{ color: "var(--primary)" }} className="font-semibold">
                  {t("ui.upload.dropZoneHighlight")}
                </span>
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground/60">
                {t("ui.upload.formatHint").replace("{size}", "5")}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                {t('ui.upload.selectFromAlbum')}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 错误横幅（拖拽区之外展示，保证布局稳定） */}
      {uploadState.phase === "error" && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30 px-3 py-2.5">
          <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
          <p className="text-xs text-red-600 dark:text-red-400">{uploadState.message}</p>
        </div>
      )}

      {/* 粘贴 URL 备选入口 */}
      {!isUploading && (
        <div>
          {!showUrlInput ? (
            <button
              type="button"
              disabled={disabled}
              onClick={() => setShowUrlInput(true)}
              className={cn(
                "flex items-center gap-1.5 text-xs",
                "text-muted-foreground",
                "hover:text-amber-500",
                "transition-colors duration-150",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              <Link className="h-3.5 w-3.5" />
              {t("ui.upload.pasteUrlBtn")}
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                type="url"
                value={urlInputValue}
                onChange={(e) => setUrlInputValue(e.target.value)}
                onKeyDown={handleUrlKeyDown}
                placeholder="https://example.com/image.jpg"
                disabled={disabled}
                className={cn(
                  "flex-1 min-w-0 rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-foreground/80 placeholder:text-muted-foreground/50",
                  "outline-none transition-all duration-150",
                  "focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              />
              {/* 确认按钮 */}
              <button
                type="button"
                disabled={disabled || !urlInputValue.trim()}
                onClick={handleUrlConfirm}
                aria-label={t("ui.upload.confirmUrl") || "确认 URL"}
                className={cn(
                  "flex items-center justify-center h-7 w-7 rounded-lg shrink-0",
                  "bg-amber-500 text-white",
                  "hover:bg-amber-600 transition-colors duration-150",
                  "disabled:opacity-40 disabled:cursor-not-allowed"
                )}
              >
                <Check className="h-4 w-4" />
              </button>
              {/* 取消按钮 */}
              <button
                type="button"
                disabled={disabled}
                onClick={() => {
                  setShowUrlInput(false);
                  setUrlInputValue("");
                }}
                aria-label={t("common.cancel") || "取消"}
                className={cn(
                  "flex items-center justify-center h-7 w-7 rounded-lg shrink-0",
                  "border border-border text-muted-foreground",
                  "hover:border-red-300 hover:text-red-500 transition-colors duration-150",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* 隐藏 file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT_TYPES}
        className="sr-only"
        onChange={handleFileChange}
        disabled={disabled || isUploading}
        tabIndex={-1}
        aria-hidden="true"
      />
    </div>
  );
}
