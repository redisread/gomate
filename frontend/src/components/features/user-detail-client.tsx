"use client";

import * as React from "react";
import {
  ArrowLeft, User, Mountain, Award, Calendar, Users,
  Briefcase, CheckCircle, Tent,
} from "lucide-react";
import { fetchAPI } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

// 等级标签
const levelLabels: Record<string, string> = {
  beginner: "新手",
  intermediate: "进阶",
  advanced: "高级",
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
  birthday?: string | null;
  completedHikes?: number;
  createdAt?: string;
  extra?: string | null;
  stats: {
    createdTeams: number;
    joinedTeams: number;
    completedTeams: number;
  };
}

interface UserDetailClientProps {
  userId: string;
}

function parseExtra(extra: string | null | undefined): { equipment?: string[]; experience?: string } {
  if (!extra) return {};
  try {
    return JSON.parse(extra);
  } catch {
    return {};
  }
}

function getGenderText(gender?: string | null): string {
  if (gender === "male") return "男";
  if (gender === "female") return "女";
  return "";
}

function getAgeText(birthday?: string | null): string {
  if (!birthday) return "";
  const birth = new Date(birthday);
  const now = new Date();
  const age = now.getFullYear() - birth.getFullYear();
  return `${age}岁`;
}

/**
 * 用户详情页客户端组件 - React Island
 */
export function UserDetailClient({ userId }: UserDetailClientProps) {
  const [user, setUser] = React.useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setIsLoading(true);
    fetchAPI(`/api/users/${userId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.user) {
          setUser(data.user);
        } else {
          setError("用户不存在");
        }
      })
      .catch(() => setError("加载失败，请稍后重试"))
      .finally(() => setIsLoading(false));
  }, [userId]);

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
  const age = getAgeText(user.birthday);
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
            <div className="text-xs text-stone-500">发起队伍</div>
          </div>

          <div className="bg-white border border-stone-200 rounded-2xl p-4 text-center">
            <div className="flex items-center justify-center mb-1">
              <Users className="h-4 w-4 text-stone-400" />
            </div>
            <div className="text-2xl font-bold text-stone-900">{user.stats.joinedTeams}</div>
            <div className="text-xs text-stone-500">参加活动</div>
          </div>

          <div className="bg-white border border-stone-200 rounded-2xl p-4 text-center">
            <div className="flex items-center justify-center mb-1">
              <CheckCircle className="h-4 w-4 text-stone-400" />
            </div>
            <div className="text-2xl font-bold text-stone-900">{user.stats.completedTeams}</div>
            <div className="text-xs text-stone-500">已完成</div>
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
