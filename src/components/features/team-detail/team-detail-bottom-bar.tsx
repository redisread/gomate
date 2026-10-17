import { Loader2 } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { useTeamDetail } from "./use-team-detail";
import { ToastDisplay } from "./team-detail-ui";
import {
  LeaveConfirmDialog,
  FormTeamConfirmDialog,
} from "./team-detail-modals";
import { TeamDecisionPrimaryAction } from "./team-detail-sidebar";
export function TeamModalsAndFooter({
  ctx,
}: {
  ctx: ReturnType<typeof useTeamDetail>;
}) {
  if (!ctx.team) return null;
  return (
    <>
      <ConfirmDialogs ctx={ctx} />
      <ToastDisplay toast={ctx.toast} exiting={ctx.exiting} />
      {!ctx.isLeader && !ctx.isMember && (
        <div
          data-testid="team-mobile-action-bar"
          className="fixed bottom-0 inset-x-0 z-40 border-t bg-background p-4 lg:hidden"
        >
          <TeamDecisionPrimaryAction
            team={ctx.team}
            userId={ctx.userId}
            canJoin={ctx.canJoin}
            joining={ctx.joining}
            isFull={ctx.isFull}
            isLeader={ctx.isLeader}
            isMember={ctx.isMember}
            onJoin={ctx.handleJoin}
          />
        </div>
      )}
    </>
  );
}
function ConfirmDialogs({ ctx }: { ctx: ReturnType<typeof useTeamDetail> }) {
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
            <h3 className="text-lg font-bold text-foreground mb-2">
              {t("teams.deleteTeamConfirm")}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {t("teams.deleteTeamWarning")}
            </p>
            <button
              onClick={ctx.handleDelete}
              disabled={ctx.isDeleting}
              className="w-full py-3 bg-red-600 text-white rounded-xl mb-2 hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {ctx.isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
              {t("teams.deleteTeam")}
            </button>
            <button
              onClick={() => ctx.setShowDeleteConfirm(false)}
              disabled={ctx.isDeleting}
              className="w-full py-3 text-muted-foreground hover:bg-accent rounded-xl transition-colors"
            >
              {t("common.cancel")}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
