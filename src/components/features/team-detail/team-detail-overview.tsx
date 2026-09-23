import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Clock,
  Crown,
  Loader2,
  MapPin,
  MessageCircle,
  Mountain,
  Timer,
} from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { createConversation } from "@/hooks/useMessages";
import { TeamLeaderMini } from "@/components/features/teams/shared";
import type { Location, Team } from "@/lib/types";
import { formatTeamStart, getTeamDurationMinutes } from "@/lib/team-display";
import { formatDuration } from "./team-detail-utils";
import { getRegionDisplayName } from "@/components/shared/quick-city-options";

interface TeamDepartureBriefProps {
  team: Team;
  location: Location | null;
  statusLabel: string;
  canMessageLeader: boolean;
  desktopAction?: React.ReactNode;
}

export function TeamDepartureBrief({
  team,
  location,
  statusLabel,
  canMessageLeader,
  desktopAction,
}: TeamDepartureBriefProps) {
  const { t } = useI18n(["teams", "common"]);
  const start = formatTeamStart(team);
  const durationMinutes = getTeamDurationMinutes(team);
  const [isStartingConversation, setIsStartingConversation] = React.useState(false);
  const [messageError, setMessageError] = React.useState<string | null>(null);

  const handleMessageLeader = async () => {
    setIsStartingConversation(true);
    setMessageError(null);
    try {
      const conversation = await createConversation(team.id);
      window.location.href = `/messages/${conversation.id}`;
    } catch (error) {
      console.error("Failed to create conversation:", error);
      setMessageError(t("teams.messageStartFailed"));
    } finally {
      setIsStartingConversation(false);
    }
  };

  return (
    <section
      data-testid="team-departure-brief"
      className="overflow-hidden rounded-[20px] bg-card shadow-warm-md lg:grid lg:grid-cols-[minmax(0,0.9fr)_minmax(24rem,1.1fr)]"
    >
      <LocationMedia location={location} />

      <div className="flex flex-col px-5 py-6 sm:px-8 sm:py-8 lg:px-9 lg:py-8 xl:px-10 xl:py-10">
        <a
          href="/teams"
          className="mb-6 inline-flex min-h-10 w-fit items-center gap-2 rounded-lg px-2 text-sm font-medium text-muted-foreground transition-[transform,color,background-color] duration-150 active:scale-[0.96] motion-reduce:transform-none [@media(hover:hover)]:hover:bg-accent [@media(hover:hover)]:hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t("common.backTeams")}
        </a>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="inline-flex min-h-8 items-center rounded-full bg-amber-100 px-3 text-sm font-semibold text-amber-800">
            {statusLabel}
          </span>
          {location?.region?.name && (
            <span className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-secondary px-3 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              {getRegionDisplayName(location.region)}
            </span>
          )}
        </div>

        <h1 className="text-balance text-3xl font-bold leading-[1.18] text-foreground sm:text-4xl lg:text-[2.65rem]">
          {team.title}
        </h1>

        <ul className="mt-6 grid grid-cols-1 gap-x-8 gap-y-3 rounded-2xl bg-secondary/60 px-4 py-4 sm:grid-cols-2 sm:px-5">
          <MetaItem icon={Calendar} label={start.date} />
          {start.time && <MetaItem icon={Clock} label={start.time} />}
          {durationMinutes > 0 && (
            <MetaItem
              icon={Timer}
              label={`${t("teams.estimatedPrefix")} ${formatDuration(durationMinutes / 60)}`}
            />
          )}
          {location && <MetaItem icon={MapPin} label={location.name} />}
        </ul>

        {location && (
          <a
            href={`/locations/${location.id}`}
            className="mt-4 inline-flex min-h-10 w-fit items-center gap-2 rounded-xl px-3 text-sm font-medium text-muted-foreground transition-[transform,color,background-color] duration-150 active:scale-[0.96] motion-reduce:transform-none [@media(hover:hover)]:hover:bg-accent [@media(hover:hover)]:hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {t("teams.viewLocationDetail")}
            <span aria-hidden="true">·</span>
            <span>{location.name}</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </a>
        )}

        {team.description && (
          <div className="prose prose-stone mt-5 max-w-none text-pretty text-sm leading-7 text-muted-foreground prose-p:my-0">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{team.description}</ReactMarkdown>
          </div>
        )}

        {desktopAction && (
          <div data-testid="team-desktop-primary-action" className="mt-6 hidden rounded-2xl bg-secondary/60 p-4 lg:block">
            {desktopAction}
          </div>
        )}

        {team.leader && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <a
              href={`/users/${team.leader.id}`}
              className="inline-flex min-h-11 items-center gap-3 rounded-xl px-2 transition-[transform,background-color] duration-150 active:scale-[0.96] motion-reduce:transform-none [@media(hover:hover)]:hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                <Crown className="h-4 w-4" aria-hidden="true" />
              </span>
              <span>
                <span className="block text-xs text-muted-foreground">{t("teams.creatorLabel")}</span>
                <TeamLeaderMini leader={team.leader} showLevel size="sm" />
              </span>
            </a>

            {canMessageLeader && (
              <button
                type="button"
                onClick={handleMessageLeader}
                disabled={isStartingConversation}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-primary/10 px-4 text-sm font-semibold text-primary transition-[transform,background-color] duration-150 active:scale-[0.96] motion-reduce:transform-none [@media(hover:hover)]:hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isStartingConversation ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <MessageCircle className="h-4 w-4" aria-hidden="true" />
                )}
                {t("teams.messageLeader")}
              </button>
            )}
          </div>
        )}

        {messageError && <p className="mt-2 text-sm text-red-600">{messageError}</p>}
      </div>
    </section>
  );
}

function LocationMedia({ location }: { location: Location | null }) {
  const { t } = useI18n(["teams"]);
  const content = (
    <div className="group relative h-full min-h-72 overflow-hidden bg-stone-900 lg:min-h-[34rem]">
      {location?.coverImageUrl ? (
        <img
          src={location.coverImageUrl}
          alt={location.name}
          width={1200}
          height={900}
          loading="eager"
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-300 motion-reduce:transform-none [@media(hover:hover)]:group-hover:scale-[1.015]"
        />
      ) : (
        <div className="flex h-full min-h-72 items-center justify-center bg-stone-900 text-amber-300/70">
          <Mountain className="h-16 w-16" aria-hidden="true" />
        </div>
      )}

      {location && (
        <div className="absolute inset-x-0 bottom-0 bg-stone-950/75 p-5 text-white sm:p-6">
          <span className="mb-1 flex items-center gap-1.5 text-xs text-white/75">
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            {t("teams.activityLocation")}
          </span>
          <div className="flex items-end justify-between gap-4">
            <span className="text-2xl font-bold leading-tight sm:text-3xl">{location.name}</span>
            <span className="shrink-0 text-xs font-medium text-white/70 sm:text-sm">
              {t("teams.viewLocationDetail")}
            </span>
          </div>
        </div>
      )}
    </div>
  );

  return content;
}

function MetaItem({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
  label: string;
}) {
  return (
    <li className="flex min-h-8 items-center gap-2 text-sm text-foreground/80">
      <Icon className="h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
      <span className="font-medium tabular-nums">{label}</span>
    </li>
  );
}
