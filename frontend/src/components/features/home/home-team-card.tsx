import * as React from "react";
import { MapPin, Calendar, Clock, ArrowRight } from "lucide-react";
import { copy } from "@/lib/copy";
import { getDaysUntil } from "@/lib/date-utils";
import { STATUS_CONFIG } from "@/lib/constants";
import type { Team } from "@/lib/types";

function getDepartureLabel(daysUntil: number | null): { text: string; urgent: boolean } | null {
  if (daysUntil === null) return null;
  if (daysUntil === 0) return { text: "今天出发", urgent: true };
  if (daysUntil === 1) return { text: "明天出发", urgent: true };
  if (daysUntil <= 3) return { text: `${daysUntil} 天后出发`, urgent: true };
  if (daysUntil <= 7) return { text: `${daysUntil} 天后出发`, urgent: false };
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

function CapacityRing({ current, max, isFull }: { current: number; max: number; isFull: boolean }) {
  const ratio = max > 0 ? Math.min(current / max, 1) : 0;
  const r = 16;
  const circ = 2 * Math.PI * r;
  const dash = circ * ratio;
  const strokeColor = isFull ? "#ef4444" : "#D97706";
  const textColor = isFull ? "#b91c1c" : "#92400E";

  return (
    <div className="relative w-10 h-10 flex items-center justify-center flex-shrink-0">
      <svg width="40" height="40" viewBox="0 0 40 40" className="absolute inset-0 -rotate-90">
        <circle cx="20" cy="20" r={r} fill="none" strokeWidth="3" className="stroke-muted/20" />
        <circle cx="20" cy="20" r={r} fill="none" stroke={strokeColor} strokeWidth="3" strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          style={{ transition: "stroke-dasharray 0.8s cubic-bezier(0.34,1.56,0.64,1)" }} />
      </svg>
      <div className="relative z-10 text-center leading-none">
        <div className="text-[11px] font-bold" style={{ color: textColor }}>{current}</div>
        <div className="text-[8px] text-muted-foreground leading-none">/{max}</div>
      </div>
    </div>
  );
}

function LeaderChip({ leader }: { leader: Team["leader"] }) {
  const name = leader.nickname ?? leader.name;
  const levelLabel = copy.enums.leaderLevel?.[leader.level] ?? copy.enums.level?.[leader.level] ?? leader.level;
  const initial = name.charAt(0).toUpperCase();
  return (
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border-2"
        style={{ borderColor: "rgba(217,119,6,0.25)", boxShadow: "0 2px 8px rgba(217,119,6,0.15)" }}>
        {leader.avatar ? (
          <img src={leader.avatar} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white"
            style={{ background: "linear-gradient(135deg, #D97706 0%, #F59E0B 100%)" }}>{initial}</div>
        )}
      </div>
      <div className="min-w-0">
        <div className="text-xs font-semibold text-foreground truncate leading-tight">{name}</div>
        <div className="text-[10px] text-muted-foreground leading-tight truncate">{levelLabel}</div>
      </div>
    </div>
  );
}

export function TeamCard({ team }: { team: Team }) {
  const [hovered, setHovered] = React.useState(false);
  const isFull = team.currentMembers >= team.maxMembers;
  const daysUntil = getDaysUntil(team.date);
  const statusKey = isFull ? "full" : team.status;
  const statusCfg = STATUS_CONFIG[statusKey];
  const departureLabel = getDepartureLabel(daysUntil);
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
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                style={{ background: "rgba(10,8,5,0.55)", color: "#fff", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.12)" }}>
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: statusCfg.dot, boxShadow: `0 0 0 2px ${statusCfg.dot}44`, animation: team.status === "recruiting" && !isFull ? "pulse-soft 2s ease-in-out infinite" : "none" }} />
                {statusCfg.label}
              </span>
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
                <span className="text-white/70 text-xs tabular-nums flex-shrink-0 ml-2">{team.currentMembers}/{team.maxMembers} 人</span>
              </div>
              <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.20)" }}>
                <div className="h-full rounded-full" style={{ width: `${Math.min((team.currentMembers / team.maxMembers) * 100, 100)}%`, background: statusCfg.bar, transition: "width 0.8s cubic-bezier(0.34,1.56,0.64,1)" }} />
              </div>
            </div>
          </div>
        ) : (
          <div className="h-2 w-full" style={{ background: statusCfg.bar }} />
        )}

        <div className="p-4">
          {!hasCover && team.location && (
            <div className="flex items-center gap-1.5 mb-2.5">
              <MapPin className="h-3 w-3 flex-shrink-0" style={{ color: "#D97706" }} />
              <span className="text-xs font-medium truncate text-amber-800 dark:text-amber-300">{team.location.name}</span>
              <span className="ml-auto flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold" style={statusCfg.pill}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusCfg.dot }} />{statusCfg.label}
              </span>
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
                <Clock className="h-3 w-3 flex-shrink-0" style={{ color: "#D97706" }} />约 {team.duration}
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
            <LeaderChip leader={team.leader} />
            <div className="ml-auto flex items-center gap-2.5 flex-shrink-0">
              {approvedMembers.length > 0 && <AvatarStack members={approvedMembers} extra={extraCount} />}
              <CapacityRing current={team.currentMembers} max={team.maxMembers} isFull={isFull} />
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-white"
          style={{ background: "linear-gradient(135deg, #D97706 0%, #F59E0B 100%)", transform: hovered ? "translateY(0)" : "translateY(100%)", transition: "transform 0.28s cubic-bezier(0.34,1.56,0.64,1)" }}>
          <span>查看详情</span><ArrowRight className="h-3.5 w-3.5" />
        </div>
      </article>
    </a>
  );
}
