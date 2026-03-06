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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tag } from "@/app/components/ui/tag";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Location } from "@/lib/types";
import { cn } from "@/lib/utils";

interface LocationInfoCardProps {
  location: Location;
  className?: string;
}

const difficultyConfig = {
  easy: { label: "简单", color: "bg-green-100 text-green-800" },
  moderate: { label: "中等", color: "bg-blue-100 text-blue-800" },
  hard: { label: "困难", color: "bg-orange-100 text-orange-800" },
  expert: { label: "专家", color: "bg-red-100 text-red-800" },
};

function LocationInfoCard({ location, className }: LocationInfoCardProps) {
  const facilities = location.extra?.facilities || [];
  const facilityConfig = [
    { key: "parking", icon: Car, label: "停车场" },
    { key: "restroom", icon: Toilet, label: "洗手间" },
    { key: "water", icon: Droplets, label: "补给点" },
    { key: "food", icon: UtensilsCrossed, label: "餐饮" },
  ];
  const facilityList = facilityConfig.map(config => ({
    ...config,
    available: facilities.includes(config.key),
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
            {location.address && (
              <div className="flex items-start gap-3">
                <div className="p-2 bg-stone-100 rounded-lg">
                  <MapPin className="h-4 w-4 text-stone-600" />
                </div>
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
              <p className="text-xs text-stone-500 mb-3">
                可选路线 ({location.routes.length})
              </p>
              <div className="space-y-2">
                {location.routes.map((route) => {
                  const difficulty = difficultyConfig[route.difficulty];
                  return (
                    <Link
                      key={route.id}
                      href={`/routes/${route.id}`}
                      className="block p-3 rounded-lg border border-stone-200 hover:border-stone-300 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <RouteIcon className="h-3.5 w-3.5 text-stone-500 flex-shrink-0" />
                            <span className="text-sm font-medium text-stone-900 truncate">
                              {route.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-stone-500">
                            <span>{route.duration}</span>
                            <span>·</span>
                            <span>{route.distance}</span>
                          </div>
                        </div>
                        <Badge className={difficulty.color} variant="secondary">
                          {difficulty.label}
                        </Badge>
                      </div>
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
