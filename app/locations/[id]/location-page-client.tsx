"use client";

import * as React from "react";
import { notFound } from "next/navigation";
import { motion } from "framer-motion";
import { Heart, Share2 } from "lucide-react";
import { Navbar } from "@/app/components/layout/navbar";
import { Footer } from "@/app/components/layout/footer";
import { LocationHeader } from "@/app/components/features/location-header";
import { LocationInfoCard } from "@/app/components/features/location-info-card";
import { RouteGuide } from "@/app/components/features/route-guide";
import { LocationCheckpoints } from "@/app/components/features/location-checkpoints";
import { TeamList } from "@/app/components/features/team-list";
import { EquipmentList } from "@/app/components/features/equipment-list";
import { FeaturedTeams } from "@/app/components/features/featured-teams";
import { useLocations } from "@/lib/locations-context";
import { useAuth } from "@/lib/auth-context";
import { useFavorite } from "@/lib/hooks/use-favorite";
import { ShareLocationDialog } from "@/components/features/share-location-dialog";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface LocationPageClientProps {
  locationId: string;
}

export function LocationPageClient({ locationId }: LocationPageClientProps) {
  const { locations, isLoading: isLocationsLoading, getLocationById } = useLocations();
  const location = getLocationById(locationId);
  const [selectedRouteId, setSelectedRouteId] = React.useState<string | null>(null);
  const [shareOpen, setShareOpen] = React.useState(false);
  const { isAuthenticated } = useAuth();
  const { isFavorite, isLoading, isToggling, toggleFavorite } = useFavorite({
    entityType: "location",
    entityId: locationId,
  });

  if (isLocationsLoading && !location) {
    return (
      <main className="min-h-screen bg-stone-50">
        <Navbar />
        <div className="h-64 bg-stone-200 animate-pulse" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <div className="h-48 bg-stone-200 rounded-2xl animate-pulse" />
              <div className="h-32 bg-stone-200 rounded-2xl animate-pulse" />
            </div>
            <div className="lg:col-span-1">
              <div className="h-64 bg-stone-200 rounded-2xl animate-pulse" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!isLocationsLoading && !location) {
    notFound();
  }

  // 类型收窄：经过上方 guard，此处 location 一定存在
  if (!location) return null;

  // 获取路线列表
  const routes = location.routes || [];
  const hasRoutes = routes.length > 0;
  const hasSingleRoute = routes.length === 1;
  const hasMultipleRoutes = routes.length > 1;

  // 获取当前选中的路线
  const selectedRoute = selectedRouteId
    ? routes.find((r) => r.id === selectedRouteId)
    : null;

  return (
    <main className="min-h-screen bg-stone-50">
      <Navbar />

      {/* Header with Cover Image */}
      <LocationHeader location={location} />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Route Guide */}
          <div className="lg:col-span-2 space-y-8">
            {/* Description */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-white rounded-2xl border border-stone-200 p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-stone-900">
                  地点介绍
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShareOpen(true)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium text-stone-600 hover:bg-stone-100 transition-colors"
                  >
                    <Share2 className="h-4 w-4" />
                    分享
                  </button>
                  {isAuthenticated && (
                    <button
                      onClick={toggleFavorite}
                      disabled={isLoading || isToggling}
                      className={cn(
                        "flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                        isFavorite
                          ? "bg-red-50 text-red-500 hover:bg-red-100"
                          : "text-stone-600 hover:bg-stone-100"
                      )}
                    >
                      <Heart
                        className={cn("h-4 w-4", isFavorite && "fill-current")}
                      />
                      {isFavorite ? "已收藏" : "收藏"}
                    </button>
                  )}
                </div>
              </div>
              <p className="text-stone-600 leading-relaxed">
                {location.description}
              </p>
            </motion.div>

            {/* 核心打卡点 */}
            <LocationCheckpoints locationId={locationId} cardStyle />

            {/* Route Details (when a route is selected) */}
            {selectedRoute && (
              <div id="route-details" className="space-y-6">
                {/* 安全须知 */}
                <RouteGuide route={selectedRoute} locationName={location.name} />

                {/* 装备建议 */}
                {selectedRoute.equipmentNeeded && selectedRoute.equipmentNeeded.length > 0 && (
                  <EquipmentList equipment={selectedRoute.equipmentNeeded} />
                )}

                {/* 热门队伍精选 */}
                <FeaturedTeams routeId={selectedRoute.id} limit={3} />
              </div>
            )}

            {/* Teams Section */}
            <div id="teams">
              <TeamList locationId={locationId} routeId={selectedRouteId || undefined} />
            </div>
          </div>

          {/* Right Column - Info Card */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              <LocationInfoCard
                location={location}
                selectedRouteId={selectedRouteId}
                onRouteSelect={(routeId) => {
                  setSelectedRouteId(routeId);
                  document.getElementById("route-details")?.scrollIntoView({ behavior: "smooth" });
                }}
              />

              {/* Quick Actions */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="bg-white rounded-2xl border border-stone-200 p-6"
              >
                <h3 className="font-semibold text-stone-900 mb-1">
                  其他推荐地点
                </h3>
                <p className="text-sm text-stone-500 mb-4">
                  探索更多深圳优质徒步路线
                </p>
                <div className="space-y-3">
                  {locations
                    .filter((l) => l.id !== location.id)
                    .slice(0, 3)
                    .map((loc) => (
                      <Link
                        key={loc.id}
                        href={`/locations/${loc.id}`}
                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-stone-50 transition-colors group"
                      >
                        <div
                          className="w-14 h-14 rounded-lg bg-cover bg-center flex-shrink-0"
                          style={{ backgroundImage: `url(${loc.coverImage})` }}
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-stone-900 group-hover:text-stone-700 transition-colors truncate">
                            {loc.name}
                          </h4>
                          {loc.subtitle && (
                            <p className="text-xs text-stone-500 truncate">
                              {loc.subtitle}
                            </p>
                          )}
                          <p className="text-xs text-stone-400">
                            {loc.difficulty === "easy"
                              ? "简单"
                              : loc.difficulty === "moderate"
                              ? "中等"
                              : loc.difficulty === "hard"
                              ? "困难"
                              : "极难"}{" "}
                            · {loc.duration}
                          </p>
                        </div>
                      </Link>
                    ))}
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      <Footer />

      {location && (
        <ShareLocationDialog
          open={shareOpen}
          onOpenChange={setShareOpen}
          location={location}
        />
      )}
    </main>
  );
}
