import * as React from "react";
import { CalendarDays, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/hooks/useI18n";
import type { Team } from "@/lib/types";

interface TeamCardProps {
  team: Team;
}

export function TeamCard({ team }: TeamCardProps) {
  const { t } = useI18n(["common"]);
  const [progressWidth, setProgressWidth] = React.useState(0);

  const ratio = team.maxMembers > 0
    ? Math.min((team.currentMembers / team.maxMembers) * 100, 100)
    : 0;
  const isFull = team.currentMembers >= team.maxMembers;
  const isNearFull = ratio >= 80;

  React.useEffect(() => {
    const t = setTimeout(() => setProgressWidth(ratio), 100);
    return () => clearTimeout(t);
  }, [ratio]);

  const dateInfo = React.useMemo(() => {
    if (!team.date) return null;
    const parts = team.date.split("-");
    if (parts.length < 3) return null;
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return {
      month: monthNames[month - 1] ?? `${month}`,
      day: String(day),
      full: team.date,
    };
  }, [team.date]);

  const progressBarClass = isFull
    ? "bg-red-400"
    : isNearFull
      ? "bg-gradient-to-r from-orange-400 to-red-400 dark:from-orange-600 dark:to-red-600"
      : "bg-gradient-to-r from-emerald-400 via-amber-400 to-amber-500 dark:from-emerald-600 dark:via-amber-500 dark:to-amber-600";

  const leaderName = team.leader?.nickname || team.leader?.name || "";

  return (
    <a href={`/teams/${team.id}`} className="block group">
      <div className="p-4 rounded-xl bg-card border border-stone-100 dark:border-stone-800 hover:border-amber-100 hover:shadow-[0_4px_20px_rgba(217,119,6,0.12)] hover:-translate-y-0.5 transition-all duration-200">
        <div className="flex items-start gap-3 mb-3">
          {dateInfo ? (
            <div className="flex-shrink-0 w-12 rounded-xl overflow-hidden border border-stone-100 dark:border-stone-800 shadow-sm group-hover:shadow-md group-hover:border-amber-100 transition-all duration-200">
              <div className="bg-amber-500 group-hover:bg-amber-600 py-0.5 text-center transition-colors">
                <span className="text-[9px] font-bold text-white tracking-widest uppercase">
                  {dateInfo.month}
                </span>
              </div>
              <div className="bg-card py-1.5 text-center">
                <span className="text-2xl font-black text-foreground leading-none">
                  {dateInfo.day}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-stone-50 dark:bg-stone-900 flex items-center justify-center border border-stone-100 dark:border-stone-800">
              <CalendarDays className="h-5 w-5 text-stone-300 dark:text-stone-600" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors text-sm leading-snug line-clamp-2 mb-1">
              {team.title}
            </h3>
            {leaderName && (
              <div className="flex items-center gap-1.5">
                {team.leader?.avatar ? (
                  <img
                    src={team.leader.avatar}
                    alt={leaderName}
                    className="w-4 h-4 rounded-full object-cover border border-white shadow-sm"
                  />
                ) : (
                  <div className="w-4 h-4 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                    <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400">
                      {leaderName.charAt(0)}
                    </span>
                  </div>
                )}
                <span className="text-[11px] text-stone-400 dark:text-stone-500 truncate">{leaderName}</span>
              </div>
            )}
          </div>

          <div className="flex-shrink-0 flex flex-col items-end gap-1.5">
            <MemberBubbles current={team.currentMembers} max={team.maxMembers} />
            <ArrowRight className="h-3.5 w-3.5 text-stone-300 dark:text-stone-600 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all duration-150" />
          </div>
        </div>

        <div className="h-1.5 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-500 ease-out motion-reduce:transition-none",
              progressBarClass
            )}
            style={{ width: `${progressWidth}%` }}
          />
        </div>

        <div className="mt-1.5 flex items-center justify-end">
          <span
            className={cn(
              "text-[11px] font-semibold",
              isFull ? "text-red-500" : isNearFull ? "text-orange-500" : "text-amber-600"
            )}
          >
            {t('common.memberCount').replace('{current}', String(team.currentMembers)).replace('{max}', String(team.maxMembers))}
            {isFull && ` · ${t('common.teamFullStatus')}`}
            {isNearFull && !isFull && ` · ${t('common.teamNearFullStatus')}`}
          </span>
        </div>
      </div>
    </a>
  );
}

function MemberBubbles({ current, max }: { current: number; max: number }) {
  const displayMax = Math.min(max, 8);
  const filledCount = Math.min(current, displayMax);

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: displayMax }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "w-2 h-2 rounded-full transition-colors",
            i < filledCount
              ? "bg-amber-400"
              : "bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700"
          )}
        />
      ))}
      {max > 8 && (
        <span className="text-[10px] text-stone-400 dark:text-stone-500 ml-0.5">+{max - 8}</span>
      )}
    </div>
  );
}
