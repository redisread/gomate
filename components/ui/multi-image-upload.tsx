"use client";

import * as React from "react";
import { Upload, X, Loader2, ImageIcon, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { copy } from "@/lib/copy";

interface MultiImageUploadProps {
  /** 当前图片 URL 数组 */
  value: string[];
  /** 图片变更回调 */
  onChange: (urls: string[]) => void;
  /** 上传 API 端点 */
  uploadEndpoint: string;
  /** 最大图片数量 */
  maxImages?: number;
  /** 单张最大文件大小 (MB) */
  maxSize?: number;
  /** 是否禁用 */
  disabled?: boolean;
}

export function MultiImageUpload({
  value = [],
  onChange,
  uploadEndpoint,
  maxImages = 9,
  maxSize = 10,
  disabled = false,
}: MultiImageUploadProps) {
  const [uploadingIndex, setUploadingIndex] = React.useState<number | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // 处理文件选择
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setError(null);

    // 检查数量限制
    if (value.length + files.length > maxImages) {
      setError(copy.ui.upload.maxImagesReached.replace("{max}", String(maxImages)));
      return;
    }

    // 逐个上传文件
    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // 验证文件类型
      const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
      if (!allowedTypes.includes(file.type)) {
        setError(copy.ui.upload.supportedFormats);
        continue;
      }

      // 验证文件大小
      const maxBytes = maxSize * 1024 * 1024;
      if (file.size > maxBytes) {
        setError(copy.ui.upload.fileSizeExceeded.replace("{name}", file.name).replace("{size}", String(maxSize)));
        continue;
      }

      // 上传文件
      setUploadingIndex(value.length + i);
      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch(uploadEndpoint, {
          method: "POST",
          body: formData,
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || copy.ui.upload.uploadFailed);
        }

        // 添加新图片 URL
        onChange([...value, result.url]);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setUploadingIndex(null);
      }
    }

    // 清空 input 以便可以重新选择相同文件
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // 删除图片
  const handleRemove = (index: number) => {
    const newValue = [...value];
    newValue.splice(index, 1);
    onChange(newValue);
  };

  // 拖拽排序相关
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newValue = [...value];
    const [draggedItem] = newValue.splice(draggedIndex, 1);
    newValue.splice(index, 0, draggedItem);
    onChange(newValue);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const canAddMore = value.length < maxImages;

  return (
    <div className="space-y-3">
      {/* 图片网格 */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {/* 已上传的图片 */}
        {value.map((url, index) => (
          <div
            key={url}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            className={cn(
              "relative aspect-square rounded-lg overflow-hidden border-2 group cursor-move",
              draggedIndex === index
                ? "border-stone-400 opacity-50"
                : "border-stone-200 hover:border-stone-300"
            )}
          >
            <img
              src={url}
              alt={copy.ui.upload.imageAlt.replace("{index}", String(index + 1))}
              className="w-full h-full object-cover"
            />
            {/* 拖拽手柄 */}
            <div className="absolute top-1 left-1 p-1 bg-black/50 rounded opacity-0 group-hover:opacity-100 transition-opacity">
              <GripVertical className="h-3 w-3 text-white" />
            </div>
            {/* 删除按钮 */}
            <button
              type="button"
              onClick={() => handleRemove(index)}
              className="absolute top-1 right-1 h-5 w-5 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
            >
              <X className="h-3 w-3" />
            </button>
            {/* 序号 */}
            <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/50 rounded text-xs text-white">
              {index + 1}
            </div>
          </div>
        ))}

        {/* 上传中的占位符 */}
        {uploadingIndex !== null && (
          <div className="aspect-square rounded-lg border-2 border-dashed border-stone-300 flex items-center justify-center bg-stone-50">
            <Loader2 className="h-6 w-6 animate-spin text-stone-400" />
          </div>
        )}

        {/* 上传按钮 */}
        {canAddMore && uploadingIndex === null && (
          <label
            className={cn(
              "aspect-square rounded-lg border-2 border-dashed cursor-pointer transition-all flex flex-col items-center justify-center",
              disabled
                ? "border-stone-200 bg-stone-50 cursor-not-allowed opacity-60"
                : "border-stone-300 hover:border-stone-400 hover:bg-stone-50"
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleFileChange}
              disabled={disabled}
              multiple
              className="hidden"
            />
            <Upload className="h-5 w-5 text-stone-400" />
            <span className="mt-1 text-xs text-stone-400">{copy.ui.upload.addImage}</span>
          </label>
        )}
      </div>

      {/* 提示信息 */}
      <div className="flex items-center justify-between text-xs text-stone-500">
        <span>
          {copy.ui.upload.uploadedCount.replace("{current}", String(value.length)).replace("{max}", String(maxImages))}
        </span>
        <span>
          {copy.ui.upload.dragToSort.replace("{size}", String(maxSize))}
        </span>
      </div>

      {/* 错误提示 */}
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}