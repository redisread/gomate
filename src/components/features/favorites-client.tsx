"use client";

import * as React from "react";
import { ArrowLeft, FileText, Heart, MapPin } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { fetchAPI, fetchCurrentUser } from "@/lib/api";
import { safeFetch } from "@/lib/api-helpers";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import {
  buildLocationFavoriteDeletePath,
  buildLocationFavoritesPath,
  buildStoryFavoriteDeletePath,
  buildStoryFavoritesPath,
  type FavoriteItem,
  type FavoriteLocationItem,
  type FavoriteStoryItem,
  mergeFavoriteItems,
} from "./favorite-contract";

interface FavoritePage<T> {
  success: boolean;
  data: { items: T[]; nextCursor: string | null };
}

async function loadAllFavoritePages<T>(
  buildPath: (cursor?: string | null) => string,
): Promise<T[] | null> {
  const items: T[] = [];
  const seenCursors = new Set<string>();
  let cursor: string | null = null;

  for (;;) {
    const response: FavoritePage<T> | null = await safeFetch<FavoritePage<T>>(
      buildPath(cursor),
    );
    if (!response?.success || !Array.isArray(response.data?.items)) return null;
    items.push(...response.data.items);
    cursor = response.data.nextCursor;
    if (!cursor) return items;
    if (seenCursors.has(cursor)) return null;
    seenCursors.add(cursor);
  }
}

/**
 * 我的收藏页客户端组件
 */
