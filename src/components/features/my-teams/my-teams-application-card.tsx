import { ChevronRight, Hourglass, CheckCircle, XCircle } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { formatTimeAgo } from "@/lib/date-utils";
import type { ApplicationRecord, PendingApproval } from "./my-teams-types";

function getAppStatusConfig(
  t: (key: string, vars?: Record<string, string | number>) => string,
) {
  return {
    pending: { label: t("myTeams.appStatusPending"), color: "bg-amber-50 text-amber-700 border border-amber-200", icon: Hourglass },
    approved: { label: t("myTeams.appStatusApproved"), color: "bg-amber-50 text-amber-700 border border-amber-200", icon: CheckCircle },
    rejected: { label: t("myTeams.appStatusRejected"), color: "bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 border border-stone-200 dark:border-stone-700", icon: XCircle },
    cancelled: { label: t("myTeams.appStatusCancelled"), color: "bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 border border-stone-200 dark:border-stone-700", icon: XCircle },
  };
}

function getLevelConfig(t: (key: string, vars?: Record<string, string | number>) => string) {
  return {
    beginner: { label: t("myTeams.levelBeginner"), emoji: "🌱", color: "bg-green-50 text-green-700 border border-green-200" },
    intermediate: { label: t("myTeams.levelIntermediate"), emoji: "🥾", color: "bg-blue-50 text-blue-700 border border-blue-200" },
    advanced: { label: t("myTeams.levelAdvanced"), emoji: "⛰️", color: "bg-purple-50 text-purple-700 border border-purple-200" },
    expert: { label: t("myTeams.levelExpert"), emoji: "🏔️", color: "bg-amber-50 text-amber-700 border border-amber-200" },
  };
}

export function ApplicationCard({ application }: { application: ApplicationRecord }) {
  const { t } = useI18n(["myTeams"]);
  const statusConfig = getAppStatusConfig(t);
  const appStatus = statusConfig[application.status];
  const StatusIcon = appStatus.icon;

  return (
    <a href={`/teams/${application.team.id}`} className="block group">
      <article className="rounded-2xl border border-stone-100 bg-card p-4 transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-amber-200/50 hover:shadow-lg dark:border-stone-800">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate font-semibold text-foreground transition-colors group-hover:text-amber-700">{application.team.title}</h3>
            {application.message && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{application.message}</p>}
            <p className="mt-2 text-xs text-stone-400 dark:text-stone-500">{formatTimeAgo(application.createdAt)}</p>
          </div>
          <span className={`flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${appStatus.color}`}>
            <StatusIcon className="h-3 w-3" />{appStatus.label}
          </span>
          <ChevronRight className="h-5 w-5 shrink-0 self-center text-stone-300 transition-transform group-hover:translate-x-0.5 group-hover:text-amber-400 dark:text-stone-600" />
        </div>
      </article>
    </a>
  );
}

export function PendingApprovalCard({ approval, onClick }: {
  approval: PendingApproval;
  onClick: (approval: PendingApproval) => void;
}) {
  const { t } = useI18n(["myTeams"]);
  const applicant = approval.user;
  const displayName = applicant.nickname || applicant.name;
  const level = getLevelConfig(t)[applicant.extra.level];

  return (
    <button
      type="button"
      className="group w-full rounded-2xl border-y border-r border-l-4 border-stone-100 border-l-amber-400 bg-card p-4 text-left transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-lg dark:border-stone-800 dark:border-l-amber-400"
      onClick={() => onClick(approval)}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <span className="flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
          <Hourglass className="h-3 w-3" />{t("myTeams.pendingReview")}
        </span>
        <span className="text-xs text-stone-400 dark:text-stone-500">{formatTimeAgo(approval.createdAt)}</span>
      </div>
      <div className="flex items-start gap-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-stone-200 ring-2 ring-amber-100 dark:bg-stone-700">
          {applicant.image ? <img src={applicant.image} alt={displayName} className="h-full w-full object-cover" /> : <span className="text-xl font-semibold text-stone-500">{displayName.charAt(0) || "?"}</span>}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-foreground">{displayName}</h3>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${level.color}`}>{level.emoji} {level.label}</span>
          </div>
          {applicant.bio ? <p className="mt-1 line-clamp-1 text-sm text-stone-500">{applicant.bio}</p> : <p className="mt-1 text-sm italic text-stone-400">{t("myTeams.noBio")}</p>}
        </div>
      </div>
      <div className="mt-3 rounded-xl bg-stone-50 px-4 py-3 text-sm dark:bg-stone-900">
        <p className="truncate font-medium text-stone-700 dark:text-stone-300">{t("myTeams.applyTeamLabel")}：{approval.team.title}</p>
        {approval.message && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{approval.message}</p>}
      </div>
      <span className="mt-3 flex items-center justify-end gap-1 text-sm font-medium text-amber-600 group-hover:gap-2">
        {t("myTeams.viewDetail")}<ChevronRight className="h-4 w-4" />
      </span>
    </button>
  );
}
