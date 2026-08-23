import {
  ExternalLink,
  MapPin,
  Navigation,
} from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { cn } from "@/lib/utils";
import type { Location } from "@/lib/types";

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
  const { t } = useI18n(["locationDetail", "common"]);

  const hasCoords = hasValidCoords(location.coordinates);

  const parkingAvailable = location.parkingAvailable ?? null;
  const parkingInfo = (location.parkingInfo ?? "").trim();
  const hasParking = parkingAvailable !== null || parkingInfo.length > 0;

  if (!hasCoords && !hasParking) return null;

  return (
    <section className="rounded-2xl bg-card p-5 shadow-warm-sm sm:p-6">
      <header className="mb-4">
        <h2 className="text-base font-bold text-foreground flex items-center gap-2">
          <span className="w-1 h-4 rounded-full bg-sky-400 flex-shrink-0" />
          {t("locationDetail.decision.title")}
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
          {t("locationDetail.decision.subtitle")}
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        {hasCoords && (() => {
          const transportMapUrl = buildFallbackMapUrl(location);
          return (
            <div className="rounded-xl border border-stone-100 bg-stone-50/60 p-4 dark:border-stone-800 dark:bg-stone-900/50 sm:col-span-2">
              <p className="mb-3 text-2xs font-bold uppercase text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
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
      </div>
    </section>
  );
}

function OpenInMapButton({ href, t }: { href: string; t: Translate }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-1 inline-flex items-center gap-1.5 rounded-lg border border-sky-200 dark:border-sky-800/60 bg-sky-50/70 dark:bg-sky-950/30 px-3 py-1.5 text-xs font-semibold text-sky-700 dark:text-sky-300 transition-colors hover:bg-sky-100 dark:hover:bg-sky-900/40"
    >
      <ExternalLink className="h-3.5 w-3.5" />
      {t("locationDetail.transport.openInMap")}
    </a>
  );
}

function buildFallbackMapUrl(location: Location): string {
  const c = location.coordinates;
  if (!hasValidCoords(c)) return "";
  return (
    "https://uri.amap.com/marker?position=" +
    c!.lng +
    "," +
    c!.lat +
    "&callnative=1"
  );
}

// ─── Parking ──────────────────────────────────────────────────────────────────

interface ParkingSubBlockProps {
  available: boolean | null;
  info: string;
  t: Translate;
}

function ParkingSubBlock({ available, info, t }: ParkingSubBlockProps) {
  const showStatus = available !== null;
  return (
            <div className="rounded-xl border border-stone-100 bg-stone-50/60 p-4 dark:border-stone-800 dark:bg-stone-900/50">
      <p className="mb-3 flex items-center gap-1.5 text-2xs font-bold uppercase text-stone-500 dark:text-stone-400">
        <MapPin className="h-3.5 w-3.5" />
        {t("locationDetail.parking.title")}
      </p>
      {showStatus && (
        <p
          className={cn(
            "text-sm font-semibold",
            available
              ? "text-emerald-700 dark:text-emerald-400"
              : "text-amber-700 dark:text-amber-400",
          )}
        >
          {available
            ? t("locationDetail.parking.available")
            : t("locationDetail.parking.noParking")}
        </p>
      )}
      {info && (
        <p className="mt-1.5 text-xs leading-relaxed text-stone-600 dark:text-stone-400">
          {info}
        </p>
      )}
    </div>
  );
}
