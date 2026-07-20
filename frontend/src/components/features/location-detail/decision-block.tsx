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
import { fetchAPI } from "@/lib/api";
import { cn } from "@/lib/utils";
import type {
  Location,
  TransportationData,
  TransportationResponse,
} from "@/lib/types";
import { normalizeLocationHiking } from "./route-utils";

type TransportState =
  | { kind: "loading" }
  | { kind: "ready"; data: TransportationData; staleDays: number | null }
  | { kind: "error" };

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

  const [transport, setTransport] = React.useState<TransportState>({
    kind: "loading",
  });

  /**
   * task #170 CR Nit 1（Martin）：加 AbortController 防 race。
   * client-side navigation 快切两个 location 时，旧请求可能覆盖新数据；
   * unmount 时 AbortError 静默 return，不 setState。
   */
  const fetchTransport = React.useCallback(
    async (signal?: AbortSignal) => {
      setTransport({ kind: "loading" });
      try {
        const res = await fetchAPI(
          "/api/locations/" + location.id + "/transportation",
          { signal },
        );
        if (!res.ok) throw new Error("status=" + res.status);
        const json = (await res.json()) as TransportationResponse;
        if (!json || !json.success || !json.transportation) {
          throw new Error("bad payload");
        }
        if (signal?.aborted) return;
        setTransport({
          kind: "ready",
          data: json.transportation,
          staleDays: json.meta ? json.meta.staleDays ?? null : null,
        });
      } catch (err) {
        // AbortError: 用户切走 location / unmount，静默丢弃
        if (
          (err instanceof DOMException && err.name === "AbortError") ||
          signal?.aborted
        ) {
          return;
        }
        console.warn("[DecisionBlock] transport fetch failed", err);
        setTransport({ kind: "error" });
      }
    },
    [location.id],
  );

  React.useEffect(() => {
    if (!hasCoords) return;
    const ctrl = new AbortController();
    void fetchTransport(ctrl.signal);
    return () => ctrl.abort();
  }, [hasCoords, fetchTransport]);

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
        {hasCoords && (
          <TransportSubBlock
            location={location}
            state={transport}
            onRetry={fetchTransport}
            locale={locale}
            t={t}
          />
        )}
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

// ─── Transport ────────────────────────────────────────────────────────────────

interface TransportSubBlockProps {
  location: Location;
  state: TransportState;
  onRetry: () => void;
  locale: string;
  t: Translate;
}

function TransportSubBlock({ location, state, onRetry, locale, t }: TransportSubBlockProps) {
  return (
    <div className="rounded-xl border border-stone-100 bg-stone-50/60 dark:border-stone-800 dark:bg-stone-900/50 p-3.5">
      <p className="mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase text-stone-500 dark:text-stone-400">
        <Navigation className="h-3.5 w-3.5" />
        {t("locationDetail.transport.title")}
      </p>

      {state.kind === "loading" && (
        <div className="flex items-center gap-2 py-2 text-xs text-stone-500 dark:text-stone-400">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {t("locationDetail.transport.loading")}
        </div>
      )}

      {state.kind === "error" && (
        <TransportErrorFallback location={location} onRetry={onRetry} t={t} />
      )}

      {state.kind === "ready" && (
        <TransportReadyView data={state.data} staleDays={state.staleDays} locale={locale} t={t} />
      )}
    </div>
  );
}

interface TransportReadyViewProps {
  data: TransportationData;
  staleDays: number | null;
  locale: string;
  t: Translate;
}

