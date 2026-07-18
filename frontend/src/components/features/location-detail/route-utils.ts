import type { Location } from "@/lib/types";

export type RouteMetricUnit = "hour" | "minute" | "kilometer" | "meter";

export interface RouteMetric {
  value: string;
  unit?: RouteMetricUnit;
}

export interface NormalizedLocationRoute {
  id: string;
  name: string;
  description?: string;
  difficulty?: Location["difficulty"];
  duration?: RouteMetric;
  distance?: RouteMetric;
  elevation?: RouteMetric;
  equipmentNeeded: string[];
  warnings: string[];
  routeGuide?: {
    overview?: string;
    tips: string[];
  };
}

type RouteRecord = {
  id?: string;
  locationId?: string;
  name?: string;
  description?: string;
  difficulty?: Location["difficulty"];
  duration?: string;
  durationMin?: number | null;
  durationMax?: number | null;
  distance?: string | number | null;
  elevation?: string | number | null;
  equipmentNeeded?: string[] | null;
  warnings?: string[] | null;
  routeGuide?: unknown;
  extra?: unknown;
};

function parseJsonObject(value: unknown): Record<string, unknown> | undefined {
  if (!value) return undefined;
  if (typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value !== "string") return undefined;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : undefined;
  } catch {
    return undefined;
  }
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

function formatDurationMetric(route: RouteRecord): RouteMetric | undefined {
  const min = route.durationMin;
  const max = route.durationMax;
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

  if (typeof route.duration === "string" && route.duration.trim()) {
    return { value: route.duration.trim() };
  }
  return undefined;
}

function formatDistanceMetric(distance: RouteRecord["distance"]): RouteMetric | undefined {
  if (distance === undefined || distance === null || distance === "") return undefined;
  return { value: trimNumberString(distance), unit: "kilometer" };
}

function formatElevationMetric(elevation: RouteRecord["elevation"]): RouteMetric | undefined {
  if (elevation === undefined || elevation === null || elevation === "") return undefined;
  return { value: trimNumberString(elevation), unit: "meter" };
}

function normalizeRouteGuide(value: unknown): NormalizedLocationRoute["routeGuide"] {
  const parsed = parseJsonObject(value);
  if (!parsed) return undefined;
  const overview = typeof parsed.overview === "string" ? parsed.overview : undefined;
  const tips = readStringArray(parsed.tips);
  if (!overview && tips.length === 0) return undefined;
  return { overview, tips };
}

function normalizeRoute(route: RouteRecord): NormalizedLocationRoute {
  const extra = parseJsonObject(route.extra);
  return {
    id: route.id || `${route.locationId || "location"}-route`,
    name: route.name || "",
    description: route.description,
    difficulty: route.difficulty as Location["difficulty"],
    duration: formatDurationMetric(route),
    distance: formatDistanceMetric(route.distance),
    elevation: formatElevationMetric(route.elevation),
    equipmentNeeded: [
      ...readStringArray(route.equipmentNeeded),
      ...readStringArray(extra?.equipmentNeeded),
    ],
    warnings: [
      ...readStringArray(route.warnings),
      ...readStringArray(extra?.warnings),
    ],
    routeGuide: normalizeRouteGuide(route.routeGuide),
  };
}

export function normalizeLocationRoutes(location: Location): NormalizedLocationRoute[] {  const routes = location.routes?.map((route) => normalizeRoute(route as RouteRecord)) ?? [];
  if (routes.length > 0) return routes;

  const fallback: RouteRecord = {
    id: `${location.id}-fallback-route`,
    locationId: location.id,
    name: location.name,
    description: location.description,
    difficulty: location.difficulty,
    duration: location.duration,
    distance: location.distance,
    elevation: location.elevation,
    equipmentNeeded: location.equipmentNeeded,
    extra: location.extra,
  };
  const normalized = normalizeRoute(fallback);
  const hasAnyMetric = normalized.difficulty || normalized.duration || normalized.distance || normalized.elevation
    || normalized.equipmentNeeded.length > 0 || normalized.warnings.length > 0;
  return hasAnyMetric ? [normalized] : [];
}

/**
 * task #152：从 location 自身字段构造「徒步攻略」区块数据（数据源已从 routes 切到 location）。
 * 4 参数读 location 扁平化字段（0010 回填）；overview/tips/装备/注意事项读 extra.hiking（0011 回填）。
 * 无任何内容时返回 null（区块整体不渲染）。
 */
export function normalizeLocationHiking(location: Location): NormalizedLocationRoute | null {
  const hiking = location.extra?.hiking ?? undefined;
  const normalized = normalizeRoute({
    id: `${location.id}-hiking`,
    locationId: location.id,
    name: location.name,
    difficulty: location.difficulty,
    durationMin: location.durationMin,
    durationMax: location.durationMax,
    distance: location.distance,
    elevation: location.elevation,
    routeGuide: hiking ? { overview: hiking.overview ?? undefined, tips: hiking.tips ?? [] } : undefined,
    equipmentNeeded: hiking?.equipmentNeeded ?? undefined,
    warnings: hiking?.warnings ?? undefined,
  });
  const hasAnyMetric = normalized.difficulty || normalized.duration || normalized.distance || normalized.elevation;
  const hasAnyNote = Boolean(normalized.routeGuide?.overview) || (normalized.routeGuide?.tips.length ?? 0) > 0
    || normalized.equipmentNeeded.length > 0 || normalized.warnings.length > 0;
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
