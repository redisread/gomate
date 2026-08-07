import { ArrowUpRight, CalendarDays, MapPin, Users } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { LocationCoverImage } from "@/components/ui/lazy-image";
import { Avatar } from "@/components/ui/avatar";
import type { Team } from "@/lib/types";

const STACK_POSITIONS = [
  "lg:left-0 lg:top-6 lg:z-30 lg:w-[88%] lg:-rotate-2",
  "lg:right-0 lg:top-36 lg:z-20 lg:w-[82%] lg:rotate-3",
  "lg:left-8 lg:top-64 lg:z-10 lg:w-[84%] lg:-rotate-1",
] as const;

function RemainingSpots({ team }: { team: Team }) {
  const { t } = useI18n(["home"]);
  const remaining = Math.max(0, team.maxMembers - team.currentMembers);

  return (
    <span className="rounded-full bg-primary-50 px-3 py-1.5 text-xs font-bold text-amber-900 dark:bg-amber-200 dark:text-amber-950">
      {remaining === 0
        ? t("home.departures.full")
        : t("home.departures.remaining", { count: remaining })}
    </span>
  );
}

export function HomeDepartureStack({ teams }: { teams: Team[] }) {
  const { t } = useI18n(["home", "common"]);
  const featuredTeams = teams.slice(0, 3);

  if (featuredTeams.length === 0) {
    return (
      <div className="flex h-[25rem] items-center justify-center rounded-[2rem] bg-brand-muted px-8 text-center ring-1 ring-primary/15 lg:h-[32rem]" data-testid="guest-departure-stack-empty">
        <div className="max-w-xs">
          <Users className="mx-auto h-12 w-12 text-primary" strokeWidth={1.5} aria-hidden="true" />
          <h2 className="mt-5 text-xl font-bold text-foreground">{t("home.departures.emptyTitle")}</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{t("home.departures.emptyDescription")}</p>
          <a href="/teams" className="mt-6 inline-flex min-h-10 items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-transform duration-150 active:scale-95">
            {t("home.departures.viewAll")}
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="relative -mr-4 overflow-hidden sm:-mr-6 lg:mr-0 lg:h-[34rem] lg:overflow-visible" data-testid="guest-departure-stack">
      <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-8 pr-12 pt-4 [scrollbar-width:none] lg:block lg:overflow-visible lg:p-0">
        {featuredTeams.map((team, index) => {
          const coverImage = team.location?.coverImage;
          const locationName = team.location?.name;
          const leaderName = team.leader.nickname || team.leader.name;

          return (
            <a
              key={team.id}
              href={`/teams/${team.id}`}
              className={`group relative h-[22rem] w-[82vw] max-w-[23rem] shrink-0 snap-center overflow-hidden rounded-[2rem] bg-neutral-900 text-white shadow-warm-xl ring-1 ring-black/10 transition-[transform,box-shadow] duration-300 ease-out active:scale-[0.98] motion-reduce:transition-none lg:absolute lg:h-[21rem] lg:max-w-none lg:hover:-translate-y-2 ${STACK_POSITIONS[index]}`}
            >
              {coverImage ? (
                <LocationCoverImage src={coverImage} alt="" priority={index === 0} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full bg-neutral-900" aria-hidden="true" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-black/10" aria-hidden="true" />

              <div className="absolute inset-0 flex flex-col p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 font-mono text-xs font-semibold text-white/90">
                    <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                    {team.date}{team.time ? ` · ${team.time}` : ""}
                  </span>
                  <RemainingSpots team={team} />
                </div>

                <div className="mt-auto">
                  <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{team.title}</h2>
                  {locationName && (
                    <p className="mt-2 flex items-center gap-1.5 text-sm text-white/75">
                      <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span className="truncate">{locationName}</span>
                    </p>
                  )}
                  <div className="mt-5 flex items-center justify-between border-t border-white/20 pt-4">
                    <div className="flex min-w-0 items-center gap-2">
                      <Avatar src={team.leader.avatar} name={leaderName} size="sm" className="ring-white/80" />
                      <span className="truncate text-xs text-white/75">{t("home.departures.startedBy", { name: leaderName })}</span>
                    </div>
                    <span className="ml-3 shrink-0 font-mono text-xs font-semibold text-white/90">
                      {team.currentMembers} / {team.maxMembers}
                    </span>
                  </div>
                </div>
              </div>
            </a>
          );
        })}
      </div>
      <p className="pr-4 text-center text-xs text-muted-foreground lg:hidden">{t("home.departures.swipeHint")}</p>
    </div>
  );
}
