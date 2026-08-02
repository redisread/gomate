import * as React from "react";
import { Crown, MapPin, Users, Calendar, Clock, ChevronRight, ChevronDown, XCircle } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { cn } from "@/lib/utils";
import type { TeamItem } from "./my-teams-types";

function getStatusLabels(t: (key: string, vars?: Record<string, string | number>) => string): Record<string, { label: string; color: string; dot: string }> {
  return {
    recruiting: { label: t("myTeams.statusRecruiting"), color: "bg-amber-50 text-amber-700 border border-amber-200", dot: "bg-amber-500" },
    full: { label: t("myTeams.statusFull"), color: "bg-amber-50 text-amber-700 border border-amber-200", dot: "bg-amber-500" },
    formed: { label: t("myTeams.statusFormed"), color: "bg-blue-50 text-blue-700 border border-blue-200", dot: "bg-blue-500" },
    ongoing: { label: t("myTeams.statusOngoing"), color: "bg-blue-50 text-blue-700 border border-blue-200", dot: "bg-blue-500" },
    completed: { label: t("myTeams.statusCompleted"), color: "bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 border border-stone-200 dark:border-stone-700", dot: "bg-stone-400" },
    cancelled: { label: t("myTeams.statusCancelled"), color: "bg-red-50 text-red-600 border border-red-200", dot: "bg-red-400" },
  };
}

function TeamCard({ team, isLeader = false, onCancel, onForm }: {
  team: TeamItem;
  isLeader?: boolean;
  onCancel?: (id: string) => void;
  onForm?: (id: string) => void;
}) {
  const { t } = useI18n(["myTeams", "teams"]);
  const statusLabels = getStatusLabels(t);
  const status = statusLabels[team.status] || { label: team.status, color: "bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 border border-stone-200 dark:border-stone-700", dot: "bg-stone-400" };
  const isFull = team.currentMembers >= team.maxMembers;
  const canCancel = isLeader && onCancel && (team.status === "recruiting" || team.status === "full");
  const canForm = isLeader && onForm && (team.status === "recruiting" || team.status === "full");

  return (
    <a href={`/teams/${team.id}`} className="block group">
      <div className="bg-card rounded-2xl border border-stone-100 dark:border-stone-800 p-4 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-amber-100/40 hover:border-amber-200/50 transition-[transform,background-color,border-color,color,opacity,box-shadow] duration-200">
        <div className="flex items-start gap-4">
          <div className="w-20 h-20 rounded-xl flex-shrink-0 overflow-hidden bg-stone-100 dark:bg-stone-800 flex items-center justify-center">
            {team.location?.coverImage ? (
              <img src={team.location.coverImage} alt={team.location.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
            ) : (
              <MapPin className="h-8 w-8 text-stone-300 dark:text-stone-600" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 title={team.title} className="font-semibold text-foreground group-hover:text-amber-700 transition-colors truncate">{team.title}</h3>
                  {isLeader && (
                    <span className="text-xs px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full flex items-center gap-1 flex-shrink-0">
                      <Crown className="h-3 w-3" />{t("myTeams.roleLeader")}
                    </span>
                  )}
                </div>
                {team.location?.name && (
                  <p className="text-sm text-stone-500 dark:text-stone-500 mt-1 flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 flex-shrink-0" /><span title={team.location.name} className="truncate">{team.location.name}</span>
                  </p>
                )}
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 flex items-center gap-1.5 ${status.color}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />{status.label}
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
              <span className="flex items-center gap-1 font-medium text-amber-600">
                <Users className="h-3.5 w-3.5" />{team.currentMembers}/{team.maxMembers}{t("myTeams.memberSuffix")}
              </span>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-stone-300 dark:text-stone-600 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-[transform,background-color,border-color,color,opacity,box-shadow] flex-shrink-0 self-center" />
        </div>
        {(canCancel || canForm) && (
          <div className="mt-3 pt-3 border-t border-stone-100 dark:border-stone-800 flex justify-end gap-2">
            {canForm && (
              <button onClick={(e) => { e.preventDefault(); onForm!(team.id); }}
                className="text-xs text-amber-600 hover:text-amber-700 transition-colors flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-amber-50">
                {isFull ? t("teams.formTeam") : t("teams.formTeamUnderfilled")}
              </button>
            )}
            {canCancel && (
              <button onClick={(e) => { e.preventDefault(); onCancel!(team.id); }}
                className="text-xs text-red-500 hover:text-red-600 transition-colors flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-red-50">
                <XCircle className="h-3.5 w-3.5" />{t("teams.cancelTeam")}
              </button>
            )}
          </div>
        )}
      </div>
    </a>
  );
}

export function CollapsibleSection({ title, count, children, defaultExpanded = true }: {
  title: string; count: number; children: React.ReactNode; defaultExpanded?: boolean;
}) {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);
  return (
    <div className="bg-card rounded-2xl border border-stone-100 dark:border-stone-800 overflow-hidden">
      <button onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-stone-50 dark:bg-stone-900/80 transition-colors">
        <div className="flex items-center gap-2.5">
          <h3 className="font-semibold text-stone-800">{title}</h3>
          <span className="text-xs px-2 py-0.5 bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-500 rounded-full">{count}</span>
        </div>
        <ChevronDown className={cn("h-4 w-4 text-stone-400 dark:text-stone-500 transition-transform duration-200", isExpanded ? "" : "-rotate-90")} />
      </button>
      {isExpanded && <div className="px-4 pb-4 space-y-3">{children}</div>}
    </div>
  );
}

export function TeamListSection({ teams, isLeader, onCancel, onForm }: {
  teams: TeamItem[]; isLeader: boolean;
  onCancel?: (id: string) => void; onForm?: (id: string) => void;
}) {
  const { t } = useI18n(["myTeams", "teams"]);
  const active = teams.filter((t2) => ["recruiting", "full", "formed", "ongoing"].includes(t2.status));
  const archived = teams.filter((t2) => ["completed", "cancelled"].includes(t2.status));
  if (teams.length === 0) return null;
  const roleLabel = isLeader ? t("myTeams.roleFilterLeader") : t("myTeams.roleFilterMember");
  return (
    <>
      {active.length > 0 && (
        <CollapsibleSection title={`${roleLabel} · ${t("myTeams.activeTeams")}`} count={active.length}>
          {active.map((team) => (
            <TeamCard key={team.id} team={team} isLeader={isLeader} onCancel={onCancel} onForm={onForm} />
          ))}
        </CollapsibleSection>
      )}
      {archived.length > 0 && (
        <CollapsibleSection title={`${roleLabel} · ${t("myTeams.archivedTeams")}`} count={archived.length} defaultExpanded={false}>
          {archived.map((team) => (
            <TeamCard key={team.id} team={team} isLeader={isLeader} />
          ))}
        </CollapsibleSection>
      )}
    </>
  );
}
