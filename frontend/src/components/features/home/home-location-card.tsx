import { MapPin, Mountain, ArrowRight } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { DIFFICULTY_CONFIG } from "@/lib/constants";
import type { Location } from "@/lib/types";

export function LocationCard({ location }: { location: Location }) {
  const { t } = useI18n(["locations"]);
  const difficulty = location.difficulty ?? location.routes?.[0]?.difficulty;
  const diffConfig = difficulty ? DIFFICULTY_CONFIG[difficulty as keyof typeof DIFFICULTY_CONFIG] : null;
  const firstTag = location.tags?.[0];

  return (
    <a href={`/locations/${location.id}`} className="block group">
      <article
        className="overflow-hidden rounded-2xl cursor-pointer bg-card"
        style={{
          boxShadow: "var(--shadow-card)",
          transition: "box-shadow 0.25s ease, transform 0.25s ease",
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLElement;
          el.style.transform = "translateY(-5px)";
          el.style.boxShadow = "var(--shadow-card-hover)";
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLElement;
          el.style.transform = "translateY(0)";
          el.style.boxShadow = "var(--shadow-card)";
        }}
      >
        <div className="relative h-52 overflow-hidden bg-muted">
          {location.coverImage ? (
            <img src={location.coverImage} alt={location.name} className="w-full h-full object-cover"
              style={{ transition: "transform 0.5s ease" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLImageElement).style.transform = "scale(1.06)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLImageElement).style.transform = "scale(1)"; }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-100 dark:from-amber-950/40 to-teal-100 dark:to-teal-950/40">
              <Mountain className="h-14 w-14 text-primary/30" />
            </div>
          )}

          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(15,15,12,0.72) 0%, rgba(15,15,12,0.18) 45%, transparent 70%)" }} />

          <div className="absolute inset-0 flex flex-col justify-end p-4 opacity-0 group-hover:opacity-100"
            style={{ background: "linear-gradient(to top, rgba(146,64,14,0.90) 0%, rgba(146,64,14,0.55) 55%, transparent 100%)", transition: "opacity 0.3s ease" }}>
            <p className="text-white/90 text-sm line-clamp-2 leading-relaxed mb-2">{location.description}</p>
            {location.routes?.[0] && (
              <div className="flex flex-wrap gap-2 text-white/75 text-xs">
                <span>🕐 {location.routes[0].duration}</span>
                <span>📏 {location.routes[0].distance}</span>
                {location.routes[0].elevation && <span>⛰️ {location.routes[0].elevation}</span>}
              </div>
            )}
          </div>

          <div className="absolute top-3 right-3 flex flex-col gap-1.5 items-end">
            {diffConfig && (
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: diffConfig.bg, color: diffConfig.color, backdropFilter: "blur(4px)" }}>{diffConfig.label}</span>
            )}
            {firstTag && (
              <span className="px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: "rgba(255,255,255,0.90)", color: "#92400E", backdropFilter: "blur(4px)" }}>{firstTag.name}</span>
            )}
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-4 group-hover:opacity-0" style={{ transition: "opacity 0.2s ease" }}>
            <h3 className="font-bold text-white text-lg leading-tight drop-shadow-sm">{location.name}</h3>
            <p className="text-white/75 text-sm flex items-center gap-1 mt-0.5">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0" />{location.address || t("locations.defaultCity")}
            </p>
          </div>
        </div>

        <div className="px-4 py-3 flex items-center justify-between">
          <div className="min-w-0">
            <h3 className="font-semibold text-foreground text-sm group-hover:text-brand transition-colors duration-150 truncate">{location.name}</h3>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <MapPin className="h-3 w-3 flex-shrink-0" />{location.address || t("locations.defaultCity")}
            </p>
          </div>
          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ml-3 transition-all duration-150 group-hover:bg-brand group-hover:text-white"
            style={{ background: "var(--brand-subtle)", color: "var(--brand)" }}>
            <ArrowRight className="h-3.5 w-3.5" />
          </div>
        </div>
      </article>
    </a>
  );
}
