"use client";

import * as React from "react";
import { ArrowLeft, FileText } from "lucide-react";
import { apiDelete, apiGet, apiPost, fetchCurrentUser } from "@/lib/api";
import type { SessionUser } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useI18n } from "@/hooks/useI18n";
import { useToast } from "@/hooks/useToast";
import { MarkdownContent } from "./markdown-content";
import { StoryDetailSkeleton } from "./story-detail-skeleton";
import { StoryToast } from "./story-detail-toast";
import { ShareStorySheet } from "./share-story-sheet";
import type { Story, StoryDetailProps, StoryDetailResponse } from "./story-detail-types";
import {
  CONTENT_WIDTH,
  RelatedLocationLink,
  SHELL_WIDTH,
  StoryActions,
  StoryByline,
  StoryDeleteButton,
  StoryDeleteDialog,
  StoryDetailError,
  StoryEyebrow,
} from "./story-detail-ui";
import { getStoryMetrics, getViewCountText } from "./story-detail-utils";

export function StoryDetail({ storyId }: StoryDetailProps) {
  const { t, locale } = useI18n(["content", "common"]);
  const { toast, show: showToast, isExiting } = useToast();
  const [story, setStory] = React.useState<Story | null>(null);
  const [currentUser, setCurrentUser] = React.useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isLiking, setIsLiking] = React.useState(false);
  const [liked, setLiked] = React.useState(false);

  // 从 API 响应初始化点赞状态（仅在故事数据首次加载时同步）
  const storyIdRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (story && story.id !== storyIdRef.current) {
      storyIdRef.current = story.id;
      setLiked(story.isLiked ?? false);
    }
  }, [story]);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState("");
  const [showShareSheet, setShowShareSheet] = React.useState(false);

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

  React.useEffect(() => {
    let cancelled = false;

    fetchCurrentUser()
      .then((user) => {
        if (!cancelled) setCurrentUser(user);
      })
      .catch(() => {
        if (!cancelled) setCurrentUser(null);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const canDelete = Boolean(
    story && currentUser && (story.author?.id === currentUser.id || currentUser.role === "admin"),
  );

  const copyCurrentUrl = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast({ type: "success", message: t("content.discover.linkCopied") });
    } catch {
      showToast({ type: "error", message: t("content.discover.shareFailed") });
    }
  }, [showToast, t]);

  const handleLike = React.useCallback(async () => {
    if (isLiking) return;

    // 未登录用户引导登录，避免无意义的 API 请求
    if (!currentUser) {
      window.location.href = "/login";
      return;
    }

    // 乐观更新：先翻转本地状态
    const prevLiked = liked;
    const prevLikeCount = story?.likeCount ?? 0;
    const nextLiked = !liked;
    setLiked(nextLiked);
    setStory((prev) =>
      prev
        ? { ...prev, isLiked: nextLiked, likeCount: prev.likeCount + (liked ? -1 : 1) }
        : prev,
    );

    try {
      setIsLiking(true);
      const response = await apiPost<{
        success: boolean;
        liked: boolean;
        likeCount: number;
        message: string;
      }>(`/stories/${storyId}/like`);

      if (response.success) {
        // 以服务器返回值为准，修正乐观计算的偏差
        setLiked(response.liked);
        setStory((prev) =>
          prev ? { ...prev, isLiked: response.liked, likeCount: response.likeCount } : prev,
        );
        showToast({
          type: "success",
          message: response.liked ? t("content.discover.liked") : t("content.discover.unliked"),
        });
      } else {
        // API 返回失败 → 回滚本地状态
        setLiked(prevLiked);
        setStory((prev) =>
          prev ? { ...prev, isLiked: prevLiked, likeCount: prevLikeCount } : prev,
        );
        showToast({ type: "error", message: t("content.discover.likeFailed") });
      }
    } catch (err) {
      // 网络异常 → 回滚本地状态
      setLiked(prevLiked);
      setStory((prev) =>
        prev ? { ...prev, isLiked: prevLiked, likeCount: prevLikeCount } : prev,
      );
      showToast({ type: "error", message: t("content.discover.likeFailed") });
      console.error("Like story error:", err);
    } finally {
      setIsLiking(false);
    }
  }, [isLiking, liked, story, currentUser, showToast, storyId, t]);

  const handleDelete = React.useCallback(async () => {
    if (!canDelete || isDeleting) return;

    try {
      setIsDeleting(true);
      setDeleteError("");
      await apiDelete<{ success: boolean; message?: string }>(`/stories/${storyId}`);
      window.location.href = "/discover";
    } catch (err) {
      console.error("Delete story error:", err);
      setDeleteError(t("content.discover.deleteFailed"));
      setIsDeleting(false);
    }
  }, [canDelete, isDeleting, storyId, t]);

  if (isLoading) {
    return <StoryDetailSkeleton t={t} />;
  }

  if (error || !story) {
    return (
      <>
        <StoryDetailError message={error || t("content.discover.storyNotFound")} t={t} />
        <StoryToast toast={toast} exiting={isExiting} />
      </>
    );
  }

  const metrics = getStoryMetrics(story, locale, t);

  return (
    <div className="min-h-screen bg-background pb-16 pt-20 sm:pt-24">
      <StoryToast toast={toast} exiting={isExiting} />

      <div className={SHELL_WIDTH}>
        <div className="mb-8 flex items-center justify-between gap-3">
          <a
            href="/discover"
            className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {t("content.discover.back")}
          </a>

          <div className="flex items-center gap-2">
            {canDelete && (
              <>
                <a href={`/discover/${storyId}/edit`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-accent">
                  <FileText className="h-4 w-4" />
                  {t("common.edit")}
                </a>
                <StoryDeleteButton
                  onClick={() => {
                    setDeleteError("");
                    setDeleteConfirmOpen(true);
                  }}
                  t={t}
                />
              </>
            )}
          </div>
        </div>
      </div>

      <header className={cn(CONTENT_WIDTH, "space-y-6")}>
        <StoryEyebrow story={story} t={t} />

        <div className="space-y-4">
          <h1 className="text-2xl font-bold leading-tight text-foreground sm:text-3xl">
            {story.title}
          </h1>
          {story.summary && (
            <p className="text-lg leading-relaxed text-muted-foreground">
              {story.summary}
            </p>
          )}
        </div>

        <StoryByline story={story} metrics={metrics} t={t} />
      </header>

      {story.coverImage && (
        <figure className={cn(CONTENT_WIDTH, "mt-8")}>
          <div className="overflow-hidden rounded-lg border border-border bg-muted shadow-sm">
            <img
              src={story.coverImage}
              alt={story.title}
              className="aspect-[16/9] w-full object-cover"
            />
          </div>
        </figure>
      )}

      <main className={cn(CONTENT_WIDTH, "mt-10")}>
        <article
          aria-label={t("content.discover.storyContent")}
          className="story-prose prose mx-auto w-full prose-a:text-primary hover:prose-a:underline prose-code:before:content-none prose-code:after:content-none"
        >
          <MarkdownContent content={story.content} headingOffset={1} />
        </article>

        {story.location && <RelatedLocationLink story={story} t={t} />}

        <StoryActions
          liked={liked}
          likeCount={story.likeCount}
          isLiking={isLiking}
          onLike={handleLike}
          onShare={() => setShowShareSheet(true)}
          viewsText={getViewCountText(story, locale, t)}
          t={t}
        />
      </main>

      {deleteConfirmOpen && (
        <StoryDeleteDialog
          deleteError={deleteError}
          isDeleting={isDeleting}
          onCancel={() => setDeleteConfirmOpen(false)}
          onDelete={handleDelete}
          t={t}
        />
      )}

      <ShareStorySheet
        open={showShareSheet}
        onClose={() => setShowShareSheet(false)}
        title={story?.title || ""}
        storyId={storyId}
        summary={story?.summary || ""}
        onCopyLink={copyCurrentUrl}
      />
    </div>
  );
}
