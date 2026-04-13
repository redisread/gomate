import { MapPin, ArrowRight, Calendar, Clock, Timer, AlertCircle, CheckCircle, Crown, Share2, Loader2, Users, Trash2, Pencil } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import type { Team } from "@/lib/types";
import { useTeamDetail } from "./use-team-detail";
import { formatDuration } from "./team-detail-utils";
import { Avatar } from "./team-detail-ui";
import { TeamApplicationsSection } from "./team-detail-applications";

export function TeamSidebar({ ctx }: { ctx: ReturnType<typeof useTeamDetail>; }) {
  const { team, location, isLeader, isMember, isPending, statusLoadFailed, applications, isFull } = ctx;
  if (!team) return null;

  return (
    <aside className="lg:sticky lg:top-24 lg:self-start space-y-6">
      <h1 className="text-2xl lg:text-3xl font-bold text-foreground leading-tight">{team.title}</h1>
      <TeamTimeInfo team={team} />
      {location && <MobileLocationLink location={location} />}
      {team.description && (
        <div className="border-t border-border pt-4">
          <p className="text-sm text-muted-foreground leading-relaxed">{team.description}</p>
        </div>
      )}
      <TeamCapacity team={team} canJoin={ctx.canJoin} remaining={ctx.remaining} />
      {team.leader && <LeaderCard leader={team.leader} />}
      <ShareButton onClick={() => ctx.setShowShare(true)} />
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
    </aside>
  );
}

function TeamTimeInfo({ team }: { team: Team; }) {
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
          <span>约 {formatDuration(team.durationMin)}</span>
        </div>
      )}
    </div>
  );
}

function MobileLocationLink({ location }: { location: any; }) {
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
  return (
    <div className="bg-amber-50 rounded-xl p-4 text-center">
      <p className="text-2xl font-bold text-amber-600 mb-1">
        {team.currentMembers}<span className="text-muted-foreground/70 text-lg">/{team.maxMembers}</span>
      </p>
      <p className="text-xs text-muted-foreground">人已加入</p>
      {canJoin && remaining > 0 && (
        <p className="text-xs text-amber-600 mt-2 font-medium">
          {remaining === 1 ? "仅剩 1 个名额" : `还剩 ${remaining} 个名额`}
        </p>
      )}
    </div>
  );
}

function LeaderCard({ leader }: { leader: any; }) {
  return (
    <div className="border-t border-border pt-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
        <Crown className="w-3.5 h-3.5" />
        <span className="font-medium">创建人</span>
      </div>
      <a href={`/users/${leader.id}`}
        className="flex items-center gap-3 p-3 bg-muted rounded-xl hover:bg-amber-50 transition-colors">
        <Avatar name={leader.nickname || leader.name || undefined} avatar={leader.avatar} isLeader size="md" />
        <div className="flex-1">
          <p className="font-semibold text-foreground text-sm">{leader.nickname || leader.name}</p>
        </div>
      </a>
    </div>
  );
}

function ShareButton({ onClick }: { onClick: () => void; }) {
  return (
    <div className="border-t border-border pt-4">
      <button onClick={onClick}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground/70 hover:bg-accent rounded-lg transition-colors">
        <Share2 className="w-4 h-4" />
        分享队伍
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
        编辑队伍
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
  return (
    <div className="bg-amber-50 rounded-xl p-3 space-y-2">
      <div className="flex items-center gap-2 text-amber-700">
        <CheckCircle className="w-4 h-4" />
        <span className="font-medium text-sm">已加入队伍</span>
      </div>
      <button onClick={onLeave} className="w-full text-xs text-muted-foreground/70 hover:text-red-600 py-1 transition-colors">
        退出队伍
      </button>
    </div>
  );
}

function PendingStatusIndicator() {
  return (
    <div className="bg-muted rounded-xl p-3 space-y-2">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Clock className="w-4 h-4" />
        <span className="font-medium text-sm">申请待审核</span>
      </div>
      <a href="/my-teams" className="block text-center text-xs text-amber-600 hover:text-amber-700">
        查看我的队伍 &rarr;
      </a>
    </div>
  );
}

function StatusLoadError({ onRetry }: { onRetry: () => void; }) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center space-y-2">
      <div className="flex items-center justify-center gap-2 text-amber-700">
        <AlertCircle className="w-4 h-4" />
        <span className="font-medium text-sm">无法加载您的状态</span>
      </div>
      <p className="text-xs text-amber-600">请刷新页面或重新尝试</p>
      <button onClick={onRetry}
        className="w-full py-2 text-xs text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors font-medium">
        重新加载
      </button>
    </div>
  );
}
