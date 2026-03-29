"use client";

import * as React from "react";
import {
  User,
  Mail,
  Mountain,
  Edit3,
  LogOut,
  MapPin,
  Calendar,
  Users,
  ChevronRight,
  CheckCircle,
} from "lucide-react";
import { copy } from "@/lib/copy";
import { fetchAPI, fetchCurrentUser } from "@/lib/api";
import { signOut } from "@/lib/auth-client";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";
import { formatBirthday, getAgeNumber } from "@/lib/user-utils";
import type { SessionUser, Team } from "@/lib/types";

/**
 * 等级配置 — 含 emoji、标题、色系
 */
const LEVEL_CONFIG: Record<string, {
  badge: string;
  glow: string;
  icon: string;
  emoji: string;
}> = {
  beginner: {
    badge: "bg-amber-50 text-amber-700 border border-amber-200",
    glow: "shadow-amber-100",
    icon: "text-amber-500",
    emoji: "🌱",
  },
  intermediate: {
    badge: "bg-sky-50 text-sky-700 border border-sky-200",
    glow: "shadow-sky-100",
    icon: "text-sky-500",
    emoji: "⛰️",
  },
  advanced: {
    badge: "bg-violet-50 text-violet-700 border border-violet-200",
    glow: "shadow-violet-100",
    icon: "text-violet-500",
    emoji: "🏔️",
  },
  expert: {
    badge: "bg-amber-50 text-amber-700 border border-amber-200",
    glow: "shadow-amber-100",
    icon: "text-amber-500",
    emoji: "🦅",
  },
};

/**
 * 统计卡片 — 支持 hover 交互、sublabel 副标签
 */
function StatCard({
  label,
  value,
  icon: Icon,
  href,
  accent = false,
  sublabel,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ElementType;
  href?: string;
  accent?: boolean;
  sublabel?: string;
}) {
  const inner = (
    <div className={cn(
      "bg-white rounded-2xl border border-stone-100 p-5 transition-all duration-200 group",
      href && "hover:-translate-y-1 hover:shadow-lg hover:shadow-amber-100/60 hover:border-amber-200/60 cursor-pointer"
    )}>
      <div className="flex items-start justify-between mb-3">
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200",
          accent
            ? "bg-amber-50 group-hover:bg-amber-100"
            : "bg-stone-50 group-hover:bg-stone-100"
        )}>
          <Icon className={cn("h-5 w-5", accent ? "text-amber-600" : "text-stone-400")} />
        </div>
        {href && (
          <ChevronRight className="h-4 w-4 text-stone-300 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all duration-150" />
        )}
      </div>
      <p className={cn(
        "text-3xl font-bold mb-1",
        accent ? "text-stone-900" : "text-stone-700"
      )}>{value}</p>
      <p className="text-xs text-stone-400 font-medium">{label}</p>
      {sublabel && <p className="text-xs text-stone-300 mt-0.5">{sublabel}</p>}
    </div>
  );
  return href ? <a href={href}>{inner}</a> : inner;
}

/**
 * 个人资料页客户端组件 - React Island
 * 视觉规范：「可靠伙伴」情感体验
 *  - 骨架屏加载态
 *  - 多层渐变 Banner + SVG 山脉剪影
 *  - 等级 emoji 徽章
 *  - 统计卡 hover 品牌绿光晕 + sublabel
 *  - 队伍列表卡片式
 *  - 多层圆形空状态
 */
