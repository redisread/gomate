"use client";

import * as React from "react";
import { Compass, Loader2, Plus } from "lucide-react";
import { apiGet } from "@/lib/api";
import { StoryCard } from "./story-card";
import { FeaturedStoryCard } from "./featured-story-card";
import { TagFilterBar } from "./tag-filter-bar";
import { useI18n } from "@/hooks/useI18n";

interface Story {
  id: string;
  title: string;
  summary: string;
  coverImage?: string;
  viewCount: number;
  likeCount: number;
  createdAt: number;
  author: {
    id: string;
    name: string;
    image?: string;
  } | null;
  location?: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

interface StoriesResponse {
  success: boolean;
  data: Story[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

interface Tag {
  id?: string;
  name: string;
  type?: string;
  count?: number;
}

interface TagsResponse {
  success: boolean;
  tags?: Tag[];
  data?: Tag[];
}

export function DiscoverMain() {
  const { t } = useI18n(["content", "common"]);
  const [stories, setStories] = React.useState<Story[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [page, setPage] = React.useState(1);
  const [hasMore, setHasMore] = React.useState(false);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);

  // 标签筛选状态 - 从 URL 读取
  const [selectedTag, setSelectedTag] = React.useState<string | null>(null);
  const [tags, setTags] = React.useState<Tag[]>([]);

  // Hydration safety - only start loading after mount
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // 从 URL 读取 tag 参数
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tagParam = params.get("tag");
      setSelectedTag(tagParam || null);
    }
  }, []);

  const loadStories = React.useCallback(async (pageNum: number, append: boolean, tagFilter: string | null = selectedTag) => {
    try {
      if (pageNum === 1) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }
      setError(null);

      const tagQuery = tagFilter ? `&tag=${encodeURIComponent(tagFilter)}` : "";
      const response = await apiGet<StoriesResponse>(`/stories?page=${pageNum}&limit=10${tagQuery}`);

      if (response.success) {
        if (append) {
          setStories((prev) => [...prev, ...response.data]);
        } else {
          setStories(response.data);
        }
        setHasMore(response.pagination.hasMore);
        setPage(pageNum);
      } else {
        setError(t("content.discover.loadError"));
      }
    } catch (err) {
      setError(t("content.discover.loadError"));
      console.error("Load stories error:", err);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [t, selectedTag]);

  // Initial load - call real API only after mount
  React.useEffect(() => {
    if (mounted) {
      setIsLoading(true);
      loadStories(1, false, selectedTag);
      loadTags();
    }
  }, [mounted, loadStories, selectedTag]);

  const loadTags = async () => {
    try {
      const result = await apiGet<TagsResponse>("/stories/tags");
      if (result.success) {
        setTags(result.tags ?? result.data ?? []);
      }
    } catch (err) {
      console.error("Load tags error:", err);
    }
  };

  const handleStoryClick = (story: Story) => {
    window.location.href = `/discover/${story.id}`;
  };

  // 处理标签点击
  const handleTagSelect = (tagName: string | null) => {
    setSelectedTag(tagName);

    // 更新 URL
    const url = new URL(window.location.href);
    if (tagName) {
      url.searchParams.set("tag", tagName);
    } else {
      url.searchParams.delete("tag");
    }
    window.history.pushState({}, "", url.toString());

    // 重置列表并重新加载
    setStories([]);
    setPage(1);
    loadStories(1, false, tagName);
  };

  const handleLoadMore = () => {
    if (!isLoadingMore && hasMore) {
      loadStories(page + 1, true, selectedTag);
    }
  };

  // Loading state (includes unmounted state for hydration safety)
  if (!mounted || isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground" suppressHydrationWarning>{t("content.discover.loading")}</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-destructive mb-4" suppressHydrationWarning>{error}</p>
          <button
            onClick={() => loadStories(1, false, selectedTag)}
            className="px-4 py-2 rounded-lg border border-border bg-background hover:bg-accent transition-colors"
          >
            {t("content.discover.retry")}
          </button>
        </div>
      </div>
    );
  }

  // Empty state
  if (stories.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-background">
        <div className="text-center">
          <Compass className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground" suppressHydrationWarning>{t("content.discover.empty")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header - 紧凑设计 */}
      <div className="pt-20 sm:pt-24 pb-5 sm:pb-6">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            {/* Left: Title + Subtitle */}
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Compass className="w-4 h-4 text-primary" />
                </div>
                <h1 className="text-2xl font-bold text-foreground">
                  {t("content.discover.title")}
                </h1>
              </div>
              <p className="text-muted-foreground text-sm sm:pl-11 leading-relaxed">
                {t("content.discover.subtitle")}
              </p>
            </div>

            {/* Right: Publish CTA (desktop) */}
            <button
              className="hidden sm:flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
              onClick={() => window.location.href = "/discover/create"}
            >
              <Plus className="h-4 w-4" />
              {t("content.discover.publish")}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content - Single Column */}
      <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 pb-12">
        <div className="space-y-4">
          {/* Tag Filter Bar */}
          <TagFilterBar
            tags={tags}
            selectedTag={selectedTag}
            onTagSelect={handleTagSelect}
          />

          {/* Featured Story - 第一篇作为精选 */}
          {stories.length > 0 && (
            <FeaturedStoryCard
              story={stories[0]}
              onClick={handleStoryClick}
            />
          )}

          {/* Story List - 其余故事 */}
          <div className="space-y-3">
            {stories.slice(1).map((story) => (
              <StoryCard
                key={story.id}
                story={story}
                onClick={handleStoryClick}
              />
            ))}
          </div>

          {/* Load More */}
          {hasMore && (
            <div className="py-6 flex justify-center">
              <button
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="px-6 py-2.5 rounded-lg border border-border bg-background hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {isLoadingMore ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("content.discover.loading")}
                  </span>
                ) : (
                  t("content.discover.loadMore")
                )}
              </button>
            </div>
          )}

          {/* No more */}
          {!hasMore && stories.length > 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {t("content.discover.noMore")}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Publish FAB */}
      <button
        className="sm:hidden fixed bottom-6 right-6 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors flex items-center justify-center z-40"
        onClick={() => window.location.href = "/discover/create"}
        aria-label={t("content.discover.publish")}
      >
        <Plus className="h-6 w-6" />
      </button>
    </div>
  );
}
