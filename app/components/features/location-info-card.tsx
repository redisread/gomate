"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Calendar,
  Car,
  Toilet,
  Droplets,
  UtensilsCrossed,
  Check,
  X,
  MapPin,
  Route as RouteIcon,
  Clock,
  Ruler,
  Mountain,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tag } from "@/app/components/ui/tag";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Location } from "@/lib/types";
import { cn } from "@/lib/utils";
import { getAmapNavigateUrl, isValidCoordinates } from "@/lib/map-utils";

interface LocationInfoCardProps {
  location: Location;
  className?: string;
  selectedRouteId?: string | null;
  onRouteSelect?: (routeId: string) => void;
}

const difficultyConfig = {
  easy: { label: "简单", color: "bg-green-100 text-green-800" },
  moderate: { label: "中等", color: "bg-blue-100 text-blue-800" },
  hard: { label: "困难", color: "bg-orange-100 text-orange-800" },
  expert: { label: "专家", color: "bg-red-100 text-red-800" },
};

const DIFFICULTY_OPTIONS = [
  { value: "all", label: "全部" },
  { value: "easy", label: "简单" },
  { value: "moderate", label: "中等" },
  { value: "hard", label: "困难" },
  { value: "expert", label: "专家" },
] as const;

function LocationInfoCard({ location, className, selectedRouteId, onRouteSelect }: LocationInfoCardProps) {
  const [difficultyFilter, setDifficultyFilter] = React.useState<string>("all");
  const rawFacilities = location.extra?.facilities;
  // 兼容两种格式：string[] 或 { [key]: boolean }
  const facilityConfig = [
    { key: "parking", icon: Car, label: "停车场" },
    { key: "restroom", icon: Toilet, label: "洗手间" },
    { key: "water", icon: Droplets, label: "补给点" },
    { key: "food", icon: UtensilsCrossed, label: "餐饮" },
  ];
  const facilityList = facilityConfig.map(config => ({
    ...config,
    available: Array.isArray(rawFacilities)
      ? rawFacilities.includes(config.key)
      : rawFacilities != null && typeof rawFacilities === "object"
        ? !!(rawFacilities as Record<string, boolean>)[config.key]
        : false,
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <Card className={cn("border-stone-200", className)}>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-stone-900">
            地点信息
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-3">
            {location.bestSeason && location.bestSeason.length > 0 && (
              <div className="flex items-start gap-3">
                <div className="p-2 bg-stone-100 rounded-lg">
                  <Calendar className="h-4 w-4 text-stone-600" />
                </div>
                <div>
                  <p className="text-xs text-stone-500">最佳季节</p>
                  <p className="text-sm font-medium text-stone-900">
                    {location.bestSeason.join("、")}
                  </p>
                </div>
              </div>
            )}
            {(location.address || isValidCoordinates(location.coordinates)) && (
              <div className="flex items-start gap-3">
                {isValidCoordinates(location.coordinates) ? (
                  <a
                    href={getAmapNavigateUrl(location.coordinates!, location.name)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-stone-100 rounded-lg flex-shrink-0 hover:bg-stone-200 transition-colors"
                    aria-label={`在高德地图中查看 ${location.name} 位置`}
                  >
                    <MapPin className="h-4 w-4 text-stone-600" />
                  </a>
                ) : (
                  <div className="p-2 bg-stone-100 rounded-lg flex-shrink-0">
                    <MapPin className="h-4 w-4 text-stone-600" />
                  </div>
                )}
                <div>
                  <p className="text-xs text-stone-500">地址</p>
                  <p className="text-sm font-medium text-stone-900">
                    {location.address}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Tags */}
          {location.tags && location.tags.length > 0 && (
            <div>
              <p className="text-xs text-stone-500 mb-2">地点标签</p>
              <div className="flex flex-wrap gap-2">
                {location.tags.map((tag) => (
                  <Tag key={typeof tag === 'string' ? tag : tag.id} variant="subtle" color="default" size="sm">
                    {typeof tag === 'string' ? tag : tag.name}
                  </Tag>
                ))}
              </div>
            </div>
          )}

          {/* Facilities */}
          {facilityList.length > 0 && (
            <div>
              <p className="text-xs text-stone-500 mb-3">配套设施</p>
              <div className="grid grid-cols-4 gap-2">
                {facilityList.map((facility) => (
                  <div
                    key={facility.label}
                    className={cn(
                      "flex flex-col items-center gap-1 p-3 rounded-xl transition-colors",
                      facility.available
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-stone-100 text-stone-400"
                    )}
                  >
                    {facility.available ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <X className="h-4 w-4" />
                    )}
                    <span className="text-xs font-medium">{facility.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Routes List */}
          {location.routes && location.routes.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-stone-500">
                  可选路线 ({location.routes.length})
                </p>
              </div>
              {/* 难度筛选 */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {DIFFICULTY_OPTIONS.filter(opt =>
                  opt.value === "all" || location.routes!.some(r => r.difficulty === opt.value)
                ).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setDifficultyFilter(opt.value)}
                    className={cn(
                      "px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
                      difficultyFilter === opt.value
                        ? "bg-stone-800 text-white"
                        : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <div className="space-y-3">
                {location.routes
                  .filter(r => difficultyFilter === "all" || r.difficulty === difficultyFilter)
                  .map((route) => {
                    const difficulty = difficultyConfig[route.difficulty];
                    const isSelected = selectedRouteId === route.id;
                    const content = (
                      <>
                        {/* 路线名称和难度 */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <RouteIcon className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                            <span className="text-sm font-semibold text-stone-900 truncate">
                              {route.name}
                            </span>
                          </div>
                          <Badge className={difficulty.color} variant="secondary">
                            {difficulty.label}
                          </Badge>
                        </div>

                        {/* 路线描述 */}
                        {route.description && (
                          <p className="text-xs text-stone-600 line-clamp-2 mb-3 leading-relaxed">
                            {route.description}
                          </p>
                        )}

                        {/* 路线信息：时长、距离、海拔 */}
                        <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500">
                          {route.duration && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5 text-stone-400" />
                              <span>{route.duration}</span>
                            </div>
                          )}
                          {route.distance && (
                            <div className="flex items-center gap-1">
                              <Ruler className="h-3.5 w-3.5 text-stone-400" />
                              <span>路线长度 {route.distance}{typeof route.distance === 'number' ? '公里' : ''}</span>
                            </div>
                          )}
                          {route.elevation && (
                            <div className="flex items-center gap-1">
                              <Mountain className="h-3.5 w-3.5 text-stone-400" />
                              <span>爬升 {route.elevation}</span>
                            </div>
                          )}
                        </div>
                      </>
                    );

                    return onRouteSelect ? (
                      <button
                        key={route.id}
                        onClick={() => onRouteSelect(route.id)}
                        className={cn(
                          "w-full text-left p-4 rounded-xl border transition-all",
                          isSelected
                            ? "border-emerald-500 bg-emerald-50 shadow-sm"
                            : "border-stone-200 bg-white hover:border-stone-300 hover:shadow-md"
                        )}
                      >
                        {content}
                      </button>
                    ) : (
                      <Link
                        key={route.id}
                        href={`/routes/${route.id}`}
                        className="block p-4 rounded-xl border border-stone-200 hover:border-stone-300 hover:shadow-md transition-all bg-white"
                      >
                        {content}
                      </Link>
                    );
                  })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export { LocationInfoCard };
