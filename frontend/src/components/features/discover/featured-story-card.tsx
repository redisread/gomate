"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/hooks/useI18n";

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

interface FeaturedStoryCardProps {
  story: Story;
  onClick?: (story: Story) => void;
  className?: string;
}

/**
 * 精选故事卡片 - 杂志风格
 * 封面图在上（16:9），内容在下
 * 8px 圆角
 */
export function FeaturedStoryCard({ story, onClick, className }: FeaturedStoryCardProps) {
  const { t } = useI18n(["content"]);

  const handleClick = () => {
    onClick?.(story);
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    // 使用固定格式避免 hydration mismatch
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}月${day}日`;
  };

  return (
    <article
      onClick={handleClick}
      className={cn(
        // 基础样式：白底、细边框、轻阴影，8px 圆角
        "group cursor-pointer rounded-lg bg-white overflow-hidden",
        "border border-border/60",
        "shadow-[0_1px_3px_rgba(0,0,0,0.05)]",
        "hover:shadow-md hover:border-primary/20",
        "transition-[transform,background-color,border-color,color,opacity,box-shadow] duration-300",
        className
      )}
    >
      {/* 封面图 - 16:9 比例（spec §6.4：无封面/加载失败用 bg-secondary + 标题首字符占位） */}
      <div className="relative aspect-video overflow-hidden bg-muted">
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
                fallback.className = 'w-full h-full flex items-center justify-center bg-secondary';
                const span = document.createElement('span');
                span.className = 'text-2xl font-bold text-muted-foreground';
                span.textContent = story.title.trim().charAt(0);
                fallback.appendChild(span);
                parent.appendChild(fallback);
              }
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-secondary">
            <span className="text-2xl font-bold text-muted-foreground">{story.title.trim().charAt(0)}</span>
          </div>
        )}

        {/* Featured Badge */}
        <div className="absolute top-3 left-3 px-2 py-1 rounded bg-primary/90 text-primary-foreground text-xs font-medium">
          {t("content.discover.featured", { defaultValue: "精选" })}
        </div>
      </div>

      {/* 内容区 */}
      <div className="p-4 sm:p-5">
        {/* 标题 - 18px 加粗 */}
        <h3 title={story.title} className="text-lg font-bold text-foreground line-clamp-2 mb-3 group-hover:text-primary transition-colors">
          {story.title}
        </h3>

        {/* 摘要 - 14px，最多 3 行 */}
        <p className="text-sm text-muted-foreground line-clamp-3 mb-4 leading-relaxed">
          {story.summary}
        </p>

        {/* Meta 信息 */}
        <div className="flex items-center gap-2 pt-4 border-t border-border/40 min-w-0">
          {/* 作者头像 */}
          {story.author?.image ? (
            <img
              src={story.author.image}
              alt={story.author.name}
              className="w-6 h-6 rounded-full object-cover"
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
              {story.author?.name?.charAt(0) || "?"}
            </div>
          )}
          <span title={story.author?.name || t("content.discover.anonymous")} className="text-sm text-muted-foreground truncate">
            {story.author?.name || t("content.discover.anonymous")}
          </span>
          <span className="text-muted-foreground/40">·</span>
          <span className="text-sm text-muted-foreground shrink-0" suppressHydrationWarning>{formatDate(story.createdAt)}</span>
          {story.location && (
            <span title={story.location.name} className="ml-auto text-xs text-primary/80 bg-primary/5 px-2 py-0.5 rounded truncate max-w-[40%]">
              {story.location.name}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
