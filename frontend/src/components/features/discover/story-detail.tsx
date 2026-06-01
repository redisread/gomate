"use client";

import * as React from "react";
import { ArrowLeft, Heart, Share2, Eye, Loader2, MapPin } from "lucide-react";
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

export function StoryDetail({ storyId }: StoryDetailProps) {
  const { t } = useI18n(["content"]);
  const [story, setStory] = React.useState<Story | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isLiking, setIsLiking] = React.useState(false);
  const [liked, setLiked] = React.useState(false);

  React.useEffect(() => {
    loadStory();
  }, [storyId]);

  const loadStory = async () => {
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
  };

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
    return date.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">{t("content.discover.loading")}</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !story) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">{error || t("content.discover.storyNotFound")}</p>
          <button
            onClick={() => window.location.href = "/discover"}
            className="px-4 py-2 rounded-lg border border-border bg-background hover:bg-accent transition-colors"
          >
            {t("content.discover.backToDiscover")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-16 z-30 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => window.location.href = "/discover"}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("content.discover.back")}
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={handleShare}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
              >
                <Share2 className="h-4 w-4" />
                {t("content.discover.share")}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 py-6">
        {/* Cover Image */}
        {story.coverImage && (
          <div className="mb-6 rounded-lg overflow-hidden">
            <img
              src={story.coverImage}
              alt={story.title}
              className="w-full h-auto max-h-[400px] object-cover"
            />
          </div>
        )}

        {/* Title */}
        <h1 className="text-2xl font-bold text-foreground mb-4">
          {story.title}
        </h1>

        {/* Author & Meta */}
        <div className="flex items-center justify-between py-4 border-b border-border mb-6">
          <div className="flex items-center gap-3">
            <Avatar
              src={story.author?.image}
              name={story.author?.name || t("content.discover.anonymous")}
              size="md"
            />
            <div>
              <p className="font-medium text-foreground">
                {story.author?.name || t("content.discover.anonymous")}
              </p>
              <p className="text-sm text-muted-foreground">
                {formatDate(story.createdAt)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              {story.viewCount}
            </span>
            <span className="flex items-center gap-1">
              <Heart className="h-4 w-4" />
              {story.likeCount}
            </span>
          </div>
        </div>

        {/* Summary */}
        {story.summary && (
          <div className="mb-6 p-4 bg-accent/50 rounded-lg">
            <p className="text-muted-foreground italic">{story.summary}</p>
          </div>
        )}

        {/* Location */}
        {story.location && (
          <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>{t("content.discover.relatedLocation")}</span>
            <a
              href={`/locations/${story.location.slug}`}
              className="text-primary hover:underline"
            >
              {story.location.name}
            </a>
          </div>
        )}

        {/* Content */}
        <article className="max-w-none">
          <MarkdownContent content={story.content} />
        </article>

        {/* Actions */}
        <div className="mt-10 pt-6 border-t border-border flex items-center justify-center gap-4">
          <button
            onClick={handleLike}
            disabled={isLiking || liked}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors min-w-[140px]",
              liked
                ? "bg-red-500 text-white hover:bg-red-600"
                : "border border-border bg-background hover:bg-accent"
            )}
          >
            <Heart className={cn("h-5 w-5", liked && "fill-current")} />
            {liked ? t("content.discover.liked") : t("content.discover.like")}
            {story.likeCount > 0 && ` (${story.likeCount})`}
          </button>
        </div>
      </main>
    </div>
  );
}
