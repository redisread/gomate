"use client";

import * as React from "react";
import {
  MapPin,
  ArrowRight,
  Search,
  Mountain,
  Users,
  Calendar,
  Clock,
  Compass,
  X,
} from "lucide-react";
import { copy } from "@/lib/copy";
import { fetchAPI, fetchCurrentUser } from "@/lib/api";
import { getDaysUntil } from "@/lib/date-utils";
import type { Location, Team } from "@/lib/types";
import {
  DIFFICULTY_CONFIG,
  STATUS_CONFIG,
} from "@/lib/constants";
import {
  useInView,
  useCountUp,
  useParallax,
  useAnimateIn,
  useSearchInteraction,
} from "@/hooks/use-animations";

/* ============================================================
   LocationCard — 大图 overlay 风格
   ============================================================ */
function LocationCard({ location }: { location: Location }) {
  const difficulty = location.difficulty ?? location.routes?.[0]?.difficulty;
  const diffConfig = difficulty ? DIFFICULTY_CONFIG[difficulty as keyof typeof DIFFICULTY_CONFIG] : null;
  const firstTag = location.tags?.[0];

  return (
    <a href={`/locations/${location.id}`} className="block group">
      <article
        className="overflow-hidden rounded-2xl cursor-pointer bg-card"
        style={{
          boxShadow: "0 2px 12px rgba(30,24,18,0.08)",
          transition: "box-shadow 0.25s ease, transform 0.25s ease",
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLElement;
          el.style.transform = "translateY(-5px)";
          el.style.boxShadow = "0 14px 40px rgba(217,119,6,0.18), 0 4px 16px rgba(30,24,18,0.08)";
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLElement;
          el.style.transform = "translateY(0)";
          el.style.boxShadow = "0 2px 12px rgba(30,24,18,0.08)";
        }}
      >
        {/* 图片区 */}
        <div className="relative h-52 overflow-hidden bg-muted">
          {location.coverImage ? (
            <img
              src={location.coverImage}
              alt={location.name}
              className="w-full h-full object-cover"
              style={{ transition: "transform 0.5s ease" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLImageElement).style.transform = "scale(1.06)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLImageElement).style.transform = "scale(1)";
              }}
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #FEF3C7 0%, #d0f0ea 100%)" }}
            >
              <Mountain className="h-14 w-14" style={{ color: "rgba(217,119,6,0.3)" }} />
            </div>
          )}

          {/* 常驻底部渐变遮罩 */}
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(to top, rgba(15,15,12,0.72) 0%, rgba(15,15,12,0.18) 45%, transparent 70%)",
            }}
          />

          {/* hover 展开详情遮罩 */}
          <div
            className="absolute inset-0 flex flex-col justify-end p-4 opacity-0 group-hover:opacity-100"
            style={{
              background: "linear-gradient(to top, rgba(146,64,14,0.90) 0%, rgba(146,64,14,0.55) 55%, transparent 100%)",
              transition: "opacity 0.3s ease",
            }}
          >
            <p className="text-white/90 text-sm line-clamp-2 leading-relaxed mb-2">
              {location.description}
            </p>
            {location.routes?.[0] && (
              <div className="flex flex-wrap gap-2 text-white/75 text-xs">
                <span>🕐 {location.routes[0].duration}</span>
                <span>📏 {location.routes[0].distance}</span>
                {location.routes[0].elevation && (
                  <span>⛰️ {location.routes[0].elevation}</span>
                )}
              </div>
            )}
          </div>

          {/* 右上角徽章 */}
          <div className="absolute top-3 right-3 flex flex-col gap-1.5 items-end">
            {diffConfig && (
              <span
                className="px-2.5 py-1 rounded-full text-xs font-semibold"
                style={{ background: diffConfig.bg, color: diffConfig.color, backdropFilter: "blur(4px)" }}
              >
                {diffConfig.label}
              </span>
            )}
            {firstTag && (
              <span
                className="px-2.5 py-1 rounded-full text-xs font-medium"
                style={{ background: "rgba(255,255,255,0.90)", color: "#92400E", backdropFilter: "blur(4px)" }}
              >
                {firstTag.name}
              </span>
            )}
          </div>

          {/* 底部常驻信息（hover 时隐藏） */}
          <div
            className="absolute bottom-0 left-0 right-0 p-4 group-hover:opacity-0"
            style={{ transition: "opacity 0.2s ease" }}
          >
            <h3 className="font-bold text-white text-lg leading-tight drop-shadow-sm">
              {location.name}
            </h3>
            <p className="text-white/75 text-sm flex items-center gap-1 mt-0.5">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
              {location.address || copy.locations.defaultCity}
            </p>
          </div>
        </div>

        {/* 底部信息条 */}
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="min-w-0">
            <h3 className="font-semibold text-foreground text-sm group-hover:text-brand transition-colors duration-150 truncate">
              {location.name}
            </h3>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <MapPin className="h-3 w-3 flex-shrink-0" />
              {location.address || copy.locations.defaultCity}
            </p>
          </div>
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ml-3 transition-all duration-150 group-hover:bg-brand group-hover:text-white"
            style={{ background: "rgba(217,119,6,0.10)", color: "#D97706" }}
          >
            <ArrowRight className="h-3.5 w-3.5" />
          </div>
        </div>
      </article>
    </a>
  );
}

