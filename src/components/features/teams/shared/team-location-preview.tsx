import { ArrowUpRight, MapPin } from "lucide-react";
import type { Location } from "@/lib/types";
import { getRegionDisplayName } from "@/components/shared/quick-city-options";
import { useI18n } from "@/hooks/useI18n";

export function TeamLocationIdentity({ location }: { location: Location }) {
  return (
    <>
      <span className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-secondary text-muted-foreground">
        <MapPin className="h-4 w-4" aria-hidden="true" />
        {location.coverImageUrl && (
          <img
            key={location.coverImageUrl}
            src={location.coverImageUrl}
            alt=""
            width={44}
            height={44}
            className="absolute inset-0 h-full w-full object-cover outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block break-words text-sm font-medium">
          {location.name}
        </span>
        {location.region && (
          <span className="block text-xs text-muted-foreground">
            {getRegionDisplayName(location.region)}
          </span>
        )}
      </span>
    </>
  );
}

export function TeamLocationPreview({
  location,
  detailHref,
}: {
  location: Location;
  detailHref: string;
}) {
  const { t } = useI18n(["teams"]);
  return (
    <a
      href={detailHref}
      aria-label={`${t("teams.viewDetailShort")} ${location.name}`}
      className="flex min-h-11 items-center gap-3 rounded-lg bg-muted px-3 py-2 transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring"
    >
      <TeamLocationIdentity location={location} />
      <ArrowUpRight
        className="h-4 w-4 shrink-0 text-muted-foreground"
        aria-hidden="true"
      />
    </a>
  );
}
