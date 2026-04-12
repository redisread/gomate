import * as React from "react";
import { cn } from "@/lib/utils";
import type { RoutePoi } from "@/lib/types";
import { getLocationPois } from "@/lib/api";
import { copy } from "@/lib/copy";
import { POI_ICON_MAP, POI_COLOR_MAP } from "./constants";

interface PoiSectionProps {
  locationId: string;
}

export function PoiSection({ locationId }: PoiSectionProps) {
  const [pois, setPois] = React.useState<RoutePoi[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    getLocationPois(locationId)
      .then(setPois)
      .finally(() => setLoading(false));
  }, [locationId]);

  if (loading || pois.length === 0) return null;

  return (
    <div className="bg-card rounded-2xl border border-stone-100 dark:border-stone-800 p-5"
      style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
      <h2 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
        <span className="w-1 h-4 rounded-full bg-violet-400 flex-shrink-0" />
        {copy.locations.poiSection}
        <span className="ml-auto text-xs font-normal text-stone-400 dark:text-stone-500 bg-stone-50 dark:bg-stone-800 px-2 py-0.5 rounded-full border border-stone-100 dark:border-stone-700">
          {pois.length} 个
        </span>
      </h2>

      <div className="relative">
        {pois.length > 1 && (
          <div className="absolute left-[19px] top-6 bottom-6 w-px bg-stone-100 dark:bg-stone-800" />
        )}

        <div className="space-y-3">
          {pois.map((poi, index) => {
            const roleType = poi.roleType as string;
            const colors = POI_COLOR_MAP[roleType] ?? POI_COLOR_MAP.poi;
            const icon = POI_ICON_MAP[roleType] ?? POI_ICON_MAP.poi;
            const roleLabel = copy.locations.poiRoleTypes[
              roleType as keyof typeof copy.locations.poiRoleTypes
            ] ?? roleType;

            return (
              <div key={poi.id} className="flex items-start gap-3">
                <div className="relative flex-shrink-0">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center border-2 border-white dark:border-stone-900 shadow-sm z-10 relative",
                      colors.bg
                    )}
                  >
                    <span className={colors.text}>{icon}</span>
                  </div>
                  <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-stone-700 dark:bg-stone-600 flex items-center justify-center z-20">
                    <span className="text-[8px] font-bold text-white">{index + 1}</span>
                  </div>
                </div>

                <div className="flex-1 min-w-0 pb-1">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="text-sm font-semibold text-foreground">{poi.name}</span>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-semibold border",
                      colors.bg, colors.text, colors.border
                    )}>
                      {roleLabel}
                    </span>
                  </div>
                  {poi.description && (
                    <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">{poi.description}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
