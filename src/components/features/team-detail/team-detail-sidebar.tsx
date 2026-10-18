import { Button as SwButton } from "@/components/starwind-react/button";
import {
  ArrowRight,
  AlertCircle,
  CheckCircle,
  Loader2,
  Users,
  Trash2,
  Pencil,
} from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import type { Team } from "@/lib/types";
import { useTeamDetail } from "./use-team-detail";

import { getTeamDisplayStatus } from "@/lib/team-display";

export function TeamDecisionPanel({
  ctx,
}: {
  ctx: ReturnType<typeof useTeamDetail>;
}) {
  const { team, isLeader, isMember, statusLoadFailed } = ctx;

  if (!team) return null;

  return (
    <div
      data-testid="team-decision-panel"
      className="mt-5 space-y-4 border-t border-dashed border-border pt-5"
    >
      <div className="space-y-4">
        <TeamCapacity
          team={team}
          canJoin={ctx.canJoin}
          remaining={ctx.remaining}
        />

        {isLeader && <LeaderActions ctx={ctx} team={team} />}
        {isMember && (
          <MemberStatusIndicator onLeave={() => ctx.setShowLeave(true)} />
        )}
        {statusLoadFailed && <StatusLoadError onRetry={ctx.retryStatus} />}
      </div>
    </div>
  );
}

