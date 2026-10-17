"use client";

import { Plus } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { cn } from "@/lib/utils";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { useMyTeams } from "./use-my-teams";
import { TeamListSection } from "./my-teams-team-card";
import { CancelTeamModal, FormTeamModal } from "./my-teams-modals";
import {
  StatBadge,
  LoadingState,
  EmptyState,
  LoadMoreButton,
} from "./my-teams-ui";

export function MyTeamsClient() {
  const { t } = useI18n(["myTeams"]);
  const ctx = useMyTeams();

  if (!ctx.currentUser) {
    return (
      <main className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          {ctx.actionMessage && <p role="alert">{ctx.actionMessage}</p>}
          <div className="animate-spin h-8 w-8 text-stone-400 dark:text-stone-500 rounded-full border-4 border-stone-200 dark:border-stone-700 border-t-stone-400 dark:border-t-stone-500" />
        </div>
      </main>
    );
  }

  const formTargetTeam = ctx.createdTeams.find(
    (t2) => t2.id === ctx.formTarget,
  );

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <div className="bg-stone-50 dark:bg-stone-900 border-b border-stone-100 dark:border-stone-800 pt-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-stone-400 dark:text-stone-500 mb-1">
              {t("myTeams.welcomeBack")}
            </p>
            <h1 className="text-2xl font-bold text-foreground leading-tight">
              {ctx.currentUser.nickname || ctx.currentUser.name}
            </h1>
            <div className="flex items-center gap-4 mt-3">
              <StatBadge
                label={t("myTeams.statCreated")}
                count={ctx.activeCreated.length}
              />
              <StatBadge
                label={t("myTeams.statJoined")}
                count={ctx.activeJoined.length}
              />
            </div>
          </div>
          <a href="/teams/create" className="flex-shrink-0">
            <button className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded-xl font-medium transition-[transform,background-color,border-color,color,opacity,box-shadow] duration-200 text-sm active:scale-[0.96]">
              <Plus className="h-4 w-4" />
              {t("myTeams.createTeamBtn")}
            </button>
          </a>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {ctx.actionMessage && (
          <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl text-sm text-amber-700 dark:text-amber-400 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <svg
                className="h-4 w-4 text-amber-500"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <path d="m9 11 3 3L22 4" />
              </svg>
              {ctx.actionMessage}
            </span>
            <button
              onClick={() => ctx.setActionMessage("")}
              className="text-amber-400 hover:text-amber-600 transition-colors ml-4"
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="m15 9-6 6" />
                <path d="m9 9 6 6" />
              </svg>
            </button>
          </div>
        )}

        {
          <div className="mt-6 space-y-4">
            <div className="flex gap-2">
              {[
                {
                  id: "all",
                  label: t("myTeams.roleFilterAll"),
                  count: ctx.createdTeams.length + ctx.joinedTeams.length,
                },
                {
                  id: "leader",
                  label: t("myTeams.roleFilterLeader"),
                  count: ctx.createdTeams.length,
                },
                {
                  id: "member",
                  label: t("myTeams.roleFilterMember"),
                  count: ctx.joinedTeams.length,
                },
              ].map(({ id, label, count }) => (
                <button
                  key={id}
                  onClick={() =>
                    ctx.handleRoleFilterChange(
                      id as "all" | "leader" | "member",
                    )
                  }
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-[transform,background-color,border-color,color,opacity,box-shadow]",
                    ctx.roleFilter === id
                      ? "bg-amber-500 text-white"
                      : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700",
                  )}
                >
                  {label}
                  <span
                    className={cn(
                      "text-xs",
                      ctx.roleFilter === id
                        ? "text-amber-100"
                        : "text-stone-400 dark:text-stone-500",
                    )}
                  >
                    {count}
                  </span>
                </button>
              ))}
            </div>

            {ctx.createdLoading || ctx.joinedLoading ? (
              <LoadingState />
            ) : ctx.createdTeams.length === 0 &&
              ctx.joinedTeams.length === 0 ? (
              <EmptyState
                icon="users"
                title={t("myTeams.emptyParticipatedTitle")}
                desc={t("myTeams.emptyParticipatedDesc")}
                btnLabel={t("myTeams.emptyParticipatedBtn")}
                href="/locations"
              />
            ) : ctx.roleFilter === "leader" && ctx.createdTeams.length === 0 ? (
              <EmptyState
                icon="crown"
                title={t("myTeams.emptyCreatedTitle")}
                desc={t("myTeams.emptyCreatedDesc")}
                btnLabel={t("myTeams.emptyCreatedBtn")}
                href="/teams/create"
              />
            ) : ctx.roleFilter === "member" && ctx.joinedTeams.length === 0 ? (
              <EmptyState
                icon="mountain"
                title={t("myTeams.emptyJoinedTitle")}
                desc={t("myTeams.emptyJoinedDesc")}
                btnLabel={t("myTeams.emptyJoinedBtn")}
                href="/locations"
              />
            ) : (
              <>
                {(ctx.roleFilter === "all" || ctx.roleFilter === "leader") && (
                  <TeamListSection
                    teams={ctx.createdTeams}
                    isLeader
                    onCancel={(id) => ctx.setCancelTarget(id)}
                    onForm={(id) => ctx.setFormTarget(id)}
                  />
                )}
                {(ctx.roleFilter === "all" || ctx.roleFilter === "member") && (
                  <TeamListSection teams={ctx.joinedTeams} isLeader={false} />
                )}
              </>
            )}
            <LoadMoreButton
              hasMore={
                ctx.roleFilter === "leader"
                  ? ctx.createdHasMore
                  : ctx.roleFilter === "member"
                    ? ctx.joinedHasMore
                    : ctx.createdHasMore || ctx.joinedHasMore
              }
              loading={
                ctx.roleFilter === "leader"
                  ? ctx.createdLoadingMore
                  : ctx.roleFilter === "member"
                    ? ctx.joinedLoadingMore
                    : ctx.createdLoadingMore || ctx.joinedLoadingMore
              }
              onClick={() => {
                if (ctx.roleFilter === "leader") ctx.loadMoreCreated();
                else if (ctx.roleFilter === "member") ctx.loadMoreJoined();
                else {
                  if (ctx.createdHasMore) ctx.loadMoreCreated();
                  if (ctx.joinedHasMore) ctx.loadMoreJoined();
                }
              }}
            />
          </div>
        }
      </div>

      <Footer />

      <CancelTeamModal
        teamId={ctx.cancelTarget}
        isCancelling={ctx.isCancelling}
        onConfirm={ctx.handleCancelTeam}
        onCancel={() => ctx.setCancelTarget(null)}
      />
      <FormTeamModal
        teamId={ctx.formTarget}
        isFull={formTargetTeam?.isFull ?? false}
        isForming={ctx.isForming}
        onConfirm={ctx.handleFormTeam}
        onCancel={() => ctx.setFormTarget(null)}
      />
    </main>
  );
}
