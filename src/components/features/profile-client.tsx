"use client";

import * as React from "react";
import {
  Calendar,
  CheckCircle2,
  ChevronRight,
  Edit3,
  MapPin,
  Mountain,
  UserRound,
  Users,
} from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { fetchAPI, fetchCurrentUser } from "@/lib/api";
import { Navbar } from "@/components/layout/navbar";
import { StatusBadge } from "@/components/features/teams/teams-ui";
import { LEVEL_CONFIG } from "@/components/shared/profile-shared";
import { cn } from "@/lib/utils";
import { formatBirthday, getAgeNumber } from "@/lib/user-utils";
import type { SessionUser, Team } from "@/lib/types";
import { formatTeamStart, getTeamDisplayStatus } from "@/lib/team-display";
import { fetchSelectableRegions } from "@/lib/regions";

function ProfileStatLink({
  href,
  icon: Icon,
  label,
  value,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  value: number;
}) {
  return (
    <a
      href={href}
      aria-label={`${value} ${label}`}
      className="group flex min-h-24 items-center justify-between gap-2 rounded-xl border border-border bg-card p-3 transition-[transform,background-color,border-color] duration-150 hover:border-primary/30 hover:bg-accent active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:p-4"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Icon className="h-4 w-4 shrink-0" />
          <span className="text-xs font-medium leading-tight">{label}</span>
        </div>
        <p className="mt-2 text-2xl font-semibold leading-none text-foreground tabular-nums sm:text-3xl">
          {value}
        </p>
      </div>
      <ChevronRight className="hidden h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-primary sm:block" />
    </a>
  );
}

function ProfileSkeleton({ label }: { label: string }) {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <div
        id="main-content"
        data-testid="profile-skeleton"
        aria-busy="true"
        aria-label={label}
        className="mx-auto max-w-5xl px-4 pb-16 pt-24 sm:px-6 lg:px-8"
      >
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
            <div className="h-24 w-24 shrink-0 animate-pulse rounded-2xl bg-muted motion-reduce:animate-none" />
            <div className="w-full flex-1 space-y-3">
              <div className="mx-auto h-7 w-40 animate-pulse rounded bg-muted motion-reduce:animate-none sm:mx-0" />
              <div className="mx-auto h-4 w-56 max-w-full animate-pulse rounded bg-muted motion-reduce:animate-none sm:mx-0" />
              <div className="mx-auto h-4 w-full max-w-md animate-pulse rounded bg-muted motion-reduce:animate-none sm:mx-0" />
            </div>
            <div className="h-11 w-full animate-pulse rounded-xl bg-muted motion-reduce:animate-none sm:w-28" />
          </div>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-24 animate-pulse rounded-xl bg-muted motion-reduce:animate-none" />
          ))}
        </div>
        <div className="mt-8 h-48 animate-pulse rounded-2xl bg-muted motion-reduce:animate-none" />
      </div>
    </main>
  );
}

