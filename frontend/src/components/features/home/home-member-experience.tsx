import { ArrowRight, CalendarDays, MapPin, Plus, RefreshCw, Users } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { LocationCoverImage } from "@/components/ui/lazy-image";
import type { SessionUser, Team } from "@/lib/types";
import { useMemberHome } from "./use-member-home";
import { isTeamInProgress, selectNextMemberTeam } from "./member-home-utils";

interface HomeMemberExperienceProps {
  currentUser: SessionUser;
  publicTeams: Team[];
}

export function HomeMemberExperience({ currentUser, publicTeams }: HomeMemberExperienceProps) {
  const { t } = useI18n(["home"]);
  const { teams, loading, error, retry } = useMemberHome(currentUser.id);
  const nextTeam = selectNextMemberTeam(teams, []);
  const displayName = currentUser.nickname || currentUser.name;

  if (loading) return <MemberHomeSkeleton />;

  return (
    <section className="relative isolate overflow-hidden border-b border-border/70 bg-background">
      <div aria-hidden="true" className="absolute -right-52 -top-44 h-[34rem] w-[34rem] rounded-full bg-[color:oklch(0.9_0.035_155)] opacity-60 dark:bg-[color:oklch(0.3_0.035_155)]" />
      <div className="relative z-10 mx-auto grid max-w-7xl gap-10 px-4 pb-16 pt-28 sm:px-6 sm:pb-20 sm:pt-32 lg:grid-cols-[minmax(0,0.78fr)_minmax(32rem,1.22fr)] lg:items-center lg:gap-14 lg:px-8 lg:pb-24">
        <div className="max-w-2xl">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-[color:oklch(0.42_0.09_155)] dark:text-emerald-300">{t("home.memberDashboard.kicker")}</p>
          <h1 className="mt-5 text-[clamp(2.5rem,6vw,4.5rem)] font-bold leading-[1.05] tracking-[-0.045em] text-foreground">
            <span className="block">{t("home.memberDashboard.greeting", { name: displayName })}</span>
            <span className="block">{nextTeam ? t("home.memberDashboard.activeTitle") : t("home.memberDashboard.emptyTitle")}</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-8 text-stone-700 dark:text-stone-300 sm:text-lg">
            {nextTeam ? t("home.memberDashboard.activeDescription") : t("home.memberDashboard.emptyDescription")}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <a href="/teams" className="group inline-flex min-h-11 items-center gap-2 rounded-full bg-[color:oklch(0.42_0.09_155)] px-6 py-3 text-sm font-bold text-white transition-transform duration-150 active:scale-95 motion-reduce:transition-none">
              {t("home.memberDashboard.findTeams")}
              <ArrowRight className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-1" aria-hidden="true" />
            </a>
            <a href="/teams/create" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-card px-5 py-3 text-sm font-bold text-foreground transition-transform duration-150 active:scale-95 motion-reduce:transition-none">
              <Plus className="h-4 w-4" aria-hidden="true" />
              {t("home.memberDashboard.createTeam")}
            </a>
          </div>
        </div>

        {error ? (
          <div className="rounded-[2rem] bg-card p-8 shadow-warm-xl ring-1 ring-border/70" role="alert">
            <RefreshCw className="h-10 w-10 text-primary" aria-hidden="true" />
            <h2 className="mt-5 text-xl font-bold text-card-foreground">{t("home.memberDashboard.loadErrorTitle")}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("home.memberDashboard.loadErrorDescription")}</p>
            <button type="button" onClick={retry} className="mt-6 inline-flex min-h-10 items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-transform duration-150 active:scale-95">
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              {t("home.memberDashboard.retry")}
            </button>
          </div>
        ) : nextTeam ? (
          <NextTripCard team={nextTeam} inProgress={isTeamInProgress(nextTeam)} />
        ) : (
          <NoTripPanel teams={publicTeams} />
        )}
      </div>
    </section>
  );
}

