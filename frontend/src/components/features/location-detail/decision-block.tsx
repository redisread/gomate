import * as React from "react";
import {
  AlertCircle,
  AlertTriangle,
  Backpack,
  Car,
  ExternalLink,
  Loader2,
  MapPin,
  Navigation,
  RotateCcw,
  Train,
} from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { cn } from "@/lib/utils";
import type {
  Location,
} from "@/lib/types";
import { normalizeLocationHiking } from "./route-utils";


type Translate = (key: string, vars?: Record<string, string | number>) => string;

interface DecisionBlockProps {
  location: Location;
}

/**
 * task #170 CR B1（Martin）：sentinel {0,0} 必须拦住。`Number.isFinite(0)===true`
 * 会让占位坐标漏过 hasCoords 校验 → transport fetch 触发 → mapUrl 指向非洲外海。
 * `buildFallbackMapUrl` 走同一 helper，保证 error fallback 也不生成 (0,0) 链接。
 */
function hasValidCoords(
  c: { lat: number; lng: number } | undefined | null,
): boolean {
  return (
    !!c &&
    Number.isFinite(c.lat) &&
    Number.isFinite(c.lng) &&
    !(c.lat === 0 && c.lng === 0)
  );
}

export function DecisionBlock({ location }: DecisionBlockProps) {
  const { t, locale } = useI18n(["locationDetail", "common"]);

  const hasCoords = hasValidCoords(location.coordinates);

  const parkingAvailable = location.parkingAvailable ?? null;
  const parkingInfo = (location.parkingInfo ?? "").trim();
  const hasParking = parkingAvailable !== null || parkingInfo.length > 0;

  const gearEssential = location.gearEssential ?? [];
  const gearOptional = location.gearOptional ?? [];
  const hiking = normalizeLocationHiking(location);
  const gearWarnings = hiking?.warnings ?? [];
  const hasGear =
    gearEssential.length > 0 ||
    gearOptional.length > 0 ||
    gearWarnings.length > 0;

  // task #203: transportation endpoint deleted, always null (static fallback CTA)
  const transport = null;

  if (!hasCoords && !hasParking && !hasGear) return null;

  return (
    <section className="bg-card rounded-xl border border-stone-100 dark:border-stone-800 p-4 sm:p-5 shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
      <header className="mb-4">
        <h2 className="text-base font-bold text-foreground flex items-center gap-2">
          <span className="w-1 h-4 rounded-full bg-sky-400 flex-shrink-0" />
          {t("locationDetail.decision.title")}
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
          {t("locationDetail.decision.subtitle")}
        </p>
      </header>

      <div className="flex flex-col gap-4">
        {hasCoords && (() => {
          const transportMapUrl = buildFallbackMapUrl(location);
          return (
            <div className="rounded-xl border border-stone-100 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-900/50 p-3.5 space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
                <Navigation className="h-3.5 w-3.5" />
                {t("locationDetail.transport.title")}
              </p>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                {t("locationDetail.transport.fallbackHint")}
              </p>
              {transportMapUrl && <OpenInMapButton href={transportMapUrl} t={t} />}
            </div>
          );
        })()}
        {hasParking && (
          <ParkingSubBlock
            available={parkingAvailable}
            info={parkingInfo}
            t={t}
          />
        )}
        {hasGear && (
          <GearSubBlock
            essential={gearEssential}
            optional={gearOptional}
            notes={gearWarnings}
            t={t}
          />
        )}
      </div>
    </section>
  );
}

