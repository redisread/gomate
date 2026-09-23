import { ArrowRight, Clock, AlertCircle, CheckCircle, Share2, Loader2, Users, Trash2, Pencil } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import type { Team } from "@/lib/types";
import { useTeamDetail } from "./use-team-detail";
import { TeamApplicationsSection } from "./team-detail-applications";
import { TeamProgress } from "@/components/features/teams/shared";
import { getTeamDisplayStatus } from "@/lib/team-display";
import { ShareOptionsSheet } from "./share-options-sheet";
import { SharePosterPreview } from "./share-poster-preview";
import * as React from "react";

// Reuse the same hook from bottom-bar
function useTeamShare(team: Team | null) {
  const [showOptions, setShowOptions] = React.useState(false);
  const [showPreview, setShowPreview] = React.useState(false);

  const openShare = React.useCallback(() => {
    setShowOptions(true);
  }, []);

  const closeOptions = React.useCallback(() => {
    setShowOptions(false);
  }, []);

  const closePreview = React.useCallback(() => {
    setShowPreview(false);
  }, []);

  const handleGeneratePoster = React.useCallback(() => {
    setShowOptions(false);
    setShowPreview(true);
  }, []);

  const handleCopyLink = React.useCallback(async () => {
    if (!team) return;
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch {
      // Ignore
    }
    setShowOptions(false);
  }, [team]);

  return {
    showOptions,
    showPreview,
    openShare,
    closeOptions,
    closePreview,
    handleGeneratePoster,
    handleCopyLink,
  };
}

export function TeamSidebar({ ctx }: { ctx: ReturnType<typeof useTeamDetail>; }) {
  const { team, isLeader, isMember, isPending, statusLoadFailed, applications, isFull } = ctx;
  const share = useTeamShare(team);

  if (!team) return null;

  return (
    <aside data-testid="team-decision-panel" className="space-y-5 lg:sticky lg:top-24 lg:col-start-2 lg:row-start-1 lg:self-start">
      <div className="rounded-[20px] bg-card p-5 shadow-[0_8px_28px_rgba(82,58,31,0.08)] sm:p-6">
        <TeamCapacity team={team} canJoin={ctx.canJoin} remaining={ctx.remaining} />

        <ShareButton onClick={share.openShare} />
        {isLeader && <LeaderActions ctx={ctx} team={team} />}
        {isMember && <MemberStatusIndicator onLeave={() => ctx.setShowLeave(true)} />}
        {isPending && <PendingStatusIndicator />}
        {statusLoadFailed && <StatusLoadError onRetry={ctx.loadTeam} />}
      </div>

      {isLeader && (
        <TeamApplicationsSection
          applications={applications}
          onApprove={ctx.handleApprove}
          onReject={ctx.handleReject}
          isFull={isFull}
        />
      )}

      <ShareOptionsSheet
        open={share.showOptions}
        onClose={share.closeOptions}
        onGeneratePoster={share.handleGeneratePoster}
        onCopyLink={share.handleCopyLink}
      />
      <SharePosterPreview
        open={share.showPreview}
        teamId={team.id}
        teamTitle={team.title}
        onClose={share.closePreview}
      />
    </aside>
  );
}

