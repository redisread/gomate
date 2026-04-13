import { Users, MapPin, Calendar, Clock, ChevronRight, Hourglass, CheckCircle, XCircle } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { cn } from "@/lib/utils";
import { formatTimeAgo } from "@/lib/date-utils";
import type { ApplicationRecord, PendingApproval } from "./my-teams-types";

function getAppStatusConfig(t: (key: any, vars?: Record<string, string | number>) => string): Record<string, { label: string; color: string; icon: React.ElementType }> {
  return {
    pending: { label: t("myTeams.appStatusPending"), color: "bg-amber-50 text-amber-700 border border-amber-200", icon: Hourglass },
    approved: { label: t("myTeams.appStatusApproved"), color: "bg-amber-50 text-amber-700 border border-amber-200", icon: CheckCircle },
    rejected: { label: t("myTeams.appStatusRejected"), color: "bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 border border-stone-200 dark:border-stone-700", icon: XCircle },
  };
}

function getLevelConfig(t: (key: any, vars?: Record<string, string | number>) => string): Record<string, { label: string; emoji: string; color: string }> {
  return {
    beginner: { label: t("myTeams.levelBeginner"), emoji: "🌱", color: "bg-green-50 text-green-700 border border-green-200" },
    intermediate: { label: t("myTeams.levelIntermediate"), emoji: "🥾", color: "bg-blue-50 text-blue-700 border border-blue-200" },
    advanced: { label: t("myTeams.levelAdvanced"), emoji: "⛰️", color: "bg-purple-50 text-purple-700 border border-purple-200" },
    expert: { label: t("myTeams.levelExpert"), emoji: "🏔️", color: "bg-amber-50 text-amber-700 border border-amber-200" },
  };
}

export function ApplicationCard({ application }: { application: ApplicationRecord }) {
  const { t } = useI18n();
  const team = application.team;
  const statusConfig = getAppStatusConfig(t);
  const appStatus = statusConfig[application.status] || statusConfig.pending;
  const StatusIcon = appStatus.icon;
  if (!team) return null;
  const isFull = team.currentMembers >= team.maxMembers;

  return (
    <a href={`/teams/${team.id}`} className="block group">
      <div className="bg-card rounded-2xl border border-stone-100 dark:border-stone-800 p-4 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-amber-100/40 hover:border-amber-200/50 transition-all duration-200">
        <div className="flex items-start gap-4">
          <div className="w-20 h-20 rounded-xl flex-shrink-0 overflow-hidden bg-stone-100 dark:bg-stone-800 flex items-center justify-center">
            {team.location?.coverImage ? (
              <img src={team.location.coverImage} alt={team.location.name || ""}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
            ) : (
              <MapPin className="h-8 w-8 text-stone-300 dark:text-stone-600" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-semibold text-foreground group-hover:text-amber-700 transition-colors truncate">{team.title}</h3>
                {team.location?.name && (
                  <p className="text-sm text-stone-500 dark:text-stone-500 mt-1 flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 flex-shrink-0" /><span className="truncate">{team.location.name}</span>
                  </p>
                )}
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 flex items-center gap-1.5 ${appStatus.color}`}>
                <StatusIcon className="h-3 w-3" />{appStatus.label}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-3 text-sm">
              {team.date && (
                <span className="flex items-center gap-1 text-stone-500 dark:text-stone-500">
                  <Calendar className="h-3.5 w-3.5" />{team.date}
                </span>
              )}
              {team.time && (
                <span className="flex items-center gap-1 text-stone-500 dark:text-stone-500">
                  <Clock className="h-3.5 w-3.5" />{team.time}
                </span>
              )}
              <span className={cn("flex items-center gap-1 font-medium", isFull ? "text-amber-600" : "text-amber-600")}>
                <Users className="h-3.5 w-3.5" />{team.currentMembers}/{team.maxMembers}{t("myTeams.memberSuffix")}
              </span>
            </div>
            <div className="flex items-center justify-between mt-2">
              {team.leader && (
                <p className="text-xs text-stone-400 dark:text-stone-500">
                  {t("myTeams.teamLeaderLabel")}<span className="text-stone-600 dark:text-stone-500">{team.leader.name}</span>
                </p>
              )}
              <p className="text-xs text-stone-400 dark:text-stone-500 ml-auto">{formatTimeAgo(application.createdAt)}</p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-stone-300 dark:text-stone-600 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all flex-shrink-0 self-center" />
        </div>
      </div>
    </a>
  );
}

export function PendingApprovalCard({ approval, onClick }: {
  approval: PendingApproval; onClick: (a: PendingApproval) => void;
}) {
  const { t } = useI18n();
  const applicant = approval.applicant;
  const team = approval.team;
  if (!applicant || !team) return null;
  const levelConfig = getLevelConfig(t);
  const lv = levelConfig[applicant.level];

  return (
    <button className="w-full text-left bg-card rounded-2xl border-l-4 border-l-amber-400 border-y border-r border-stone-100 dark:border-stone-800 p-4 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-amber-50 transition-all duration-200 group"
      onClick={() => onClick(approval)}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1.5">
          <Hourglass className="h-3 w-3" />{t("myTeams.pendingReview")}
        </span>
        <span className="text-xs text-stone-400 dark:text-stone-500">{formatTimeAgo(approval.createdAt)}</span>
      </div>
      <div className="flex items-start gap-3">
        <div className="w-14 h-14 rounded-full bg-stone-200 dark:bg-stone-700 flex items-center justify-center overflow-hidden flex-shrink-0 ring-2 ring-amber-100">
          {applicant.avatar ? (
            <img src={applicant.avatar} alt={applicant.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-xl font-semibold text-stone-500 dark:text-stone-500">{applicant.name?.charAt(0) || "?"}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-foreground">{applicant.name}</h3>
            {lv ? (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${lv.color}`}>{lv.emoji} {lv.label}</span>
            ) : (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-500">{applicant.level}</span>
            )}
          </div>
          {applicant.bio ? (
            <p className="text-sm text-stone-500 dark:text-stone-500 mt-1 line-clamp-1 leading-relaxed">{applicant.bio}</p>
          ) : (
            <p className="text-sm text-stone-400 dark:text-stone-500 mt-1 italic">{t("myTeams.noBio")}</p>
          )}
        </div>
      </div>
      <div className="mt-3 bg-stone-50 dark:bg-stone-900 rounded-xl px-4 py-3 text-sm">
        <p className="font-medium text-stone-700 dark:text-stone-300 mb-1.5 truncate">{t("myTeams.applyTeamLabel")}：{team.title}</p>
        <div className="flex flex-wrap gap-3 text-stone-500 dark:text-stone-500 text-xs">
          {team.date && (
            <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{team.date}</span>
          )}
          <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{team.currentMembers}/{team.maxMembers}{t("myTeams.memberSuffix")}</span>
          {team.location?.name && (
            <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{team.location.name}</span>
          )}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-end">
        <span className="text-sm text-amber-600 font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
          {t("myTeams.viewDetail")}<ChevronRight className="h-4 w-4" />
        </span>
      </div>
    </button>
  );
}
