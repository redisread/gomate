import { Button as SwButton } from "@/components/starwind-react/button";
import { Card as SwCard } from "@/components/starwind-react/card";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Clock,
  Footprints,
  MapPin,
  Mountain,
  Timer,
} from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { TeamLeaderMini } from "@/components/features/teams/shared";
import type { Location, Team } from "@/lib/types";
import { formatTeamStart, getTeamDurationMinutes } from "@/lib/team-display";
import { formatDuration } from "./team-detail-utils";
import { getRegionDisplayName } from "@/components/shared/quick-city-options";

interface TeamDepartureBriefProps {
  team: Team;
  location: Location | null;
  statusLabel: string;
  statusColor?: string;
  desktopAction?: ReactNode;
  decisionPanel?: ReactNode;
  showMeetingPoint?: boolean;
}

export function TeamDepartureBrief({
  team,
  location,
  statusLabel,
  statusColor = "bg-brand-subtle text-accent-foreground",
  desktopAction,
  decisionPanel,
  showMeetingPoint,
}: TeamDepartureBriefProps) {
  const { t } = useI18n(["teams", "common"]);
  const start = formatTeamStart(team);
  const durationMinutes = getTeamDurationMinutes(team);
  return (
    <section
      data-testid="team-departure-brief"
      className="space-y-5 sm:space-y-7"
    >
      <SwButton as="a" variant="plain" size="inherit"
        href="/teams"
        className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {t("common.backTeams")}
      </SwButton>
      <header className="relative max-w-4xl space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold ${statusColor}`}
          >
            <span
              className="h-1.5 w-1.5 rounded-full bg-current"
              aria-hidden="true"
            />
            {statusLabel}
          </span>
          {location?.region && (
            <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" aria-hidden="true" />
              {getRegionDisplayName(location.region)}
            </span>
          )}
        </div>
        <h1 className="text-page-h1 break-words text-foreground sm:text-4xl">
          {team.title}
        </h1>
      </header>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:items-start lg:gap-8">
        <SwCard className="block gap-0 py-0 ring-0 min-w-0 rounded-2xl bg-card p-5 shadow-warm-md sm:p-6 lg:col-start-2 lg:row-start-1 lg:p-7">
          <div className="flex items-center justify-between gap-3 text-sm font-medium text-accent-foreground">
            <span>{t("teams.departureCardTitle")}</span>
            <Footprints
              className="h-5 w-5 -rotate-12 text-accent-500"
              aria-hidden="true"
            />
          </div>
          <div className="relative mt-4 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-lg bg-warm-subtle p-4">
            <time
              dateTime={team.startAt}
              className="min-w-0 space-y-1 tabular-nums"
            >
              <span className="block text-sm text-muted-foreground">
                {start.date.slice(0, 4)}
              </span>
              <span className="block text-3xl font-bold tracking-tight text-foreground">
                {start.date.slice(5)}
              </span>
            </time>
            <div className="flex min-w-0 flex-1 flex-col gap-2 border-s border-dashed border-brand/30 ps-5">
              {start.time && (
                <span className="flex items-center gap-2 text-lg font-semibold tabular-nums">
                  <Clock
                    className="h-4 w-4 shrink-0 text-accent-foreground"
                    aria-hidden="true"
                  />
                  {start.time}
                </span>
              )}
              {durationMinutes > 0 && (
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Timer className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {t("teams.estimatedPrefix")}{" "}
                  {formatDuration(durationMinutes / 60)}
                </span>
              )}
            </div>
          </div>
          {location && (
            <a
              href={`/locations/${location.id}`}
              className="mt-3 flex min-h-11 items-center gap-3 rounded-lg py-2 text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <MapPin
                className="h-5 w-5 shrink-0 text-accent-foreground"
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1">
                <span className="block break-words font-semibold">
                  {location.name}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {t("teams.viewLocationDetail")}
                </span>
              </span>
              <ArrowUpRight className="h-4 w-4 shrink-0" aria-hidden="true" />
            </a>
          )}
          {showMeetingPoint && team.meetingPoint && (
            <div className="mt-4 rounded-lg bg-secondary p-4">
              <h2 className="text-sm font-semibold">
                {t("teams.meetingPoint")}
              </h2>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">
                {team.meetingPoint}
              </p>
            </div>
          )}
          {decisionPanel}
          {desktopAction && (
            <div
              data-testid="team-desktop-primary-action"
              className="mt-5 hidden lg:block"
            >
              {desktopAction}
            </div>
          )}
        </SwCard>
        <div className="space-y-4 lg:col-start-1 lg:row-start-1">
          <LocationMedia location={location} />
          {team.leader && (
            <a
              href={`/users/${team.leader.id}`}
              className="flex min-h-11 w-fit max-w-full items-center gap-4 rounded-xl px-2 py-2 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="shrink-0 text-sm text-muted-foreground">
                {t("teams.creatorLabel")}
              </span>
              <TeamLeaderMini leader={team.leader} showLevel size="md" />
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

function LocationMedia({ location }: { location: Location | null }) {
  return (
    <div className="relative aspect-[16/9] overflow-hidden rounded-2xl bg-warm-subtle lg:aspect-[4/3]">
      {location?.coverImageUrl ? (
        <img
          src={location.coverImageUrl}
          alt={location.name}
          width={1200}
          height={900}
          loading="eager"
          decoding="async"
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full items-center justify-center text-accent-foreground/60">
          <Mountain className="h-16 w-16" aria-hidden="true" />
        </div>
      )}
      <div
        className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-black/10 dark:ring-white/10"
        aria-hidden="true"
      />
    </div>
  );
}
