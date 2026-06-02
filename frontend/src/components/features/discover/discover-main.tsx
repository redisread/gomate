"use client";

import * as React from "react";
import { Compass, Loader2, Plus, MapPin, Tag, Flame, X } from "lucide-react";
import { apiGet } from "@/lib/api";
import { StoryCard } from "./story-card";
import { FeaturedStoryCard } from "./featured-story-card";
import { SidebarSection } from "./sidebar-section";
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

interface Location {
  id: string;
  name: string;
  slug: string;
  storyCount?: number;
}

interface Tag {
  id?: string;
  name: string;
  type?: string;
  count?: number;
}

interface LocationsResponse {
  success: boolean;
  locations?: Location[];
  data?: Location[];
}

interface TagsResponse {
  success: boolean;
  tags?: Tag[];
  data?: Tag[];
}

interface StoriesStatsResponse {
  success: boolean;
  data: {
    weeklyNewStories: number;
    popularLocation: {
      id: string;
      name: string;
      slug: string;
      storyCount: number;
    } | null;
  };
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

  // Sidebar data
  const [locations, setLocations] = React.useState<Location[]>([]);
  const [tags, setTags] = React.useState<Tag[]>([]);
  const [stats, setStats] = React.useState<StoriesStatsResponse["data"] | null>(null);
  const [statsLoading, setStatsLoading] = React.useState(false);

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
      loadSidebarData();
    }
  }, [mounted, loadStories, selectedTag]);

  const loadSidebarData = async () => {
    const [locationsResult, tagsResult, statsResult] = await Promise.allSettled([
      apiGet<LocationsResponse>("/locations?view=card&pageSize=5"),
      apiGet<TagsResponse>("/locations?tags=true"),
      apiGet<StoriesStatsResponse>("/stories/stats"),
    ]);

    if (locationsResult.status === "fulfilled" && locationsResult.value.success) {
      setLocations(locationsResult.value.locations ?? locationsResult.value.data ?? []);
    } else {
      if (locationsResult.status === "rejected") {
        console.error("Load locations error:", locationsResult.reason);
      }
      setLocations([]);
    }

    if (tagsResult.status === "fulfilled" && tagsResult.value.success) {
      setTags(tagsResult.value.tags ?? tagsResult.value.data ?? []);
    } else {
      if (tagsResult.status === "rejected") {
        console.error("Load tags error:", tagsResult.reason);
      }
      setTags([]);
    }

    if (statsResult.status === "fulfilled" && statsResult.value.success) {
      setStats(statsResult.value.data);
    } else {
      if (statsResult.status === "rejected") {
        console.error("Load stats error:", statsResult.reason);
      }
      setStats(null);
    }
  };

  const handleStoryClick = (story: Story) => {
    window.location.href = `/discover/${story.id}`;
  };

  // 处理标签点击
  const handleTagClick = (tagName: string) => {
    const newTag = tagName === selectedTag ? null : tagName;
    setSelectedTag(newTag);

    // 更新 URL
    if (newTag) {
      const url = new URL(window.location.href);
      url.searchParams.set("tag", newTag);
      window.history.pushState({}, "", url.toString());
    } else {
      const url = new URL(window.location.href);
      url.searchParams.delete("tag");
      window.history.pushState({}, "", url.toString());
    }

    // 重置列表并重新加载
    setStories([]);
    setPage(1);
    loadStories(1, false, newTag);
  };

  // 清除筛选
  const handleClearFilter = () => {
    setSelectedTag(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("tag");
    window.history.pushState({}, "", url.toString());
    setStories([]);
    setPage(1);
    loadStories(1, false, null);
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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

            {/* Right: Publish Button */}
            <button
              className="flex w-full sm:w-auto items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
              onClick={() => window.location.href = "/discover/create"}
            >
              <Plus className="h-4 w-4" />
              {t("content.discover.publish")}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content: Two Column Layout */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-5 lg:gap-8">
          {/* Left: Main Content Flow */}
          <div className="space-y-4">
            {/* Mobile Tag Filter - 横向滚动标签入口 */}
            <div className="lg:hidden">
              {tags.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-2 -mx-3 px-3 scrollbar-hide">
                  {tags.map((tag) => (
                    <button
                      key={tag.id ?? tag.name}
                      onClick={() => handleTagClick(tag.name)}
                      className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors ${
                        selectedTag === tag.name
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      #{tag.name}
                      {typeof tag.count === "number" && (
                        <span className="ml-1 opacity-60">{tag.count}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Filter Status Chip */}
            {selectedTag && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">筛选:</span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
                  #{selectedTag}
                  <button
                    onClick={handleClearFilter}
                    className="ml-1 p-0.5 rounded-full hover:bg-primary/20 transition-colors"
                    aria-label="清除筛选"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              </div>
            )}

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

          {/* Right: Sidebar - 300px */}
          <aside className="hidden lg:block space-y-4">
            {/* Publish CTA */}
            <div className="p-5 rounded-lg border border-border bg-white shadow-sm">
              <h3 className="font-semibold text-sm mb-2">{t("content.discover.shareStory")}</h3>
              <p className="text-xs text-muted-foreground mb-4">
                {t("content.discover.shareStoryDesc")}
              </p>
              <button
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
                onClick={() => window.location.href = "/discover/create"}
              >
                <Plus className="h-4 w-4" />
                {t("content.discover.publish")}
              </button>
            </div>

            {/* Popular Locations */}
            {locations.length > 0 && (
              <SidebarSection
                icon={<MapPin className="w-4 h-4" />}
                title={t("content.discover.popularLocations")}
              >
                <div className="space-y-2">
                  {locations.map((location) => (
                    <a
                      key={location.id}
                      href={`/locations/${location.slug || location.id}`}
                      className="flex items-center justify-between py-2 px-2 -mx-2 rounded-md hover:bg-muted/50 transition-colors"
                    >
                      <span className="text-sm text-foreground">{location.name}</span>
                      {typeof location.storyCount === "number" && (
                        <span className="text-xs text-muted-foreground">{location.storyCount} 篇</span>
                      )}
                    </a>
                  ))}
                </div>
              </SidebarSection>
            )}

            {/* Popular Tags */}
            {tags.length > 0 && (
              <SidebarSection
                icon={<Tag className="w-4 h-4" />}
                title={t("content.discover.popularTags")}
              >
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <button
                      key={tag.id ?? tag.name}
                      onClick={() => handleTagClick(tag.name)}
                      className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs transition-colors ${
                        selectedTag === tag.name
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      #{tag.name}
                      {typeof tag.count === "number" && (
                        <span className={`ml-1 ${selectedTag === tag.name ? "opacity-80" : "opacity-60"}`}>
                          {tag.count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </SidebarSection>
            )}

            {/* Trending */}
            <SidebarSection
              icon={<Flame className="w-4 h-4" />}
              title={t("content.discover.trending")}
            >
              {stats ? (
                <div className="space-y-2 text-sm">
                  <p className="text-muted-foreground">
                    本周新增 <span className="text-foreground font-medium">{stats.weeklyNewStories}</span> 篇故事
                  </p>
                  {stats.popularLocation && (
                    <p className="text-muted-foreground">
                      <span className="text-foreground font-medium">{stats.popularLocation.name}</span> 是最热门的目的地
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  {t("content.discover.trendingDesc")}
                </div>
              )}
            </SidebarSection>
          </aside>
        </div>
      </div>
    </div>
  );
}
