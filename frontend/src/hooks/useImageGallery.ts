/**
 * 图片画廊 hook
 * 管理图片切换、Lightbox、视差滚动
 */

import { useState, useEffect, useRef, useCallback } from "react";

interface UseImageGalleryOptions {
  images: string[];
}

interface UseImageGalleryReturn {
  activeIndex: number;
  visible: boolean;
  showArrows: boolean;
  lightboxIndex: number | null;
  parallaxOffset: number;
  heroRef: React.RefObject<HTMLDivElement | null>;
  switchImage: (index: number) => void;
  prevImage: () => void;
  nextImage: () => void;
  openLightbox: (index: number) => void;
  closeLightbox: () => void;
  setShowArrows: (show: boolean) => void;
}

export function useImageGallery({ images }: UseImageGalleryOptions): UseImageGalleryReturn {
  const [activeIndex, setActiveIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const [showArrows, setShowArrows] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [parallaxOffset, setParallaxOffset] = useState(0);
  const heroRef = useRef<HTMLDivElement>(null);

  // 视差滚动
  useEffect(() => {
    const handleScroll = () => {
      if (!heroRef.current) return;
      const scrollY = window.scrollY;
      const heroBottom = heroRef.current.getBoundingClientRect().bottom + scrollY;
      if (scrollY < heroBottom) {
        setParallaxOffset(scrollY * 0.28);
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // 图片切换（淡入淡出）
  const switchImage = useCallback((index: number) => {
    if (index === activeIndex) return;
    setVisible(false);
    setTimeout(() => {
      setActiveIndex(index);
      setVisible(true);
    }, 180);
  }, [activeIndex]);

  const prevImage = useCallback(() => {
    switchImage((activeIndex - 1 + images.length) % images.length);
  }, [activeIndex, images.length, switchImage]);

  const nextImage = useCallback(() => {
    switchImage((activeIndex + 1) % images.length);
  }, [activeIndex, images.length, switchImage]);

  const openLightbox = useCallback((index: number) => {
    setLightboxIndex(index);
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxIndex(null);
  }, []);

  return {
    activeIndex,
    visible,
    showArrows,
    lightboxIndex,
    parallaxOffset,
    heroRef,
    switchImage,
    prevImage,
    nextImage,
    openLightbox,
    closeLightbox,
    setShowArrows,
  };
}
