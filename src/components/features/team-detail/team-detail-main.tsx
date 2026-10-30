import { withI18n } from "@/i18n/context";

import { Button as SwButton } from "@/components/starwind-react/button";

import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { useTeamDetail } from "./use-team-detail";
import {
  TeamDecisionPrimaryAction,
  TeamDecisionPanel,
} from "./team-detail-sidebar";
import { TeamMainContent } from "./team-detail-content";
import { TeamModalsAndFooter } from "./team-detail-bottom-bar";
import { TeamDetailSkeleton } from "./team-detail-skeleton";
import { useI18n } from "@/hooks/useI18n";
import { TeamDepartureBrief } from "./team-detail-overview";
import { getStatusInfo } from "./team-detail-utils";
import { getTeamDisplayStatus } from "@/lib/team-display";

import type { Team } from "@/lib/types";

interface TeamDetailPartifulProps {
  teamId: string;
  initialTeam?: Team;
}

function TeamDetailPartifulContent({ teamId, initialTeam }: TeamDetailPartifulProps) {
  const { t } = useI18n(["teams", "common", "enums"]);
  const ctx = useTeamDetail(teamId, initialTeam);
  const { team, loading, error } = ctx;

  if (loading) return <TeamDetailSkeleton />;

  if (error || !team) {
    return (
      <main className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex min-h-80 flex-1 items-center justify-center px-4 pb-12 pt-24">
          <div className="text-center space-y-4">
            <p className="text-muted-foreground/70">
              {error || t("teams.notFound")}
            </p>
            <SwButton variant="plain" size="inherit"
              type="button"
              onClick={() => window.location.reload()}
              className="min-h-11 underline"
            >
              {t("common.retry")}
            </SwButton>
            <a
              href="/teams"
              className="text-accent-foreground hover:text-foreground underline underline-offset-2"
            >
              {t("common.backTeams")}
            </a>
          </div>
        </div>
        <Footer />
      </main>
    );
  }

  const statusInfo = getStatusInfo(getTeamDisplayStatus(team), t);
  const desktopAction =
    !ctx.isLeader && !ctx.isMember ? (
      <TeamDecisionPrimaryAction
        team={team}
        userId={ctx.userId}
        canJoin={ctx.canJoin}
        isFull={ctx.isFull}
        isLeader={ctx.isLeader}
        isMember={ctx.isMember}
        onJoin={ctx.handleJoin}
        joining={ctx.joining}
        pending={ctx.statusLoading}
        unavailable={ctx.statusLoadFailed}
      />
    ) : null;

  return (
    <main className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div
        data-testid="team-detail-content"
        className="mx-auto w-full max-w-6xl flex-1 px-4 pb-[calc(var(--team-action-height,0px)+3rem)] pt-20 sm:px-6 lg:pb-16 lg:pt-24"
      >
        {(ctx.refreshing || ctx.refreshError) && (
          <div role={ctx.refreshError ? "alert" : "status"} className="mb-4 flex items-center gap-3 rounded-xl bg-muted px-4 py-3 text-sm">
            <span>{ctx.refreshError || t("teams.updating")}</span>
            {ctx.refreshError && <SwButton variant="plain" size="inherit" type="button" onClick={ctx.loadTeam} className="min-h-11 underline">{t("common.retry")}</SwButton>}
          </div>
        )}
        <TeamDepartureBrief
          team={team}
          location={ctx.location}
          statusLabel={statusInfo.label}
          statusColor={statusInfo.color}
          decisionPanel={<TeamDecisionPanel ctx={ctx} />}
          showMeetingPoint={ctx.isLeader || ctx.isMember}
          desktopAction={desktopAction}
        />

        <div className="mt-8 sm:mt-12">
          <TeamMainContent ctx={ctx} />
        </div>
      </div>
      <TeamModalsAndFooter ctx={ctx} />
    </main>
  );
}

export const TeamDetailPartiful = withI18n(TeamDetailPartifulContent);
