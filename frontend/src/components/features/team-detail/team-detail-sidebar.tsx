import { MapPin, ArrowRight, Calendar, Clock, Timer, AlertCircle, CheckCircle, Crown, Share2, Loader2, Users, Trash2, Pencil, MessageCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useI18n } from "@/hooks/useI18n";
import type { Team, Location, User } from "@/lib/types";
import { useTeamDetail } from "./use-team-detail";
import { formatDuration } from "./team-detail-utils";
import { TeamApplicationsSection } from "./team-detail-applications";
import { TeamProgress, TeamLeaderMini } from "@/components/features/teams/shared";
import * as React from "react";
import { createConversation } from "@/hooks/useMessages";

// 懒加载分享相关组件
const ShareOptionsSheet = React.lazy(() => import("./share-options-sheet").then(m => ({ default: m.ShareOptionsSheet })));
const SharePosterPreview = React.lazy(() => import("./share-poster-preview").then(m => ({ default: m.SharePosterPreview })));

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
  const { team, location, isLeader, isMember, isPending, statusLoadFailed, applications, isFull } = ctx;
  const share = useTeamShare(team);

  if (!team) return null;

  return (
    <aside className="lg:sticky lg:top-24 lg:self-start space-y-6">
      <h1 className="text-2xl lg:text-3xl font-bold text-foreground leading-tight">{team.title}</h1>
      <TeamTimeInfo team={team} />
      {location && <MobileLocationLink location={location} />}
      {team.description && (
        <div className="border-t border-border pt-4">
          <div className="text-sm text-muted-foreground leading-relaxed prose-sm">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{team.description}</ReactMarkdown>
          </div>
        </div>
      )}
      <TeamCapacity team={team} canJoin={ctx.canJoin} remaining={ctx.remaining} />
      {team.leader && <LeaderCard leader={team.leader} teamId={team.id} canMessage={isMember} />}
      <ShareButton onClick={share.openShare} />
      {isLeader && <LeaderActions ctx={ctx} team={team} />}
      {isMember && <MemberStatusIndicator onLeave={() => ctx.setShowLeave(true)} />}
      {isPending && <PendingStatusIndicator />}
      {statusLoadFailed && <StatusLoadError onRetry={ctx.loadTeam} />}
      {isLeader && (
        <TeamApplicationsSection
          applications={applications}
          onApprove={ctx.handleApprove}
          onReject={ctx.handleReject}
          isFull={isFull}
        />
      )}

      {/* Share Modals - 懒加载 */}
      <React.Suspense fallback={null}>
        <ShareOptionsSheet
          open={share.showOptions}
          onClose={share.closeOptions}
          onGeneratePoster={share.handleGeneratePoster}
          onCopyLink={share.handleCopyLink}
        />
      </React.Suspense>
      <React.Suspense fallback={null}>
        <SharePosterPreview
          open={share.showPreview}
          teamId={team.id}
          teamTitle={team.title}
          onClose={share.closePreview}
        />
      </React.Suspense>
    </aside>
  );
}

function TeamTimeInfo({ team }: { team: Team; }) {
  const { t } = useI18n(["teams"]);
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-base text-foreground/70">
        <Calendar className="w-4 h-4 text-amber-500" />
        <span className="font-medium">{team.date}</span>
      </div>
      {team.time && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>{team.time}</span>
        </div>
      )}
      {team.durationMin && team.durationMin > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Timer className="w-4 h-4" />
          <span>{t('teams.estimatedPrefix')} {formatDuration(team.durationMin / 60)}</span>
        </div>
      )}
    </div>
  );
}

function MobileLocationLink({ location }: { location: Location; }) {
  return (
    <div className="lg:hidden">
      <a href={`/locations/${location.id}`}
        className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg text-foreground/70 hover:bg-amber-50 hover:text-amber-700 transition-colors">
        <MapPin className="w-4 h-4" />
        <span className="font-medium text-sm">{location.name}</span>
        <ArrowRight className="w-3 h-3 ml-auto" />
      </a>
    </div>
  );
}

function TeamCapacity({ team, canJoin, remaining }: { team: Team; canJoin: boolean; remaining: number; }) {
  const { t } = useI18n(["teams"]);
  return (
    <div className="bg-amber-50 rounded-xl p-4 space-y-3">
      <TeamProgress
        current={team.currentMembers}
        max={team.maxMembers}
        status={team.status}
        showLabel={true}
        size="md"
      />
      {canJoin && remaining > 0 && (
        <p className="text-xs text-amber-600 mt-2 font-medium text-center">
          {remaining === 1 ? t('teams.spotsRemainingOne') : t('teams.spotsRemainingCount').replace('{remaining}', String(remaining))}
        </p>
      )}
    </div>
  );
}

function LeaderCard({ leader, teamId, canMessage }: { leader: User; teamId: string; canMessage: boolean; }) {
  const { t } = useI18n(["teams"]);
  const [isStarting, setIsStarting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleMessage = async () => {
    setIsStarting(true);
    setError(null);
    try {
      const conversation = await createConversation(teamId);
      window.location.href = `/messages/${conversation.id}`;
    } catch (err) {
      console.error("Failed to create conversation:", err);
      setError(t("teams.messageStartFailed"));
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div className="border-t border-border pt-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
        <Crown className="w-3.5 h-3.5" />
        <span className="font-medium">{t('teams.creatorLabel')}</span>
      </div>
      <a href={`/users/${leader.id}`}
        className="flex items-center gap-3 p-3 bg-muted rounded-xl hover:bg-amber-50 transition-colors">
        <TeamLeaderMini leader={leader} showLevel={true} size="md" />
      </a>
      {canMessage && (
        <div className="mt-2 space-y-2">
          <button
            type="button"
            onClick={handleMessage}
            disabled={isStarting}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isStarting ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
            {t("teams.messageLeader")}
          </button>
          {error && <p className="text-xs text-red-600 text-center">{error}</p>}
        </div>
      )}
    </div>
  );
}

function ShareButton({ onClick }: { onClick: () => void; }) {
  const { t } = useI18n(["teams"]);
  return (
    <div className="border-t border-border pt-4">
      <button onClick={onClick}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground/70 hover:bg-accent rounded-lg transition-colors">
        <Share2 className="w-4 h-4" />
        {t('teams.shareTeam')}
      </button>
    </div>
  );
}

function LeaderActions({ ctx, team }: { ctx: ReturnType<typeof useTeamDetail>; team: Team; }) {
  const { t } = useI18n(["teams"]);
  return (
    <div className="bg-amber-50 rounded-xl p-3 space-y-1.5">
      <a href={`/teams/${team.id}/edit`}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground/70 hover:bg-accent rounded-lg transition-colors">
        <Pencil className="w-4 h-4" />
        {t('teams.editTeam')}
      </a>
      {(team.status === "recruiting" || team.status === "full") && (
        <button onClick={() => ctx.setShowFormConfirm(true)} disabled={ctx.isForming}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-amber-400 hover:bg-accent rounded-lg transition-colors disabled:opacity-50 font-medium">
          {ctx.isForming && <Loader2 className="w-4 h-4 animate-spin" />}
          <Users className="w-4 h-4" />
          {ctx.isFull ? t('teams.formTeam') : t('teams.formTeamUnderfilled')}
        </button>
      )}
      {(team.status === "recruiting" || team.status === "cancelled") && (
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
