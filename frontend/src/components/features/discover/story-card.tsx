"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/hooks/useI18n";
import { Heart, Eye, Clock } from "lucide-react";

interface StoryAuthor {
  id: string;
  name: string;
  image?: string;
}

interface StoryLocation {
  id: string;
  name: string;
  slug: string;
}

interface Story {
  id: string;
  title: string;
  summary: string;
  coverImage?: string;
  viewCount: number;
  likeCount: number;
  createdAt: number;
  author: StoryAuthor | null;
  location?: StoryLocation | null;
}

interface StoryCardProps {
  story: Story;
  onClick?: (story: Story) => void;
  className?: string;
}

/**
 * 故事卡片组件 - 瀑布流布局（垂直卡片）
 * - 封面图（可变高度）
 * - 标题 + 摘要
 * - 作者 + 互动数据
 */
export function StoryCard({ story, onClick, className }: StoryCardProps) {
  const { t } = useI18n(["content"]);

  const handleClick = () => {
    onClick?.(story);
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return t("content.discover.today");
    if (diffDays === 1) return t("content.discover.yesterday");
    if (diffDays < 7) return t("content.discover.daysAgo", { days: diffDays });
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}月${day}日`;
  };

  const formatCount = (count: number) => {
    if (count >= 10000) return `${(count / 10000).toFixed(1)}w`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
    return count.toString();
  };

  return (
    <article
      onClick={handleClick}
      className={cn(
        "bg-white cursor-pointer rounded-lg overflow-hidden",
        "border border-border/60",
        "shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
        "hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:-translate-y-[2px]",
        "transition-all duration-300",
        "break-inside-avoid mb-4",
        className
      )}
    >
      {/* 封面图 */}
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {story.coverImage ? (
          <img
            src={story.coverImage}
            alt={story.title}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const parent = target.parentElement;
              if (parent) {
                const fallback = document.createElement('div');
                fallback.className = 'w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-50 to-stone-100';
                const span = document.createElement('span');
                span.className = 'text-3xl';
                span.textContent = '🏔️';
                fallback.appendChild(span);
                parent.appendChild(fallback);
              }
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-50 to-stone-100">
            <span className="text-3xl">🏔️</span>
          </div>
        )}
        {/* 地点标签 */}
        {story.location && (
          <span className="absolute bottom-2 left-2 text-xs text-white bg-black/50 backdrop-blur-sm px-2 py-0.5 rounded-full">
            {story.location.name}
          </span>
        )}
      </div>

      {/* 内容区域 */}
      <div className="p-3 space-y-2">
        {/* 标题 */}
        <h3 className="text-sm font-semibold text-foreground line-clamp-2 leading-snug">
          {story.title}
        </h3>

        {/* 摘要 */}
        <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
          {story.summary}
        </p>

        {/* 作者 + 数据 */}
        <div className="flex items-center justify-between pt-1">
          {/* 作者 */}
          <div className="flex items-center gap-1.5">
            {story.author?.image ? (
              <img
                src={story.author.image}
                alt={story.author.name}
                className="w-5 h-5 rounded-full object-cover"
              />
            ) : (
              <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-medium text-primary">
                {story.author?.name?.charAt(0) || "?"}
              </div>
            )}
            <span className="text-xs text-muted-foreground truncate max-w-[80px]">
              {story.author?.name || t("content.discover.anonymous")}
            </span>
          </div>

          {/* 互动数据 */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
            <span className="flex items-center gap-0.5">
              <Eye className="w-3 h-3" />
              {formatCount(story.viewCount)}
            </span>
            <span className="flex items-center gap-0.5">
              <Heart className="w-3 h-3" />
              {formatCount(story.likeCount)}
            </span>
          </div>
        </div>

        {/* 日期 */}
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground/50">
          <Clock className="w-3 h-3" />
          <span suppressHydrationWarning>{formatDate(story.createdAt)}</span>
        </div>
      </div>
    </article>
  );
}