/* ============================================================
   getDepartureLabel — 出发日期标签
   ============================================================ */
function getDepartureLabel(daysUntil: number | null): {
  text: string;
  urgent: boolean;
} | null {
  if (daysUntil === null) return null;
  if (daysUntil === 0) return { text: "今天出发", urgent: true };
  if (daysUntil === 1) return { text: "明天出发", urgent: true };
  if (daysUntil <= 3) return { text: `${daysUntil} 天后出发`, urgent: true };
  if (daysUntil <= 7) return { text: `${daysUntil} 天后出发`, urgent: false };
  return null;
}

/* ============================================================
   AvatarStack — 成员头像叠加组
   ============================================================ */
function AvatarStack({
  members,
  extra = 0,
}: {
  members: { name: string; avatar: string | null }[];
  extra?: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-2">
        {members.map((m, idx) => {
          const initial = (m.name || "?").charAt(0).toUpperCase();
          return (
            <div
              key={idx}
              className="w-7 h-7 rounded-full border-2 border-white overflow-hidden flex-shrink-0"
              style={{ zIndex: 10 - idx, boxShadow: "0 1px 4px rgba(0,0,0,0.12)" }}
            >
              {m.avatar ? (
                <img src={m.avatar} alt={m.name} className="w-full h-full object-cover" />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center text-[10px] font-bold text-white"
                  style={{ background: "linear-gradient(135deg, #D97706 0%, #FCD34D 100%)" }}
                >
                  {initial}
                </div>
              )}
            </div>
          );
        })}
        {extra > 0 && (
          <div
            className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold flex-shrink-0"
            style={{
              zIndex: 1,
              background: "rgba(217,119,6,0.12)",
              color: "#92400E",
              boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
            }}
          >
            +{extra}
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   CapacityRing — 圆形容量环（右侧装饰）
   ============================================================ */
function CapacityRing({
  current,
  max,
  isFull,
}: {
  current: number;
  max: number;
  isFull: boolean;
}) {
  const ratio = max > 0 ? Math.min(current / max, 1) : 0;
  const r = 16;
  const circ = 2 * Math.PI * r;
  const dash = circ * ratio;
  const strokeColor = isFull ? "#ef4444" : "#D97706";
  const textColor = isFull ? "#b91c1c" : "#92400E";

  return (
    <div className="relative w-10 h-10 flex items-center justify-center flex-shrink-0">
      {/* -rotate-90 让弧从顶部开始 */}
      <svg width="40" height="40" viewBox="0 0 40 40" className="absolute inset-0 -rotate-90">
        {/* 底轨 */}
        <circle cx="20" cy="20" r={r} fill="none" stroke="rgba(30,24,18,0.07)" strokeWidth="3" />
        {/* 进度弧 */}
        <circle
          cx="20" cy="20" r={r}
          fill="none"
          stroke={strokeColor}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          style={{ transition: "stroke-dasharray 0.8s cubic-bezier(0.34,1.56,0.64,1)" }}
        />
      </svg>
      {/* 中心文字 */}
      <div className="relative z-10 text-center leading-none">
        <div className="text-[11px] font-bold" style={{ color: textColor }}>{current}</div>
        <div className="text-[8px] text-muted-foreground leading-none">/{max}</div>
      </div>
    </div>
  );
}

/* ============================================================
   LeaderChip — 领队信息胶囊
   ============================================================ */
function LeaderChip({
  leader,
}: {
  leader: Team["leader"];
}) {
  const name = leader.nickname ?? leader.name;
  const levelLabel = copy.enums.leaderLevel?.[leader.level] ?? copy.enums.level?.[leader.level] ?? leader.level;
  const initial = name.charAt(0).toUpperCase();
  return (
    <div className="flex items-center gap-2">
      {/* 头像 */}
      <div
        className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border-2"
        style={{ borderColor: "rgba(217,119,6,0.25)", boxShadow: "0 2px 8px rgba(217,119,6,0.15)" }}
      >
        {leader.avatar ? (
          <img src={leader.avatar} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-xs font-bold text-white"
            style={{ background: "linear-gradient(135deg, #D97706 0%, #F59E0B 100%)" }}
          >
            {initial}
          </div>
        )}
      </div>
      {/* 文字 */}
      <div className="min-w-0">
        <div className="text-xs font-semibold text-foreground truncate leading-tight">{name}</div>
        <div className="text-[10px] text-muted-foreground leading-tight truncate">{levelLabel}</div>
      </div>
    </div>
  );
}

/* ============================================================
   TeamCard — 极致优化版（含地点封面 + 交互动效）
   ============================================================ */
function TeamCard({ team }: { team: Team }) {
  const [hovered, setHovered] = React.useState(false);
  const isFull = team.currentMembers >= team.maxMembers;
  const daysUntil = getDaysUntil(team.date);
  const statusKey = isFull ? "full" : team.status;
  const statusCfg = STATUS_CONFIG[statusKey];
  const departureLabel = getDepartureLabel(daysUntil);
  const hasCover = Boolean(team.location?.coverImage);

  // 取前 3 位已批准成员（不含领队）
  const approvedMembers = (team.members ?? [])
    .filter((m) => m.status === "approved")
    .slice(0, 3)
    .map((m) => ({ name: m.nickname ?? m.name, avatar: m.avatar }));

  // 剩余人数（超出 3 个显示 +N）
  const totalApproved = (team.members ?? []).filter((m) => m.status === "approved").length;
  const extraCount = Math.max(0, totalApproved - 3);

  return (
    <a href={`/teams/${team.id}`} className="block group">
      <article
        className="overflow-hidden rounded-2xl cursor-pointer bg-card relative"
        style={{
          boxShadow: hovered
            ? `0 20px 48px ${statusCfg.glow}, 0 6px 18px rgba(30,24,18,0.10)`
            : "0 2px 14px rgba(30,24,18,0.07)",
          transform: hovered ? "translateY(-5px) scale(1.005)" : "translateY(0) scale(1)",
          transition: "box-shadow 0.30s ease, transform 0.30s cubic-bezier(0.34,1.56,0.64,1)",
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* ── 封面图区域 ── */}
        {hasCover ? (
          <div className="relative h-36 overflow-hidden">
            {/* 图片（hover 时微缩放） */}
            <img
              src={team.location!.coverImage}
              alt={team.location!.name ?? ""}
              className="w-full h-full object-cover"
              style={{
                transform: hovered ? "scale(1.07)" : "scale(1)",
                transition: "transform 0.55s cubic-bezier(0.25,0.46,0.45,0.94)",
              }}
            />

            {/* 常驻底部遮罩 */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to top, rgba(10,8,5,0.72) 0%, rgba(10,8,5,0.12) 50%, transparent 100%)",
              }}
            />

            {/* hover 时顶部微遮罩（增强沉浸感） */}
            <div
              className="absolute inset-0"
              style={{
                background: "linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, transparent 40%)",
                opacity: hovered ? 1 : 0,
                transition: "opacity 0.3s ease",
              }}
            />

            {/* 左上：状态 Pill */}
            <div className="absolute top-3 left-3">
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                style={{
                  background: "rgba(10,8,5,0.55)",
                  color: "#fff",
                  backdropFilter: "blur(8px)",
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
              >
                {/* 动态呼吸点 */}
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{
                    background: statusCfg.dot,
                    boxShadow: `0 0 0 2px ${statusCfg.dot}44`,
                    animation: team.status === "recruiting" && !isFull
                      ? "pulse-soft 2s ease-in-out infinite"
                      : "none",
                  }}
                />
                {statusCfg.label}
              </span>
            </div>

            {/* 右上：出发倒计时 */}
            {departureLabel && (
              <div className="absolute top-3 right-3">
                <span
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold"
                  style={{
                    background: departureLabel.urgent
                      ? "rgba(239,68,68,0.80)"
                      : "rgba(217,119,6,0.80)",
                    color: "#fff",
                    backdropFilter: "blur(8px)",
                  }}
                >
                  {departureLabel.urgent ? "🔥" : "⏱"} {departureLabel.text}
                </span>
              </div>
            )}

            {/* 底部：地点名 + 进度条 */}
            <div className="absolute bottom-0 left-0 right-0 px-3.5 pb-3 pt-6">
              <div className="flex items-end justify-between mb-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <MapPin className="h-3.5 w-3.5 text-white/70 flex-shrink-0" />
                  <span className="text-white text-sm font-semibold drop-shadow-sm truncate">
                    {team.location!.name}
                  </span>
                </div>
                <span className="text-white/70 text-xs tabular-nums flex-shrink-0 ml-2">
                  {team.currentMembers}/{team.maxMembers} 人
                </span>
              </div>
              {/* 薄进度条 */}
              <div
                className="h-1 rounded-full overflow-hidden"
                style={{ background: "rgba(255,255,255,0.20)" }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min((team.currentMembers / team.maxMembers) * 100, 100)}%`,
                    background: statusCfg.bar,
                    transition: "width 0.8s cubic-bezier(0.34,1.56,0.64,1)",
                  }}
                />
              </div>
            </div>
          </div>
        ) : (
          /* ── 无封面：顶部渐变色块 ── */
          <div
            className="h-2 w-full"
            style={{ background: statusCfg.bar }}
          />
        )}

        {/* ── 卡片主体 ── */}
        <div className="p-4">

          {/* 无封面时展示地点徽章 */}
          {!hasCover && team.location && (
            <div className="flex items-center gap-1.5 mb-2.5">
              <MapPin className="h-3 w-3 flex-shrink-0" style={{ color: "#D97706" }} />
              <span className="text-xs font-medium truncate" style={{ color: "#92400E" }}>
                {team.location.name}
              </span>
              {/* 无封面时也显示状态 */}
              <span
                className="ml-auto flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
                style={statusCfg.pill}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: statusCfg.dot }}
                />
                {statusCfg.label}
              </span>
            </div>
          )}

          {/* 标题 */}
          <h3
            className="font-bold text-foreground line-clamp-1 mb-2 leading-snug"
            style={{
              fontSize: "15px",
              color: hovered ? "#D97706" : undefined,
              transition: "color 0.2s ease",
            }}
          >
            {team.title}
          </h3>

          {/* 时间 + 时长 */}
          <div className="flex items-center gap-3 mb-3">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3 flex-shrink-0" style={{ color: "#D97706" }} />
              {team.date}
              {team.time && <span className="ml-0.5 font-medium">{team.time}</span>}
            </span>
            {team.duration && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3 flex-shrink-0" style={{ color: "#D97706" }} />
                约 {team.duration}
              </span>
            )}
            {/* 无封面时的倒计时 */}
            {!hasCover && departureLabel && (
              <span
                className="ml-auto flex-shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full"
                style={{
                  background: departureLabel.urgent ? "rgba(239,68,68,0.10)" : "rgba(217,119,6,0.08)",
                  color: departureLabel.urgent ? "#b91c1c" : "#D97706",
                }}
              >
                {departureLabel.urgent ? "🔥" : "⏱"} {departureLabel.text}
              </span>
            )}
          </div>

          {/* 分隔线 */}
          <div
            className="h-px mb-3"
            style={{ background: "rgba(30,24,18,0.06)" }}
          />

          {/* 底部：领队 + 成员头像 + 容量环 */}
          <div className="flex items-center gap-3">
            {/* 领队 */}
            <LeaderChip leader={team.leader} />

            {/* 右侧：成员头像 + 容量环 */}
            <div className="ml-auto flex items-center gap-2.5 flex-shrink-0">
              {approvedMembers.length > 0 && (
                <AvatarStack members={approvedMembers} extra={extraCount} />
              )}
              <CapacityRing
                current={team.currentMembers}
                max={team.maxMembers}
                isFull={isFull}
              />
            </div>
          </div>
        </div>

        {/* ── hover 时底部「查看详情」浮出条 ── */}
        <div
          className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-white"
          style={{
            background: "linear-gradient(135deg, #D97706 0%, #F59E0B 100%)",
            transform: hovered ? "translateY(0)" : "translateY(100%)",
            transition: "transform 0.28s cubic-bezier(0.34,1.56,0.64,1)",
          }}
        >
          <span>查看详情</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </div>
      </article>
    </a>
  );
}


/* ============================================================
   HomeClient — 首页主组件
   ============================================================ */
export function HomeClient() {
  const [locations, setLocations] = React.useState<Location[]>([]);
  const [teams, setTeams] = React.useState<Team[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pagination, setPagination] = React.useState({
    total: 0,
    totalPages: 0,
    pageSize: 6,
  });
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);

  // 获取登录状态
  React.useEffect(() => {
    (async () => {
      const user = await fetchCurrentUser();
      setIsLoggedIn(!!user);
    })();
  }, []);

  // 动效 Hooks
  const animate = useAnimateIn();
  const { y: parallaxY } = useParallax(0.015);
  const search = useSearchInteraction();

  // Section 入场
  const [locationsRef, locationsInView] = useInView(0.08);
  const [howItWorksRef, howItWorksInView] = useInView(0.08);
  const [teamsRef, teamsInView] = useInView(0.08);
  const [ctaRef, ctaInView] = useInView(0.15);

  const fetchLocations = React.useCallback(async (page = 1) => {
    setIsLoading(true);
    try {
      const res = await fetchAPI(`/api/locations?page=${page}&pageSize=6`);
      const data = await res.json();
      if (data.success) {
        setLocations(data.locations);
        setPagination(data.pagination);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchTeams = React.useCallback(async () => {
    try {
      const res = await fetchAPI("/api/teams?status=recruiting&pageSize=4");
      const data = await res.json();
      if (data.success) setTeams(data.teams || []);
    } catch (error) {
      console.error("[HomeClient] 获取队伍列表失败:", error);
    }
  }, []);

  React.useEffect(() => {
    fetchLocations(1);
    fetchTeams();
  }, [fetchLocations, fetchTeams]);

  const handleSearch = (query: string) => {
    if (query.trim()) {
      window.location.href = `/locations?q=${encodeURIComponent(query.trim())}`;
    } else {
      window.location.href = "/locations";
    }
  };

  return (
    <main className="min-h-screen bg-background">

      {/* ================================================================
          Hero Section — 多层装饰背景 + 超大标题 + 统计数字
          ================================================================ */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">

        {/* 背景渐变 */}
        <div
          className="absolute inset-0 home-hero-gradient"
          style={{
            background:
              "linear-gradient(160deg, #FEF3C7 0%, rgba(255,122,101,0.06) 38%, #faf8f5 65%, #f5f0e8 100%)",
          }}
        />

        {/* 装饰光斑：左上品牌绿 */}
        <div
          className="absolute -top-40 -left-40 w-[640px] h-[640px] rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(217,119,6,0.13) 0%, transparent 68%)",
            transform: `translateY(${parallaxY * 0.8}px)`,
          }}
          aria-hidden="true"
        />

        {/* 装饰光斑：右下珊瑚 */}
        <div
          className="absolute -bottom-28 -right-28 w-[520px] h-[520px] rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(255,122,101,0.10) 0%, transparent 68%)",
            transform: `translateY(${-parallaxY * 0.6}px)`,
          }}
          aria-hidden="true"
        />

        {/* 装饰光斑：中间偏右浅绿 */}
        <div
          className="absolute top-1/3 right-1/4 w-[220px] h-[220px] rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(252,211,77,0.16) 0%, transparent 70%)",
            transform: `translateY(${parallaxY * 1.2}px)`,
          }}
          aria-hidden="true"
        />

        {/* SVG 山脉轮廓（底部，视差） */}
        <svg
          className="absolute bottom-0 left-0 right-0 w-full pointer-events-none"
          style={{
            opacity: 0.12,
            transform: `translateY(${parallaxY * 0.5}px)`,
          }}
          viewBox="0 0 1440 260"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          preserveAspectRatio="none"
        >
          <path
            d="M0 260L100 200L200 230L320 160L440 210L560 130L680 185L800 95L920 150L1040 55L1160 110L1280 35L1440 90V260H0Z"
            fill="#D97706"
          />
          <path
            d="M0 260L160 220L300 250L460 190L600 240L760 165L900 215L1060 145L1200 195L1360 130L1440 170V260H0Z"
            fill="#92400E"
            opacity="0.65"
          />
        </svg>

        {/* 主内容区 */}
        <div className="relative z-10 text-center px-4 max-w-5xl mx-auto pt-24 pb-16">

          {/* 徽章 */}
          <span
            className={`inline-flex items-center gap-1.5 mb-7 px-4 py-1.5 text-sm font-medium rounded-full border ${animate.badge}`}
            style={{
              background: "rgba(217,119,6,0.08)",
              borderColor: "rgba(217,119,6,0.22)",
              color: "#92400E",
            }}
          >
            <Mountain className="h-3.5 w-3.5" />
            {copy.hero.badge}
          </span>

          {/* 超大主标题 */}
          <h1
            className={`font-bold leading-[1.08] mb-6 ${animate.title}`}
            style={{ fontSize: "clamp(2.8rem, 7.5vw, 5.2rem)" }}
          >
            <span className="text-foreground block">{copy.hero.titleLine1}</span>
            <span className="block text-gradient-brand">{copy.hero.titleLine2}</span>
          </h1>

          {/* 副标题 */}
          <p
            className={`text-lg md:text-xl text-muted-foreground mb-10 max-w-xl mx-auto leading-relaxed ${animate.subtitle}`}
          >
            {copy.hero.description}
          </p>

          {/* 搜索栏 */}
          <div className={`relative max-w-2xl mx-auto mb-8 group ${animate.search}`}>
            <Search
              className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 pointer-events-none transition-colors duration-200"
              style={{ color: search.isFocused ? "#D97706" : "#8f7f6e" }}
            />
            <input
              type="text"
              placeholder={copy.common.searchPlaceholder}
              value={search.value}
              onChange={(e) => search.setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch(search.value);
              }}
              onFocus={() => search.setFocused(true)}
              onBlur={() => search.setFocused(false)}
              className="w-full pl-14 pr-32 py-4 bg-card/95 border border-border rounded-2xl text-foreground placeholder:text-muted-foreground text-base transition-all duration-250 focus:outline-none"
              style={{
                boxShadow: search.isFocused
                  ? "0 6px 28px rgba(217,119,6,0.20), 0 0 0 3px rgba(217,119,6,0.12)"
                  : "0 4px 20px rgba(30,24,18,0.08)",
                backdropFilter: "blur(8px)",
              }}
            />

            {/* 清空按钮 */}
            {search.value && (
              <button
                onClick={search.clear}
                className="absolute right-[5.5rem] top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-150 animate-spin-in"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}

            {/* 搜索按钮 */}
            <button
              onClick={() => handleSearch(search.value)}
              className={`absolute right-3 top-1/2 -translate-y-1/2 px-5 py-2 text-sm font-semibold rounded-xl text-white transition-colors duration-150 ${search.isButtonBouncing ? "animate-bounce-in" : ""}`}
              style={{
                background: "linear-gradient(135deg, #D97706 0%, #F59E0B 100%)",
                boxShadow: "0 2px 10px rgba(217,119,6,0.30)",
              }}
            >
              搜索
            </button>
          </div>

          {/* CTA 按钮组 */}
          <div className={`flex flex-col sm:flex-row gap-3 justify-center mb-14 ${animate.cta}`}>
            <a
              href="/locations"
              className="inline-block px-8 py-3.5 text-white font-semibold rounded-full text-base transition-all duration-150"
              style={{
                background: "linear-gradient(135deg, #D97706 0%, #F59E0B 100%)",
                boxShadow: "0 4px 18px rgba(217,119,6,0.35)",
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLAnchorElement;
                el.style.transform = "translateY(-2px)";
                el.style.boxShadow = "0 8px 28px rgba(217,119,6,0.45)";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLAnchorElement;
                el.style.transform = "translateY(0)";
                el.style.boxShadow = "0 4px 18px rgba(217,119,6,0.35)";
              }}
            >
              {copy.hero.exploreBtn}
            </a>
            <a
              href="/teams"
              className="inline-block px-8 py-3.5 font-semibold rounded-full border-2 text-base transition-all duration-150 hover:bg-brand/5"
              style={{ borderColor: "rgba(217,119,6,0.35)", color: "#92400E" }}
            >
              {copy.hero.findTeamBtn}
            </a>
          </div>

          {/* 价值主张卡片 */}
          <div className={`flex flex-wrap justify-center gap-6 ${animate.stats}`}>
            {[
              { icon: "🗺️", title: copy.hero.statRoutes, desc: copy.hero.statRoutesDesc },
              { icon: "👥", title: copy.hero.statPlayers, desc: copy.hero.statPlayersDesc },
              { icon: "✨", title: copy.hero.statSafety, desc: copy.hero.statSafetyDesc },
            ].map((item) => (
              <div key={item.title} className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-gradient-to-br from-white/80 to-amber-50/60 border border-amber-200/40" style={{ backdropFilter: "blur(8px)" }}>
                <span className="text-2xl">{item.icon}</span>
                <div>
                  <div className="text-sm font-semibold text-foreground">{item.title}</div>
                  <div className="text-xs text-muted-foreground">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 浮动装饰卡片（大屏） */}
        <div
          className="absolute left-8 top-1/3 hidden lg:flex flex-col gap-3"
          aria-hidden="true"
        >
          {[
            { icon: "🏔️", label: "七娘山", delay: "0s" },
            { icon: "🌊", label: "东西冲", delay: "-2s" },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-gradient-to-br from-white/95 to-amber-50/80 border border-amber-200/50 animate-float-up"
              style={{
                boxShadow: "0 8px 24px rgba(217,119,6,0.12), 0 2px 8px rgba(30,24,18,0.06)",
                backdropFilter: "blur(12px)",
                animationDelay: item.delay,
              }}
            >
              <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-amber-50 text-base">{item.icon}</span>
              <span className="text-sm font-medium text-foreground whitespace-nowrap">{item.label}</span>
            </div>
          ))}
        </div>

        <div
          className="absolute right-8 top-1/3 hidden lg:flex flex-col gap-3"
          aria-hidden="true"
        >
          {[
            { icon: "👥", label: "3人已组队", delay: "-1s" },
            { icon: "🎒", label: "周六出发", delay: "-3.5s" },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-gradient-to-br from-white/95 to-amber-50/80 border border-amber-200/50 animate-float-down"
              style={{
                boxShadow: "0 8px 24px rgba(217,119,6,0.12), 0 2px 8px rgba(30,24,18,0.06)",
                backdropFilter: "blur(12px)",
                animationDelay: item.delay,
              }}
            >
              <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-amber-50 text-base">{item.icon}</span>
              <span className="text-sm font-medium text-foreground whitespace-nowrap">{item.label}</span>
            </div>
          ))}
        </div>
      </section>


      {/* ================================================================
          精选地点 Section
          ================================================================ */}
      <section
        id="locations"
        ref={locationsRef}
        className={`py-20 bg-background section-hidden ${locationsInView ? "section-visible" : ""}`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span
              className="inline-block mb-4 px-3 py-1 text-xs font-semibold rounded-full uppercase tracking-widest"
              style={{ background: "rgba(217,119,6,0.08)", color: "#92400E" }}
            >
              精选地点
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              {copy.locations.pageTitle}
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed text-lg">
              {copy.locations.pageSubtitle}
            </p>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="skeleton h-72 rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {locations.map((location) => (
                <LocationCard key={location.id} location={location} />
              ))}
            </div>
          )}

          {pagination.totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-10">
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => {
                    setCurrentPage(page);
                    fetchLocations(page);
                  }}
                  className={`w-10 h-10 rounded-full text-sm font-medium transition-all duration-150 ${
                    page === currentPage
                      ? "bg-brand text-brand-foreground shadow-brand-glow"
                      : "bg-muted text-muted-foreground hover:bg-accent hover:text-brand"
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
          )}

          <div className="text-center mt-10">
            <a href="/locations">
              <button className="border border-border hover:bg-accent text-foreground hover:text-brand px-7 py-3 rounded-xl text-sm font-medium transition-all duration-150 inline-flex items-center gap-2">
                {copy.common.viewAll}
                <ArrowRight className="h-4 w-4" />
              </button>
            </a>
          </div>
        </div>
      </section>

      {/* ================================================================
          How It Works Section — 3步流程
          ================================================================ */}
      <section
        ref={howItWorksRef}
        className={`py-20 section-hidden ${howItWorksInView ? "section-visible" : ""}`}
        style={{ background: "#f2ede7" }}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span
              className="inline-block mb-4 px-3 py-1 text-xs font-semibold rounded-full uppercase tracking-widest"
              style={{ background: "rgba(217,119,6,0.08)", color: "#92400E" }}
            >
              使用流程
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              三步开启户外之旅
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto leading-relaxed">
              极简流程，从发现到出发，最快 5 分钟
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                step: "01",
                icon: <Search className="h-7 w-7" />,
                emoji: "🗺️",
                title: "发现心仪地点",
                desc: "浏览精选目的地，咖啡馆、公园、山野、海岸一网打尽。查看路线信息和最佳季节，找到下一个想去的地方",
                color: "#D97706",
                bg: "rgba(217,119,6,0.08)",
                href: "/locations",
                cta: "浏览地点 →",
              },
              {
                step: "02",
                icon: <Users className="h-7 w-7" />,
                emoji: "👥",
                title: "找到同行伙伴",
                desc: "按地点筛选招募中的队伍，看看谁在等你。查看领队信息和成员构成，申请加入志同道合的小队",
                color: "#ff7a65",
                bg: "rgba(255,122,101,0.08)",
                href: "/teams",
                cta: "找队伍 →",
              },
              {
                step: "03",
                icon: <Compass className="h-7 w-7" />,
                emoji: "🎒",
                title: "一起出发",
                desc: "加入审批通过后，与队友约定集合时间，背起背包出发。或者自己发起一支，带领伙伴去你想去的地方",
                color: "#92400E",
                bg: "rgba(146,64,14,0.08)",
                href: "/teams/create",
                cta: "发起队伍 →",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="rounded-2xl p-7 bg-card flex flex-col"
                style={{
                  boxShadow: "0 2px 12px rgba(30,24,18,0.06)",
                  border: "1px solid rgba(30,24,18,0.04)",
                  transition: "transform 0.25s ease, box-shadow 0.25s ease",
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.transform = "translateY(-5px)";
                  el.style.boxShadow = `0 14px 36px rgba(30,24,18,0.10), 0 0 0 2px ${item.color}22`;
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.transform = "translateY(0)";
                  el.style.boxShadow = "0 2px 12px rgba(30,24,18,0.06)";
                }}
              >
                <div className="flex items-start justify-between mb-5">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 text-2xl"
                    style={{ background: item.bg }}
                  >
                    {item.emoji}
                  </div>
                  <span
                    className="text-5xl font-black leading-none select-none"
                    style={{ color: item.bg.replace("0.08", "0.18") }}
                  >
                    {item.step}
                  </span>
                </div>
                <h3 className="text-xl font-bold mb-3" style={{ color: item.color }}>
                  {item.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed flex-1 mb-5">
                  {item.desc}
                </p>
                <a href={item.href}>
                  <button
                    className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-150"
                    style={{ background: item.bg, color: item.color }}
                    onMouseEnter={(e) => {
                      const el = e.currentTarget as HTMLButtonElement;
                      el.style.background = item.color;
                      el.style.color = "#fff";
                    }}
                    onMouseLeave={(e) => {
                      const el = e.currentTarget as HTMLButtonElement;
                      el.style.background = item.bg;
                      el.style.color = item.color;
                    }}
                  >
                    {item.cta} →
                  </button>
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================
          近期队伍 Section
          ================================================================ */}
      <section
        id="teams"
        ref={teamsRef}
        className={`py-20 bg-background section-hidden ${teamsInView ? "section-visible" : ""}`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span
              className="inline-block mb-4 px-3 py-1 text-xs font-semibold rounded-full uppercase tracking-widest"
              style={{ background: "rgba(217,119,6,0.08)", color: "#92400E" }}
            >
              近期队伍
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              {copy.teams.pageTitle}
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed text-lg">
              {copy.teams.pageSubtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {teams.map((team) => (
              <TeamCard key={team.id} team={team} />
            ))}
          </div>

          <div className="text-center mt-10">
            <a href="/teams">
              <button className="border border-border hover:bg-accent text-foreground hover:text-brand px-7 py-3 rounded-xl text-sm font-medium transition-all duration-150 inline-flex items-center gap-2">
                {copy.common.viewAll}
                <ArrowRight className="h-4 w-4" />
              </button>
            </a>
          </div>
        </div>
      </section>

      {/* ================================================================
          CTA Section — 独立浅色背景，与 Footer 深色形成分区
          ================================================================ */}
      <section
        ref={ctaRef}
        className={`py-24 section-hidden ${ctaInView ? "section-visible" : ""} home-cta-gradient`}
        style={{ background: "linear-gradient(160deg, #FFFBEB 0%, #faf8f5 50%, #f5f0e8 100%)" }}
      >
        <div className="max-w-4xl mx-auto px-4 text-center">
          {/* eyebrow */}
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-4"
            style={{ color: "#D97706" }}
          >
            准备好了吗
          </p>

          {/* 主标题 */}
          <h2
            className="font-bold leading-tight mb-5"
            style={{ fontSize: "clamp(2rem, 5vw, 3rem)", color: "#1e1812" }}
          >
            找到同行的人，
            <span className="text-gradient-brand">出发就不远</span>
          </h2>

          {/* 副文案 */}
          <p className="text-muted-foreground text-lg mb-10 max-w-xl mx-auto leading-relaxed">
            已有{" "}
            <span className="font-semibold" style={{ color: "#D97706" }}>200+</span>
            {" "}伙伴在这里找到了同行的人，你也可以
          </p>

          {/* 按钮组 - 未登录显示注册按钮，已登录隐藏 */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {!isLoggedIn && (
              <a
                href="/register"
                className="inline-block px-8 py-3.5 font-semibold rounded-full text-white text-base transition-all duration-150"
                style={{
                  background: "linear-gradient(135deg, #D97706 0%, #F59E0B 100%)",
                  boxShadow: "0 4px 18px rgba(217,119,6,0.38)",
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLAnchorElement;
                  el.style.transform = "translateY(-2px)";
                  el.style.boxShadow = "0 8px 26px rgba(217,119,6,0.50)";
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLAnchorElement;
                  el.style.transform = "translateY(0)";
                  el.style.boxShadow = "0 4px 18px rgba(217,119,6,0.38)";
                }}
              >
                免费加入 GoMate
              </a>
            )}
            <a
              href="/teams"
              className="inline-block px-8 py-3.5 font-semibold rounded-full text-base transition-all duration-150 border-2"
              style={{
                borderColor: "rgba(217,119,6,0.35)",
                color: "#92400E",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background = "rgba(217,119,6,0.06)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
              }}
            >
              先看看有哪些队伍
            </a>
          </div>
        </div>
      </section>

    </main>
  );
}
