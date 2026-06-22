"use client";

import * as React from "react";
import {
  Mountain,
  Edit3,
  LogOut,
  MapPin,
  Calendar,
  Users,
  FileText,
} from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { fetchAPI, fetchCurrentUser } from "@/lib/api";
import { signOut } from "@/lib/auth-client";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";
import { formatBirthday, getAgeNumber } from "@/lib/user-utils";
import type { SessionUser, Team } from "@/lib/types";

const LEVEL_CONFIG: Record<string, {
  badge: string;
  emoji: string;
}> = {
  beginner: {
    badge: "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50",
    emoji: "🌱",
  },
  intermediate: {
    badge: "bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-900/50",
    emoji: "⛰️",
  },
  advanced: {
    badge: "bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-400 border border-violet-200 dark:border-violet-900/50",
    emoji: "🏔️",
  },
  expert: {
    badge: "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50",
    emoji: "🦅",
  },
};

function StatItem({
  label,
  value,
  href,
}: {
  label: string;
  value: React.ReactNode;
  href?: string;
}) {
  const inner = (
    <div className="group cursor-pointer">
      <p className="text-3xl font-light text-stone-800 dark:text-zinc-100 leading-none">{value}</p>
      <p className="text-xs text-stone-400 dark:text-zinc-500 mt-1 font-medium">{label}</p>
    </div>
  );
  return href ? <a href={href} className="block py-3 px-3 rounded-lg hover:bg-stone-50 dark:hover:bg-zinc-800/50 transition-colors">{inner}</a> : inner;
}