function TransportReadyView({ data, staleDays, locale, t }: TransportReadyViewProps) {
  const showStale = typeof staleDays === "number" && staleDays >= 7;

  // amap 全挂：只显示 mapUrl CTA
  if (data.amapAllFailed) {
    return (
      <div className="space-y-2">
        <p className="text-xs text-stone-500 dark:text-stone-400">
          {t("locationDetail.transport.fallbackHint")}
        </p>
        {data.mapUrl && <OpenInMapButton href={data.mapUrl} t={t} />}
        {showStale && <StaleHint days={staleDays as number} t={t} />}
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {data.subway && <SubwayRow subway={data.subway} t={t} />}
      {data.driving && <DrivingRow driving={data.driving} locale={locale} t={t} />}
      {data.mapUrl && <OpenInMapButton href={data.mapUrl} t={t} />}
      {showStale && <StaleHint days={staleDays as number} t={t} />}
    </div>
  );
}

function SubwayRow({
  subway,
  t,
}: {
  subway: NonNullable<TransportationData["subway"]>;
  t: Translate;
}) {
  const hasLines = Array.isArray(subway.lines) && subway.lines.length > 0;
  const lineText = hasLines
    ? t("locationDetail.transport.subwayWithLines", {
        lines: subway.lines.join(" / "),
        station: subway.station,
        n: subway.walkMinutes,
      })
    : t("locationDetail.transport.subwayLine", {
        station: subway.station,
        n: subway.walkMinutes,
      });

  return (
    <div className="flex items-start gap-2 text-sm text-foreground">
      <Train className="mt-0.5 h-4 w-4 flex-shrink-0 text-sky-500" />
      <div className="flex-1">
        <p className="text-[11px] font-semibold uppercase text-stone-500 dark:text-stone-400">
          {t("locationDetail.transport.subwayLabel")}
        </p>
        <p className="mt-0.5 leading-relaxed text-stone-700 dark:text-stone-300">
          {lineText}
        </p>
        {subway.approximate && (
          <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
            {t("locationDetail.transport.subwayTransferHint")}
          </p>
        )}
      </div>
    </div>
  );
}

function DrivingRow({
  driving,
  locale,
  t,
}: {
  driving: NonNullable<TransportationData["driving"]>;
  locale: string;
  t: Translate;
}) {
  const label = pickLocaleString(driving.referencePointLabel, locale);
  return (
    <div className="flex items-start gap-2 text-sm text-foreground">
      <Car className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
      <div className="flex-1">
        <p className="text-[11px] font-semibold uppercase text-stone-500 dark:text-stone-400">
          {t("locationDetail.transport.drivingLabel")}
        </p>
        <p className="mt-0.5 leading-relaxed text-stone-700 dark:text-stone-300">
          {t("locationDetail.transport.drivingDistance", {
            landmark: label,
            km: driving.distanceKm,
          })}
          {" · "}
          {t("locationDetail.transport.drivingDuration", {
            n: driving.durationMinutes,
          })}
        </p>
      </div>
    </div>
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

function StaleHint({ days, t }: { days: number; t: Translate }) {
  return (
    <p className="mt-1 flex items-center gap-1 text-[11px] text-stone-500 dark:text-stone-500">
      <AlertCircle className="h-3 w-3" />
      {t("locationDetail.transport.stale", { n: days })}
    </p>
  );
}

function TransportErrorFallback({
  location,
  onRetry,
  t,
}: {
  location: Location;
  onRetry: () => void;
  t: Translate;
}) {
  const mapUrl = buildFallbackMapUrl(location);
  return (
    <div className="space-y-2">
      <p className="flex items-start gap-1.5 text-xs text-stone-500 dark:text-stone-400">
        <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
        {t("locationDetail.transport.fallbackHint")}
      </p>
      <div className="flex items-center gap-2">
        {mapUrl && <OpenInMapButton href={mapUrl} t={t} />}
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1 rounded-lg border border-stone-200 dark:border-stone-700 bg-transparent px-2.5 py-1.5 text-xs font-semibold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
        >
          <RotateCcw className="h-3 w-3" />
          {t("locationDetail.transport.retry")}
        </button>
      </div>
    </div>
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

function pickLocaleString(
  label: { zh: string; en: string; ja: string } | undefined | null,
  locale: string,
): string {
  if (!label) return "";
  if (locale === "en" && label.en) return label.en;
  if (locale === "ja" && label.ja) return label.ja;
  return label.zh || label.en || label.ja || "";
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
    <div className="rounded-xl border border-stone-100 bg-stone-50/60 dark:border-stone-800 dark:bg-stone-900/50 p-3.5">
      <p className="mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase text-stone-500 dark:text-stone-400">
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

// ─── Gear ─────────────────────────────────────────────────────────────────────

interface GearSubBlockProps {
  essential: string[];
  optional: string[];
  notes: string[];
  t: Translate;
}

function GearSubBlock({ essential, optional, notes, t }: GearSubBlockProps) {
  return (
    <div className="rounded-xl border border-stone-100 bg-stone-50/60 dark:border-stone-800 dark:bg-stone-900/50 p-3.5">
      <p className="mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase text-stone-500 dark:text-stone-400">
        <Backpack className="h-3.5 w-3.5" />
        {t("locationDetail.gear.title")}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {essential.length > 0 && (
          <GearList
            title={t("locationDetail.gear.essential")}
            items={essential}
            tone="essential"
          />
        )}
        {optional.length > 0 && (
          <GearList
            title={t("locationDetail.gear.optional")}
            items={optional}
            tone="optional"
          />
        )}
      </div>
      {notes.length > 0 && (
        <div className="mt-3 rounded-lg border border-amber-100 bg-amber-50/70 dark:border-amber-900/40 dark:bg-amber-950/20 px-3 py-2.5">
          <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase text-amber-700 dark:text-amber-400">
            <AlertTriangle className="h-3.5 w-3.5" />
            {t("locationDetail.gear.notes")}
          </p>
          <ul className="space-y-1">
            {notes.map((note, idx) => (
              <li
                key={note + "-" + idx}
                className="flex items-start gap-1.5 text-xs leading-relaxed text-stone-700 dark:text-stone-300"
              >
                <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-amber-400" />
                {note}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function GearList({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "essential" | "optional";
}) {
  return (
    <div>
      <p
        className={cn(
          "mb-1.5 text-[11px] font-bold uppercase",
          tone === "essential"
            ? "text-emerald-700 dark:text-emerald-400"
            : "text-stone-500 dark:text-stone-400",
        )}
      >
        {title}
      </p>
      <ul className="space-y-1">
        {items.map((item, idx) => (
          <li
            key={item + "-" + idx}
            className="flex items-start gap-1.5 text-xs leading-relaxed text-stone-700 dark:text-stone-300"
          >
            <span
              className={cn(
                "mt-1.5 h-1 w-1 flex-shrink-0 rounded-full",
                tone === "essential"
                  ? "bg-emerald-400"
                  : "bg-stone-400 dark:bg-stone-500",
              )}
            />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
