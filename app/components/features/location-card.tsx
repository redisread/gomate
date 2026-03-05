"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { MapPin, Clock, Route, Users, Locate } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tag } from "@/app/components/ui/tag";
import type { Location } from "@/lib/types";
import { useTeams } from "@/lib/teams-context";
import { cn } from "@/lib/utils";

interface LocationCardProps {
  location: Location;
  index?: number;
  className?: string;
  variant?: "default" | "compact" | "horizontal";
}

function LocationCard({
  location,
  index = 0,
  className,
  variant = "default",
}: LocationCardProps) {
  const { getTeamsByLocationId } = useTeams();
  const teams = getTeamsByLocationId(location.id);
  const openTeams = teams.filter((t) => t.status === "open").length;

  // 获取路线数量和难度范围
  const routeCount = location.routes?.length || 0;
  const getDifficultyRange = () => {
    if (!location.routes || location.routes.length === 0) {
      return location.difficulty || "未知";
    }
    if (location.routes.length === 1) {
      const difficultyMap = { easy: "简单", moderate: "中等", hard: "困难", expert: "专家" };
      return difficultyMap[location.routes[0].difficulty];
    }
    const difficulties = ["easy", "moderate", "hard", "expert"];
    const routeDifficulties = location.routes.map((r) => r.difficulty);
    const minDiff = difficulties.find((d) => routeDifficulties.includes(d as any));
    const maxDiff = [...difficulties].reverse().find((d) => routeDifficulties.includes(d as any));
    const difficultyMap = { easy: "简单", moderate: "中等", hard: "困难", expert: "专家" };
    return `${difficultyMap[minDiff as keyof typeof difficultyMap]}-${difficultyMap[maxDiff as keyof typeof difficultyMap]}`;
  };

  if (variant === "horizontal") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: index * 0.1 }}
      >
        <Link href={`/locations/${location.id}`}>
          <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300 border-stone-200">
            <div className="flex flex-col sm:flex-row">
              {/* Image */}
              <div className="relative w-full sm:w-48 h-48 sm:h-auto flex-shrink-0 overflow-hidden">
                <Image
                  src={location.coverImage}
                  alt={location.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 left-3 flex gap-2">
                {location.cityName && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-medium text-stone-700">
                    <Locate className="h-3 w-3" />
                    {location.cityName}
                  </span>
                )}
                {routeCount > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-medium text-stone-700">
                    <Route className="h-3 w-3" />
                    {routeCount}条路线
                  </span>
                )}
              </div>
              </div>

              {/* Content */}
              <CardContent className="flex-1 p-4 sm:p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-stone-900 group-hover:text-stone-700 transition-colors">
                      {location.name}
                    </h3>
                    <p className="text-sm text-stone-500 mt-1">
                      {location.subtitle}
                    </p>
                  </div>
                  {openTeams > 0 && (
                    <div className="flex items-center gap-1 text-sm text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                      <Users className="h-3.5 w-3.5" />
                      {openTeams}个队伍
                    </div>
                  )}
                </div>

                <p className="text-sm text-stone-600 mt-3 line-clamp-2">
                  {location.description}
                </p>

                <div className="flex flex-wrap gap-2 mt-3">
                  {location.tags && location.tags.slice(0, 3).map((tag) => (
                    <Tag key={typeof tag === 'string' ? tag : tag.id} variant="subtle" color="default" size="sm">
                      {typeof tag === 'string' ? tag : tag.name}
                    </Tag>
                  ))}
                </div>

                <div className="flex items-center gap-4 mt-4 text-sm text-stone-500">
                  <div className="flex items-center gap-1">
                    <Route className="h-4 w-4" />
                    {routeCount}条路线
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {getDifficultyRange()}
                  </div>
                  {location.address && (
                    <div className="flex items-center gap-1">
                      <Locate className="h-4 w-4" />
                      {location.address.split("区")[0]}区
                    </div>
                  )}
                </div>
              </CardContent>
            </div>
          </Card>
        </Link>
      </motion.div>
    );
  }

  if (variant === "compact") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: index * 0.1 }}
      >
        <Link href={`/locations/${location.id}`}>
          <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300 border-stone-200">
            <div className="relative h-40 overflow-hidden">
              <Image
                src={location.coverImage}
                alt={location.name}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute top-3 left-3 flex gap-2">
                {location.cityName && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-medium text-stone-700">
                    <Locate className="h-3 w-3" />
                    {location.cityName}
                  </span>
                )}
                {routeCount > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-medium text-stone-700">
                    <Route className="h-3 w-3" />
                    {routeCount}条路线
                  </span>
                )}
              </div>
              <div className="absolute bottom-3 left-3 right-3">
                <h3 className="text-lg font-semibold text-white">
                  {location.name}
                </h3>
                <p className="text-sm text-white/80">{location.subtitle}</p>
              </div>
            </div>
            <CardContent className="p-4">
              <div className="flex items-center gap-3 text-sm text-stone-500">
                <span className="flex items-center gap-1">
                  <Route className="h-4 w-4" />
                  {routeCount}条路线
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {getDifficultyRange()}
                </span>
              </div>
            </CardContent>
          </Card>
        </Link>
      </motion.div>
    );
  }

  // Default variant
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
    >
      <Link href={`/locations/${location.id}`}>
        <Card className="group overflow-hidden hover:shadow-xl transition-all duration-300 border-stone-200 h-full">
          {/* Image */}
          <div className="relative h-52 overflow-hidden">
            <Image
              src={location.coverImage}
              alt={location.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

            {/* Badges */}
            <div className="absolute top-4 left-4 flex gap-2">
              {location.cityName && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-medium text-stone-700">
                  <Locate className="h-3 w-3" />
                  {location.cityName}
                </span>
              )}
              {routeCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-medium text-stone-700">
                  <Route className="h-3 w-3" />
                  {routeCount}条路线
                </span>
              )}
            </div>

            {/* Open Teams Badge */}
            {openTeams > 0 && (
              <div className="absolute top-4 right-4 flex items-center gap-1 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full text-sm font-medium text-stone-800">
                <Users className="h-3.5 w-3.5 text-emerald-600" />
                {openTeams}个队伍可加入
              </div>
            )}

            {/* Title Overlay */}
            <div className="absolute bottom-4 left-4 right-4">
              <h3 className="text-xl font-bold text-white mb-1">
                {location.name}
              </h3>
              <p className="text-sm text-white/90">{location.subtitle}</p>
            </div>
          </div>

          {/* Content */}
          <CardContent className="p-5">
            {/* Tags */}
            {location.tags && location.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {location.tags.slice(0, 4).map((tag) => (
                  <Tag key={typeof tag === 'string' ? tag : tag.id} variant="subtle" color="default" size="sm">
                    {typeof tag === 'string' ? tag : tag.name}
                  </Tag>
                ))}
              </div>
            )}

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-stone-600">
                <div className="p-1.5 bg-stone-100 rounded-lg">
                  <Route className="h-4 w-4 text-stone-500" />
                </div>
                <span>{routeCount}条路线</span>
              </div>
              <div className="flex items-center gap-2 text-stone-600">
                <div className="p-1.5 bg-stone-100 rounded-lg">
                  <MapPin className="h-4 w-4 text-stone-500" />
                </div>
                <span className="truncate">{getDifficultyRange()}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}

export { LocationCard };