export function ProfileClient() {
  const [user, setUser] = React.useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [createdTeams, setCreatedTeams] = React.useState<Team[]>([]);
  const [joinedTeams, setJoinedTeams] = React.useState<Team[]>([]);
  const [createdTotal, setCreatedTotal] = React.useState(0);
  const [joinedTotal, setJoinedTotal] = React.useState(0);

  const [completedTotal, setCompletedTotal] = React.useState(0);

  React.useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      const u = await fetchCurrentUser("/login?redirect=/profile");
      if (!u) return;
      setUser(u as SessionUser);
      loadTeams(u.id as string);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTeams = async (_userId: string) => {
    try {
      const [createdRes, joinedRes] = await Promise.all([
        fetchAPI("/api/user/created-teams"),
        fetchAPI("/api/user/teams/joined"),
      ]);
      const createdData = await createdRes.json();
      const joinedData = await joinedRes.json();
      if (createdData.success) {
        const all: Team[] = createdData.teams || [];
        setCreatedTotal(all.length);
        setCreatedTeams(all.slice(0, 3));
      }
      if (joinedData.success) {
        const all: Team[] = joinedData.teams || [];
        setJoinedTotal(all.length);
        setJoinedTeams(all.slice(0, 3));
      }
      if (createdData.success && joinedData.success) {
        const createdList: Team[] = createdData.teams || [];
        const joinedList: Team[] = joinedData.teams || [];
        const completedCount = [...createdList, ...joinedList].filter(
          (t) => t.status === "completed"
        ).length;
        setCompletedTotal(completedCount);
      }
    } catch (error) {
      console.warn("[ProfileClient] 队伍加载失败:", error);
    }
  };

  const handleLogout = async () => {
    await signOut();
    window.location.href = "/";
  };

  /* ── 骨架屏加载态 ── */
  if (isLoading) {
    return (
      <main className="min-h-screen bg-stone-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-8">
          {/* Banner 骨架 */}
          <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden mb-6">
            <div className="h-36 bg-gradient-to-r from-stone-100 via-stone-50 to-stone-100 animate-pulse" />
            <div className="px-6 pb-6 pt-20">
              <div className="space-y-3">
                <div className="h-6 bg-stone-100 rounded-full w-40 animate-pulse" />
                <div className="h-4 bg-stone-100 rounded-full w-56 animate-pulse" />
                <div className="flex gap-2 mt-4">
                  <div className="h-6 w-24 bg-stone-100 rounded-full animate-pulse" />
                  <div className="h-6 w-32 bg-stone-100 rounded-full animate-pulse" />
                </div>
              </div>
            </div>
          </div>
          {/* 统计卡骨架 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white rounded-2xl border border-stone-100 p-5">
                <div className="h-3 bg-stone-100 rounded-full w-16 animate-pulse mb-3" />
                <div className="h-8 bg-stone-100 rounded-full w-12 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (!user) return null;

  const levelConfig = LEVEL_CONFIG[user.level ?? ""] || LEVEL_CONFIG.beginner;
  const displayName = user.nickname || user.name;

  return (
    <main className="min-h-screen bg-stone-50">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">

        {/* ── 个人信息卡 ── */}
        <div className="bg-white rounded-3xl border border-stone-100 overflow-hidden mb-6 shadow-sm">

          {/* Banner — 多层渐变 + SVG 山脉 */}
          <div
            className="relative h-40 overflow-hidden"
            style={{
              background: "linear-gradient(135deg, #78350F 0%, #92400E 30%, #D97706 65%, #5bbfac 90%, #8dd5c8 100%)",
            }}
          >
            {/* 光晕装饰 */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
            <div className="absolute -bottom-10 left-1/4 w-48 h-48 bg-amber-300/10 rounded-full blur-2xl" />

            {/* 点阵纹理 */}
            <div className="absolute inset-0 opacity-[0.06]" style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
              backgroundSize: "24px 24px",
            }} />

            {/* SVG 山脉剪影 — 三层，营造景深 */}
            <svg
              className="absolute bottom-0 left-0 right-0 w-full"
              viewBox="0 0 1200 80"
              fill="none"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              {/* 远景山 */}
              <path d="M0 80L150 45L300 62L450 30L600 55L750 25L900 48L1050 18L1200 40V80H0Z" fill="white" fillOpacity="0.06" />
              {/* 中景山 */}
              <path d="M0 80L200 52L400 68L600 38L800 58L1000 32L1200 52V80H0Z" fill="white" fillOpacity="0.10" />
              {/* 近景山 */}
              <path d="M0 80L250 60L500 72L750 50L1000 65L1200 55V80H0Z" fill="white" fillOpacity="0.18" />
            </svg>
          </div>

          <div className="relative px-6 pb-7">
            {/* 头像 */}
            <div className="absolute -top-16 left-6">
              <div className="relative">
                <div className="h-32 w-32 rounded-full ring-4 ring-white shadow-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center overflow-hidden">
                  {user.image ? (
                    <img src={user.image} alt={displayName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-4xl font-bold text-white" style={{ textShadow: "0 2px 8px rgba(0,0,0,0.2)" }}>
                      {displayName?.[0]?.toUpperCase()}
                    </span>
                  )}
                </div>
                {/* 等级装饰点 */}
                <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center text-base shadow-md ring-2 ring-white bg-white">
                  {levelConfig.emoji}
                </div>
              </div>
            </div>

            {/* 用户信息 */}
            <div className="pt-20 sm:pt-6 sm:pl-40">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-stone-900">{displayName}</h1>
                  <p className="text-stone-400 flex items-center gap-1.5 mt-1 text-sm">
                    <Mail className="h-3.5 w-3.5" />
                    {user.email}
                  </p>
                </div>

                {/* 操作按钮 */}
                <div className="flex gap-2 shrink-0">
                  <a href="/profile/edit">
                    <button className="inline-flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150 shadow-md shadow-amber-200 hover:shadow-lg hover:shadow-amber-200 hover:-translate-y-px active:scale-95">
                      <Edit3 className="h-3.5 w-3.5" />
                      {copy.profile.editProfileBtn}
                    </button>
                  </a>
                  <button
                    onClick={handleLogout}
                    className="inline-flex items-center gap-1.5 border border-stone-200 text-stone-500 px-4 py-2 rounded-xl text-sm font-medium hover:border-red-200 hover:text-red-500 hover:bg-red-50 transition-all duration-150 active:scale-95"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    {copy.profile.logoutBtn}
                  </button>
                </div>
              </div>

              {/* 徽章行 */}
              <div className="flex flex-wrap gap-2 mt-4">
                {/* 等级徽章 */}
                <span className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold",
                  levelConfig.badge
                )}>
                  <span>{levelConfig.emoji}</span>
                  {copy.profile.levelTitle[user.level as keyof typeof copy.profile.levelTitle] ?? copy.profile.levelTitle.beginner}
                </span>

                {/* 徒步次数 */}
                {(user.completedHikes ?? 0) > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-stone-50 text-stone-600 border border-stone-200">
                    <Mountain className="h-3 w-3" />
                    已完成 {user.completedHikes} {copy.profile.hikesCompleted}
                  </span>
                )}

                {/* 性别 */}
                {user.gender && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-stone-50 text-stone-600 border border-stone-200">
                    {user.gender === "male" ? "♂ 男" : user.gender === "female" ? "♀ 女" : copy.common.unknown}
                  </span>
                )}

                {/* 生日 / 年龄 */}
                {user.birthday && (() => {
                  const age = getAgeNumber(user.birthday);
                  const formatted = formatBirthday(user.birthday);
                  return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-stone-50 text-stone-600 border border-stone-200">
                      🎂 {formatted}（{age}{copy.profile.ageSuffix}）
                    </span>
                  );
                })()}
              </div>

              {/* 个人简介 */}
              {user.bio && (
                <p className="mt-4 text-stone-500 text-sm leading-relaxed border-t border-stone-100 pt-4">
                  {user.bio}
                </p>
              )}

              {/* 装备清单 */}
              {user.extra && (() => {
                try {
                  const extra = JSON.parse(user.extra as string);
                  if (extra.equipment?.length) {
                    return (
                      <div className="mt-4 border-t border-stone-100 pt-4">
                        <div className="text-xs text-stone-500 mb-2 flex items-center gap-1">
                          <Mountain className="h-3.5 w-3.5" />
                          {copy.profile.equipmentLabel}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {extra.equipment.map((item: string, i: number) => (
                            <span key={i} className="px-2.5 py-1 bg-stone-100 text-stone-700 rounded-full text-xs">
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  }
                } catch {}
                return null;
              })()}
            </div>
          </div>
        </div>

        {/* ── 统计卡片 ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="我发起的队伍"
            value={createdTotal}
            icon={Users}
            href="/my-teams?tab=created"
            accent
            sublabel="作为领队带领伙伴出发"
          />
          <StatCard
            label="我加入的队伍"
            value={joinedTotal}
            icon={User}
            href="/my-teams?tab=joined"
            accent
            sublabel="与伙伴一起出发的次数"
          />
          <StatCard
            label="已完成"
            value={completedTotal}
            icon={CheckCircle}
            href="/my-teams?tab=history"
            sublabel="圆满完成的活动"
          />
          <StatCard
            label="加入时间"
            value={user.createdAt ? new Date(user.createdAt).toLocaleDateString("zh-CN", { year: "numeric", month: "short" }) : "—"}
            icon={Calendar}
          />
        </div>

        {/* ── 我发起的队伍 ── */}
        {createdTeams.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-stone-900">{copy.profile.createdTeamsSectionTitle}</h2>
                <p className="text-xs text-stone-400 mt-0.5">{copy.profile.createdTeamsDesc}</p>
              </div>
              <a href="/my-teams" className="inline-flex items-center gap-1 text-sm text-amber-600 hover:text-amber-700 font-medium transition-colors">
                {copy.profile.viewMyTeams}
                <ChevronRight className="h-4 w-4" />
              </a>
            </div>

            <div className="space-y-3">
              {createdTeams.map((team: Team) => (
                <a key={team.id} href={`/teams/${team.id}`} className="block group">
                  <div className="bg-white rounded-2xl border border-stone-100 p-4 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-amber-100/40 hover:border-amber-200/60 transition-all duration-200">
                    <div className="flex items-center gap-4">
                      {/* 封面图 */}
                      <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-amber-100 to-amber-50">
                        {team.location?.coverImage ? (
                          <img
                            src={team.location.coverImage}
                            alt={team.location.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Mountain className="h-7 w-7 text-amber-300" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <h3 className="font-semibold text-stone-900 truncate group-hover:text-amber-700 transition-colors duration-150 text-sm">
                            {team.title}
                          </h3>
                          <StatusBadge status={team.status} size="sm" />
                        </div>
                        <div className="flex items-center gap-3 text-xs text-stone-400 flex-wrap">
                          {team.location?.name && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {team.location.name}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {team.date}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {team.currentMembers}/{team.maxMembers}{copy.profile.memberCount}
                          </span>
                        </div>
                      </div>

                      <ChevronRight className="h-4 w-4 text-stone-300 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all duration-150 flex-shrink-0" />
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* ── 我加入的队伍 ── */}
        {joinedTeams.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-stone-900">{copy.profile.joinedTeamsSectionTitle}</h2>
                <p className="text-xs text-stone-400 mt-0.5">{copy.profile.joinedTeamsDesc}</p>
              </div>
              <a href="/my-teams?tab=joined" className="inline-flex items-center gap-1 text-sm text-amber-600 hover:text-amber-700 font-medium transition-colors">
                {copy.profile.viewMyTeams}
                <ChevronRight className="h-4 w-4" />
              </a>
            </div>

            <div className="space-y-3">
              {joinedTeams.map((team: Team) => (
                <a key={team.id} href={`/teams/${team.id}`} className="block group">
                  <div className="bg-white rounded-2xl border border-stone-100 p-4 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-amber-100/40 hover:border-amber-200/60 transition-all duration-200">
                    <div className="flex items-center gap-4">
                      {/* 封面图 */}
                      <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-sky-100 to-sky-50">
                        {team.location?.coverImage ? (
                          <img
                            src={team.location.coverImage}
                            alt={team.location.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Mountain className="h-7 w-7 text-sky-300" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <h3 className="font-semibold text-stone-900 truncate group-hover:text-amber-700 transition-colors duration-150 text-sm">
                            {team.title}
                          </h3>
                          <StatusBadge status={team.status} size="sm" />
                        </div>
                        <div className="flex items-center gap-3 text-xs text-stone-400 flex-wrap">
                          {team.location?.name && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {team.location.name}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {team.date}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {team.currentMembers}/{team.maxMembers}{copy.profile.memberCount}
                          </span>
                        </div>
                      </div>

                      <ChevronRight className="h-4 w-4 text-stone-300 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all duration-150 flex-shrink-0" />
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* ── 空状态 ── */}
        {createdTotal === 0 && joinedTotal === 0 && (
          <div className="bg-white rounded-3xl border border-dashed border-stone-200 p-16 text-center">
            {/* 多层圆形装饰 */}
            <div className="relative inline-flex items-center justify-center mb-8">
              <div className="w-24 h-24 rounded-full bg-amber-50 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
                  <Mountain className="h-8 w-8 text-amber-400" />
                </div>
              </div>
              <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center text-xs">✨</div>
            </div>
            <h3 className="text-lg font-bold text-stone-800 mb-2">{copy.profile.noTeamsTitle}</h3>
            <p className="text-sm text-stone-400 mb-8 max-w-xs mx-auto leading-relaxed">{copy.profile.noTeamsDesc}</p>
            <a href="/teams/create">
              <button className="bg-amber-600 hover:bg-amber-700 text-white px-7 py-3 rounded-full font-medium transition-all duration-150 shadow-lg shadow-amber-200 hover:shadow-xl hover:shadow-amber-200 hover:-translate-y-0.5 active:scale-95 text-sm">
                {copy.profile.createTeamBtn}
              </button>
            </a>
          </div>
        )}

      </div>

      <Footer />
    </main>
  );
}