export function ProfileClient() {
  const { t } = useI18n(["profile", "common"]);
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
      setUser((u as unknown) as SessionUser);
      loadTeams(u.id as string);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTeams = async (_userId: string) => {
    try {
      const [createdRes, joinedRes] = await Promise.all([
        fetchAPI("/api/users/created-teams"),
        fetchAPI("/api/users/teams/joined"),
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

  /* ── 骨架屏 ── */
  if (isLoading) {
    return (
      <main className="min-h-screen bg-[var(--anthropic-bg)]">
        <Navbar />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-8">
          <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8">
            {/* 左侧骨架 */}
            <div className="space-y-6">
              <div className="flex flex-col items-center gap-3">
                <div className="w-20 h-20 rounded-xl bg-stone-200 dark:bg-zinc-700 animate-pulse" />
                <div className="h-5 w-32 bg-stone-200 dark:bg-zinc-700 rounded animate-pulse" />
                <div className="h-4 w-24 bg-stone-100 dark:bg-zinc-800 rounded animate-pulse" />
              </div>
              <div className="border-t border-stone-100 dark:border-zinc-800 pt-6 space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-baseline gap-2">
                    <div className="h-7 w-8 bg-stone-200 dark:bg-zinc-700 rounded animate-pulse" />
                    <div className="h-3 w-16 bg-stone-100 dark:bg-zinc-800 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
            {/* 右侧骨架 */}
            <div className="space-y-8">
              <div className="space-y-2">
                <div className="h-6 w-40 bg-stone-200 dark:bg-zinc-700 rounded animate-pulse" />
                <div className="h-4 w-56 bg-stone-100 dark:bg-zinc-800 rounded animate-pulse" />
              </div>
              <div className="space-y-3">
                <div className="h-3 w-24 bg-stone-100 dark:bg-zinc-800 rounded animate-pulse" />
                {[1, 2].map(i => (
                  <div key={i} className="h-12 bg-stone-50 dark:bg-zinc-800/50 rounded-lg animate-pulse" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!user) return null;

  const levelConfig = LEVEL_CONFIG[user.level ?? ""] || LEVEL_CONFIG.beginner;
  const displayName = user.nickname || user.name;

  const genderText = user.gender === "male"
    ? t("profile.genderMale")
    : user.gender === "female"
      ? t("profile.genderFemale")
      : t("common.unknown");

  return (
    <main className="min-h-screen bg-[var(--anthropic-bg)]">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8">

          {/* ════════════ 左侧边栏 ════════════ */}
          <aside className="profile-stagger-1 space-y-6">

            {/* 头像 */}
            <div className="flex flex-col items-center text-center">
              <div className="relative">
                {user.image ? (
                  <img
                    src={user.image}
                    alt={displayName}
                    className="w-20 h-20 rounded-xl object-cover bg-stone-100 dark:bg-zinc-800"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-900/40 dark:to-amber-950/30 flex items-center justify-center">
                    <span className="text-xl font-semibold text-amber-700 dark:text-amber-400">
                      {displayName?.[0]?.toUpperCase()}
                    </span>
                  </div>
                )}
              </div>

              {/* 用户名 */}
              <h1 className="mt-3 text-lg font-semibold text-[var(--anthropic-text)] tracking-tight">{displayName}</h1>

              {/* 等级徽章 */}
              <span className={cn(
                "mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                levelConfig.badge
              )}>
                <span>{levelConfig.emoji}</span>
                {t(`profile.levelTitle.${user.level}` as any) ?? t("profile.levelTitle.beginner")}
              </span>

              {/* 邮箱 */}
              <p className="mt-1 text-xs text-stone-400 dark:text-zinc-500 truncate max-w-[200px]">{user.email}</p>
            </div>

            {/* 操作按钮 */}
            <div className="flex flex-col gap-2 border-t border-stone-100 dark:border-zinc-800 pt-5">
              <a href="/profile/edit">
                <button className="w-full inline-flex items-center justify-center gap-1.5 bg-[var(--anthropic-accent)] hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors">
                  <Edit3 className="h-3.5 w-3.5" />
                  {t("profile.editProfileBtn")}
                </button>
              </a>
              <button
                onClick={handleLogout}
                className="w-full inline-flex items-center justify-center gap-1.5 border border-stone-200 dark:border-zinc-700 text-stone-500 dark:text-zinc-400 px-4 py-2 rounded-lg text-xs font-medium hover:text-red-500 hover:border-red-200 dark:hover:border-red-800 transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
                {t("profile.logoutBtn")}
              </button>
            </div>

            {/* 统计 */}
            <div className="border-t border-stone-100 dark:border-zinc-800 pt-5 space-y-1">
              <StatItem label={t("profile.statCreatedLabel")} value={createdTotal} href="/my-teams?tab=created" />
              <StatItem label={t("profile.statJoinedLabel")} value={joinedTotal} href="/my-teams?tab=joined" />
              <StatItem label={t("profile.statCompletedLabel")} value={completedTotal} href="/my-teams?tab=history" />
            </div>
          </aside>

          {/* ════════════ 右侧主内容 ════════════ */}
          <div className="profile-stagger-2 space-y-8">

            {/* ── 个人简介 & 属性 ── */}
            <section className="space-y-5">
              {/* 徽章行 */}
              <div className="flex flex-wrap gap-1.5">
                {(user.completedHikes ?? 0) > 0 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-stone-50 dark:bg-zinc-800 text-stone-600 dark:text-zinc-400 border border-stone-100 dark:border-zinc-700">
                    <Mountain className="h-3 w-3" />
                    {t("profile.hikesCompleted")}
                  </span>
                )}
                {user.gender && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-stone-50 dark:bg-zinc-800 text-stone-600 dark:text-zinc-400 border border-stone-100 dark:border-zinc-700">
                    {genderText}
                  </span>
                )}
                {user.birthday && (() => {
                  const age = getAgeNumber(user.birthday);
                  const formatted = formatBirthday(user.birthday);
                  return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-stone-50 dark:bg-zinc-800 text-stone-600 dark:text-zinc-400 border border-stone-100 dark:border-zinc-700">
                      {formatted}（{age}{t("profile.ageSuffix")}）
                    </span>
                  );
                })()}
              </div>

              {/* 个人简介 */}
              {user.bio && (
                <p className="text-sm text-stone-500 dark:text-zinc-400 leading-relaxed">
                  {user.bio}
                </p>
              )}

              {/* 装备清单 */}
              {user.extra && (() => {
                try {
                  const extra = JSON.parse(user.extra as string);
                  if (extra.equipment?.length) {
                    return (
                      <div>
                        <div className="text-xs uppercase tracking-wider text-stone-400 dark:text-zinc-500 font-medium mb-2 flex items-center gap-1.5">
                          <Mountain className="h-3.5 w-3.5" />
                          {t("profile.equipmentLabel")}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {extra.equipment.map((item: string, i: number) => (
                            <span key={i} className="px-2 py-0.5 bg-stone-50 dark:bg-zinc-800 text-stone-600 dark:text-zinc-400 rounded text-xs border border-stone-100 dark:border-zinc-700">
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  }
                } catch {
                  console.warn("Failed to parse extra data (equipment section)");
                }
                return null;
              })()}

              {/* 活动经历 */}
              {user.extra && (() => {
                try {
                  const extra = JSON.parse(user.extra as string);
                  if (extra.experience?.trim()) {
                    return (
                      <div>
                        <div className="text-xs uppercase tracking-wider text-stone-400 dark:text-zinc-500 font-medium mb-2 flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5" />
                          {t("profile.experienceLabel")}
                        </div>
                        <p className="text-sm text-stone-500 dark:text-zinc-400 leading-relaxed whitespace-pre-wrap">
                          {extra.experience.trim()}
                        </p>
                      </div>
                    );
                  }
                } catch {
                  console.warn("Failed to parse extra data (experience section)");
                }
                return null;
              })()}
            </section>

            {/* ── 我发起的队伍 ── */}
            {createdTeams.length > 0 && (
              <section className="profile-stagger-3">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xs uppercase tracking-wider text-stone-400 dark:text-zinc-500 font-medium">
                    {t("profile.createdTeamsSectionTitle")}
                  </h2>
                  <a href="/my-teams" className="text-xs text-stone-400 hover:text-[var(--anthropic-accent)] transition-colors font-medium">
                    {t("profile.viewMyTeams")}
                  </a>
                </div>

                <div className="divide-y divide-stone-100 dark:divide-zinc-800 border border-stone-100 dark:border-zinc-800 rounded-lg overflow-hidden bg-white dark:bg-[var(--anthropic-surface)]">
                  {createdTeams.map((team: Team) => (
                    <a key={team.id} href={`/teams/${team.id}`} className="block group">
                      <div className="px-4 py-3.5 hover:bg-stone-50 dark:hover:bg-zinc-800/50 transition-colors">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-sm font-medium text-stone-800 dark:text-zinc-100 truncate group-hover:text-[var(--anthropic-accent)] transition-colors">
                            {team.title}
                          </h3>
                          <StatusBadge status={team.status} size="sm" />
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-stone-400 dark:text-zinc-500">
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
                            {team.currentMembers}/{team.maxMembers}
                          </span>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </section>
            )}

            {/* ── 我加入的队伍 ── */}
            {joinedTeams.length > 0 && (
              <section className="profile-stagger-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xs uppercase tracking-wider text-stone-400 dark:text-zinc-500 font-medium">
                    {t("profile.joinedTeamsSectionTitle")}
                  </h2>
                  <a href="/my-teams?tab=joined" className="text-xs text-stone-400 hover:text-[var(--anthropic-accent)] transition-colors font-medium">
                    {t("profile.viewMyTeams")}
                  </a>
                </div>

                <div className="divide-y divide-stone-100 dark:divide-zinc-800 border border-stone-100 dark:border-zinc-800 rounded-lg overflow-hidden bg-white dark:bg-[var(--anthropic-surface)]">
                  {joinedTeams.map((team: Team) => (
                    <a key={team.id} href={`/teams/${team.id}`} className="block group">
                      <div className="px-4 py-3.5 hover:bg-stone-50 dark:hover:bg-zinc-800/50 transition-colors">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-sm font-medium text-stone-800 dark:text-zinc-100 truncate group-hover:text-[var(--anthropic-accent)] transition-colors">
                            {team.title}
                          </h3>
                          <StatusBadge status={team.status} size="sm" />
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-stone-400 dark:text-zinc-500">
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
                            {team.currentMembers}/{team.maxMembers}
                          </span>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </section>
            )}

            {/* ── 空状态 ── */}
            {createdTotal === 0 && joinedTotal === 0 && (
              <section className="profile-stagger-3 text-center py-16">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-stone-50 dark:bg-zinc-800 mb-4">
                  <Mountain className="h-5 w-5 text-stone-300 dark:text-zinc-600" />
                </div>
                <h3 className="text-base font-semibold text-stone-700 dark:text-zinc-200 mb-1">{t("profile.noTeamsTitle")}</h3>
                <p className="text-sm text-stone-400 dark:text-zinc-500 mb-6 max-w-xs mx-auto">{t("profile.noTeamsDesc")}</p>
                <a href="/teams/create">
                  <button className="bg-[var(--anthropic-accent)] hover:bg-amber-700 text-white px-6 py-2 rounded-lg font-medium transition-colors text-sm">
                    {t("profile.createTeamBtn")}
                  </button>
                </a>
              </section>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
