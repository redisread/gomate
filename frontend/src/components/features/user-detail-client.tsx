"use client";

import * as React from "react";
import {
  ArrowLeft, User, Mountain, Award, Calendar, Users,
  Briefcase, CheckCircle, Tent, MapPin, ChevronRight,
} from "lucide-react";
import { fetchAPI } from "@/lib/api";
import { copy } from "@/lib/copy";
import { cn } from "@/lib/utils";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { StatusBadge } from "@/components/ui/status-badge";
import { parseExtra, getAgeFromBirthday, formatBirthday } from "@/lib/user-utils";
import type { TeamStatus } from "@gomate/types";

const c = copy.userDetail;

// 等级标签
const levelLabels: Record<string, string> = {
  beginner: "新手",
  intermediate: "进阶",
  advanced: "资深",
  expert: "专家",
};

const levelColors: Record<string, string> = {
  beginner: "bg-stone-100 text-stone-700",
  intermediate: "bg-blue-100 text-blue-700",
  advanced: "bg-purple-100 text-purple-700",
  expert: "bg-amber-100 text-amber-700",
};

interface UserProfile {
  id: string;
  name: string;
  nickname?: string | null;
  avatar?: string | null;
  bio?: string | null;
  level: string;
  gender?: string | null;
  birthday?: number | null;
  completedHikes?: number;
  createdAt?: number;
  extra?: string | null;
  stats: {
    createdTeams: number;
    joinedTeams: number;
    completedTeams: number;
  };
}

interface OngoingTeam {
  id: string;
  title: string;
  date: string | null;
  time: string | null;
  status: TeamStatus;
  currentMembers: number;
  maxMembers: number;
  location: {
    name: string;
    coverImage: string;
  } | null;
}

interface UserDetailClientProps {
  userId: string;
}

function getGenderText(gender?: string | null): string {
  if (gender === "male") return "男";
  if (gender === "female") return "女";
  return "";
}

/**
 * 队伍卡片组件
 */
function TeamCard({ team }: { team: OngoingTeam }) {
  return (
    <a href={`/teams/${team.id}`} className="block group">
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
                {team.currentMembers}/{team.maxMembers}{c.memberCount}
              </span>
            </div>
          </div>

          <ChevronRight className="h-4 w-4 text-stone-300 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all duration-150 flex-shrink-0" />
        </div>
      </div>
    </a>
  );
}

/**
 * 空状态组件
 */
function EmptyState({ icon: Icon, title, desc }: { icon: typeof Mountain; title: string; desc: string }) {
  return (
    <div className="bg-white rounded-2xl border border-dashed border-stone-200 p-10 text-center">
      <div className="relative inline-flex items-center justify-center mb-4">
        <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center">
          <Icon className="h-7 w-7 text-amber-300" />
        </div>
      </div>
      <h3 className="text-base font-semibold text-stone-800 mb-1">{title}</h3>
      <p className="text-sm text-stone-400">{desc}</p>
    </div>
  );
}

/**
 * 用户详情页客户端组件 - React Island
 */
