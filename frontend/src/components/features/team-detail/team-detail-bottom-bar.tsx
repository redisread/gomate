import { Crown, Share2, Trash2, Pencil, CheckCircle, LogOut, Clock, ArrowRight, Loader2 } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import type { Team } from "@/lib/types";
import { useTeamDetail } from "./use-team-detail";
import { ToastDisplay } from "./team-detail-ui";
import {
  JoinBottomSheet, JoinDesktopModal, LeaveConfirmDialog,
  FormTeamConfirmDialog, WechatEditModal,
} from "./team-detail-modals";
import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";

// 动态导入 SharePosterModal
const SharePosterModal = React.lazy(() => import("../share-poster-modal").then(m => ({ default: m.SharePosterModal })));

export function TeamModalsAndFooter({ ctx }: { ctx: ReturnType<typeof useTeamDetail>; }) {
  const { t } = useI18n(["teams", "common"]);
  const { team, location } = ctx;
  if (!team) return null;

  const fillRatio = Math.round((team.currentMembers / team.maxMembers) * 100);

  return (
    <>
      <JoinModals ctx={ctx} team={team} fillRatio={fillRatio} />
      <ConfirmDialogs ctx={ctx} />
      <WechatModals ctx={ctx} />
      {ctx.showShare && (
        <SharePosterModal
          type="team"
          title={team.title}
          subtitle={team.date}
          url={window.location.href}
          imageUrl={location?.coverImage}
          locationName={location?.name}
          description={team.description}
          leaderName={team.leader?.nickname || team.leader?.name}
          membersInfo={`${team.currentMembers}/${team.maxMembers}`}
          meta={t('teams.teamMeta').replace('{currentMembers}', String(team.currentMembers)).replace('{maxMembers}', String(team.maxMembers))}
          tags={team.requirements?.slice(0, 4)}
          onClose={() => ctx.setShowShare(false)}
          onToast={ctx.show}
        />
      )}
      <ToastDisplay toast={ctx.toast} exiting={ctx.exiting} />
      <MobileBottomBar ctx={ctx} team={team} />
    </>
  );
}

function JoinModals({ ctx, team, fillRatio }: { ctx: ReturnType<typeof useTeamDetail>; team: Team; fillRatio: number; }) {
  return (
    <>
      <JoinBottomSheet
        open={ctx.showJoinModal} onClose={() => ctx.setShowJoinModal(false)}
        onJoin={ctx.handleJoin} isJoining={ctx.joining}
        joinMessage={ctx.joinMsg} setJoinMessage={ctx.setJoinMsg}
        remaining={ctx.remaining} fillRatio={fillRatio}
        currentMembers={team.currentMembers} maxMembers={team.maxMembers}
      />
      {ctx.showJoinModal && (
        <JoinDesktopModal
          open={ctx.showJoinModal} onClose={() => ctx.setShowJoinModal(false)}
          onJoin={ctx.handleJoin} isJoining={ctx.joining}
          joinMessage={ctx.joinMsg} setJoinMessage={ctx.setJoinMsg}
          remaining={ctx.remaining} fillRatio={fillRatio}
          currentMembers={team.currentMembers} maxMembers={team.maxMembers}
        />
      )}
    </>
  );
}

