import * as React from "react";
import {
  Mountain,
  Clock,
  Ruler,
  TrendingUp,
  CalendarDays,
  Backpack,
  AlertTriangle,
} from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { cn } from "@/lib/utils";
import type { Location } from "@/lib/types";
import { DIFFICULTY_CONFIG, SEASON_LABEL } from "./constants";

interface RouteInfoCardProps {
  location: Location;
}

export function RouteInfoCard({ location }: RouteInfoCardProps) {
  const { t } = useI18n(["enums", "locations"]);
  const diffInfo = location.difficulty
    ? { ...DIFFICULTY_CONFIG[location.difficulty] ?? DIFFICULTY_CONFIG.easy, label: t(`enums.difficulty.${location.difficulty}`) }
    : null;

  const routeData = {
    duration: location.duration ?? location.routes?.[0]?.duration,
    distance: (location as any).distance ?? location.routes?.[0]?.distance,
    elevation: (location as any).elevation ?? location.routes?.[0]?.elevation,
    equipmentNeeded: location.equipmentNeeded ?? location.routes?.[0]?.equipmentNeeded,
    warnings: location.extra?.warnings ?? location.routes?.[0]?.warnings,
  };

  const splitValue = (raw: string | undefined): [string, string] => {
    if (!raw) return ["—", ""];
    const match = raw.match(/^([\d.]+)\s*(.*)$/);
    return match ? [match[1], match[2]] : [raw, ""];
  };

  const [durVal, durUnit] = splitValue(routeData.duration);
  const [distVal, distUnit] = splitValue(routeData.distance);
  const [elevVal, elevUnit] = splitValue(routeData.elevation);

  const hasData = diffInfo || routeData.duration || routeData.distance || routeData.elevation
    || (routeData.equipmentNeeded && routeData.equipmentNeeded.length > 0)
    || (routeData.warnings && routeData.warnings.length > 0)
    || (location.bestSeason && location.bestSeason.length > 0);
  if (!hasData) return null;

  return (
    <div className="bg-card rounded-2xl border border-stone-100 dark:border-stone-800 p-5"
      style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
      <h2 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
        <span className="w-1 h-4 rounded-full bg-sky-400 flex-shrink-0" />
        {t('locations.routeInfo')}
      </h2>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {diffInfo && (
          <DataItem
            icon={<Mountain className="h-4.5 w-4.5" />}
            iconBg={diffInfo.bgColor}
            iconColor={diffInfo.textColor}
            label={t('locations.difficultyLabel')}
            valueNode={
              <div className="space-y-2">
                <span className={cn("font-bold text-sm", diffInfo.textColor)}>
                  {diffInfo.label}
                </span>
                <div className="h-1.5 w-full bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                  <DifficultyBar percent={diffInfo.percent} barColor={diffInfo.barColor} />
                </div>
              </div>
            }
          />
        )}
        {routeData.duration && (
          <DataItem
            icon={<Clock className="h-4.5 w-4.5" />}
            iconBg="bg-sky-50 dark:bg-sky-950/30"
            iconColor="text-sky-500 dark:text-sky-400"
            label={t('locations.estimatedTime')}
            valueNode={<BigNumber value={durVal} unit={durUnit} />}
          />
        )}
        {routeData.distance && (
          <DataItem
            icon={<Ruler className="h-4.5 w-4.5" />}
            iconBg="bg-violet-50 dark:bg-violet-950/30"
            iconColor="text-violet-500 dark:text-violet-400"
            label={t('locations.routeLength')}
            valueNode={<BigNumber value={distVal} unit={distUnit} />}
          />
        )}
        {routeData.elevation && (
          <DataItem
            icon={<TrendingUp className="h-4.5 w-4.5" />}
            iconBg="bg-stone-100 dark:bg-stone-800"
            iconColor="text-stone-500 dark:text-stone-400"
            label={t('locations.totalElevation')}
            valueNode={<BigNumber value={elevVal} unit={elevUnit} />}
          />
        )}
      </div>

      {location.bestSeason && location.bestSeason.length > 0 && (
        <div className="mt-5 pt-4 border-t border-stone-100 dark:border-stone-800">
          <p className="text-[11px] text-stone-400 dark:text-stone-500 mb-2.5 flex items-center gap-1.5 font-semibold uppercase tracking-wide">
            <CalendarDays className="h-3.5 w-3.5 text-amber-400" />
            {t('locations.detailSeasonsLabel')}
          </p>
          <div className="flex flex-wrap gap-2">
            {location.bestSeason.map((season: string, i: number) => (
              <span
                key={i}
                className="px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 text-xs font-semibold border border-amber-100 dark:border-amber-900/50"
              >
                {SEASON_LABEL[season] ?? season}
              </span>
            ))}
          </div>
        </div>
      )}

      {routeData.equipmentNeeded && routeData.equipmentNeeded.length > 0 && (
        <div className="mt-4 pt-4 border-t border-stone-100 dark:border-stone-800">
          <p className="text-[11px] text-stone-400 dark:text-stone-500 mb-2.5 flex items-center gap-1.5 font-semibold uppercase tracking-wide">
            <Backpack className="h-3.5 w-3.5 text-amber-400" />
            推荐装备
          </p>
          <div className="flex flex-wrap gap-2">
            {routeData.equipmentNeeded.map((item: string, i: number) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-stone-50 dark:bg-stone-800 text-stone-600 dark:text-stone-400 rounded-lg text-xs font-medium border border-stone-100 dark:border-stone-700"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      )}

      {routeData.warnings && routeData.warnings.length > 0 && (
        <div className="mt-4 pt-4 border-t border-stone-100 dark:border-stone-800">
          <p className="text-[11px] text-orange-500 mb-2.5 flex items-center gap-1.5 font-semibold uppercase tracking-wide">
            <AlertTriangle className="h-3.5 w-3.5" />
            注意事项
          </p>
          <ul className="space-y-2">
            {routeData.warnings.map((w: string, i: number) => (
              <li key={i} className="flex items-start gap-2 text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-orange-300 flex-shrink-0" />
                {w}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function DifficultyBar({ percent, barColor }: { percent: number; barColor: string }) {
  const [width, setWidth] = React.useState(0);
  React.useEffect(() => {
    const t = setTimeout(() => setWidth(percent), 150);
    return () => clearTimeout(t);
  }, [percent]);
  return (
    <div
      className={cn("h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none", barColor)}
      style={{ width: `${width}%` }}
    />
  );
}

function DataItem({
  icon,
  iconBg,
  iconColor,
  label,
  valueNode,
}: {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  label: string;
  valueNode: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2.5 p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/70 border border-stone-100 dark:border-stone-700">
      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", iconBg)}>
        <span className={iconColor}>{icon}</span>
      </div>
      <div>
        <p className="text-[10px] text-stone-400 dark:text-stone-500 mb-1 font-semibold uppercase tracking-wide">{label}</p>
        {valueNode}
      </div>
    </div>
  );
}

function BigNumber({ value, unit }: { value: string; unit: string }) {
  return (
    <span className="flex items-baseline gap-0.5">
      <span className="text-xl font-black text-foreground leading-none">{value}</span>
      {unit && <span className="text-xs text-stone-400 dark:text-stone-500 font-normal ml-0.5">{unit}</span>}
    </span>
  );
}