export function FavoritesClient() {
  const { t } = useI18n(["favorites"]);
  const [favorites, setFavorites] = React.useState<FavoriteItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [removingId, setRemovingId] = React.useState<string | null>(null);

  const loadFavorites = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const [locations, stories] = await Promise.all([
      loadAllFavoritePages<FavoriteLocationItem>(buildLocationFavoritesPath),
      loadAllFavoritePages<FavoriteStoryItem>(buildStoryFavoritesPath),
    ]);
    if (!locations || !stories) {
      setError(t("favorites.loadFailed"));
      setFavorites([]);
      setIsLoading(false);
      return;
    }

    setFavorites(mergeFavoriteItems(locations, stories));
    setIsLoading(false);
  }, [t]);

  React.useEffect(() => {
    (async () => {
      const user = await fetchCurrentUser();
      if (!user) {
        window.location.href = "/login";
        return;
      }
      await loadFavorites();
    })();
  }, [loadFavorites]);

  const handleRemove = async (favorite: FavoriteItem) => {
    const id =
      favorite.kind === "location" ? favorite.location.id : favorite.story.id;
    const removingKey = `${favorite.kind}:${id}`;
    const path =
      favorite.kind === "location"
        ? buildLocationFavoriteDeletePath(id)
        : buildStoryFavoriteDeletePath(id);
    setRemovingId(removingKey);
    try {
      const res = await fetchAPI(path, { method: "DELETE" });
      if (res.ok) {
        setFavorites((prev) =>
          prev.filter((item) => {
            if (item.kind !== favorite.kind) return true;
            return item.kind === "location"
              ? item.location.id !== id
              : item.story.id !== id;
          }),
        );
      }
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 pt-20 pb-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          {/* 页面标题 */}
          <div className="py-8">
            <a
              href="/locations"
              className="inline-flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors mb-4"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("favorites.backBtn")}
            </a>
            <h1 className="text-page-h1">{t("favorites.pageTitle")}</h1>
            {!isLoading && favorites.length > 0 && (
              <p className="text-sm text-[var(--muted-foreground)] mt-1">
                {t("favorites.itemCount", { count: favorites.length })}
              </p>
            )}
          </div>

          {/* 加载状态 */}
          {isLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-card rounded-2xl overflow-hidden animate-pulse"
                  style={{
                    boxShadow:
                      "0 1px 4px color-mix(in oklab, var(--foreground) 6%, transparent)",
                  }}
                >
                  <div className="h-48 bg-stone-200 dark:bg-stone-700" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 bg-stone-200 dark:bg-stone-700 rounded w-3/4" />
                    <div className="h-3 bg-stone-100 dark:bg-stone-800 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 错误状态 */}
          {!isLoading && error && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 bg-red-50 dark:bg-red-950/30">
                <Heart className="h-8 w-8 text-red-500" />
              </div>
              <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-2">
                {error}
              </h2>
              <button
                onClick={loadFavorites}
                className="mt-4 px-5 py-2.5 rounded-xl text-sm font-medium bg-primary text-primary-foreground shadow-md hover:shadow-lg transition-shadow"
              >
                {t("favorites.retry") || "重试"}
              </button>
            </div>
          )}

          {/* 空状态 */}
          {!isLoading && !error && favorites.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 bg-amber-50 dark:bg-amber-950/30">
                <Heart className="h-8 w-8 text-amber-600 dark:text-amber-400" />
              </div>
              <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-2">
                {t("favorites.emptyTitle")}
              </h2>
              <p className="text-sm text-stone-500 dark:text-stone-400 mb-6">
                {t("favorites.emptyDesc")}
              </p>
              <a
                href="/discover"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-primary text-primary-foreground shadow-md hover:shadow-lg transition-shadow"
              >
                <FileText className="h-4 w-4" />
                {t("favorites.emptyBtn")}
              </a>
            </div>
          )}

          {/* 收藏列表 */}
          {!isLoading && !error && favorites.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {favorites.map((fav) => {
                const isLocation = fav.kind === "location";
                const id = isLocation ? fav.location.id : fav.story.id;
                const title = isLocation
                  ? fav.location.name
                  : fav.story.title || fav.story.content.slice(0, 60);
                const href = isLocation
                  ? `/locations/${fav.location.id}`
                  : `/discover/${fav.story.id}`;
                const image = isLocation
                  ? fav.location.coverImageUrl
                  : fav.story.images[0];
                const subtitle = isLocation
                  ? fav.location.address
                  : fav.story.summary || fav.story.content.slice(0, 100);
                const removingKey = `${fav.kind}:${id}`;
                return (
                  <div
                    key={removingKey}
                    className="bg-card rounded-2xl overflow-hidden group transition-[transform,background-color,border-color,color,opacity,box-shadow] duration-200 hover:-translate-y-0.5"
                    style={{
                      boxShadow:
                        "0 1px 4px color-mix(in oklab, var(--foreground) 6%, transparent)",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLDivElement).style.boxShadow =
                        "0 8px 24px color-mix(in oklab, var(--foreground) 12%, transparent)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLDivElement).style.boxShadow =
                        "0 1px 4px color-mix(in oklab, var(--foreground) 6%, transparent)";
                    }}
                  >
                    {/* 封面图 */}
                    <a
                      href={href}
                      className="block relative h-48 overflow-hidden"
                    >
                      {image ? (
                        <img
                          src={image}
                          alt={title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-secondary text-muted-foreground">
                          <FileText className="h-10 w-10" aria-hidden="true" />
                        </div>
                      )}
                      {/* 取消收藏按钮 */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          void handleRemove(fav);
                        }}
                        disabled={removingId === removingKey}
                        className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-[transform,background-color,border-color,color,opacity,box-shadow] duration-150"
                        style={{
                          background:
                            "color-mix(in oklab, white 92%, transparent)",
                          backdropFilter: "blur(4px)",
                          boxShadow:
                            "0 2px 8px color-mix(in oklab, var(--foreground) 12%, transparent)",
                        }}
                        aria-label={t("favorites.removeSuccess")}
                      >
                        <Heart
                          className="h-4 w-4 transition-colors"
                          style={{ color: "var(--primary)" }}
                          fill={
                            removingId === removingKey
                              ? "transparent"
                              : "var(--primary)"
                          }
                        />
                      </button>
                    </a>

                    {/* 卡片内容 */}
                    <a href={href} className="block p-4">
                      <h3
                        title={title}
                        className="font-semibold text-[var(--foreground)] text-sm leading-snug mb-1.5 line-clamp-1"
                      >
                        {title}
                      </h3>
                      {subtitle && (
                        <div className="flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
                          {isLocation ? (
                            <MapPin className="h-3 w-3 flex-shrink-0" />
                          ) : (
                            <FileText className="h-3 w-3 flex-shrink-0" />
                          )}
                          <span className="line-clamp-1">{subtitle}</span>
                        </div>
                      )}
                    </a>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
