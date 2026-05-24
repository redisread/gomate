import * as React from "react";
import { MapPin, Calendar, Clock, ArrowRight } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import type { TranslationKey } from "@/i18n";
import { getDaysUntil } from "@/lib/date-utils";
import { STATUS_CONFIG } from "@/lib/constants";
import type { Team } from "@/lib/types";
import { TeamProgress, TeamUrgencyLabel, TeamLeaderMini } from "@/components/features/teams/shared";

function getDepartureLabel(daysUntil: number | null, t: (key: TranslationKey, vars?: Record<string, string | number>) => string): { text: string; urgent: boolean } | null {
  if (daysUntil === null) return null;
  if (daysUntil === 0) return { text: t("home.teamCard.departingToday"), urgent: true };
  if (daysUntil === 1) return { text: t("home.teamCard.departingTomorrow"), urgent: true };
  if (daysUntil <= 3) return { text: t("home.teamCard.departingInDays", { days: daysUntil }), urgent: true };
  if (daysUntil <= 7) return { text: t("home.teamCard.departingInDays", { days: daysUntil }), urgent: false };
  return null;
}

function AvatarStack({ members, extra = 0 }: { members: { name: string; avatar: string | null }[]; extra?: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-2">
        {members.map((m, idx) => {
          const initial = (m.name || "?").charAt(0).toUpperCase();
          return (
            <div key={idx} className="w-7 h-7 rounded-full border-2 border-border overflow-hidden flex-shrink-0"
              style={{ zIndex: 10 - idx, boxShadow: "var(--shadow-warm-sm)" }}>
              {m.avatar ? (
                <img src={m.avatar} alt={m.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-white"
                  style={{ background: "linear-gradient(135deg, #D97706 0%, #FCD34D 100%)" }}>{initial}</div>
              )}
            </div>
          );
        })}
        {extra > 0 && (
          <div className="w-7 h-7 rounded-full border-2 border-border flex items-center justify-center text-[10px] font-bold flex-shrink-0"
            style={{ zIndex: 1, background: "var(--brand-subtle)", color: "var(--accent-foreground)", boxShadow: "var(--shadow-warm-sm)" }}>+{extra}</div>
        )}
      </div>
    </div>
  );
}

export function TeamCard({ team }: { team: Team }) {
  const { t } = useI18n(["home", "common", "enums"]);
  const [hovered, setHovered] = React.useState(false);
  const isFull = team.currentMembers >= team.maxMembers;
  const daysUntil = getDaysUntil(team.date);
  const statusKey = isFull ? "full" : team.status;
  const statusCfg = STATUS_CONFIG[statusKey];
  const departureLabel = getDepartureLabel(daysUntil, t);
  const hasCover = Boolean(team.location?.coverImage);

  const approvedMembers = (team.members ?? []).filter((m) => m.status === "approved").slice(0, 3).map((m) => ({ name: m.nickname ?? m.name, avatar: m.avatar }));
  const totalApproved = (team.members ?? []).filter((m) => m.status === "approved").length;
  const extraCount = Math.max(0, totalApproved - 3);

  return (
    <a href={`/teams/${team.id}`} className="block group">
      <article className="overflow-hidden rounded-2xl cursor-pointer bg-card relative"
        style={{
          boxShadow: hovered ? `0 20px 48px ${statusCfg.glow}, 0 6px 18px rgba(0,0,0,0.10)` : "0 2px 14px rgba(0,0,0,0.07)",
          transform: hovered ? "translateY(-5px) scale(1.005)" : "translateY(0) scale(1)",
          transition: "box-shadow 0.30s ease, transform 0.30s cubic-bezier(0.34,1.56,0.64,1)",
        }}
        onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
        {hasCover ? (
          <div className="relative h-36 overflow-hidden">
            <img src={team.location!.coverImage} alt={team.location!.name ?? ""} className="w-full h-full object-cover"
              style={{ transform: hovered ? "scale(1.07)" : "scale(1)", transition: "transform 0.55s cubic-bezier(0.25,0.46,0.45,0.94)" }} />
            <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(10,8,5,0.72) 0%, rgba(10,8,5,0.12) 50%, transparent 100%)" }} />
            <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, transparent 40%)", opacity: hovered ? 1 : 0, transition: "opacity 0.3s ease" }} />

            <div className="absolute top-3 left-3">
              <TeamUrgencyLabel
                status={team.status}
                currentMembers={team.currentMembers}
                maxMembers={team.maxMembers}
                date={team.date}
                variant="badge"
              />
            </div>

            {departureLabel && (
              <div className="absolute top-3 right-3">
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold"
                  style={{ background: departureLabel.urgent ? "rgba(239,68,68,0.80)" : "rgba(217,119,6,0.80)", color: "#fff", backdropFilter: "blur(8px)" }}>
                  {departureLabel.urgent ? "🔥" : "⏱"} {departureLabel.text}
                </span>
              </div>
            )}

            <div className="absolute bottom-0 left-0 right-0 px-3.5 pb-3 pt-6">
              <div className="flex items-end justify-between mb-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <MapPin className="h-3.5 w-3.5 text-white/70 flex-shrink-0" />
                  <span className="text-white text-sm font-semibold drop-shadow-sm truncate">{team.location!.name}</span>
                </div>
              </div>
              <TeamProgress
                current={team.currentMembers}
                max={team.maxMembers}
                status={team.status}
                showLabel={false}
                size="sm"
              />
            </div>
          </div>
        ) : (
          <TeamProgress
            current={team.currentMembers}
            max={team.maxMembers}
            status={team.status}
            showLabel={false}
            size="sm"
          />
        )}

        <div className="p-4 pb-10 sm:pb-4">
          {!hasCover && team.location && (
            <div className="flex items-center gap-1.5 mb-2.5">
              <MapPin className="h-3 w-3 flex-shrink-0" style={{ color: "#D97706" }} />
              <span className="text-xs font-medium truncate text-amber-800 dark:text-amber-300">{team.location.name}</span>
              <div className="ml-auto flex-shrink-0">
                <TeamUrgencyLabel
                  status={team.status}
                  currentMembers={team.currentMembers}
                  maxMembers={team.maxMembers}
                  date={team.date}
                  variant="badge"
                />
              </div>
            </div>
          )}

          <h3 className="font-bold text-foreground line-clamp-1 mb-2 leading-snug"
            style={{ fontSize: "15px", color: hovered ? "#D97706" : undefined, transition: "color 0.2s ease" }}>{team.title}</h3>

          <div className="flex items-center gap-3 mb-3">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3 flex-shrink-0" style={{ color: "#D97706" }} />{team.date}{team.time && <span className="ml-0.5 font-medium">{team.time}</span>}
            </span>
            {team.duration && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3 flex-shrink-0" style={{ color: "#D97706" }} />{t("common.approx")} {team.duration}
              </span>
            )}
            {!hasCover && departureLabel && (
              <span className="ml-auto flex-shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: departureLabel.urgent ? "rgba(239,68,68,0.10)" : "rgba(217,119,6,0.08)", color: departureLabel.urgent ? "#b91c1c" : "#D97706" }}>
                {departureLabel.urgent ? "🔥" : "⏱"} {departureLabel.text}</span>
            )}
          </div>

          <div className="h-px mb-3 bg-border/30" />

          <div className="flex items-center gap-3">
            <TeamLeaderMini leader={team.leader} size="sm" />
            <div className="ml-auto flex items-center gap-2.5 flex-shrink-0">
              {approvedMembers.length > 0 && <AvatarStack members={approvedMembers} extra={extraCount} />}
            </div>
          </div>
        </div>

        <div className="sm:absolute bottom-0 left-0 right-0 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-white sm:translate-y-full sm:group-hover:translate-y-0 transition-all duration-300 ease-out rounded-b-lg sm:rounded-none opacity-100 sm:opacity-0 sm:group-hover:opacity-100 mt-2 sm:mt-0 static sm:static"
          style={{ background: "linear-gradient(135deg, #D97706 0%, #F59E0B 100%)", transitionTimingFunction: "cubic-bezier(0.34,1.56,0.64,1)" }}>
          <span>{t("home.teamCard.viewDetails")}</span><ArrowRight className="h-3.5 w-3.5" />
        </div>
      </article>
    </a>
  );
}
