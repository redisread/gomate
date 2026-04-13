"use client";

import * as React from "react";
import { Heart, MapPin, ArrowLeft, Mountain } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { fetchAPI, fetchCurrentUser } from "@/lib/api";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

interface FavoriteLocation {
  id: string;
  entityType: string;
  entityId: string;
  createdAt: string;
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
  const [removingId, setRemovingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    (async () => {
      const user = await fetchCurrentUser();
      if (!user) {
        window.location.href = "/login";
        return;
      }
      await loadFavorites();
    })();
  }, []);

  const loadFavorites = async () => {
    setIsLoading(true);
    try {
      const res = await fetchAPI("/favorites?entityType=location");
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      setFavorites(data.favorites || []);
    } catch {
      setFavorites([]);
    } finally {
      setIsLoading(false);
    }
  };

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
              className="inline-flex items-center gap-1.5 text-sm text-[#8f7f6e] hover:text-[#1e1812] transition-colors mb-4"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("favorites.backBtn")}
            </a>
            <h1 className="text-2xl font-bold text-[#1e1812]">{t("favorites.pageTitle")}</h1>
            {!isLoading && favorites.length > 0 && (
              <p className="text-sm text-[#8f7f6e] mt-1">
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
                  style={{ boxShadow: "0 1px 4px rgba(30,24,18,0.06)" }}
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

          {/* 空状态 */}
          {!isLoading && favorites.length === 0 && (
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
          {!isLoading && favorites.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {favorites.map((fav) => {
                if (!fav.location) return null;
                const loc = fav.location;
                return (
                  <div
                    key={fav.id}
                    className="bg-card rounded-2xl overflow-hidden group transition-all duration-200 hover:-translate-y-0.5"
                    style={{
                      boxShadow: "0 1px 4px rgba(30,24,18,0.06)",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLDivElement).style.boxShadow =
                        "0 8px 24px rgba(30,24,18,0.12)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLDivElement).style.boxShadow =
                        "0 1px 4px rgba(30,24,18,0.06)";
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
                          style={{ background: "linear-gradient(135deg, #FEF3C7, #FDE68A)" }}
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
                        className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-150"
                        style={{
                          background: "rgba(255,255,255,0.92)",
                          backdropFilter: "blur(4px)",
                          boxShadow: "0 2px 8px rgba(30,24,18,0.12)",
                        }}
                        aria-label={t("favorites.removeSuccess")}
                      >
                        <Heart
                          className="h-4 w-4 transition-colors"
                          style={{ color: "#D97706" }}
                          fill={removingId === loc.id ? "transparent" : "#D97706"}
                        />
                      </button>
                    </a>

                    {/* 卡片内容 */}
                    <a href={`/locations/${loc.id}`} className="block p-4">
                      <h3 className="font-semibold text-[#1e1812] text-sm leading-snug mb-1.5 line-clamp-1">
                        {loc.name}
                      </h3>
                      {(loc.address || loc.cityName) && (
                        <div className="flex items-center gap-1 text-xs text-[#8f7f6e]">
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
