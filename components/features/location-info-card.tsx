"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Clock,
  Route,
  Mountain,
  Calendar,
  Car,
  Toilet,
  Droplets,
  UtensilsCrossed,
  Check,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tag } from "@/app/components/ui/tag";
import type { Location } from "@/lib/types";
import { cn } from "@/lib/utils";
import { copy } from "@/lib/copy";

const loc = copy.locations;

interface LocationInfoCardProps {
  location: Location;
  className?: string;
}

function LocationInfoCard({ location, className }: LocationInfoCardProps) {
  const infoItems = [
    {
      icon: Clock,
      label: loc.estimatedTime,
      value: location.duration,
    },
    {
      icon: Route,
      label: loc.routeLength,
      value: location.distance,
    },
    {
      icon: Mountain,
      label: loc.totalElevation,
      value: location.elevation,
    },
    {
      icon: Calendar,
      label: loc.bestSeason,
      value: location.bestSeason.join("、"),
    },
  ];

  const facilitiesData = location.extra?.facilities || [];
  const facilityConfig = [
    { key: "parking", icon: Car, label: loc.facilityParking },
    { key: "restroom", icon: Toilet, label: loc.facilityRestroom },
    { key: "water", icon: Droplets, label: loc.facilityWater },
    { key: "food", icon: UtensilsCrossed, label: loc.facilityFood },
  ];
  const facilities = facilityConfig.map(config => ({
    ...config,
    available: facilitiesData.includes(config.key),
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
            {loc.routeInfo}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Info Grid */}
          <div className="grid grid-cols-2 gap-4">
            {infoItems.map((item) => (
              <div key={item.label} className="flex items-start gap-3">
                <div className="p-2 bg-stone-100 rounded-lg">
                  <item.icon className="h-4 w-4 text-stone-600" />
                </div>
                <div>
                  <p className="text-xs text-stone-500">{item.label}</p>
                  <p className="text-sm font-medium text-stone-900">
                    {item.value}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Tags */}
          <div>
            <p className="text-xs text-stone-500 mb-2">{loc.routeTags}</p>
            <div className="flex flex-wrap gap-2">
              {location.tags.map((tag) => (
                <Tag key={tag} variant="subtle" color="default" size="sm">
                  {tag}
                </Tag>
              ))}
            </div>
          </div>

          {/* Facilities */}
          <div>
            <p className="text-xs text-stone-500 mb-3">{loc.facilities}</p>
            <div className="grid grid-cols-4 gap-2">
              {facilities.map((facility) => (
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
        </CardContent>
      </Card>
    </motion.div>
  );
}

export { LocationInfoCard };