function TeamSection({
  id,
  teams,
  title,
  viewAllHref,
  viewAllLabel,
}: {
  id: string;
  teams: Team[];
  title: string;
  viewAllHref: string;
  viewAllLabel: string;
}) {
  const sectionId = `${id}-title`;

  return (
    <section aria-labelledby={sectionId}>
      <div className="mb-3 flex items-center justify-between gap-4">
        <h2 id={sectionId} className="text-sm font-semibold text-foreground">
          {title}
        </h2>
        <a
          href={viewAllHref}
          className="inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-medium text-muted-foreground transition-colors duration-150 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {viewAllLabel}
        </a>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {teams.map((team, index) => {
          const start = formatTeamStart(team);
          return (
            <a
              key={team.id}
              href={`/teams/${team.id}`}
              className={cn(
                "group block px-4 py-4 transition-colors duration-150 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                index > 0 && "border-t border-border",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <h3 title={team.title} className="min-w-0 truncate text-sm font-semibold text-foreground transition-colors duration-150 group-hover:text-primary">
                  {team.title}
                </h3>
                <StatusBadge status={getTeamDisplayStatus(team)} />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                {team.location?.name && (
                  <span className="flex min-w-0 items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span title={team.location.name} className="truncate">{team.location.name}</span>
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {start.date}
                </span>
                <span className="flex items-center gap-1 tabular-nums">
                  <Users className="h-3.5 w-3.5" />
                  {team.activeParticipantCount}/{team.maxParticipants}
                </span>
              </div>
            </a>
          );
        })}
      </div>
    </section>
  );
}

export function ProfileClient() {
  const { t } = useI18n(["profile", "common"]);
  const [user, setUser] = React.useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [createdTeams, setCreatedTeams] = React.useState<Team[]>([]);
  const [joinedTeams, setJoinedTeams] = React.useState<Team[]>([]);
  const [createdTotal, setCreatedTotal] = React.useState(0);
  const [joinedTotal, setJoinedTotal] = React.useState(0);
  const [completedTotal, setCompletedTotal] = React.useState(0);
  const [regionName, setRegionName] = React.useState<string | null>(null);

  const loadTeams = React.useCallback(async () => {
    try {
      const [createdRes, joinedRes] = await Promise.all([
        fetchAPI("/users/me/created-teams"),
        fetchAPI("/users/me/joined-teams"),
      ]);
      const [createdData, joinedData] = await Promise.all([
        createdRes.json(),
        joinedRes.json(),
      ]);

      const createdList: Team[] = createdData.success ? createdData.teams || [] : [];
      const joinedList: Team[] = joinedData.success ? joinedData.teams || [] : [];

      setCreatedTotal(createdList.length);
      setJoinedTotal(joinedList.length);
      setCreatedTeams(createdList.slice(0, 3));
      setJoinedTeams(joinedList.slice(0, 3));
      setCompletedTotal(
        [...createdList, ...joinedList].filter((team) => team.lifecycle === "completed").length,
      );
    } catch (error) {
      console.warn("[ProfileClient] 队伍加载失败:", error);
    }
  }, []);

  const loadProfile = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const currentUser = await fetchCurrentUser("/login?redirect=/profile");
      if (!currentUser) return;

      setUser(currentUser as unknown as SessionUser);
      const regionRequest = currentUser.extra.city
        ? fetchSelectableRegions()
            .then((regions) => {
              const match = regions.find((region) => region.id === currentUser.extra.city);
              setRegionName(match?.name ?? null);
            })
            .catch(() => setRegionName(null))
        : Promise.resolve();

      await Promise.all([loadTeams(), regionRequest]);
    } finally {
      setIsLoading(false);
    }
  }, [loadTeams]);

  React.useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  if (isLoading) return <ProfileSkeleton label={t("profile.loadingHint")} />;
  if (!user) return null;

  const levelConfig = LEVEL_CONFIG[user.extra.level] || LEVEL_CONFIG.beginner;
  const displayName = user.nickname || user.name;
  const genderText = user.gender === "male"
    ? t("profile.genderMale")
    : user.gender === "female"
      ? t("profile.genderFemale")
      : t("common.unknown");

  return (
    <main className="min-h-screen bg-background">
      <Navbar />

      <div id="main-content" className="mx-auto max-w-5xl px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <section
          data-testid="profile-header"
          aria-labelledby="profile-title"
          className="rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6"
        >
          <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
            {user.image ? (
              <img
                src={user.image}
                alt={displayName}
                className="h-24 w-24 shrink-0 rounded-2xl object-cover outline outline-1 -outline-offset-1 outline-[oklch(0_0_0_/_0.1)] dark:outline-[oklch(1_0_0_/_0.1)]"
              />
            ) : (
              <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-brand-subtle">
                <span className="text-2xl font-semibold text-brand">
                  {displayName?.[0]?.toUpperCase()}
                </span>
              </div>
            )}

            <div className="min-w-0 flex-1 text-center sm:text-start">
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <h1 id="profile-title" className="text-2xl font-bold tracking-tight text-foreground">
                  {displayName}
                </h1>
                <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium", levelConfig.badge)}>
                  <span aria-hidden="true">{levelConfig.emoji}</span>
                  {t(`profile.levelTitle.${user.extra.level}` as string) ?? t("profile.levelTitle.beginner")}
                </span>
              </div>

              <p title={user.email ?? undefined} className="mt-1 truncate text-sm text-muted-foreground">
                {user.email}
              </p>

              <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm text-muted-foreground sm:justify-start">
                {regionName && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" />
                    {regionName}
                  </span>
                )}
                {user.gender && (
                  <span className="inline-flex items-center gap-1.5">
                    <UserRound className="h-4 w-4" />
                    {genderText}
                  </span>
                )}
                {user.birthday && (
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    {formatBirthday(user.birthday)} · {getAgeNumber(user.birthday)} {t("profile.ageSuffix")}
                  </span>
                )}
                {user.extra.completedHikes > 0 && (
                  <span className="inline-flex items-center gap-1.5">
                    <Mountain className="h-4 w-4" />
                    <span className="tabular-nums">{user.extra.completedHikes}</span>
                    {t("profile.hikesCompleted")}
                  </span>
                )}
              </div>

              {user.bio && (
                <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
                  {user.bio}
                </p>
              )}
            </div>

            <a
              href="/profile/edit"
              className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-[transform,background-color] duration-150 hover:bg-primary/90 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:w-auto"
            >
              <Edit3 className="h-4 w-4" />
              {t("profile.editProfileBtn")}
            </a>
          </div>
        </section>

        <section data-testid="profile-stats" aria-label={t("profile.statsTitle")} className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
          <ProfileStatLink href="/my-teams?tab=created" icon={Mountain} label={t("profile.statCreatedLabel")} value={createdTotal} />
          <ProfileStatLink href="/my-teams?tab=joined" icon={Users} label={t("profile.statJoinedLabel")} value={joinedTotal} />
          <ProfileStatLink href="/my-teams?tab=history" icon={CheckCircle2} label={t("profile.statCompletedLabel")} value={completedTotal} />
        </section>

        <div className="mt-8 space-y-8">
          {createdTeams.length > 0 && (
            <TeamSection
              id="created-teams"
              teams={createdTeams}
              title={t("profile.createdTeamsSectionTitle")}
              viewAllHref="/my-teams?tab=created"
              viewAllLabel={t("profile.viewMyTeams")}
            />
          )}

          {joinedTeams.length > 0 && (
            <TeamSection
              id="joined-teams"
              teams={joinedTeams}
              title={t("profile.joinedTeamsSectionTitle")}
              viewAllHref="/my-teams?tab=joined"
              viewAllLabel={t("profile.viewMyTeams")}
            />
          )}

          {createdTotal === 0 && joinedTotal === 0 && (
            <section className="rounded-2xl border border-border bg-card px-6 py-10 text-center sm:py-12" aria-labelledby="profile-empty-title">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Mountain className="h-5 w-5 text-muted-foreground" />
              </div>
              <h2 id="profile-empty-title" className="mt-4 text-lg font-semibold text-foreground">
                {t("profile.noTeamsTitle")}
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                {t("profile.noTeamsDesc")}
              </p>
              <a
                href="/teams/create"
                className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground transition-[transform,background-color] duration-150 hover:bg-primary/90 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {t("profile.createTeamBtn")}
              </a>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
