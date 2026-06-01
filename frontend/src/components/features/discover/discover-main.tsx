"use client";

import * as React from "react";
import { Compass, Loader2, Plus, MapPin, Tag, Flame } from "lucide-react";
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

export function DiscoverMain() {
  const { t } = useI18n(["content", "common"]);
  const [stories, setStories] = React.useState<Story[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [page, setPage] = React.useState(1);
  const [hasMore, setHasMore] = React.useState(false);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);

  // Sidebar data
  const [locations, setLocations] = React.useState<Location[]>([]);
  const [tags, setTags] = React.useState<Tag[]>([]);

  const loadStories = React.useCallback(async (pageNum: number, append: boolean) => {
    try {
      if (pageNum === 1) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }
      setError(null);

      const response = await apiGet<StoriesResponse>(`/stories?page=${pageNum}&limit=10`);

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
  }, [t]);

  // Initial load - call real API
  React.useEffect(() => {
    loadStories(1, false);
    loadSidebarData();
  }, [loadStories]);

  const loadSidebarData = async () => {
    const [locationsResult, tagsResult] = await Promise.allSettled([
      apiGet<LocationsResponse>("/locations?view=card&pageSize=5"),
      apiGet<TagsResponse>("/locations?tags=true"),
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
  };

  const handleStoryClick = (story: Story) => {
    window.location.href = `/discover/${story.id}`;
  };

  const handleLoadMore = () => {
    if (!isLoadingMore && hasMore) {
      loadStories(page + 1, true);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">{t("content.discover.loading")}</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-destructive mb-4">{error}</p>
          <button
            onClick={() => loadStories(1, false)}
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
          <p className="text-muted-foreground">{t("content.discover.empty")}</p>
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
                    <a
                      key={tag.id ?? tag.name}
                      href={`/discover?tag=${tag.name}`}
                      className="inline-flex items-center px-2.5 py-1 rounded-md bg-muted/50 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    >
                      #{tag.name}
                      {typeof tag.count === "number" && (
                        <span className="ml-1 text-muted-foreground/60">{tag.count}</span>
                      )}
                    </a>
                  ))}
                </div>
              </SidebarSection>
            )}

            {/* Trending */}
            <SidebarSection
              icon={<Flame className="w-4 h-4" />}
              title={t("content.discover.trending")}
            >
              <div className="text-sm text-muted-foreground">
                {t("content.discover.trendingDesc")}
              </div>
            </SidebarSection>
          </aside>
        </div>
      </div>
    </div>
  );
}
