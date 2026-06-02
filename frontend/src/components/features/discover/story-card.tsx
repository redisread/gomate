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

interface StoryCardProps {
  story: Story;
  onClick?: (story: Story) => void;
  className?: string;
}

/**
 * 故事卡片组件 - 横排布局（保持可扫读）
 * 桌面：左侧图片 120×80，右侧内容
 * 移动：图片置顶，避免窄屏文本挤压
 * 8px 圆角，细边框，轻阴影
 */
export function StoryCard({ story, onClick, className }: StoryCardProps) {
  const { t } = useI18n(["content"]);

  const handleClick = () => {
    onClick?.(story);
  };

  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return t("content.discover.today");
    if (diffDays === 1) return t("content.discover.yesterday");
    if (diffDays < 7) return t("content.discover.daysAgo", { days: diffDays });
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
        "flex flex-col sm:flex-row gap-3 sm:gap-4 p-3 sm:p-4 bg-white cursor-pointer rounded-lg overflow-hidden",
        "border border-border/60",
        "shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
        // Hover：微边框色 + 微上移
        "hover:border-primary/30 hover:-translate-y-[1px]",
        "transition-all duration-300",
        className
      )}
    >
      {/* 封面图 - 移动端 4:3，桌面端 120x80 横版 */}
      <div className="flex-shrink-0 w-full aspect-[4/3] sm:w-[140px] sm:h-[100px] sm:aspect-auto rounded-lg overflow-hidden bg-muted">
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
                fallback.className = 'w-full h-full flex items-center justify-center bg-gradient-to-br from-muted/50 to-muted';
                fallback.innerHTML = '<span class="text-xl">🏔️</span>';
                parent.appendChild(fallback);
              }
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-50/50 to-stone-100">
            <span className="text-xl">🏔️</span>
          </div>
        )}
      </div>

      {/* 右侧内容 */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* 标题 - 16px 加粗，1-2 行 */}
        <h3 className="text-base font-semibold text-foreground line-clamp-2 mb-1 group-hover:text-primary transition-colors">
          {story.title}
        </h3>

        {/* 摘要 - 最多 3 行 */}
        <p className="text-sm text-muted-foreground line-clamp-3 mb-auto leading-relaxed">
          {story.summary}
        </p>

        {/* Meta 行：作者 + 日期 + 阅读时间，移动端隐藏地点 */}
        <div className="flex items-center gap-2 mt-3 sm:mt-2 text-xs text-muted-foreground flex-wrap">
          {/* 作者头像 */}
          {story.author?.image ? (
            <img
              src={story.author.image}
              alt={story.author.name}
              className="w-5 h-5 rounded-full object-cover"
            />
          ) : (
            <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
              {story.author?.name?.charAt(0) || "?"}
            </div>
          )}

          {/* 作者名 */}
          <span className="truncate max-w-[120px]">
            {story.author?.name || t("content.discover.anonymous")}
          </span>

          <span className="text-muted-foreground/40">·</span>

          {/* 日期 */}
          <span className="shrink-0" suppressHydrationWarning>{formatDate(story.createdAt)}</span>

          <span className="text-muted-foreground/40">·</span>

          {/* 阅读时间 */}
          <span className="shrink-0">{Math.ceil(story.summary.length / 300)} 分钟</span>

          {/* 地点标签 - 桌面端显示 */}
          {story.location && (
            <span className="hidden sm:inline-flex ml-auto text-xs text-primary bg-primary/8 px-2 py-0.5 rounded-full">
              {story.location.name}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
