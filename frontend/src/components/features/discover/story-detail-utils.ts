import { Clock, Eye, FileText, Heart, type LucideIcon } from "lucide-react";
import type { Story, TFunction } from "./story-detail-types";

export interface StoryMetric {
  icon: LucideIcon;
  label: string;
  value: string;
}

export function getStoryMetrics(story: Story, locale: string, t: TFunction): StoryMetric[] {
  const numberFormatter = new Intl.NumberFormat(locale);
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
      icon: Eye,
      label: t("content.discover.views"),
      value: t("content.discover.viewCount", {
        count: numberFormatter.format(story.viewCount),
      }),
    },
    {
      icon: Heart,
      label: t("content.discover.likes"),
      value: t("content.discover.likeCount", {
        count: numberFormatter.format(story.likeCount),
      }),
    },
    {
      icon: Clock,
      label: t("content.discover.readingTime"),
      value: t("content.discover.readTime", { minutes: readMinutes }),
    },
    {
      icon: FileText,
      label: t("content.discover.characters"),
      value: t("content.discover.characterCount", {
        count: numberFormatter.format(characterCount),
      }),
    },
  ];
}
