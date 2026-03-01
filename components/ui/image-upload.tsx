"use client";

import * as React from "react";
import { Upload, X, Loader2, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  /** 当前图片 URL */
  value?: string;
  /** 图片变更回调 */
  onChange: (url: string) => void;
  /** 上传 API 端点 */
  uploadEndpoint: string;
  /** 接受的文件类型 */
  accept?: string;
  /** 最大文件大小 (MB) */
  maxSize?: number;
  /** 预览区域样式 */
  previewClassName?: string;
  /** 是否禁用 */
  disabled?: boolean;
  /** 提示文字 */
  hint?: string;
}

export function ImageUpload({
  value,
  onChange,
  uploadEndpoint,
  accept = "image/jpeg,image/png,image/gif,image/webp",
  maxSize = 10,
  previewClassName = "w-full h-40",
  disabled = false,
  hint = "点击上传图片",
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [localPreview, setLocalPreview] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // 处理点击上传区域
  const handleClick = () => {
    if (disabled || isUploading) return;
    fileInputRef.current?.click();
  };

  // 处理文件选择
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    // 验证文件类型
    const allowedTypes = accept.split(",");
    if (!allowedTypes.includes(file.type)) {
      setError("不支持的文件格式");
      return;
    }

    // 验证文件大小
    const maxBytes = maxSize * 1024 * 1024;
    if (file.size > maxBytes) {
      setError(`文件太大，最大 ${maxSize}MB`);
      return;
    }

    // 创建本地预览
    const reader = new FileReader();
    reader.onloadend = () => {
      setLocalPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // 上传文件
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(uploadEndpoint, {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "上传失败");
      }

      onChange(result.url);
      setLocalPreview(null);
    } catch (err) {
      setError((err as Error).message);
      setLocalPreview(null);
    } finally {
      setIsUploading(false);
      // 清空 input 以便可以重新选择相同文件
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // 清除图片
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    setLocalPreview(null);
    setError(null);
  };

  // 显示的预览图
  const displayImage = localPreview || value;

  return (
    <div className="space-y-2">
      <div
        onClick={handleClick}
        className={cn(
          "relative border-2 border-dashed rounded-lg cursor-pointer transition-all overflow-hidden group",
          previewClassName,
          disabled || isUploading
            ? "border-stone-200 bg-stone-50 cursor-not-allowed opacity-60"
            : "border-stone-300 hover:border-stone-400 hover:bg-stone-50",
          error && "border-red-300 bg-red-50"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileChange}
          disabled={disabled || isUploading}
          className="hidden"
        />

        {displayImage ? (
          // 显示预览图
          <>
            <img
              src={displayImage}
              alt="预览"
              className="w-full h-full object-cover"
            />
            {/* 遮罩层 */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              {isUploading ? (
                <Loader2 className="h-8 w-8 text-white animate-spin" />
              ) : (
                <Upload className="h-8 w-8 text-white" />
              )}
            </div>
            {/* 清除按钮 */}
            {!disabled && !isUploading && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute top-2 right-2 h-6 w-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </>
        ) : (
          // 空状态
          <div className="w-full h-full flex flex-col items-center justify-center text-stone-400">
            {isUploading ? (
              <>
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="mt-2 text-sm">上传中...</span>
              </>
            ) : (
              <>
                <ImageIcon className="h-8 w-8" />
                <span className="mt-2 text-sm">{hint}</span>
                <span className="mt-1 text-xs text-stone-400">
                  最大 {maxSize}MB
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {/* 错误提示 */}
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}