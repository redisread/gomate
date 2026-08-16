import { ArrowRight, Image as ImageIcon, MapPin } from "lucide-react";
import type { Location } from "@/lib/types";

interface TeamLocationPreviewProps {
  location: Location;
  detailHref: string;
  selectedLabel: string;
  emptyCoverLabel: string;
  detailLabel: string;
}

export function TeamLocationPreview({
  location,
  detailHref,
  selectedLabel,
  emptyCoverLabel,
  detailLabel,
}: TeamLocationPreviewProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
      <a
        href={detailHref}
        className="group grid grid-cols-[7rem_1fr] items-stretch focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset sm:grid-cols-[9rem_1fr]"
        aria-label={`${selectedLabel}: ${location.name}`}
      >
        <div className="relative min-h-28 overflow-hidden bg-muted sm:min-h-32">
          {location.coverImageUrl ? (
            <img
              src={location.coverImageUrl}
              alt={location.name}
              className="h-full w-full object-cover outline outline-1 -outline-offset-1 outline-[oklch(0_0_0_/_0.1)] dark:outline-[oklch(1_0_0_/_0.1)] transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full min-h-28 flex-col items-center justify-center gap-1.5 text-muted-foreground sm:min-h-32">
              <ImageIcon className="h-5 w-5" aria-hidden="true" />
              <span className="px-2 text-center text-[11px] leading-tight">{emptyCoverLabel}</span>
            </div>
          )}
          <div className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
            <MapPin className="h-3 w-3" aria-hidden="true" />
            {selectedLabel}
          </div>
        </div>

        <div className="flex min-w-0 flex-col justify-center gap-2 px-4 py-3.5 sm:px-5">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-foreground sm:text-base">{location.name}</h3>
            {location.region?.name && (
              <p className="mt-1 truncate text-xs text-muted-foreground">{location.region.name}</p>
            )}
          </div>
          <span className="inline-flex items-center gap-1 self-start text-xs font-medium text-primary transition-[color,transform] duration-150 group-hover:translate-x-0.5">
            {detailLabel}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
        </div>
      </a>
    </div>
  );
}
