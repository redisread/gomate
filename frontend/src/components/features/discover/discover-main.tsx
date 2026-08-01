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

/**
 * 骨架屏组件
 */
function StoryCardSkeleton() {
  return (
    <div className="bg-white rounded-lg overflow-hidden border border-border/60 animate-pulse">
      <div className="aspect-[4/3] bg-stone-200" />
      <div className="p-3 space-y-2">
        <div className="h-4 bg-stone-200 rounded w-3/4" />
        <div className="h-3 bg-stone-100 rounded w-full" />
        <div className="h-3 bg-stone-100 rounded w-2/3" />
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-stone-200" />
            <div className="h-3 bg-stone-200 rounded w-16" />
          </div>
          <div className="flex gap-2">
            <div className="h-3 bg-stone-200 rounded w-8" />
            <div className="h-3 bg-stone-200 rounded w-8" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function DiscoverMain() {
  const { t } = useI18n(["content", "common"]);
  const [stories, setStories] = React.useState<Story[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [page, setPage] = React.useState(1);
  const [hasMore, setHasMore] = React.useState(false);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);

  // 标签筛选状态
  const [selectedTag, setSelectedTag] = React.useState<string | null>(null);
  const [tags, setTags] = React.useState<Tag[]>([]);

  // 无限滚动
  const loadMoreRef = React.useRef<HTMLDivElement>(null);

  // Hydration safety
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
      const response = await apiGet<StoriesResponse>(`/stories?page=${pageNum}&limit=12${tagQuery}`);

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

  // Initial load
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

  // 无限滚动 - IntersectionObserver
  React.useEffect(() => {
    if (!hasMore || isLoadingMore || isLoading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          loadStories(page + 1, true, selectedTag);
        }
      },
      { threshold: 0.1, rootMargin: "200px" }
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [hasMore, isLoadingMore, isLoading, page, selectedTag, loadStories]);

  const handleStoryClick = (story: Story) => {
    window.location.href = `/discover/${story.id}`;
  };

  const handleTagSelect = (tagName: string | null) => {
    setSelectedTag(tagName);

    const url = new URL(window.location.href);
    if (tagName) {
      url.searchParams.set("tag", tagName);
    } else {
      url.searchParams.delete("tag");
    }
    window.history.pushState({}, "", url.toString());

    setStories([]);
    setPage(1);
    loadStories(1, false, tagName);
  };

  const handleLoadMore = () => {
    if (!isLoadingMore && hasMore) {
      loadStories(page + 1, true, selectedTag);
    }
  };

  // Loading state
  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="pt-20 sm:pt-24 pb-5 sm:pb-6">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Compass className="w-4 h-4 text-primary" />
              </div>
              <h2 className="text-lg font-semibold text-foreground tracking-tight">
                {t("content.discover.title")}
              </h2>
            </div>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 pb-12">
          <div className="columns-2 sm:columns-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <StoryCardSkeleton key={i} />
            ))}
          </div>
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
      {/* Header */}
      <div className="pt-20 sm:pt-24 pb-5 sm:pb-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Compass className="w-4 h-4 text-primary" />
                </div>
                <h1 className="text-page-h1">
                  {t("content.discover.title")}
                </h1>
              </div>
              <p className="text-muted-foreground text-sm sm:pl-11 leading-relaxed">
                {t("content.discover.subtitle")}
              </p>
            </div>

            {/* Publish CTA (desktop) */}
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

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 pb-12">
        <div className="space-y-4">
          {/* Tag Filter Bar */}
          <TagFilterBar
            tags={tags}
            selectedTag={selectedTag}
            onTagSelect={handleTagSelect}
          />

          {/* Featured Story */}
          {stories.length > 0 && (
            <FeaturedStoryCard
              story={stories[0]}
              onClick={handleStoryClick}
            />
          )}

          {/* 瀑布流 Story Grid */}
          <div className="columns-2 sm:columns-3 gap-4">
            {stories.slice(1).map((story) => (
              <StoryCard
                key={story.id}
                story={story}
                onClick={handleStoryClick}
              />
            ))}
          </div>

          {/* 无限滚动触发点 */}
          {hasMore && (
            <div ref={loadMoreRef} className="py-6 flex justify-center">
              {isLoadingMore ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">{t("content.discover.loading")}</span>
                </div>
              ) : (
                <button
                  onClick={handleLoadMore}
                  className="px-6 py-2.5 rounded-lg border border-border bg-background hover:bg-accent transition-colors text-sm"
                >
                  {t("content.discover.loadMore")}
                </button>
              )}
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
