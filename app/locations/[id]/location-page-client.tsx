"use client";

import * as React from "react";
import { notFound } from "next/navigation";
import { motion } from "framer-motion";

import { Navbar } from "@/app/components/layout/navbar";
import { Footer } from "@/app/components/layout/footer";
import { LocationHeader } from "@/app/components/features/location-header";
import { LocationInfoCard } from "@/app/components/features/location-info-card";
import { RouteGuide } from "@/app/components/features/route-guide";
import { TeamList } from "@/app/components/features/team-list";
import { useLocations } from "@/lib/locations-context";

interface LocationPageClientProps {
  locationId: string;
}

export function LocationPageClient({ locationId }: LocationPageClientProps) {
  const { locations, getLocationById } = useLocations();
  const location = getLocationById(locationId);

  if (!location) {
    notFound();
  }

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

            {/* Route Guide */}
            <RouteGuide location={location} />

            {/* Teams Section */}
            <div id="teams">
              <TeamList locationId={locationId} />
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
