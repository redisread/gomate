"use client";

import { MapPin, Clock, Ruler, TrendingUp } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import type { Location } from "@/lib/types";

interface LocationDetailInfoProps {
  location: Location;
  primaryRoute?: {
    duration?: string;
    distance?: string;
    elevation?: string;
  };
}

export function LocationDetailInfo({ location, primaryRoute }: LocationDetailInfoProps) {
  const { t } = useI18n(["locationDetail", "locations", "common"]);

  return (
    <div className="space-y-6">
      {/* 地址 */}
      {(location.address || location.cityName) && (
        <div className="flex items-start gap-3">
          <MapPin className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
          <div>
            <p className="text-sm text-foreground">
              {[location.cityName, location.address].filter(Boolean).join(" · ")}
            </p>
          </div>
        </div>
      )}

      {/* 路线信息 */}
      {primaryRoute && (
        <div className="grid grid-cols-3 gap-4">
          {primaryRoute.duration && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">{t("locations.estimatedTime")}</p>
                <p className="text-sm font-medium">{primaryRoute.duration}</p>
              </div>
            </div>
          )}
          {primaryRoute.distance && (
            <div className="flex items-center gap-2">
              <Ruler className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">{t("locations.routeLength")}</p>
                <p className="text-sm font-medium">{primaryRoute.distance}</p>
              </div>
            </div>
          )}
          {primaryRoute.elevation && (
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">{t("locations.totalElevation")}</p>
                <p className="text-sm font-medium">{primaryRoute.elevation}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 描述 */}
      {location.description && (
        <div className="prose prose-sm max-w-none">
          <p className="text-muted-foreground leading-relaxed">
            {location.description}
          </p>
        </div>
      )}

      {/* 标签 */}
      {location.tags && location.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {location.tags.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary"
            >
              #{tag.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
