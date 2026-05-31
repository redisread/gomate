"use client";

import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { useTeamDetail } from "./use-team-detail";
import { TeamSidebar } from "./team-detail-sidebar";
import { TeamMainContent } from "./team-detail-content";
import { TeamModalsAndFooter } from "./team-detail-bottom-bar";
import { TeamDetailSkeleton } from "./team-detail-skeleton";
import { useI18n } from "@/hooks/useI18n";

interface TeamDetailPartifulProps {
  teamId: string;
}

export function TeamDetailPartiful({ teamId }: TeamDetailPartifulProps) {
  const { t } = useI18n(["teams", "common"]);
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

  return (
    <main className="min-h-screen bg-background flex flex-col">
      <Navbar />
      {/* pt-20 为固定导航栏预留空间（移动端） */}
      <div className="flex-1 max-w-7xl mx-auto px-6 pt-20 pb-8 lg:pt-8 lg:pb-12 lg:py-8 pb-24 lg:pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-8 lg:gap-12">
          <TeamSidebar ctx={ctx} />
          <TeamMainContent ctx={ctx} />
        </div>
      </div>
      <TeamModalsAndFooter ctx={ctx} />
    </main>
  );
}
