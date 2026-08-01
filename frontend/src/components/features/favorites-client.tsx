"use client";

import * as React from "react";
import { Heart, MapPin, ArrowLeft, Mountain } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { fetchAPI, fetchCurrentUser } from "@/lib/api";
import { safeFetch } from "@/lib/api-helpers";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

interface FavoriteLocation {
  id: string;
  entityType: string;
  entityId: string;
  createdAt: string;
  isDeleted?: boolean;
  location: {
    id: string;
    name: string;
    coverImage: string | null;
    address: string | null;
    cityName: string | null;
  } | null;
}

/**
 * 我的收藏页客户端组件
 */
export function FavoritesClient() {
  const { t } = useI18n(["favorites"]);
  const [favorites, setFavorites] = React.useState<FavoriteLocation[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [removingId, setRemovingId] = React.useState<string | null>(null);

  const loadFavorites = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const data = await safeFetch<{ favorites: FavoriteLocation[] }>("/favorites?entityType=location");
    if (data?.favorites) {
      setFavorites(data.favorites);
    } else {
      setError(t("favorites.loadFailed") || "加载失败");
      setFavorites([]);
    }
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

  const handleRemove = async (entityId: string) => {
    setRemovingId(entityId);
    try {
      const res = await fetchAPI(
        `/favorites?entityType=location&entityId=${entityId}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setFavorites((prev) => prev.filter((f) => f.entityId !== entityId));
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
            <h1 className="text-2xl font-bold text-[var(--foreground)]">{t("favorites.pageTitle")}</h1>
            {!isLoading && favorites.length > 0 && (
              <p className="text-sm text-[var(--muted-foreground)] mt-1">
                {favorites.length} {t("favorites.locationCount")}
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
                  style={{ boxShadow: "0 1px 4px color-mix(in oklab, var(--foreground) 6%, transparent)" }}
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
              <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-2">{error}</h2>
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
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mb-4 bg-amber-50 dark:bg-amber-950/30"
              >
                <Heart className="h-8 w-8 text-amber-600 dark:text-amber-400" />
              </div>
              <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-2">{t("favorites.emptyTitle")}</h2>
              <p className="text-sm text-stone-500 dark:text-stone-400 mb-6">{t("favorites.emptyDesc")}</p>
              <a
                href="/locations"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-primary text-primary-foreground shadow-md hover:shadow-lg transition-shadow"
              >
                <Mountain className="h-4 w-4" />
                {t("favorites.emptyBtn")}
              </a>
            </div>
          )}

          {/* 收藏列表 */}
          {!isLoading && !error && favorites.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {favorites.map((fav) => {
                // 幽灵收藏：地点已下线
                if (fav.isDeleted || !fav.location) {
                  return (
                    <div
                      key={fav.id}
                      className="bg-card rounded-2xl overflow-hidden opacity-60"
                      style={{ boxShadow: "0 1px 4px color-mix(in oklab, var(--foreground) 6%, transparent)" }}
                    >
                      <div className="h-48 bg-stone-100 dark:bg-stone-800 flex items-center justify-center">
                        <div className="text-center">
                          <Mountain className="h-8 w-8 text-stone-300 mx-auto mb-2" />
                          <p className="text-xs text-stone-400">{t("favorites.locationDeleted") || "该地点已下线"}</p>
                        </div>
                      </div>
                      <div className="p-4">
                        <p className="text-sm text-stone-400">{t("favorites.locationDeletedDesc") || "此地点已被移除"}</p>
                        <button
                          type="button"
                          onClick={() => handleRemove(fav.entityId)}
                          className="mt-2 text-xs text-stone-400 hover:text-stone-600 transition-colors"
                        >
                          {t("favorites.removeSuccess") || "取消收藏"}
                        </button>
                      </div>
                    </div>
                  );
                }

                const loc = fav.location;
                return (
                  <div
                    key={fav.id}
                    className="bg-card rounded-2xl overflow-hidden group transition-[transform,background-color,border-color,color,opacity,box-shadow] duration-200 hover:-translate-y-0.5"
                    style={{
                      boxShadow: "0 1px 4px color-mix(in oklab, var(--foreground) 6%, transparent)",
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
                    <a href={`/locations/${loc.id}`} className="block relative h-48 overflow-hidden">
                      {loc.coverImage ? (
                        <img
                          src={loc.coverImage}
                          alt={loc.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div
                          className="w-full h-full flex items-center justify-center fav-placeholder-gradient"
                          style={{ background: "linear-gradient(135deg, var(--anthropic-accent-soft), var(--accent-foreground))" }}
                        >
                          <Mountain className="h-12 w-12 text-amber-400" />
                        </div>
                      )}
                      {/* 取消收藏按钮 */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          handleRemove(loc.id);
                        }}
                        disabled={removingId === loc.id}
                        className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-[transform,background-color,border-color,color,opacity,box-shadow] duration-150"
                        style={{
                          background: "color-mix(in oklab, white 92%, transparent)",
                          backdropFilter: "blur(4px)",
                          boxShadow: "0 2px 8px color-mix(in oklab, var(--foreground) 12%, transparent)",
                        }}
                        aria-label={t("favorites.removeSuccess")}
                      >
                        <Heart
                          className="h-4 w-4 transition-colors"
                          style={{ color: "var(--primary)" }}
                          fill={removingId === loc.id ? "transparent" : "var(--primary)"}
                        />
                      </button>
                    </a>

                    {/* 卡片内容 */}
                    <a href={`/locations/${loc.id}`} className="block p-4">
                      <h3 className="font-semibold text-[var(--foreground)] text-sm leading-snug mb-1.5 line-clamp-1">
                        {loc.name}
                      </h3>
                      {(loc.address || loc.cityName) && (
                        <div className="flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
                          <MapPin className="h-3 w-3 flex-shrink-0" />
                          <span className="line-clamp-1">
                            {[loc.cityName, loc.address].filter(Boolean).join(" · ")}
                          </span>
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
