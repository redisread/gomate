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
import { Location } from "@/lib/data/mock";
import { cn } from "@/lib/utils";

interface LocationInfoCardProps {
  location: Location;
  className?: string;
}

function LocationInfoCard({ location, className }: LocationInfoCardProps) {
  const infoItems = [
    {
      icon: Clock,
      label: "预计用时",
      value: location.duration,
    },
    {
      icon: Route,
      label: "路线长度",
      value: location.distance,
    },
    {
      icon: Mountain,
      label: "累计爬升",
      value: location.elevation,
    },
    {
      icon: Calendar,
      label: "最佳季节",
      value: location.bestSeason.join("、"),
    },
  ];

  const facilities = [
    { icon: Car, label: "停车场", available: location.facilities.parking },
    { icon: Toilet, label: "洗手间", available: location.facilities.restroom },
    { icon: Droplets, label: "补给点", available: location.facilities.water },
    { icon: UtensilsCrossed, label: "餐饮", available: location.facilities.food },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <Card className={cn("border-stone-200", className)}>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-stone-900">
            路线信息
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
            <p className="text-xs text-stone-500 mb-2">路线标签</p>
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
            <p className="text-xs text-stone-500 mb-3">配套设施</p>
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
