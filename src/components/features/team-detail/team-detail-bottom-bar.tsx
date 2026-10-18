import { Card as SwCard } from "@/components/starwind-react/card";
import { Button as SwButton } from "@/components/starwind-react/button";
import { useEffect, useRef } from "react";
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
  const barRef = useRef<HTMLDivElement>(null);
  const hasMobileAction = !ctx.isLeader && !ctx.isMember;
  useEffect(() => {
    const bar = barRef.current;
    const main = bar?.closest("main");
    if (!bar || !main) return;
    const root = document.documentElement;
    const previousScrollPadding = root.style.scrollPaddingBottom;
    const update = () => {
      const height = bar.getBoundingClientRect().height;
      main.style.setProperty("--team-action-height", `${height}px`);
      root.style.scrollPaddingBottom =
        height > 0 ? `${height + 16}px` : previousScrollPadding;
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(bar);
    return () => {
      observer.disconnect();
      main.style.removeProperty("--team-action-height");
      root.style.scrollPaddingBottom = previousScrollPadding;
    };
  }, [hasMobileAction]);
  if (!ctx.team) return null;
  return (
    <>
      <ConfirmDialogs ctx={ctx} />
      <ToastDisplay toast={ctx.toast} exiting={ctx.exiting} />
      {hasMobileAction && (
        <div
          ref={barRef}
          data-testid="team-mobile-action-bar"
          className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md lg:hidden"
        >
          <div className="mx-auto max-w-lg">
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
          <SwCard className="block gap-0 py-0 ring-0 bg-card rounded-2xl max-w-sm w-full p-6 animate-[fadeScaleIn_0.2s_ease_both]">
            <h3 className="text-lg font-bold text-foreground mb-2">
              {t("teams.deleteTeamConfirm")}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {t("teams.deleteTeamWarning")}
            </p>
            <SwButton variant="plain" size="inherit" type="button"
              onClick={ctx.handleDelete}
              disabled={ctx.isDeleting}
              className="w-full py-3 bg-red-600 text-white rounded-xl mb-2 hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {ctx.isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
              {t("teams.deleteTeam")}
            </SwButton>
            <SwButton variant="plain" size="inherit" type="button"
              onClick={() => ctx.setShowDeleteConfirm(false)}
              disabled={ctx.isDeleting}
              className="w-full py-3 text-muted-foreground hover:bg-accent rounded-xl transition-colors"
            >
              {t("common.cancel")}
            </SwButton>
          </SwCard>
        </div>
      )}
    </>
  );
}
