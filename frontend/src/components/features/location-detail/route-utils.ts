import type { Location } from "@/lib/types";

export type RouteMetricUnit = "hour" | "minute" | "kilometer" | "meter";

export interface RouteMetric {
  value: string;
  unit?: RouteMetricUnit;
}

export interface NormalizedLocationHiking {
  id: string;
  name: string;
  difficulty?: NonNullable<Location["extra"]["hiking"]>["difficulty"];
  duration?: RouteMetric;
  distance?: RouteMetric;
  elevation?: RouteMetric;
  gearEssential: string[];
  gearOptional: string[];
  warnings: string[];
  routeGuide?: {
    overview?: string;
    tips: string[];
  };
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function trimNumberString(value: number | string): string {
  if (typeof value === "number") return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(1)));
  const match = value.trim().match(/[\d.]+/);
  return match?.[0] ?? value.trim();
}

function formatDurationMetric(min: number | undefined, max: number | undefined): RouteMetric | undefined {
  if (typeof min === "number" && min > 0) {
    const maxValue = typeof max === "number" && max > 0 ? max : min;
    if (min >= 60 && maxValue >= 60) {
      const minHours = min / 60;
      const maxHours = maxValue / 60;
      const value = minHours === maxHours
        ? trimNumberString(minHours)
        : `${trimNumberString(minHours)}-${trimNumberString(maxHours)}`;
      return { value, unit: "hour" };
    }
    const value = min === maxValue ? String(min) : `${min}-${maxValue}`;
    return { value, unit: "minute" };
  }

  return undefined;
}

function formatDistanceMetric(distance: number | undefined): RouteMetric | undefined {
  if (distance === undefined) return undefined;
  return { value: trimNumberString(distance), unit: "kilometer" };
}

function formatElevationMetric(elevation: number | undefined): RouteMetric | undefined {
  if (elevation === undefined) return undefined;
  return { value: trimNumberString(elevation), unit: "meter" };
}

function normalizeRouteGuide(
  hiking: NonNullable<Location["extra"]["hiking"]>,
): NormalizedLocationHiking["routeGuide"] {
  const overview = typeof hiking.overview === "string" && hiking.overview.trim()
    ? hiking.overview.trim()
    : undefined;
  const tips = readStringArray(hiking.tips);
  if (!overview && tips.length === 0) return undefined;
  return { overview, tips };
}

/**
 * Project the public V2 Location DTO into the view model used by route cards.
 * Storage JSON and the removed flat Location fields are intentionally unsupported.
 */
export function normalizeLocationHiking(location: Location): NormalizedLocationHiking | null {
  const hiking = location.extra.hiking;
  if (!hiking) return null;

  const normalized: NormalizedLocationHiking = {
    id: `${location.id}-hiking`,
    name: location.name,
    difficulty: hiking.difficulty,
    duration: formatDurationMetric(hiking.durationMin, hiking.durationMax),
    distance: formatDistanceMetric(hiking.distanceKm),
    elevation: formatElevationMetric(hiking.elevationGainM),
    gearEssential: readStringArray(hiking.gearEssential),
    gearOptional: readStringArray(hiking.gearOptional),
    warnings: readStringArray(hiking.warnings),
    routeGuide: normalizeRouteGuide(hiking),
  };
  const hasAnyMetric = normalized.difficulty || normalized.duration || normalized.distance || normalized.elevation;
  const hasAnyNote = Boolean(normalized.routeGuide?.overview) || (normalized.routeGuide?.tips.length ?? 0) > 0
    || normalized.gearEssential.length > 0 || normalized.gearOptional.length > 0
    || normalized.warnings.length > 0;
  return hasAnyMetric || hasAnyNote ? normalized : null;
}

/** 把 RouteMetric 渲染为带单位的文本（单位走 locationDetail.metricUnits.* i18n） */
export function formatRouteMetric(
  metric: RouteMetric | undefined,
  t: (key: string, vars?: Record<string, string | number>) => string
): string | undefined {
  if (!metric) return undefined;
  const unit = metric.unit ? t(`locationDetail.metricUnits.${metric.unit}`) : "";
  return unit ? `${metric.value} ${unit}` : metric.value;
}
