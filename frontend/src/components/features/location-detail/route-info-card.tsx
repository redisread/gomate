import * as React from "react";
import {
  AlertTriangle,
  Backpack,
  Clock,
  Lightbulb,
  Mountain,
  Ruler,
  TrendingUp,
} from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { cn } from "@/lib/utils";
import type { Location } from "@/lib/types";
import { DIFFICULTY_CONFIG } from "./constants";
import {
  normalizeLocationRoutes,
  type NormalizedLocationRoute,
  type RouteMetric,
} from "./route-utils";

interface RouteInfoCardProps {
  location: Location;
}

export function RouteInfoCard({ location }: RouteInfoCardProps) {
  const { t } = useI18n(["enums", "locations", "common", "locationDetail"]);
  const routes = React.useMemo(() => normalizeLocationRoutes(location), [location]);
  const [selectedRouteId, setSelectedRouteId] = React.useState<string | null>(null);

  React.useEffect(() => {
    setSelectedRouteId(routes[0]?.id ?? null);
  }, [routes]);

  if (routes.length === 0) return null;

  const selectedRoute = routes.find((route) => route.id === selectedRouteId) ?? routes[0];
  const metrics = getMetricItems(selectedRoute, t);
  const hasRouteNotes =
    selectedRoute.equipmentNeeded.length > 0 ||
    selectedRoute.warnings.length > 0 ||
    Boolean(selectedRoute.routeGuide?.overview) ||
    (selectedRoute.routeGuide?.tips.length ?? 0) > 0;

  return (
    <section className="bg-card rounded-xl border border-stone-100 dark:border-stone-800 p-4 sm:p-5 shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <span className="w-1 h-4 rounded-full bg-emerald-400 flex-shrink-0" />
            {t("locations.routeInfo")}
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
            {t("locationDetail.routeSummarySubtitle")}
          </p>
        </div>
        {routes.length > 1 && (
          <span className="inline-flex w-fit items-center rounded-full border border-emerald-100 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            {t("locationDetail.routeOptions", { count: routes.length })}
          </span>
        )}
      </div>

      {routes.length > 1 && (
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1 scrollbar-none" role="listbox" aria-label={t("locations.routeInfo")}>
          {routes.map((route, index) => {
            const selected = route.id === selectedRoute.id;
            return (
              <button
                key={route.id}
                type="button"
                role="option"
                aria-selected={selected}
                aria-label={t("locationDetail.routeCardAria", { name: route.name })}
                onClick={() => setSelectedRouteId(route.id)}
                className={cn(
                  "min-w-[132px] rounded-xl border px-3 py-2.5 text-left transition-all duration-150",
                  selected
                    ? "border-emerald-300 bg-emerald-50 text-emerald-950 shadow-sm dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-100"
                    : "border-stone-100 bg-stone-50/70 text-stone-700 hover:border-stone-200 hover:bg-stone-100 dark:border-stone-800 dark:bg-stone-900/60 dark:text-stone-300 dark:hover:bg-stone-800"
                )}
              >
                <span className="block text-sm font-bold leading-snug line-clamp-1">{route.name}</span>
                <span className="mt-1 block text-[11px] font-medium text-stone-600 dark:text-stone-400">
                  {index === 0 ? t("locationDetail.recommendedRoute") : getRouteDifficulty(route, t)}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {metrics.map((item) => (
          <MetricTile key={item.label} {...item} />
        ))}
      </div>

      {(selectedRoute.description || selectedRoute.routeGuide?.overview) && (
        <p className="mt-4 rounded-xl border border-stone-100 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-900/50 px-3.5 py-3 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
          {selectedRoute.routeGuide?.overview || selectedRoute.description}
        </p>
      )}

      {hasRouteNotes && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {selectedRoute.equipmentNeeded.length > 0 && (
            <RouteNoteBlock
              icon={<Backpack className="h-3.5 w-3.5" />}
              title={t("common.recommendedGear")}
              items={selectedRoute.equipmentNeeded}
              tone="stone"
            />
          )}
          {(selectedRoute.routeGuide?.tips.length ?? 0) > 0 && (
            <RouteNoteBlock
              icon={<Lightbulb className="h-3.5 w-3.5" />}
              title={t("locationDetail.routeTips")}
              items={selectedRoute.routeGuide?.tips ?? []}
              tone="stone"
            />
          )}
          {selectedRoute.warnings.length > 0 && (
            <RouteNoteBlock
              icon={<AlertTriangle className="h-3.5 w-3.5" />}
              title={t("common.precautions")}
              items={selectedRoute.warnings}
              tone="warning"
            />
          )}
        </div>
      )}
    </section>
  );
}

function getRouteDifficulty(
  route: NormalizedLocationRoute,
  t: (key: string, vars?: Record<string, string | number>) => string
) {
  return route.difficulty ? t(`enums.difficulty.${route.difficulty}`) : t("common.unknown");
}

function getMetricItems(
  route: NormalizedLocationRoute,
  t: (key: string, vars?: Record<string, string | number>) => string
) {
  const diffInfo = route.difficulty
    ? DIFFICULTY_CONFIG[route.difficulty] ?? DIFFICULTY_CONFIG.easy
    : null;

  return [
    {
      icon: <Mountain className="h-4 w-4" />,
      label: t("locations.difficultyLabel"),
      value: route.difficulty ? t(`enums.difficulty.${route.difficulty}`) : t("common.unknown"),
      accent: diffInfo?.textColor ?? "text-stone-600 dark:text-stone-400",
      bg: diffInfo?.bgColor ?? "bg-stone-50 dark:bg-stone-900",
    },
    {
      icon: <Clock className="h-4 w-4" />,
      label: t("locations.estimatedTime"),
      value: metricValue(route.duration, t),
      accent: "text-sky-700 dark:text-sky-400",
      bg: "bg-sky-50 dark:bg-sky-950/30",
    },
    {
      icon: <Ruler className="h-4 w-4" />,
      label: t("locations.routeLength"),
      value: metricValue(route.distance, t),
      accent: "text-violet-600 dark:text-violet-400",
      bg: "bg-violet-50 dark:bg-violet-950/30",
    },
    {
      icon: <TrendingUp className="h-4 w-4" />,
      label: t("locations.totalElevation"),
      value: metricValue(route.elevation, t),
      accent: "text-emerald-700 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
    },
  ];
}

function metricValue(
  metric: RouteMetric | undefined,
  t: (key: string, vars?: Record<string, string | number>) => string
) {
  if (!metric) return "—";
  const unit = metric.unit ? t(`locationDetail.metricUnits.${metric.unit}`) : "";
  return unit ? `${metric.value} ${unit}` : metric.value;
}

function MetricTile({
  icon,
  label,
  value,
  accent,
  bg,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: string;
  bg: string;
}) {
  return (
    <div className="rounded-xl border border-stone-100 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-900/50 p-3">
      <div className={cn("mb-2 flex h-8 w-8 items-center justify-center rounded-lg", bg)}>
        <span className={accent}>{icon}</span>
      </div>
      <p className="text-[10px] font-semibold uppercase text-stone-600 dark:text-stone-400">{label}</p>
      <p className={cn("mt-1 text-sm font-black leading-tight", accent)}>{value}</p>
    </div>
  );
}

function RouteNoteBlock({
  icon,
  title,
  items,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  items: string[];
  tone: "stone" | "warning";
}) {
  return (
    <div
      className={cn(
        "rounded-xl border px-3.5 py-3",
        tone === "warning"
          ? "border-orange-100 bg-orange-50/70 dark:border-orange-900/40 dark:bg-orange-950/20"
          : "border-stone-100 bg-stone-50/70 dark:border-stone-800 dark:bg-stone-900/50"
      )}
    >
      <p
        className={cn(
          "mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase",
          tone === "warning" ? "text-orange-700 dark:text-orange-400" : "text-stone-500 dark:text-stone-400"
        )}
      >
        {icon}
        {title}
      </p>
      <ul className="space-y-1.5">
        {items.map((item, index) => (
          <li key={`${item}-${index}`} className="flex items-start gap-2 text-xs leading-relaxed text-stone-600 dark:text-stone-400">
            <span
              className={cn(
                "mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full",
                tone === "warning" ? "bg-orange-300" : "bg-stone-300 dark:bg-stone-600"
              )}
            />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