function TeamCapacity({
  team,
  canJoin,
  remaining,
}: {
  team: Team;
  canJoin: boolean;
  remaining: number;
}) {
  const { t } = useI18n(["teams"]);
  const percentage =
    team.maxParticipants > 0
      ? Math.min(
          100,
          Math.max(
            0,
            (team.activeParticipantCount / team.maxParticipants) * 100,
          ),
        )
      : 0;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm font-medium">
          {t("teams.teamMembersTitle")}
        </span>
        <span className="text-sm tabular-nums text-muted-foreground">
          <strong className="text-lg text-foreground">
            {team.activeParticipantCount}
          </strong>
          {team.maxParticipants > 0
            ? ` / ${team.maxParticipants}`
            : ` · ${t("teams.unlimitedSpots")}`}
        </span>
      </div>
      {team.maxParticipants > 0 && (
        <div
          className="h-1.5 overflow-hidden rounded-full bg-secondary"
          aria-hidden="true"
        >
          <div
            className="h-full rounded-full bg-brand transition-[width] duration-200 ease-out motion-reduce:transition-none"
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
      {canJoin && remaining > 0 && (
        <p className="text-sm text-accent-foreground">
          {remaining === 1
            ? t("teams.spotsRemainingOne")
            : t("teams.spotsRemainingCount").replace(
                "{remaining}",
                String(remaining),
              )}
        </p>
      )}
    </div>
  );
}

export function TeamDecisionPrimaryAction({
  team,
  userId,
  canJoin,
  isFull,
  isLeader,
  isMember,
  onJoin,
  joining = false,
}: {
  team: Team;
  userId: string | null;
  canJoin: boolean;
  isFull: boolean;
  isLeader: boolean;
  isMember: boolean;
  onJoin: () => void;
  joining?: boolean;
}) {
  const { t } = useI18n(["teams"]);
  const displayStatus = getTeamDisplayStatus(team);

  if (isLeader || isMember) return null;

  if (!canJoin) {
    const unavailableMessage = isFull
      ? t("teams.teamFullCannotJoin")
      : displayStatus === "completed" ||
          displayStatus === "expired_unformed" ||
          displayStatus === "closed"
        ? t("teams.statusEnded")
        : displayStatus === "formed" || displayStatus === "ongoing"
          ? t("teams.statusFormed")
          : t("teams.statusCancelled");

    return (
      <p className="text-sm leading-6 text-muted-foreground">
        {unavailableMessage}
      </p>
    );
  }

  if (!userId) {
    return (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <p className="text-pretty text-sm leading-6 text-muted-foreground">
          {t("teams.loginToJoinTeam")}
        </p>
        <SwButton as="a" variant="plain" size="inherit"
          href={`/login?redirect=/teams/${team.id}`}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-accent-foreground px-5 text-sm font-semibold text-background transition-[transform,background-color] duration-150 active:scale-[0.96] motion-reduce:transform-none [@media(hover:hover)]:hover:bg-accent-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
        >
          {t("teams.loginBtn")}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </SwButton>
      </div>
    );
  }

  return (
    <SwButton variant="plain" size="inherit"
      type="button"
      data-testid="team-join-button"
      onClick={onJoin}
      disabled={joining}
      aria-busy={joining}
      className="inline-flex min-h-12 w-full gap-2 items-center justify-center rounded-lg bg-accent-foreground px-6 text-base font-semibold text-background transition-[transform,background-color] duration-150 active:scale-[0.96] motion-reduce:transform-none [@media(hover:hover)]:hover:bg-accent-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
    >
      {joining && (
        <Loader2
          className="h-4 w-4 animate-spin motion-reduce:animate-none"
          aria-hidden="true"
        />
      )}
      {t("teams.joinTeam")}
    </SwButton>
  );
}

function LeaderActions({
  ctx,
  team,
}: {
  ctx: ReturnType<typeof useTeamDetail>;
  team: Team;
}) {
  const { t } = useI18n(["teams"]);
  return (
    <div className="space-y-3">
      {team.lifecycle === "pending" && (
        <a
          href={`/teams/${team.id}/edit`}
          className="min-h-11 w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-accent rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Pencil className="w-4 h-4" />
          {t("teams.editTeam")}
        </a>
      )}
      {team.lifecycle === "pending" && (
        <SwButton variant="plain" size="inherit" type="button"
          onClick={() => ctx.setShowFormConfirm(true)}
          disabled={ctx.isForming}
          className="min-h-11 w-full flex items-center gap-2 px-3 py-2 text-sm text-background bg-accent-foreground hover:bg-accent-foreground/90 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 font-medium"
        >
          {ctx.isForming && (
            <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" />
          )}
          <Users className="w-4 h-4" />
          {ctx.isFull ? t("teams.formTeam") : t("teams.formTeamUnderfilled")}
        </SwButton>
      )}
      {team.lifecycle === "pending" && team.activeParticipantCount === 1 && (
        <SwButton variant="plain" size="inherit" type="button"
          onClick={() => ctx.setShowDeleteConfirm(true)}
          disabled={ctx.isDeleting}
          className="min-h-11 w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-destructive/10 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        >
          {ctx.isDeleting && (
            <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" />
          )}
          <Trash2 className="w-4 h-4 text-destructive" aria-hidden="true" />
          {t("teams.deleteTeam")}
        </SwButton>
      )}
    </div>
  );
}

function MemberStatusIndicator({ onLeave }: { onLeave: () => void }) {
  const { t } = useI18n(["teams"]);
  return (
    <div
      data-testid="team-member-status"
      className="rounded-lg bg-success-subtle p-3 space-y-2"
    >
      <div className="flex items-center gap-2 text-accent-foreground">
        <CheckCircle className="w-4 h-4" />
        <span className="font-medium text-sm">
          {t("teams.joinedTeamStatus")}
        </span>
      </div>
      <SwButton variant="plain" size="inherit" type="button"
        onClick={onLeave}
        className="min-h-11 w-full rounded-lg text-sm text-muted-foreground hover:text-foreground py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {t("teams.leaveTeam")}
      </SwButton>
    </div>
  );
}

function StatusLoadError({ onRetry }: { onRetry: () => void }) {
  const { t } = useI18n(["teams"]);
  return (
    <div className="bg-warning-subtle border border-warning/30 rounded-xl p-4 text-center space-y-2">
      <div className="flex items-center justify-center gap-2 text-accent-foreground">
        <AlertCircle className="w-4 h-4" />
        <span className="font-medium text-sm">
          {t("teams.statusLoadFailed")}
        </span>
      </div>
      <p className="text-xs text-foreground">{t("teams.retryMessage")}</p>
      <SwButton variant="plain" size="inherit" type="button"
        onClick={onRetry}
        className="min-h-11 w-full py-2 text-sm text-accent-foreground bg-secondary hover:bg-accent rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring font-medium"
      >
        {t("teams.reloadBtn")}
      </SwButton>
    </div>
  );
}
