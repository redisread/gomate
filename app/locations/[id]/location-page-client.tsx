"use client";

import * as React from "react";
import { notFound } from "next/navigation";
import { motion } from "framer-motion";

import { Navbar } from "@/app/components/layout/navbar";
import { Footer } from "@/app/components/layout/footer";
import { LocationHeader } from "@/app/components/features/location-header";
import { LocationInfoCard } from "@/app/components/features/location-info-card";
import { RouteGuide } from "@/app/components/features/route-guide";
import { LocationCheckpoints } from "@/app/components/features/location-checkpoints";
import { RouteList } from "@/app/components/features/route-list";
import { TeamList } from "@/app/components/features/team-list";
import { EquipmentList } from "@/app/components/features/equipment-list";
import { FeaturedTeams } from "@/app/components/features/featured-teams";
import { useLocations } from "@/lib/locations-context";

interface LocationPageClientProps {
  locationId: string;
}

export function LocationPageClient({ locationId }: LocationPageClientProps) {
  const { locations, getLocationById } = useLocations();
  const location = getLocationById(locationId);
  const [selectedRouteId, setSelectedRouteId] = React.useState<string | null>(null);

  if (!location) {
    notFound();
  }

  // 获取路线列表
  const routes = location.routes || [];
  const hasRoutes = routes.length > 0;
  const hasSingleRoute = routes.length === 1;
  const hasMultipleRoutes = routes.length > 1;

  // 如果只有一条路线,默认选中
  React.useEffect(() => {
    if (hasSingleRoute && !selectedRouteId) {
      setSelectedRouteId(routes[0].id);
    }
  }, [hasSingleRoute, routes, selectedRouteId]);

  // 获取当前选中的路线
  const selectedRoute = selectedRouteId
    ? routes.find((r) => r.id === selectedRouteId)
    : hasSingleRoute
    ? routes[0]
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
              <h2 className="text-xl font-semibold text-stone-900 mb-4">
                地点介绍
              </h2>
              <p className="text-stone-600 leading-relaxed">
                {location.description}
              </p>
            </motion.div>

            {/* Routes Section */}
            {hasMultipleRoutes && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <RouteList
                  locationId={locationId}
                  routes={routes}
                  locationName={location.name}
                  showFilters={true}
                  onRouteSelect={(routeId) => {
                    setSelectedRouteId(routeId);
                    // 滚动到路线详情
                    document.getElementById("route-details")?.scrollIntoView({ behavior: "smooth" });
                  }}
                />
              </motion.div>
            )}

            {/* Route Details (when a route is selected) */}
            {selectedRoute && (
              <div id="route-details" className="space-y-6">
                {/* 核心打卡点 */}
                <LocationCheckpoints locationId={locationId} />

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
              <LocationInfoCard location={location} />

              {/* Quick Actions */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="bg-white rounded-2xl border border-stone-200 p-6"
              >
                <h3 className="font-semibold text-stone-900 mb-4">
                  其他推荐地点
                </h3>
                <div className="space-y-3">
                  {locations
                    .filter((l) => l.id !== location.id)
                    .slice(0, 3)
                    .map((loc) => (
                      <a
                        key={loc.id}
                        href={`/locations/${loc.id}`}
                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-stone-50 transition-colors group"
                      >
                        <div
                          className="w-12 h-12 rounded-lg bg-cover bg-center"
                          style={{ backgroundImage: `url(${loc.coverImage})` }}
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-stone-900 group-hover:text-stone-700 transition-colors truncate">
                            {loc.name}
                          </h4>
                          <p className="text-xs text-stone-500">
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
                      </a>
                    ))}
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