function NextTripCard({ team, inProgress }: { team: Team; inProgress: boolean }) {
  const { t } = useI18n(["home"]);
  const coverImage = team.location?.coverImage;

  return (
    <article className="group relative h-[24rem] overflow-hidden rounded-[2rem] bg-neutral-900 text-white shadow-warm-xl ring-1 ring-black/10" data-testid="member-next-trip">
      {coverImage ? <div className="absolute inset-0"><LocationCoverImage src={coverImage} alt="" priority className="h-full w-full object-cover" /></div> : null}
      <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/55 to-black/20" aria-hidden="true" />
      <div className="relative z-10 flex min-h-[24rem] flex-col p-6 sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <span className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-emerald-100">{t("home.memberDashboard.nextDeparture")}</span>
          <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-950">
            {inProgress ? t("home.memberDashboard.inProgressStatus") : t("home.memberDashboard.upcomingStatus")}
          </span>
        </div>

        <div className="mt-auto">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{team.title}</h2>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/75">
            <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-4 w-4" aria-hidden="true" />{team.date}{team.time ? ` · ${team.time}` : ""}</span>
            {team.location?.name && <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" aria-hidden="true" />{team.location.name}</span>}
          </div>
          <div className="mt-7 flex flex-wrap items-center justify-between gap-4 border-t border-white/20 pt-5">
            <span className="inline-flex items-center gap-2 font-mono text-sm font-bold"><Users className="h-4 w-4" aria-hidden="true" />{team.currentMembers} / {team.maxMembers}</span>
            <a href={`/teams/${team.id}`} className="group/link inline-flex min-h-11 items-center gap-2 rounded-full bg-primary-50 px-5 py-3 text-sm font-bold text-amber-950 transition-transform duration-150 active:scale-95">
              {t("home.memberDashboard.viewTrip")}
              <ArrowRight className="h-4 w-4 transition-transform duration-150 group-hover/link:translate-x-1" aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}

function NoTripPanel({ teams }: { teams: Team[] }) {
  const { t } = useI18n(["home"]);
  const suggestions = teams.slice(0, 2);

  return (
    <div className="rounded-[2rem] bg-secondary/70 p-6 ring-1 ring-border/70 sm:p-8" data-testid="member-no-trip">
      <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-amber-800 dark:text-amber-300">{t("home.memberDashboard.recommendationKicker")}</p>
      <h2 className="mt-3 text-2xl font-bold text-foreground">{t("home.memberDashboard.recommendationTitle")}</h2>
      {suggestions.length > 0 ? (
        <div className="mt-6 space-y-3">
          {suggestions.map((team) => (
            <a key={team.id} href={`/teams/${team.id}`} className="group flex min-h-20 items-center gap-4 rounded-2xl bg-card p-3 ring-1 ring-border/70 transition-transform duration-150 active:scale-[0.98]">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-brand-subtle text-primary"><Users className="h-5 w-5" aria-hidden="true" /></div>
              <div className="min-w-0 flex-1"><h3 className="truncate text-sm font-bold text-card-foreground">{team.title}</h3><p className="mt-1 truncate text-xs text-muted-foreground">{team.date}{team.time ? ` · ${team.time}` : ""}{team.location?.name ? ` · ${team.location.name}` : ""}</p></div>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-150 group-hover:translate-x-1" aria-hidden="true" />
            </a>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm leading-6 text-muted-foreground">{t("home.memberDashboard.noRecommendation")}</p>
      )}
      <a href="/teams" className="mt-6 inline-flex min-h-10 items-center gap-2 text-sm font-bold text-amber-800 hover:text-amber-950 dark:text-amber-300 dark:hover:text-amber-200">
        {t("home.memberDashboard.findTeams")}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </a>
    </div>
  );
}

function MemberHomeSkeleton() {
  return (
    <section className="mx-auto grid min-h-[38rem] max-w-7xl gap-12 px-4 pb-20 pt-28 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8" aria-busy="true" data-testid="member-home-loading">
      <div className="space-y-5"><div className="h-4 w-36 animate-pulse rounded bg-muted motion-reduce:animate-none" /><div className="h-32 max-w-lg animate-pulse rounded-2xl bg-muted motion-reduce:animate-none" /><div className="h-20 max-w-md animate-pulse rounded-xl bg-muted motion-reduce:animate-none" /></div>
      <div className="h-96 animate-pulse rounded-[2rem] bg-muted motion-reduce:animate-none" />
    </section>
  );
}
