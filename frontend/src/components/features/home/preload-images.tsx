"use client";

import { useEffect } from "react";

interface PreloadImageProps {
  images: string[];
}

/**
 * 预加载首屏图片
 * 在页面加载前提前请求关键图片资源
 */
export function PreloadImages({ images }: PreloadImageProps) {
  useEffect(() => {
    // 使用 Image 对象预加载图片
    images.forEach((src) => {
      if (src) {
        const img = new Image();
        img.fetchPriority = "high";
        img.src = src;
      }
    });
  }, [images]);

  return null;
}
