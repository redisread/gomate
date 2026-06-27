"use client";

import * as React from "react";
import { ArrowLeft, Heart, Share2, Eye, MapPin, Quote, Clock, FileText, ArrowRight } from "lucide-react";
import { apiGet, apiPost } from "@/lib/api";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useI18n } from "@/hooks/useI18n";
import { MarkdownContent } from "./markdown-content";

interface Story {
  id: string;
  title: string;
  summary: string;
  content: string;
  coverImage?: string;
  viewCount: number;
  likeCount: number;
  createdAt: number;
  updatedAt: number;
  status: string;
  author: {
    id: string;
    name: string;
    image?: string;
  } | null;
  location: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

interface StoryDetailResponse {
  success: boolean;
  data: Story;
}

interface StoryDetailProps {
  storyId: string;
}

const contentSkeletonWidths = ["92%", "78%", "88%", "64%", "84%", "72%"];

export function StoryDetail({ storyId }: StoryDetailProps) {
  const { t } = useI18n(["content"]);
  const [story, setStory] = React.useState<Story | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isLiking, setIsLiking] = React.useState(false);
  const [liked, setLiked] = React.useState(false);

  const loadStory = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await apiGet<StoryDetailResponse>(`/stories/${storyId}`);

      if (response.success && response.data) {
        setStory(response.data);
      } else {
        setError(t("content.discover.storyNotFound"));
      }
    } catch (err) {
      setError(t("content.discover.loadStoryError"));
      console.error("Load story error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [storyId, t]);

  React.useEffect(() => {
    loadStory();
  }, [loadStory]);

  const handleLike = async () => {
    if (isLiking || liked) return;

    try {
      setIsLiking(true);
      const response = await apiPost<{ success: boolean; message: string }>(
        `/stories/${storyId}/like`
      );

      if (response.success) {
        setLiked(true);
        setStory((prev) =>
          prev ? { ...prev, likeCount: prev.likeCount + 1 } : prev
        );
      }
    } catch (err) {
      console.error("Like story error:", err);
    } finally {
      setIsLiking(false);
    }
  };

  const handleShare = async () => {
    if (navigator.share && story) {
      try {
        await navigator.share({
          title: story.title,
          text: story.summary,
          url: window.location.href,
        });
      } catch {
        // User cancelled share
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(window.location.href);
        alert(t("content.discover.linkCopied"));
      } catch {
        // Copy failed
      }
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    // 使用固定格式避免 hydration mismatch
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${year}年${month}月${day}日`;
  };

  // Loading state - Enhanced skeleton screen
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header skeleton */}
        <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-md border-b border-border/50 shadow-sm">
          <div className="max-w-4xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="h-9 w-24 bg-muted rounded-xl animate-pulse" />
              <div className="h-9 w-20 bg-muted rounded-xl animate-pulse" />
            </div>
          </div>
        </header>

        {/* Content skeleton */}
        <main className="max-w-4xl mx-auto px-6 py-12">
          {/* Cover image skeleton */}
          <div className="relative h-[60vh] min-h-[400px] bg-muted rounded-2xl mb-12 animate-pulse" />

          {/* Summary skeleton */}
          <div className="mb-12 p-6 bg-accent/30 rounded-2xl">
            <div className="h-6 w-3/4 bg-muted rounded animate-pulse mb-3" />
            <div className="h-6 w-1/2 bg-muted rounded animate-pulse" />
          </div>

          {/* Stats skeleton */}
          <div className="flex items-center gap-6 mb-12 pb-8 border-b border-border">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-5 w-20 bg-muted rounded animate-pulse" />
            ))}
          </div>

          {/* Content skeleton */}
          <div className="space-y-4">
            {contentSkeletonWidths.map((width) => (
              <div key={width} className="h-4 bg-muted rounded animate-pulse" style={{ width }} />
            ))}
          </div>
        </main>
      </div>
    );
  }

  // Error state - Enhanced style
  if (error || !story) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center px-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-destructive/10 mb-6">
            <FileText className="h-10 w-10 text-destructive" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-3">
            {error || t("content.discover.storyNotFound")}
          </h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            抱歉，我们无法找到这个故事。它可能已被删除或不存在。
          </p>
          <button
            onClick={() => window.location.href = "/discover"}
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-all duration-200 hover:scale-105"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("content.discover.backToDiscover")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header - Enhanced with glass morphism */}
      <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-md border-b border-border/50 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Back button - Enhanced style */}
            <button
              onClick={() => window.location.href = "/discover"}
              className="group flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground bg-accent/50 hover:bg-accent rounded-xl transition-all duration-200"
            >
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
              {t("content.discover.back")}
            </button>

            {/* Action buttons - Enhanced style */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleShare}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground bg-accent/50 hover:bg-accent rounded-xl transition-all duration-200"
              >
                <Share2 className="h-4 w-4" />
                <span className="hidden sm:inline">{t("content.discover.share")}</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Cover Image - Magazine Style */}
      {story.coverImage && (
        <div className="relative h-[60vh] min-h-[400px] overflow-hidden">
          <img
            src={story.coverImage}
            alt={story.title}
            className="w-full h-full object-cover"
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

          {/* Title and author overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-8 sm:p-12">
            <div className="max-w-4xl mx-auto">
              {/* Category tag */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/90 text-white text-xs font-semibold mb-4">
                <MapPin className="h-3 w-3" />
                {story.location?.name || "户外故事"}
              </div>

              {/* Title */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight drop-shadow-lg">
                {story.title}
              </h1>

              {/* Author info */}
              <div className="flex items-center gap-3">
                <Avatar
                  src={story.author?.image}
                  name={story.author?.name || t("content.discover.anonymous")}
                  size="md"
                  className="border-2 border-white/30"
                />
                <div className="text-white">
                  <p className="font-medium">{story.author?.name || t("content.discover.anonymous")}</p>
                  <p className="text-sm text-white/70" suppressHydrationWarning>
                    {formatDate(story.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content Area - Enhanced typography */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Summary - Enhanced style with quote icon */}
        {story.summary && (
          <div className="mb-12 p-6 bg-gradient-to-br from-accent/60 to-accent/30 rounded-2xl border-l-4 border-primary">
            <div className="flex items-start gap-3">
              <Quote className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
              <p className="text-foreground/90 text-lg leading-relaxed font-medium">
                {story.summary}
              </p>
            </div>
          </div>
        )}

        {/* Stats - Enhanced layout */}
        <div className="flex flex-wrap items-center gap-6 mb-12 pb-8 border-b border-border">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Eye className="h-4 w-4" />
            <span className="font-medium">{story.viewCount}</span>
            <span>浏览</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Heart className="h-4 w-4" />
            <span className="font-medium">{story.likeCount}</span>
            <span>点赞</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span className="font-medium">{Math.ceil((story.content?.length || 0) / 400)}</span>
            <span>分钟阅读</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="h-4 w-4" />
            <span className="font-medium">{story.content?.length?.toLocaleString() || 0}</span>
            <span>字</span>
          </div>
        </div>

        {/* Location Card - Enhanced style */}
        {story.location && (
          <div className="mb-12 p-5 bg-accent/30 rounded-xl border border-border hover:border-primary/50 transition-colors">
            <a href={`/locations/${story.location.slug}`} className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <MapPin className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">相关地点</p>
                <p className="font-semibold text-foreground hover:text-primary transition-colors">
                  {story.location.name}
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground ml-auto" />
            </a>
          </div>
        )}

        {/* Article Content - Enhanced typography */}
        <article
          aria-label="故事正文"
          className="story-prose prose mx-auto w-full prose-a:text-primary hover:prose-a:underline prose-code:before:content-none prose-code:after:content-none"
        >
          <MarkdownContent content={story.content} headingOffset={1} />
        </article>

        {/* Actions - Enhanced style */}
        <div className="mt-16 pt-8 border-t border-border">
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={handleLike}
              disabled={isLiking || liked}
              className={cn(
                "group flex items-center gap-2 px-8 py-4 rounded-2xl font-semibold transition-all duration-300",
                liked
                  ? "bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/30"
                  : "border-2 border-border bg-background hover:border-primary hover:text-primary"
              )}
            >
              <Heart className={cn("h-5 w-5 transition-transform group-hover:scale-110", liked && "fill-current")} />
              {liked ? t("content.discover.liked") : t("content.discover.like")}
              {story.likeCount > 0 && ` (${story.likeCount})`}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