export function UserDetailClient({ userId }: UserDetailClientProps) {
  const [user, setUser] = React.useState<UserProfile | null>(null);
  const [ongoingTeams, setOngoingTeams] = React.useState<OngoingTeam[]>([]);
  const [activeTab, setActiveTab] = React.useState<"ongoing" | "history">("ongoing");
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setIsLoading(true);
    fetchAPI(`/api/users/${userId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.user) {
          setUser(data.user);
          setOngoingTeams(data.ongoingTeams || []);
        } else {
          setError("用户不存在");
        }
      })
      .catch(() => setError("加载失败，请稍后重试"))
      .finally(() => setIsLoading(false));
  }, [userId]);

  // 过滤进行中 vs 历史队伍（这里简化处理，实际历史需要额外查询）
  // 当前 API 只返回了进行中的队伍，历史队伍可以后续扩展
  const ongoingList = ongoingTeams.filter((t) =>
    ["recruiting", "full", "formed"].includes(t.status)
  );

  if (isLoading) {
    return (
      <main className="min-h-screen bg-stone-50">
        <Navbar />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 space-y-4">
          <div className="h-40 bg-stone-200 rounded-2xl animate-pulse" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-stone-200 rounded-xl animate-pulse" />
            ))}
          </div>
          <div className="h-32 bg-stone-200 rounded-2xl animate-pulse" />
        </div>
      </main>
    );
  }

  if (error || !user) {
    return (
      <main className="min-h-screen bg-stone-50">
        <Navbar />
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-stone-900 mb-2">{error || "用户不存在"}</h1>
            <button
              onClick={() => window.history.back()}
              className="text-stone-600 hover:text-stone-900 underline text-sm"
            >
              返回上一页
            </button>
          </div>
        </div>
        <Footer />
      </main>
    );
  }

  const displayName = user.nickname || user.name;
  const extra = parseExtra(user.extra);
  const age = getAgeFromBirthday(user.birthday);
  const genderText = getGenderText(user.gender);

  const joinDate = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString("zh-CN", { year: "numeric", month: "long" })
    : null;

  return (
    <main className="min-h-screen bg-stone-50">
      <Navbar />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        {/* 返回按钮 */}
        <div className="mb-6">
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center text-stone-600 hover:text-stone-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            返回
          </button>
        </div>

        {/* 用户头部信息 */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* 头像 */}
            <div className="w-24 h-24 rounded-full bg-stone-200 overflow-hidden flex-shrink-0 flex items-center justify-center border-4 border-stone-100">
              {user.avatar ? (
                <img src={user.avatar} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-bold text-stone-500">
                  {user.name?.charAt(0) || "?"}
                </span>
              )}
            </div>

            {/* 基本信息 */}
            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
                <h1 className="text-2xl font-bold text-stone-900">{displayName}</h1>
                <span className={cn("text-xs px-2.5 py-1 rounded-full font-medium", levelColors[user.level])}>
                  {levelLabels[user.level] || user.level}
                </span>
              </div>

              {(genderText || age) && (
                <div className="flex items-center justify-center sm:justify-start gap-2 mt-2 text-stone-500">
                  <User className="h-4 w-4" />
                  <span>
                    {genderText}
                    {genderText && age ? " · " : ""}
                    {age}
                  </span>
                </div>
              )}

              {joinDate && (
                <div className="flex items-center justify-center sm:justify-start gap-2 mt-1 text-sm text-stone-400">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{joinDate} 加入</span>
                </div>
              )}
            </div>
          </div>

          {user.bio && (
            <div className="mt-6 pt-6 border-t border-stone-100">
              <p className="text-stone-600 leading-relaxed text-center sm:text-left">{user.bio}</p>
            </div>
          )}
        </div>

        {/* 活动统计 */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white border border-stone-200 rounded-2xl p-4 text-center">
            <div className="flex items-center justify-center mb-1">
              <Briefcase className="h-4 w-4 text-stone-400" />
            </div>
            <div className="text-2xl font-bold text-stone-900">{user.stats.createdTeams}</div>
            <div className="text-xs text-stone-500">{c.statCreated}</div>
          </div>

          <div className="bg-white border border-stone-200 rounded-2xl p-4 text-center">
            <div className="flex items-center justify-center mb-1">
              <Users className="h-4 w-4 text-stone-400" />
            </div>
            <div className="text-2xl font-bold text-stone-900">{user.stats.joinedTeams}</div>
            <div className="text-xs text-stone-500">{c.statJoined}</div>
          </div>

          <div className="bg-white border border-stone-200 rounded-2xl p-4 text-center">
            <div className="flex items-center justify-center mb-1">
              <CheckCircle className="h-4 w-4 text-stone-400" />
            </div>
            <div className="text-2xl font-bold text-stone-900">{user.stats.completedTeams}</div>
            <div className="text-xs text-stone-500">{c.statCompleted}</div>
          </div>
        </div>

        {/* Tab 导航 + 队伍列表 */}
        <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden mb-6">
          {/* Tab 导航 */}
          <div className="border-b border-stone-100">
            <div className="flex">
              {[
                { id: "ongoing", label: c.ongoingTab },
                { id: "history", label: c.historyTab },
              ].map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id as "ongoing" | "history")}
                  className={cn(
                    "flex-1 px-4 py-3 text-sm font-medium transition-all duration-200 relative",
                    activeTab === id
                      ? "text-amber-700"
                      : "text-stone-500 hover:text-stone-700"
                  )}
                >
                  {label}
                  {activeTab === id && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Tab 内容 */}
          <div className="p-4">
            {activeTab === "ongoing" && (
              <div className="space-y-3">
                {ongoingList.length === 0 ? (
                  <EmptyState
                    icon={Mountain}
                    title={c.emptyOngoing}
                    desc={c.emptyOngoingDesc}
                  />
                ) : (
                  ongoingList.map((team) => <TeamCard key={team.id} team={team} />)
                )}
              </div>
            )}

            {activeTab === "history" && (
              <EmptyState
                icon={CheckCircle}
                title={c.emptyHistory}
                desc={c.emptyHistoryDesc}
              />
            )}
          </div>
        </div>

        {/* 基础信息 */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-stone-900 flex items-center gap-2 mb-4">
            <User className="h-5 w-5 text-stone-600" />
            基础信息
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl">
              <Mountain className="h-5 w-5 text-stone-400" />
              <div>
                <div className="text-sm text-stone-500">已完成徒步</div>
                <div className="font-medium text-stone-900">{user.completedHikes || 0} 次</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl">
              <Award className="h-5 w-5 text-stone-400" />
              <div>
                <div className="text-sm text-stone-500">户外等级</div>
                <div className="font-medium text-stone-900">{levelLabels[user.level] || user.level}</div>
              </div>
            </div>
          </div>
        </div>

        {/* 户外经验 */}
        {(extra.equipment?.length || extra.experience) && (
          <div className="bg-white border border-stone-200 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-stone-900 flex items-center gap-2 mb-4">
              <Tent className="h-5 w-5 text-stone-600" />
              户外经验
            </h2>

            <div className="space-y-4">
              {extra.equipment && extra.equipment.length > 0 && (
                <div>
                  <div className="text-sm text-stone-500 mb-2 flex items-center gap-1">
                    <Mountain className="h-3.5 w-3.5" />
                    装备清单
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {extra.equipment.map((item, i) => (
                      <span key={i} className="px-2.5 py-1 bg-stone-100 text-stone-700 rounded-full text-sm">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {extra.experience && (
                <div>
                  <div className="text-sm text-stone-500 mb-2 flex items-center gap-1">
                    <Award className="h-3.5 w-3.5" />
                    经验分享
                  </div>
                  <p className="text-sm text-stone-600 bg-stone-50 p-3 rounded-xl leading-relaxed">
                    {extra.experience}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <Footer />
    </main>
  );
}