function ConfirmDialogs({ ctx }: { ctx: ReturnType<typeof useTeamDetail>; }) {
  const { t } = useI18n(["teams", "common"]);
  return (
    <>
      <LeaveConfirmDialog
        open={ctx.showLeave}
        onCancel={() => ctx.setShowLeave(false)}
        onConfirm={ctx.handleLeave}
      />
      {ctx.showFormConfirm && (
        <FormTeamConfirmDialog
          open={ctx.showFormConfirm}
          isFull={ctx.isFull}
          isLoading={ctx.isForming}
          onCancel={() => ctx.setShowFormConfirm(false)}
          onConfirm={ctx.handleFormTeam}
        />
      )}
      {ctx.showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl max-w-sm w-full p-6 animate-[fadeScaleIn_0.2s_ease_both]">
            <h3 className="text-lg font-bold text-foreground mb-2">{t('teams.deleteTeamConfirm')}</h3>
            <p className="text-sm text-muted-foreground mb-4">{t('teams.deleteTeamWarning')}</p>
            <button onClick={ctx.handleDelete} disabled={ctx.isDeleting}
              className="w-full py-3 bg-red-600 text-white rounded-xl mb-2 hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {ctx.isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
              {t('teams.deleteTeam')}
            </button>
            <button onClick={() => ctx.setShowDeleteConfirm(false)} disabled={ctx.isDeleting}
              className="w-full py-3 text-muted-foreground hover:bg-accent rounded-xl transition-colors">
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function WechatModals({ ctx }: { ctx: ReturnType<typeof useTeamDetail>; }) {
  const { t } = useI18n(["teams", "common"]);
  return (
    <>
      {ctx.showWechatConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div role="alertdialog" aria-modal="true"
            className="bg-card rounded-2xl max-w-sm w-full p-6 shadow-xl animate-[fadeScaleIn_0.2s_ease_both]">
            <h3 className="text-lg font-bold text-foreground mb-2">{t('teams.wechatRequiredJoinTitle')}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">{t('teams.wechatRequiredJoinDesc')}</p>
            <button onClick={() => { ctx.setShowWechatConfirm(false); ctx.setShowWechatSheet(true); }}
              className="w-full py-3 bg-amber-600 text-white rounded-xl font-medium hover:bg-amber-700 transition-colors mb-2">
              {t('teams.fillWechatBtn') || t('common.goToFill')}
            </button>
            <button onClick={() => ctx.setShowWechatConfirm(false)}
              className="w-full py-3 text-muted-foreground text-sm font-medium hover:bg-accent rounded-xl transition-colors">
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}
      {ctx.showWechatSheet && (
        <WechatEditModal
          onClose={() => ctx.setShowWechatSheet(false)}
          onSave={ctx.handleSaveWechat}
          isSaving={false}
        />
      )}
    </>
  );
}

function MobileBottomBar({ ctx, team }: { ctx: ReturnType<typeof useTeamDetail>; team: Team; }) {
  const { isLeader, isMember, isPending, userId, canJoin } = ctx;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border z-40 lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="max-w-7xl mx-auto px-4 py-3">
        {isLeader && <BottomBarLeader ctx={ctx} team={team} />}
        {!isLeader && isMember && <BottomBarMember ctx={ctx} />}
        {!isLeader && !isMember && isPending && <BottomBarPending ctx={ctx} />}
        {!isLeader && !isMember && !isPending && !userId && <BottomBarNotLoggedIn team={team} />}
        {!isLeader && !isMember && !isPending && userId && canJoin && <BottomBarCanJoin ctx={ctx} />}
        {!isLeader && !isMember && !isPending && userId && !canJoin && <BottomBarCannotJoin ctx={ctx} team={team} />}
      </div>
    </div>
  );
}

function BottomBarLeader({ ctx, team }: { ctx: ReturnType<typeof useTeamDetail>; team: Team; }) {
  const { t } = useI18n(["teams", "common"]);
  return (
    <div className="flex items-center justify-between min-h-[44px]">
      <div className="flex items-center gap-2 text-amber-600 text-sm">
        <Crown className="h-4 w-4" />
        <span className="font-medium">{t('teams.youAreLeader')}</span>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={() => ctx.setShowShare(true)} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-muted-foreground/70 hover:bg-amber-50 hover:text-amber-600 transition-colors">
          <Share2 className="h-4 w-4" />
        </button>
        {(team.status === "recruiting" || team.status === "cancelled") && (
          <button onClick={() => ctx.setShowDeleteConfirm(true)}
            className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-red-500 hover:bg-red-100 transition-colors"
            title={t('teams.deleteTeam')}>
            <Trash2 className="h-4 h-4" />
          </button>
        )}
        <a href={`/teams/${team.id}/edit`} className="inline-flex items-center gap-1 text-xs text-amber-600 font-medium">
          <Pencil className="h-3 w-3" />
          {t('teams.editBtn')}
        </a>
      </div>
    </div>
  );
}

function BottomBarMember({ ctx }: { ctx: ReturnType<typeof useTeamDetail>; }) {
  const { t } = useI18n(["teams", "common"]);
  return (
    <div className="flex items-center justify-between min-h-[44px]">
      <div className="flex items-center gap-2 text-amber-600 text-sm">
        <CheckCircle className="h-4 w-4" />
        <span className="font-medium">{t('teams.statusApproved')}</span>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={() => ctx.setShowShare(true)} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-muted-foreground/70 hover:bg-amber-50 hover:text-amber-600 transition-colors">
          <Share2 className="h-4 w-4" />
        </button>
        <button onClick={() => ctx.setShowLeave(true)} className="flex items-center gap-1 text-xs text-muted-foreground border border-border rounded-full px-3 py-1.5 hover:border-red-300 hover:text-red-500 transition-colors">
          <LogOut className="h-3 w-3" />
          {t('teams.leaveTeam')}
        </button>
      </div>
    </div>
  );
}

function BottomBarPending({ ctx }: { ctx: ReturnType<typeof useTeamDetail>; }) {
  const { t } = useI18n(["teams", "common"]);
  return (
    <div className="flex items-center justify-between min-h-[44px]">
      <div className="flex items-center gap-2 text-amber-600 text-sm">
        <Clock className="h-4 w-4" />
        <span className="font-medium">{t('teams.statusPending')}</span>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={() => ctx.setShowShare(true)} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-muted-foreground/70 hover:bg-amber-50 hover:text-amber-600 transition-colors">
          <Share2 className="h-4 w-4" />
        </button>
        <a href="/my-teams" className="text-xs text-amber-600 flex items-center gap-1">
          {t('teams.viewLink')} <ArrowRight className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}

function BottomBarNotLoggedIn({ team }: { team: Team; }) {
  const { t } = useI18n(["teams"]);
  return (
    <div className="flex items-center justify-between min-h-[44px]">
      <span className="text-sm text-muted-foreground">{t('teams.loginToJoinTeam')}</span>
      <a href={`/login?redirect=/teams/${team.id}`}
        className="px-4 py-2 bg-stone-800 text-white rounded-xl text-sm font-medium hover:bg-stone-900 transition-colors">
        {t('teams.loginBtn')}
      </a>
    </div>
  );
}

function BottomBarCanJoin({ ctx }: { ctx: ReturnType<typeof useTeamDetail>; }) {
  const { t } = useI18n(["teams", "common"]);
  return (
    <div className="flex items-center gap-2">
      <button onClick={() => ctx.setShowShare(true)} className="w-11 h-11 rounded-2xl bg-secondary flex items-center justify-center text-muted-foreground hover:bg-amber-50 hover:text-amber-600 border border-border hover:border-amber-200 transition-all flex-shrink-0">
        <Share2 className="h-4 w-4" />
      </button>
      <button onClick={() => ctx.setShowJoinModal(true)}
        className="flex-1 py-3 rounded-2xl font-semibold text-white bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 transition-all min-h-[44px]">
        {t('teams.joinTeam')}
      </button>
    </div>
  );
}

function BottomBarCannotJoin({ ctx, team }: { ctx: ReturnType<typeof useTeamDetail>; team: Team; }) {
  const { t } = useI18n(["teams", "common"]);
  return (
    <div className="flex items-center justify-between min-h-[44px]">
      <div className="text-muted-foreground/70 text-sm">
        {team.status === "completed" ? t('teams.statusEnded') : team.status === "cancelled" ? t('teams.statusCancelled') : t('teams.teamFull')}
      </div>
      <button onClick={() => ctx.setShowShare(true)} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-muted-foreground/70 hover:bg-amber-50 hover:text-amber-600 transition-colors">
        <Share2 className="h-4 h-4" />
      </button>
    </div>
  );
}
