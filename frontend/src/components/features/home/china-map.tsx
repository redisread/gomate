"use client";

import * as React from "react";
import { ArrowLeft, MapPinned } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import {
  getMapTransform,
  MAP_PROVINCE_PARAM,
  parseMapProvince,
  projectChina,
  transformMapPoint,
  PROVINCE_CENTERS,
} from "@/lib/china-map";
import { fetchAPI } from "@/lib/api";

interface ProvinceStat {
  province: string;
  count: number;
}

interface MapPoint {
  id: string;
  name: string;
  slug: string;
  cityName: string;
  province: string | null;
  lat: number;
  lng: number;
}

interface StatsResponse {
  provinces: ProvinceStat[];
  points: MapPoint[];
}

interface Tooltip {
  x: number;
  y: number;
  title: string;
  subtitle?: string;
}

function provinceFill(count: number, max: number): string {
  if (count === 0) return "#f2ede7";
  const t = 0.35 + 0.65 * (count / Math.max(1, max));
  const l = 0.72 - 0.25 * t;
  const c = 0.09 + 0.10 * t;
  return `oklch(${l.toFixed(3)} ${c.toFixed(3)} 58)`;
}

function updateMapUrl(province: string | null, mode: "push" | "replace") {
  const url = new URL(window.location.href);
  if (province) url.searchParams.set(MAP_PROVINCE_PARAM, province);
  else url.searchParams.delete(MAP_PROVINCE_PARAM);

  const nextUrl = `${url.pathname}${url.search}${url.hash}`;
  window.history[`${mode}State`]({}, "", nextUrl);
}

function TooltipCard({ tooltip, mobile = false }: { tooltip: Tooltip; mobile?: boolean }) {
  return (
    <div
      className={
        mobile
          ? "pointer-events-none absolute inset-x-2 bottom-2 z-20 rounded-xl bg-foreground px-3 py-2.5 text-xs text-background shadow-lg sm:hidden"
          : "pointer-events-none absolute z-20 hidden max-w-[15rem] -translate-x-1/2 -translate-y-full rounded-lg bg-foreground px-3 py-1.5 text-xs text-background shadow-lg sm:block"
      }
      style={
        mobile
          ? undefined
          : {
              left: `${Math.min(92, Math.max(8, (tooltip.x / 800) * 100))}%`,
              top: `${Math.min(88, Math.max(12, (tooltip.y / 620) * 100))}%`,
            }
      }
    >
      <p className="font-semibold">{tooltip.title}</p>
      {tooltip.subtitle && <p className="mt-0.5 text-background/70">{tooltip.subtitle}</p>}
    </div>
  );
}

