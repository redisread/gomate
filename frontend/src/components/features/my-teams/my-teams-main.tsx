"use client";

import { Plus, Users, ClipboardCheck, Hourglass } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { cn } from "@/lib/utils";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { useMyTeams } from "./use-my-teams";
import { TeamListSection } from "./my-teams-team-card";
import { ApplicationCard, PendingApprovalCard } from "./my-teams-application-card";
import { ApprovalDetailModal, RejectConfirmModal, CancelTeamModal, FormTeamModal } from "./my-teams-modals";
import { StatBadge, LoadingState, EmptyState, LoadMoreButton } from "./my-teams-ui";

export function MyTeamsClient() {
  const { t } = useI18n(["myTeams"]);
  const ctx = useMyTeams();

  if (!ctx.currentUser) {
    return (
      <main className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin h-8 w-8 text-stone-400 dark:text-stone-500 rounded-full border-4 border-stone-200 dark:border-stone-700 border-t-stone-400 dark:border-t-stone-500" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <div className="bg-stone-50 dark:bg-stone-900 border-b border-stone-100 dark:border-stone-800 pt-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-stone-400 dark:text-stone-500 mb-1">{t("myTeams.welcomeBack")}</p>
            <h1 className="text-2xl font-bold text-foreground leading-tight">
              {ctx.currentUser.nickname || ctx.currentUser.name}
            </h1>
            <div className="flex items-center gap-4 mt-3">
              <StatBadge label={t("myTeams.statCreated")} count={ctx.activeCreated.length} />
              <StatBadge label={t("myTeams.statJoined")} count={ctx.activeJoined.length} />
              {ctx.pendingApprovals.length > 0 && (
                <StatBadge label={t("myTeams.statPendingApprovals")} count={ctx.pendingApprovals.length} highlight />
              )}
            </div>
          </div>
          <a href="/teams/create" className="flex-shrink-0">
            <button className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded-xl font-medium transition-all duration-200 text-sm active:scale-95">
              <Plus className="h-4 w-4" />{t("myTeams.createTeamBtn")}
            </button>
          </a>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {ctx.actionMessage && (
          <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl text-sm text-amber-700 dark:text-amber-400 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="m9 11 3 3L22 4" /></svg>
              {ctx.actionMessage}
            </span>
            <button onClick={() => ctx.setActionMessage("")} className="text-amber-400 hover:text-amber-600 transition-colors ml-4">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="m15 9-6 6" /><path d="m9 9 6 6" /></svg>
            </button>
          </div>
        )}

        <div className="border-b border-stone-100 dark:border-stone-800 mt-2 overflow-x-auto">
          <div className="flex min-w-max">
            {[
              { id: "participated", label: t("myTeams.tabParticipated"), icon: Users, count: ctx.createdTeams.length + ctx.joinedTeams.length },
              { id: "applications", label: t("myTeams.tabApplications"), icon: ClipboardCheck, count: ctx.pendingApplicationsCount + ctx.pendingApprovals.length },
            ].map(({ id, label, icon: Icon, count }) => (
              <button key={id} onClick={() => ctx.handleTabChange(id)}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-3 text-sm font-medium transition-all duration-200 whitespace-nowrap relative",
                  ctx.activeTab === id ? "text-amber-700 border-b-2 border-amber-500" : "text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300 border-b-2 border-transparent"
                )}>
                <Icon className="h-4 w-4" />{label}
                {count > 0 && <span className="w-2 h-2 rounded-full absolute top-2 right-1.5 bg-amber-500" />}
              </button>
            ))}
          </div>
        </div>

        {ctx.activeTab === "participated" && (
          <div className="mt-6 space-y-4">
            <div className="flex gap-2">
              {[
                { id: "all", label: t("myTeams.roleFilterAll"), count: ctx.createdTeams.length + ctx.joinedTeams.length },
                { id: "leader", label: t("myTeams.roleFilterLeader"), count: ctx.createdTeams.length },
                { id: "member", label: t("myTeams.roleFilterMember"), count: ctx.joinedTeams.length },
              ].map(({ id, label, count }) => (
                <button key={id} onClick={() => ctx.handleRoleFilterChange(id as "all" | "leader" | "member")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                    ctx.roleFilter === id ? "bg-amber-500 text-white" : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700"
                  )}>
                  {label}
                  <span className={cn("text-xs", ctx.roleFilter === id ? "text-amber-100" : "text-stone-400 dark:text-stone-500")}>{count}</span>
                </button>
              ))}
            </div>

            {ctx.createdLoading || ctx.joinedLoading ? (
              <LoadingState />
            ) : ctx.createdTeams.length === 0 && ctx.joinedTeams.length === 0 ? (
              <EmptyState icon="users" title={t("myTeams.emptyParticipatedTitle")} desc={t("myTeams.emptyParticipatedDesc")} btnLabel={t("myTeams.emptyParticipatedBtn")} href="/locations" />
            ) : ctx.roleFilter === "leader" && ctx.createdTeams.length === 0 ? (
              <EmptyState icon="crown" title={t("myTeams.emptyCreatedTitle")} desc={t("myTeams.emptyCreatedDesc")} btnLabel={t("myTeams.emptyCreatedBtn")} href="/teams/create" />
            ) : ctx.roleFilter === "member" && ctx.joinedTeams.length === 0 ? (
              <EmptyState icon="mountain" title={t("myTeams.emptyJoinedTitle")} desc={t("myTeams.emptyJoinedDesc")} btnLabel={t("myTeams.emptyJoinedBtn")} href="/locations" />
            ) : (
              <>
                {(ctx.roleFilter === "all" || ctx.roleFilter === "leader") && (
                  <TeamListSection teams={ctx.createdTeams} isLeader onCancel={(id) => ctx.setCancelTarget(id)} onForm={(id) => ctx.setFormTarget(id)} />
                )}
                {(ctx.roleFilter === "all" || ctx.roleFilter === "member") && (
                  <TeamListSection teams={ctx.joinedTeams} isLeader={false} />
                )}
              </>
            )}
            <LoadMoreButton
              hasMore={ctx.roleFilter === "leader" ? ctx.createdHasMore : ctx.roleFilter === "member" ? ctx.joinedHasMore : ctx.createdHasMore || ctx.joinedHasMore}
              loading={ctx.roleFilter === "leader" ? ctx.createdLoadingMore : ctx.roleFilter === "member" ? ctx.joinedLoadingMore : ctx.createdLoadingMore || ctx.joinedLoadingMore}
              onClick={() => {
                if (ctx.roleFilter === "leader") ctx.setCreatedPage((p) => p + 1);
                else if (ctx.roleFilter === "member") ctx.setJoinedPage((p) => p + 1);
                else { if (ctx.createdHasMore) ctx.setCreatedPage((p) => p + 1); if (ctx.joinedHasMore) ctx.setJoinedPage((p) => p + 1); }
              }}
            />
          </div>
        )}

        {ctx.activeTab === "applications" && (
          <div className="mt-6 space-y-4">
            <div className="flex gap-2 bg-stone-100 dark:bg-stone-800 rounded-xl p-1">
              <button onClick={() => ctx.handleSubTabChange("my")}
                className={cn("flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all",
                  ctx.applicationSubTab === "my" ? "bg-white text-stone-800 shadow-sm" : "text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300"
                )}>
                <ClipboardCheck className="h-4 w-4" />{t("myTeams.subTabMyApplications")}
                {ctx.pendingApplicationsCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
              </button>
              <button onClick={() => ctx.handleSubTabChange("pending")}
                className={cn("flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all",
                  ctx.applicationSubTab === "pending" ? "bg-white text-stone-800 shadow-sm" : "text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300"
                )}>
                <Hourglass className="h-4 w-4" />{t("myTeams.subTabPendingApprovals")}
                {ctx.pendingApprovals.length > 0 && (
                  <span className="px-1.5 py-0.5 text-xs bg-amber-500 text-white rounded-full">{ctx.pendingApprovals.length}</span>
                )}
              </button>
            </div>

            {ctx.applicationSubTab === "my" && (
              <div className="space-y-3">
                {ctx.applicationsLoading ? <LoadingState />
                  : ctx.applications.length === 0 ? (
                    <EmptyState icon="clipboard" title={t("myTeams.emptyApplications")} desc={t("myTeams.emptyApplicationsDesc")} btnLabel={t("myTeams.emptyApplicationsBtn")} href="/teams" />
                  ) : ctx.applications.map((app) => <ApplicationCard key={app.id} application={app} />)
                }
                <LoadMoreButton hasMore={ctx.applicationsHasMore} loading={ctx.applicationsLoadingMore} onClick={() => ctx.setApplicationsPage((p) => p + 1)} />
              </div>
            )}

            {ctx.applicationSubTab === "pending" && (
              <div className="space-y-3">
                {ctx.pendingLoading ? <LoadingState />
                  : ctx.pendingApprovals.length === 0 ? (
                    <EmptyState icon="hourglass" title={t("myTeams.emptyPending")} desc={t("myTeams.emptyPendingDesc")} btnLabel={t("myTeams.emptyPendingBtn")} href="/my-teams?tab=initiated" />
                  ) : ctx.pendingApprovals.map((approval) => (
                    <PendingApprovalCard key={approval.id} approval={approval} onClick={(a) => { ctx.setSelectedApproval(a); ctx.setIsDetailOpen(true); }} />
                  ))
                }
                <LoadMoreButton hasMore={ctx.pendingHasMore} loading={ctx.pendingLoadingMore} onClick={() => ctx.setPendingPage((p) => p + 1)} />
              </div>
            )}
          </div>
        )}
      </div>

      <Footer />

      {ctx.isDetailOpen && ctx.selectedApproval && (
        <ApprovalDetailModal
          approval={ctx.selectedApproval} isProcessing={ctx.isProcessing}
          onApprove={ctx.handleApprove} onReject={async () => ctx.setIsRejectConfirmOpen(true)}
          onClose={() => ctx.setIsDetailOpen(false)}
        />
      )}
      <RejectConfirmModal
        isOpen={ctx.isRejectConfirmOpen} isProcessing={ctx.isProcessing}
        onConfirm={ctx.handleConfirmReject} onCancel={() => ctx.setIsRejectConfirmOpen(false)}
      />
      <CancelTeamModal
        teamId={ctx.cancelTarget} isCancelling={ctx.isCancelling}
        onConfirm={ctx.handleCancelTeam} onCancel={() => ctx.setCancelTarget(null)}
      />
      <FormTeamModal
        teamId={ctx.formTarget} isFull={!!ctx.createdTeams.find((t2) => t2.id === ctx.formTarget)?.currentMembers && ctx.createdTeams.find((t2) => t2.id === ctx.formTarget)?.currentMembers! >= ctx.createdTeams.find((t2) => t2.id === ctx.formTarget)?.maxMembers!}
        isForming={ctx.isForming} onConfirm={ctx.handleFormTeam} onCancel={() => ctx.setFormTarget(null)}
      />
    </main>
  );
}
