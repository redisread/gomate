import { ArrowRight, MapPin, RotateCcw } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { getRegionDisplayName } from "@/components/shared/quick-city-options";
import type { MapPoint } from "./use-map-data";

interface Props {
  point: MapPoint | null;
  candidates: MapPoint[];
  loading: boolean;
  failed: boolean;
  unavailable: boolean;
  emptyProvince: string | null;
  onSelect: (point: MapPoint) => void;
  onRetry: () => void;
  onNavigate: () => void;
}

export function MapPreview({ point, candidates, loading, failed, unavailable, emptyProvince, onSelect, onRetry, onNavigate }: Props) {
  const { t } = useI18n(["home", "locations", "common"]);
  return <div data-testid="map-preview" role="region" aria-label={t("home.discoveryMap.previewLabel")}
    className="min-h-36 border-t border-border bg-card p-4 sm:min-h-28 sm:p-5" aria-busy={loading}>
    {failed ? <div className="flex flex-wrap items-center justify-between gap-3" role="alert">
      <p className="text-sm text-foreground">{t("home.discoveryMap.loadFailed")}</p>
      <button type="button" onClick={onRetry} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-secondary px-4 text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <RotateCcw className="h-4 w-4" aria-hidden="true" />{t("home.discoveryMap.retry")}
      </button>
    </div> : candidates.length > 1 ? <div>
      <p className="mb-2 text-sm text-muted-foreground">{t("home.discoveryMap.chooseLocation")}</p>
      <div className="flex max-h-36 flex-wrap gap-2 overflow-y-auto">
        {candidates.map(candidate => <button key={candidate.id} type="button" onClick={() => onSelect(candidate)} className="min-h-11 rounded-xl bg-secondary px-4 py-2 text-start text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {candidate.name} <span className="font-normal text-muted-foreground">· {getRegionDisplayName(candidate.region)}</span>
        </button>)}
      </div>
    </div> : <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-5">
      <div className="min-w-0" aria-live="polite" aria-atomic="true">
        {point ? <>
          <p className="flex items-start gap-2 text-base font-semibold text-foreground"><MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />{point.name}</p>
          <p className="mt-1 text-sm text-muted-foreground">{point.provinceName ? `${point.provinceName} · ` : ""}{getRegionDisplayName(point.region)}</p>
        </> : <>
          <p className="text-sm font-semibold text-foreground">{loading ? t("common.loading") : unavailable ? t("home.discoveryMap.locationUnavailable") : emptyProvince ? t("home.mapFocusedEmptyTitle", { province: emptyProvince }) : t("home.discoveryMap.previewHint")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{emptyProvince ? t("home.mapFocusedEmptyDesc") : t("home.discoveryMap.previewDescription")}</p>
        </>}
      </div>
      {point && <a href={`/locations/${encodeURIComponent(point.id)}`} onClick={onNavigate} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 self-start rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-transform duration-150 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:transform-none sm:self-auto">
        {t("home.discoveryMap.viewLocation")}<ArrowRight className="h-4 w-4" aria-hidden="true" />
      </a>}
    </div>}
  </div>;
}
