import { ArrowRight, CalendarDays, MapPin } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { LocationCoverImage } from "@/components/ui/lazy-image";
import { Avatar } from "@/components/ui/avatar";
import type { Team } from "@/lib/types";
import { formatTeamStart } from "@/lib/team-display";

export function HomeDepartureBoard({ teams }: { teams: Team[] }) {
  const { t } = useI18n(["home", "common"]);
  const departures = teams.slice(0, 3);

  return (
    <section id="guest-departures" className="border-b border-border/70 bg-secondary/55 py-14 sm:py-16" data-testid="guest-departure-board">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between gap-6">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-amber-800 dark:text-amber-300">{t("home.departures.kicker")}</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{t("home.departures.title")}</h2>
          </div>
          <a href="/teams" className="group hidden min-h-10 items-center gap-1.5 text-sm font-bold text-amber-800 hover:text-amber-950 dark:text-amber-300 dark:hover:text-amber-200 sm:inline-flex">
            {t("home.departures.viewAll")}
            <ArrowRight className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-1" aria-hidden="true" />
          </a>
        </div>

        {departures.length > 0 ? (
          <div className="mt-7 grid gap-4 lg:grid-cols-[1.08fr_1fr_1fr]">
            {departures.map((team, index) => {
              const coverImage = team.location?.coverImageUrl;
              const leaderName = team.leader?.nickname || team.leader?.name || t("common.unknown");
              const remaining = Math.max(0, team.maxParticipants - team.activeParticipantCount);
              const start = formatTeamStart(team);

              return (
                <a key={team.id} href={`/teams/${team.id}`} className="group grid min-h-44 grid-cols-[7rem_1fr] overflow-hidden rounded-2xl bg-card shadow-warm-sm ring-1 ring-border/70 transition-[transform,box-shadow] duration-200 active:scale-[0.98] motion-reduce:transition-none lg:hover:-translate-y-1 lg:hover:shadow-card-hover">
                  <div className="bg-muted">
                    {coverImage ? <LocationCoverImage src={coverImage} alt="" priority={index === 0} className="h-full w-full object-cover" /> : null}
                  </div>
                  <div className="flex min-w-0 flex-col p-4">
                    <p className="flex items-center gap-1.5 font-mono text-[0.68rem] font-bold text-warm">
                      <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                      {start.date}{start.time ? ` · ${start.time}` : ""}
                    </p>
                    <h3 className="mt-2 line-clamp-2 text-base font-bold tracking-tight text-card-foreground">{team.title}</h3>
                    {team.location?.name && (
                      <p className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span className="truncate">{team.location.name}</span>
                      </p>
                    )}
                    <div className="mt-auto flex items-center justify-between gap-3 pt-4">
                      <div className="flex min-w-0 items-center gap-2">
                        <Avatar src={team.leader?.image} name={leaderName} size="xs" />
                        <span className="truncate text-xs text-muted-foreground">{leaderName}</span>
                      </div>
                      <span className="shrink-0 text-xs font-bold text-[color:oklch(0.42_0.09_155)] dark:text-emerald-300">
                        {remaining === 0 ? t("home.departures.full") : t("home.departures.remaining", { count: remaining })}
                      </span>
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        ) : (
          <div className="mt-7 flex items-center justify-between gap-6 rounded-2xl bg-card p-6 ring-1 ring-border/70">
            <div>
              <h3 className="font-bold text-card-foreground">{t("home.departures.emptyTitle")}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{t("home.departures.emptyDescription")}</p>
            </div>
            <a href="/teams/create" className="shrink-0 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-transform duration-150 active:scale-95">{t("home.departures.startTeam")}</a>
          </div>
        )}
      </div>
    </section>
  );
}
