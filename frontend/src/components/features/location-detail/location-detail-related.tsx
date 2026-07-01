"use client";

import { MapPin } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import type { Location } from "@/lib/types";

interface LocationDetailRelatedProps {
  locations: Location[];
}

export function LocationDetailRelated({ locations }: LocationDetailRelatedProps) {
  const { t } = useI18n(["locationDetail", "common"]);

  if (locations.length === 0) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">
        {t("locationDetail.relatedTitle") || "相关地点"}
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {locations.map((location) => (
          <a
            key={location.id}
            href={`/locations/${location.slug || location.id}`}
            className="group"
          >
            <div className="aspect-[4/3] rounded-lg overflow-hidden mb-2">
              {location.coverImage ? (
                <img
                  src={location.coverImage}
                  alt={location.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <MapPin className="w-8 h-8 text-muted-foreground" />
                </div>
              )}
            </div>
            <h3 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
              {location.name}
            </h3>
            {location.cityName && (
              <p className="text-xs text-muted-foreground">{location.cityName}</p>
            )}
          </a>
        ))}
      </div>
    </div>
  );
}
