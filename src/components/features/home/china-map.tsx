"use client";

import * as React from "react";
import { ArrowLeft, MapPinned } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { getMapTransform, type MapBounds } from "@/lib/china-map";
import { MapCanvas } from "./map-canvas";
import { MapPreview } from "./map-preview";
import { useMapData, type MapPoint, type ProvincePath } from "./use-map-data";
import { useMapExploration } from "./use-map-exploration";

const NO_POINTS: MapPoint[] = [];
const NO_PATHS: ProvincePath[] = [];
const NO_COUNTS = new Map<string, number>();

export function ChinaMap({ className }: { className?: string }) {
  const { t } = useI18n(["home", "locations", "common"]);
  const resources = useMapData();
  const points = resources.data.value?.points ?? NO_POINTS;
  const paths = resources.map.value ?? NO_PATHS;
  const counts = resources.data.value?.counts ?? NO_COUNTS;
  const [bounds, setBounds] = React.useState<Record<string, MapBounds> | null>(null);
  const ready = !resources.loading && !resources.failed && bounds !== null;
  const exploration = useMapExploration(points, ready);
  const { selection } = exploration;
  const [candidates, setCandidates] = React.useState<MapPoint[]>([]);
  const [returnFocus, setReturnFocus] = React.useState<string | null>(null);
  const backButton = React.useRef<HTMLButtonElement>(null);
  const camera = getMapTransform(selection.province, selection.province ? bounds?.[selection.province] : undefined);
  const selectedPoint = points.find(point => point.id === selection.locationId) ?? null;
  const count = selection.province ? counts.get(selection.province) ?? 0 : 0;

  React.useEffect(() => {
    setCandidates([]);
    if (selection.province && document.activeElement?.hasAttribute("data-province")) backButton.current?.focus({ preventScroll: true });
  }, [selection.province, selection.locationId]);

  const leaveProvince = () => {
    setReturnFocus(selection.province);
    setCandidates([]);
    exploration.leaveProvince();
  };
  const selectPoint = (point: MapPoint) => {
    setCandidates([]);
    exploration.selectPoint(point);
  };

  return <div className={className ?? ""}>
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex min-h-20 items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground"><MapPinned className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            {selection.province ?? t("home.discoveryMap.country")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{selection.province ? t("locations.mapProvinceCount", { count }) : t("home.mapHint")}</p>
        </div>
        <button ref={backButton} type="button" onClick={leaveProvince} disabled={!selection.province} aria-hidden={!selection.province}
          className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl bg-secondary px-3 text-xs font-semibold text-foreground transition-[background-color,transform,opacity] duration-150 hover:bg-accent active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transform-none ${selection.province ? "visible opacity-100" : "invisible opacity-0"}`}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />{t("home.mapBackToChina")}
        </button>
      </div>
      <MapCanvas paths={paths} points={points} counts={counts} selection={selection} camera={camera}
        animate={exploration.animate} measuring={Boolean(selection.province && bounds === null)} returnFocus={returnFocus}
        onBounds={setBounds} onProvince={exploration.focusProvince} onPoints={matches => {
          if (matches.length === 1) selectPoint(matches[0]);
          else setCandidates(matches);
        }} />
      <MapPreview point={selectedPoint} candidates={candidates} loading={resources.loading} failed={resources.failed}
        unavailable={exploration.unavailable} emptyProvince={ready && selection.province && count === 0 ? selection.province : null}
        onSelect={selectPoint} onRetry={resources.retry} onNavigate={exploration.saveReturnPosition} />
    </div>
  </div>;
}