function TeamCapacity({ team, canJoin, remaining }: { team: Team; canJoin: boolean; remaining: number; }) {
  const { t } = useI18n(["teams"]);
  const displayStatus = getTeamDisplayStatus(team);
  return (
    <div className="rounded-xl bg-amber-50 p-4 space-y-3">
      <TeamProgress
        current={team.activeParticipantCount}
        max={team.maxParticipants}
        status={displayStatus}
        showLabel={true}
        size="md"
      />
      {canJoin && remaining > 0 && (
        <p className="mt-2 text-center text-xs font-medium text-amber-800">
          {remaining === 1 ? t('teams.spotsRemainingOne') : t('teams.spotsRemainingCount').replace('{remaining}', String(remaining))}
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
  isPending,
  onJoin,
}: {
  team: Team;
  userId: string | null;
  canJoin: boolean;
  isFull: boolean;
  isLeader: boolean;
  isMember: boolean;
  isPending: boolean;
  onJoin: () => void;
}) {
  const { t } = useI18n(["teams"]);
  const displayStatus = getTeamDisplayStatus(team);

  if (isLeader || isMember || isPending) return null;

  if (!canJoin) {
    const unavailableMessage = isFull
      ? t("teams.teamFullCannotJoin")
      : displayStatus === "completed" || displayStatus === "expired_unformed" || displayStatus === "closed"
        ? t("teams.statusEnded")
        : displayStatus === "formed" || displayStatus === "ongoing"
          ? t("teams.statusFormed")
          : t("teams.statusCancelled");

    return <p className="text-sm leading-6 text-muted-foreground">{unavailableMessage}</p>;
  }

  if (!userId) {
    return (
      <div className="space-y-3">
        <p className="text-pretty text-sm leading-6 text-muted-foreground">
          {t("teams.loginToJoinTeam")}
        </p>
        <a
          href={`/login?redirect=/teams/${team.id}`}
          className="inline-flex min-h-11 w-fit items-center gap-2 rounded-xl bg-stone-900 px-5 text-sm font-semibold text-white transition-[transform,background-color] duration-150 active:scale-[0.96] motion-reduce:transform-none [@media(hover:hover)]:hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {t("teams.loginBtn")}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </a>
      </div>
    );
  }

  return (
    <button
      type="button"
      data-testid="team-join-button"
      onClick={onJoin}
      className="inline-flex min-h-12 w-fit items-center justify-center rounded-xl bg-amber-600 px-6 text-base font-semibold text-white transition-[transform,background-color] duration-150 active:scale-[0.96] motion-reduce:transform-none [@media(hover:hover)]:hover:bg-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      {t("teams.joinTeam")}
    </button>
  );
}

function ShareButton({ onClick }: { onClick: () => void; }) {
  const { t } = useI18n(["teams"]);
  return (
    <div className="mt-5 border-t border-border pt-4">
      <button
        type="button"
        onClick={onClick}
        className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-sm text-foreground/70 transition-[transform,background-color,color] duration-150 active:scale-[0.96] motion-reduce:transform-none [@media(hover:hover)]:hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Share2 className="h-4 w-4" aria-hidden="true" />
        {t('teams.shareTeam')}
      </button>
    </div>
  );
}

function LeaderActions({ ctx, team }: { ctx: ReturnType<typeof useTeamDetail>; team: Team; }) {
  const { t } = useI18n(["teams"]);
  return (
    <div className="bg-amber-50 rounded-xl p-3 space-y-1.5">
      {team.lifecycle === "pending" && (
        <a href={`/teams/${team.id}/edit`}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground/70 hover:bg-accent rounded-lg transition-colors">
          <Pencil className="w-4 h-4" />
          {t('teams.editTeam')}
        </a>
      )}
      {team.lifecycle === "pending" && (
        <button onClick={() => ctx.setShowFormConfirm(true)} disabled={ctx.isForming}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-amber-400 hover:bg-accent rounded-lg transition-colors disabled:opacity-50 font-medium">
          {ctx.isForming && <Loader2 className="w-4 h-4 animate-spin" />}
          <Users className="w-4 h-4" />
          {ctx.isFull ? t('teams.formTeam') : t('teams.formTeamUnderfilled')}
        </button>
      )}
      {team.lifecycle === "pending" && team.activeParticipantCount === 0 && (
        <button onClick={() => ctx.setShowDeleteConfirm(true)} disabled={ctx.isDeleting}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-accent rounded-lg transition-colors disabled:opacity-50">
          {ctx.isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
          <Trash2 className="w-4 h-4" />
          {t('teams.deleteTeam')}
        </button>
      )}
    </div>
  );
}

function MemberStatusIndicator({ onLeave }: { onLeave: () => void; }) {
  const { t } = useI18n(["teams"]);
  return (
    <div data-testid="team-member-status" className="bg-amber-50 rounded-xl p-3 space-y-2">
      <div className="flex items-center gap-2 text-amber-700">
        <CheckCircle className="w-4 h-4" />
        <span className="font-medium text-sm">{t('teams.joinedTeamStatus')}</span>
      </div>
      <button onClick={onLeave} className="w-full text-xs text-muted-foreground/70 hover:text-red-600 py-1 transition-colors">
        {t('teams.leaveTeam')}
      </button>
    </div>
  );
}

function PendingStatusIndicator() {
  const { t } = useI18n(["teams"]);
  return (
    <div data-testid="team-pending-status" className="bg-muted rounded-xl p-3 space-y-2">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Clock className="w-4 h-4" />
        <span className="font-medium text-sm">{t('teams.pendingReviewStatus')}</span>
      </div>
      <a href="/my-teams" className="block text-center text-xs text-amber-600 hover:text-amber-700">
        {t('teams.myTeamsLink')} &rarr;
      </a>
    </div>
  );
}

function StatusLoadError({ onRetry }: { onRetry: () => void; }) {
  const { t } = useI18n(["teams"]);
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center space-y-2">
      <div className="flex items-center justify-center gap-2 text-amber-700">
        <AlertCircle className="w-4 h-4" />
        <span className="font-medium text-sm">{t('teams.statusLoadFailed')}</span>
      </div>
      <p className="text-xs text-amber-600">{t('teams.retryMessage')}</p>
      <button onClick={onRetry}
        className="w-full py-2 text-xs text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors font-medium">
        {t('teams.reloadBtn')}
      </button>
    </div>
  );
}
