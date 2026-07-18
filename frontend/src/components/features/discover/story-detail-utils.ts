import { Clock, type LucideIcon } from "lucide-react";
import type { Story, TFunction } from "./story-detail-types";

export interface StoryMetric {
  icon: LucideIcon;
  label: string;
  value: string;
}

// spec v1.1 §3.3：byline 只保留「作者 · 日期 · 阅读时长」，
// 浏览量/点赞数下移到文章底部操作区（见 StoryActions）
export function getStoryMetrics(story: Story, locale: string, t: TFunction): StoryMetric[] {
  const publishedDate = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(story.createdAt));
  const characterCount = story.content?.length || 0;
  const readMinutes = Math.max(1, Math.ceil(characterCount / 400));

  return [
    {
      icon: Clock,
      label: t("content.discover.publishedDate"),
      value: publishedDate,
    },
    {
      icon: Clock,
      label: t("content.discover.readingTime"),
      value: t("content.discover.readTime", { minutes: readMinutes }),
    },
  ];
}

export function getViewCountText(story: Story, locale: string, t: TFunction): string {
  const numberFormatter = new Intl.NumberFormat(locale);
  return t("content.discover.viewCount", {
    count: numberFormatter.format(story.viewCount),
  });
}