export function ChinaMap({ className }: { className?: string }) {
  const { t } = useI18n(["home", "locations", "common"]);
  const [svgPaths, setSvgPaths] = React.useState<{ name: string; d: string }[]>([]);
  const [stats, setStats] = React.useState<StatsResponse | null>(null);
  const [tooltip, setTooltip] = React.useState<Tooltip | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [focusedProvince, setFocusedProvince] = React.useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = React.useState(false);
  const transitionTimer = React.useRef<number | null>(null);
  const pushedMapState = React.useRef(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/maps/china-provinces.svg");
        const svgText = await res.text();
        const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
        const paths = [...doc.querySelectorAll("path[data-name]")].map((el) => ({
          name: el.getAttribute("data-name") || "",
          d: el.getAttribute("d") || "",
        }));
        if (!cancelled) setSvgPaths(paths.filter((p) => p.name && p.d));
      } catch {
        // 地图加载失败 → 组件留空，不阻断页面
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchAPI("/v1/locations/stats");
        const data = (await res.json()) as StatsResponse;
        if (!cancelled) setStats(data);
      } catch {
        // 失败静默：地图无数据时不渲染点
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    setFocusedProvince(parseMapProvince(window.location.search));

    const handlePopState = () => {
      const province = parseMapProvince(window.location.search);
      pushedMapState.current = false;
      setFocusedProvince(province);
      setTooltip(null);
      setIsTransitioning(false);
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      if (transitionTimer.current !== null) window.clearTimeout(transitionTimer.current);
    };
  }, []);

  const provinceCount = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const province of stats?.provinces ?? []) map.set(province.province, province.count);
    return map;
  }, [stats]);
  const maxCount = Math.max(1, ...(stats?.provinces ?? []).map((province) => province.count));
  const mapTransform = React.useMemo(() => getMapTransform(focusedProvince), [focusedProvince]);
  const mapPoints = React.useMemo(
    () =>
      focusedProvince
        ? (stats?.points ?? []).filter((point) => point.province === focusedProvince)
        : (stats?.points ?? []),
    [focusedProvince, stats],
  );
  const focusedCount = focusedProvince ? provinceCount.get(focusedProvince) ?? 0 : 0;

  const focusProvince = (name: string) => {
    if (!PROVINCE_CENTERS[name]) return;
    setTooltip(null);
    setIsTransitioning(true);
    if (!focusedProvince) {
      pushedMapState.current = true;
      updateMapUrl(name, "push");
    } else {
      updateMapUrl(name, "replace");
    }
    setFocusedProvince(name);
    if (transitionTimer.current !== null) window.clearTimeout(transitionTimer.current);
    transitionTimer.current = window.setTimeout(() => setIsTransitioning(false), 560);
  };

  const leaveProvince = () => {
    setTooltip(null);
    if (pushedMapState.current) {
      pushedMapState.current = false;
      window.history.back();
      return;
    }
    updateMapUrl(null, "replace");
    setFocusedProvince(null);
  };

  const handleProvinceEnter = (name: string) => {
    if (focusedProvince) return;
    const center = PROVINCE_CENTERS[name];
    if (!center) return;
    const count = provinceCount.get(name) ?? 0;
    setTooltip({
      x: center.x,
      y: center.y,
      title: name,
      subtitle: count > 0 ? t("locations.mapProvinceCount", { count }) : t("locations.mapNoLocations"),
    });
  };

  const handlePointEnter = (point: MapPoint) => {
    const position = transformMapPoint(projectChina(point.lat, point.lng), mapTransform);
    const citySubtitle =
      point.cityName && point.province
        ? t("locations.mapPointCity", { city: point.cityName, province: point.province })
        : point.cityName || point.province || t("locations.defaultCity");
    setTooltip({
      x: position.x,
      y: position.y - 12,
      title: point.name,
      subtitle: citySubtitle,
    });
  };

  const handleInteractiveKeyDown = (event: React.KeyboardEvent, action: () => void) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      action();
    }
  };

  return (
    <div className={className ?? ""}>
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card">
        <svg
          viewBox="0 0 800 620"
          role="group"
          aria-label={
            focusedProvince
              ? t("home.mapFocusedAriaLabel", { province: focusedProvince })
              : t("home.mapAriaLabel")
          }
          className="block h-auto w-full select-none"
          onMouseLeave={() => setTooltip(null)}
        >
          <g
            transform={`matrix(${mapTransform.scale} 0 0 ${mapTransform.scale} ${mapTransform.translateX} ${mapTransform.translateY})`}
            className="transition-transform duration-500 ease-out motion-reduce:transition-none"
          >
            {svgPaths.map((path) => {
              const count = provinceCount.get(path.name) ?? 0;
              const isFocused = focusedProvince === path.name;
              return (
                <path
                  key={path.name}
                  d={path.d}
                  fill={provinceFill(count, maxCount)}
                  stroke="#ffffff"
                  strokeWidth={isFocused ? 1.4 : 0.6}
                  tabIndex={focusedProvince ? -1 : 0}
                  role="button"
                  aria-label={path.name}
                  className={`cursor-pointer outline-none transition-[opacity,fill,stroke-width] duration-200 hover:opacity-80 focus-visible:opacity-80 focus-visible:stroke-foreground motion-reduce:transition-none ${
                    focusedProvince && !isFocused ? "pointer-events-none opacity-20" : ""
                  }`}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => handleProvinceEnter(path.name)}
                  onFocus={() => handleProvinceEnter(path.name)}
                  onClick={() => focusProvince(path.name)}
                  onKeyDown={(event) => handleInteractiveKeyDown(event, () => focusProvince(path.name))}
                />
              );
            })}

            {mapPoints.map((point) => {
              const position = projectChina(point.lat, point.lng);
              return (
                <g key={point.id}>
                  <circle
                    cx={position.x}
                    cy={position.y}
                    r={focusedProvince ? 12 : 10}
                    fill="transparent"
                    tabIndex={0}
                    role="button"
                    aria-label={point.name}
                    className="cursor-pointer outline-none"
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => handlePointEnter(point)}
                    onFocus={() => handlePointEnter(point)}
                    onClick={() => {
                      window.location.href = `/locations/${point.slug}`;
                    }}
                    onKeyDown={(event) =>
                      handleInteractiveKeyDown(event, () => {
                        window.location.href = `/locations/${point.slug}`;
                      })
                    }
                  />
                  <circle
                    cx={position.x}
                    cy={position.y}
                    r={focusedProvince ? 5.5 : 5}
                    fill="var(--primary)"
                    stroke="#fff"
                    strokeWidth={1.2}
                    pointerEvents="none"
                    className="transition-[r] duration-150 motion-reduce:transition-none"
                  />
                </g>
              );
            })}
          </g>
        </svg>

        {focusedProvince && (
          <div className="absolute inset-x-3 top-3 z-10 flex items-start justify-between gap-3">
            <div className="rounded-xl bg-card/90 px-3 py-2 shadow-warm-sm ring-1 ring-black/5 backdrop-blur-sm dark:ring-white/10">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                中国 / {focusedProvince}
              </p>
              <p className="mt-0.5 text-sm font-bold text-foreground">
                {focusedProvince} · {t("locations.mapProvinceCount", { count: focusedCount })}
              </p>
            </div>
            <button
              type="button"
              onClick={leaveProvince}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-card/90 px-3 text-xs font-semibold text-foreground shadow-warm-sm ring-1 ring-black/5 backdrop-blur-sm transition-[background-color,transform] duration-150 hover:bg-card active:scale-[0.97] dark:ring-white/10"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              {t("home.mapBackToChina")}
            </button>
          </div>
        )}

        {!focusedProvince && !loading && (
          <div className="pointer-events-none absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-card/85 px-3 py-1.5 text-center text-[11px] font-semibold text-muted-foreground shadow-warm-sm backdrop-blur-sm">
            <span className="inline-flex items-center gap-1.5">
              <MapPinned className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              {t("home.mapHint")}
            </span>
          </div>
        )}

        {focusedProvince && focusedCount === 0 && !loading && (
          <div className="absolute inset-x-4 bottom-4 z-10 rounded-2xl bg-card/95 p-4 shadow-warm-lg ring-1 ring-black/5 backdrop-blur-sm sm:left-auto sm:max-w-xs dark:ring-white/10">
            <p className="text-sm font-bold text-foreground">
              {t("home.mapFocusedEmptyTitle", { province: focusedProvince })}
            </p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{t("home.mapFocusedEmptyDesc")}</p>
            <button
              type="button"
              onClick={leaveProvince}
              className="mt-3 inline-flex min-h-9 items-center rounded-lg bg-foreground px-3 text-xs font-semibold text-background transition-[background-color,transform] duration-150 hover:bg-amber-800 hover:text-white active:scale-[0.97]"
            >
              {t("home.mapBrowseOtherRegions")}
            </button>
          </div>
        )}

        {focusedProvince && mapPoints.length > 0 && !tooltip && !isTransitioning && (
          <div className="pointer-events-none absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-card/85 px-3 py-1.5 text-center text-[11px] font-semibold text-muted-foreground shadow-warm-sm backdrop-blur-sm">
            {t("home.mapPointHint")}
          </div>
        )}

        {tooltip && (
          <>
            <TooltipCard tooltip={tooltip} />
            <TooltipCard tooltip={tooltip} mobile />
          </>
        )}

        <div className="sr-only" aria-live="polite">
          {focusedProvince && `${focusedProvince} · ${t("locations.mapProvinceCount", { count: focusedCount })}`}
        </div>

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-card/50">
            <span className="text-sm text-muted-foreground">{t("common.loading")}</span>
          </div>
        )}
      </div>
    </div>
  );
}
