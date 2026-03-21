"use client";

import * as React from "react";
import {
  ArrowLeft,
  User,
  Mail,
  Mountain,
  Edit3,
  LogOut,
  MapPin,
  Calendar,
  Award,
  Users,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { copy } from "@/lib/copy";
import { fetchAPI } from "@/lib/api";
import { signOut } from "@/lib/auth-client";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/lib/types";

/**
 * 等级对应的设计系统语义色
 */
const LEVEL_STYLES: Record<string, { badge: string; icon: string }> = {
  beginner:     { badge: "bg-success-subtle text-success border border-success/20",   icon: "text-success" },
  intermediate: { badge: "bg-brand-subtle text-brand border border-brand/20",         icon: "text-brand" },
  advanced:     { badge: "bg-[#f2effe] text-[#7c5ce8] border border-[#7c5ce8]/20",   icon: "text-[#7c5ce8]" },
  expert:       { badge: "bg-warning-subtle text-warning border border-warning/20",   icon: "text-warning" },
};

/**
 * 统计卡片
 */
function StatCard({
  label,
  value,
  icon: Icon,
  href,
  accent = false,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ElementType;
  href?: string;
  accent?: boolean;
}) {
  const inner = (
    <div
      className={cn(
        "bg-card rounded-2xl border border-border p-5 transition-all duration-200",
        href && "hover:-translate-y-0.5 hover:shadow-[0_4px_18px_rgba(36,154,135,0.10)] hover:border-brand/25 cursor-pointer"
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground mb-1">{label}</p>
          <p className={cn("text-3xl font-bold", accent ? "text-brand" : "text-foreground")}>{value}</p>
        </div>
        <div className={cn(
          "w-11 h-11 rounded-xl flex items-center justify-center",
          accent ? "bg-brand-subtle" : "bg-muted"
        )}>
          <Icon className={cn("h-5 w-5", accent ? "text-brand" : "text-muted-foreground")} />
        </div>
      </div>
    </div>
  );
  return href ? <a href={href}>{inner}</a> : inner;
}

/**
 * 个人资料页客户端组件 - React Island
 * 视觉规范：GoMate Design System v2.0
 *  - 封面：品牌渐变 Banner
 *  - 头像：ring-4 ring-background + 品牌色占位
 *  - 等级徽章：语义色系
 *  - 统计卡：hover 品牌绿光晕
 *  - 队伍列表：card-interactive 风格
 */
export function ProfileClient() {
  const [user, setUser] = React.useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [createdTeams, setCreatedTeams] = React.useState<any[]>([]);
  const [joinedTeams, setJoinedTeams] = React.useState<any[]>([]);

  React.useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      const res = await fetchAPI("/auth/get-session");
      const data = await res.json();
      if (!data?.user?.id) {
        window.location.href = "/login?redirect=/profile";
        return;
      }
      setUser(data.user);
      loadTeams(data.user.id);
    } catch {
      window.location.href = "/login?redirect=/profile";
    } finally {
      setIsLoading(false);
    }
  };

  const loadTeams = async (userId: string) => {
    try {
      const [createdRes, joinedRes] = await Promise.all([
        fetchAPI(`/api/teams?leaderId=${userId}&pageSize=3`),
        fetchAPI("/api/user/teams/joined?pageSize=3"),
      ]);
      const createdData = await createdRes.json();
      const joinedData = await joinedRes.json();
      if (createdData.success) setCreatedTeams(createdData.teams || []);
      if (joinedData.success) setJoinedTeams(joinedData.teams || []);
    } catch {}
  };

  const handleLogout = async () => {
    await signOut();
    window.location.href = "/";
  };

  /* ── 加载态 ── */
  if (isLoading) {
    return (
      <main className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-brand" />
        </div>
      </main>
    );
  }

  if (!user) return null;

  const levelStyle = LEVEL_STYLES[user.level] || LEVEL_STYLES.beginner;
  const displayName = user.nickname || user.name;
  const levelLabel = copy.enums.level[user.level as keyof typeof copy.enums.level];

  return (
    <main className="min-h-screen bg-background">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">

        {/* 返回 */}
        <a
          href="/"
          className="inline-flex items-center text-muted-foreground hover:text-brand transition-colors duration-150 mb-6 text-sm"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          {copy.common.backHome}
        </a>

        {/* ── 个人信息卡 ── */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden mb-6">

          {/* 封面 Banner — 品牌渐变 */}
          <div
            className="relative h-36"
            style={{
              background: "linear-gradient(135deg, #1a6459 0%, #249a87 50%, #3fb5a0 80%, #74d0bf 100%)",
            }}
          >
            {/* 装饰性山脊 */}
            <svg
              className="absolute bottom-0 left-0 right-0 w-full"
              style={{ opacity: 0.12 }}
              viewBox="0 0 1200 80"
              fill="none"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path d="M0 80L200 30L400 55L600 10L800 40L1000 20L1200 50V80H0Z" fill="white" />
            </svg>
          </div>

          <div className="relative px-6 pb-6">
            {/* 头像 — 从 Banner 底部溢出 */}
            <div className="absolute -top-14 left-6">
              <div className="h-28 w-28 rounded-full ring-4 ring-card shadow-[0_4px_18px_rgba(30,24,18,0.15)] bg-muted flex items-center justify-center overflow-hidden">
                {user.image ? (
                  <img src={user.image} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  <span
                    className="text-3xl font-bold text-white"
                    style={{ textShadow: "0 1px 4px rgba(0,0,0,0.2)" }}
                  >
                    {displayName?.[0]?.toUpperCase()}
                  </span>
                )}
              </div>
            </div>

            {/* 用户信息 */}
            <div className="pt-20 sm:pt-4 sm:pl-36">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">{displayName}</h1>
                  <p className="text-muted-foreground flex items-center gap-1.5 mt-1 text-sm">
                    <Mail className="h-3.5 w-3.5" />
                    {user.email}
                  </p>
                </div>

                {/* 操作按钮 */}
                <div className="flex gap-2 shrink-0">
                  <a href="/profile/edit">
                    <button className="inline-flex items-center gap-1.5 bg-brand text-brand-foreground px-3.5 py-2 rounded-xl text-sm font-medium hover:bg-brand/90 hover:-translate-y-px transition-all duration-150 shadow-[0_2px_8px_rgba(36,154,135,0.25)]">
                      <Edit3 className="h-3.5 w-3.5" />
                      {copy.profile.editProfileBtn}
                    </button>
                  </a>
                  <button
                    onClick={handleLogout}
                    className="inline-flex items-center gap-1.5 border border-border text-muted-foreground px-3.5 py-2 rounded-xl text-sm font-medium hover:border-destructive/40 hover:text-destructive hover:bg-destructive/5 transition-all duration-150"
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
                  "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium",
                  levelStyle.badge
                )}>
                  <Award className={cn("h-3 w-3", levelStyle.icon)} />
                  {levelLabel}{copy.profile.levelTitleSuffix}
                </span>

                {/* 徒步次数 */}
                {(user.completedHikes ?? 0) > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                    <Mountain className="h-3 w-3" />
                    已完成 {user.completedHikes} {copy.profile.hikesCompleted}
                  </span>
                )}
              </div>

              {/* 个人简介 */}
              {user.bio && (
                <p className="mt-4 text-muted-foreground text-sm leading-relaxed border-t border-border pt-4">
                  {user.bio}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── 统计卡片 ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <StatCard
            label={copy.profile.createdTeams}
            value={createdTeams.length}
            icon={Users}
            href="/my-teams?tab=created"
            accent
          />
          <StatCard
            label={copy.profile.joinedTeams}
            value={joinedTeams.length}
            icon={User}
            href="/my-teams?tab=joined"
            accent
          />
          <StatCard
            label={copy.profile.registeredAt}
            value={user.createdAt ? new Date(user.createdAt).toLocaleDateString("zh-CN", { year: "numeric", month: "short" }) : "—"}
            icon={Calendar}
          />
        </div>

        {/* ── 我发起的队伍 ── */}
        {createdTeams.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-foreground">{copy.profile.recentTeams}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{copy.profile.createdTeamsDesc}</p>
              </div>
              <a
                href="/my-teams"
                className="inline-flex items-center gap-1 text-sm text-brand hover:text-brand/80 font-medium transition-colors"
              >
                {copy.common.viewAll}
                <ChevronRight className="h-4 w-4" />
              </a>
            </div>

            <div className="space-y-3">
              {createdTeams.map((team: any) => (
                <a key={team.id} href={`/teams/${team.id}`}>
                  <div className="bg-card rounded-xl border border-border p-4 mb-3 hover:-translate-y-0.5 hover:shadow-[0_4px_18px_rgba(36,154,135,0.08)] hover:border-brand/25 transition-all duration-200 group">
                    <div className="flex items-center gap-4">
                      {/* 封面图 / 占位 */}
                      {team.location?.coverImage ? (
                        <div
                          className="w-14 h-14 rounded-xl bg-cover bg-center flex-shrink-0"
                          style={{ backgroundImage: `url(${team.location.coverImage})` }}
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-brand-subtle flex items-center justify-center flex-shrink-0">
                          <Mountain className="h-6 w-6 text-brand/50" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-foreground truncate group-hover:text-brand transition-colors duration-150 text-sm">
                            {team.title}
                          </h3>
                          <StatusBadge status={team.status} size="sm" />
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                          {team.location?.name && (
                            <span className="flex items-center gap-0.5">
                              <MapPin className="h-3 w-3" />
                              {team.location.name}
                            </span>
                          )}
                          <span className="flex items-center gap-0.5">
                            <Calendar className="h-3 w-3" />
                            {team.date}
                          </span>
                          <span className="flex items-center gap-0.5">
                            <Users className="h-3 w-3" />
                            {team.currentMembers}/{team.maxMembers}人
                          </span>
                        </p>
                      </div>

                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-brand group-hover:translate-x-0.5 transition-all duration-150 flex-shrink-0" />
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* ── 空状态 ── */}
        {createdTeams.length === 0 && joinedTeams.length === 0 && (
          <div className="bg-card rounded-2xl border border-dashed border-border p-14 text-center">
            <div className="w-16 h-16 bg-brand-subtle rounded-full flex items-center justify-center mx-auto mb-5">
              <Mountain className="h-8 w-8 text-brand/60" />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-2">{copy.profile.noTeamsYet}</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto leading-relaxed">
              {copy.profile.noTeamsTip}
            </p>
            <a href="/teams/create">
              <button className="bg-brand hover:bg-brand/90 text-brand-foreground px-6 py-2.5 rounded-xl font-medium transition-all duration-150 shadow-[0_4px_14px_rgba(36,154,135,0.30)] hover:-translate-y-px active:scale-[0.97] text-sm">
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
