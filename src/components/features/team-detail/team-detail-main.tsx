"use client";

import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { useTeamDetail } from "./use-team-detail";
import { TeamDecisionPrimaryAction, TeamSidebar } from "./team-detail-sidebar";
import { TeamMainContent } from "./team-detail-content";
import { TeamModalsAndFooter } from "./team-detail-bottom-bar";
import { TeamDetailSkeleton } from "./team-detail-skeleton";
import { useI18n } from "@/hooks/useI18n";
import { TeamDepartureBrief } from "./team-detail-overview";
import { getStatusInfo } from "./team-detail-utils";
import { getTeamDisplayStatus } from "@/lib/team-display";

interface TeamDetailPartifulProps {
  teamId: string;
}

export function TeamDetailPartiful({ teamId }: TeamDetailPartifulProps) {
  const { t } = useI18n(["teams", "common", "enums"]);
  const ctx = useTeamDetail(teamId);
  const { team, loading, error } = ctx;

  if (loading) return <TeamDetailSkeleton />;

  if (error || !team) {
    return (
      <main className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <p className="text-muted-foreground/70">{error || t('teams.notFound')}</p>
            <a href="/teams" className="text-amber-600 hover:text-amber-700 underline underline-offset-2">
              {t('common.backTeams')}
            </a>
          </div>
        </div>
        <Footer />
      </main>
    );
  }

  const statusInfo = getStatusInfo(getTeamDisplayStatus(team), t);
  const desktopAction = !ctx.isLeader && !ctx.isMember && !ctx.isPending ? (
    <TeamDecisionPrimaryAction
      team={team}
      userId={ctx.userId}
      canJoin={ctx.canJoin}
      isFull={ctx.isFull}
      isLeader={ctx.isLeader}
      isMember={ctx.isMember}
      isPending={ctx.isPending}
      onJoin={() => ctx.setShowJoinModal(true)}
    />
  ) : null;

  return (
    <main className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="mx-auto w-full max-w-7xl flex-1 px-4 pb-28 pt-20 sm:px-6 lg:pb-16 lg:pt-8">
        <TeamDepartureBrief
          team={team}
          location={ctx.location}
          statusLabel={statusInfo.label}
          canMessageLeader={ctx.isMember}
          desktopAction={desktopAction}
        />

        <div className="mt-7 grid grid-cols-1 gap-7 lg:mt-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-10">
          <TeamSidebar ctx={ctx} />
          <TeamMainContent ctx={ctx} />
        </div>
      </div>
      <TeamModalsAndFooter ctx={ctx} />
    </main>
  );
}
