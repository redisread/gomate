import * as React from "react";
import {
  ArrowLeft, User, Mountain, Award, Calendar, Users,
  Briefcase, CheckCircle, Tent,
} from "lucide-react";
import { fetchAPI } from "@/lib/api";
import { cn } from "@/lib/utils";
import { copy } from "@/lib/copy";
import { formatJoinDate } from "@/lib/date-utils";
import { getAgeFromBirthday } from "@/lib/user-utils";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { LEVEL_CONFIG, StatCard, ProfileSkeleton } from "@/components/shared/profile-shared";

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
  if (gender === "male") return copy.enums.gender.male;
  if (gender === "female") return copy.enums.gender.female;
  return "";
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
          setError(copy.errors.userNotFound);
        }
      })
      .catch(() => setError(copy.errors.loadFailed))
      .finally(() => setIsLoading(false));
  }, [userId]);

  if (isLoading) {
    return (
      <main className="min-h-screen bg-stone-50">
        <Navbar />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-8">
          <ProfileSkeleton variant="amber" />
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
            <h1 className="text-2xl font-bold text-stone-900 mb-2">{error || copy.errors.userNotFound}</h1>
            <button
              onClick={() => window.history.back()}
              className="text-stone-600 hover:text-stone-900 underline text-sm"
            >
              {copy.common.back}
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
  const levelConfig = LEVEL_CONFIG[user.level] || LEVEL_CONFIG.beginner;

  const joinDate = user.createdAt ? formatJoinDate(user.createdAt) : null;

  return (
    <main className="min-h-screen bg-stone-50">
      <Navbar />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">

        {/* 返回按钮 */}
        <div className="mb-4">
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center text-stone-500 hover:text-stone-900 transition-colors text-sm"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            {copy.common.back}
          </button>
        </div>

        {/* 用户信息卡 */}
        <div className="bg-white rounded-3xl border border-stone-100 overflow-hidden mb-6 shadow-sm">
          {/* Banner — 多层渐变 + SVG 山脉 */}
          <div
            className="relative h-40 overflow-hidden"
            style={{
              background: "linear-gradient(135deg, #78350F 0%, #92400E 30%, #D97706 65%, #5bbfac 90%, #8dd5c8 100%)",
            }}
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
            <div className="absolute -bottom-10 left-1/4 w-48 h-48 bg-amber-300/10 rounded-full blur-2xl" />
            <div className="absolute inset-0 opacity-[0.06]" style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
              backgroundSize: "24px 24px",
            }} />
            <svg
              className="absolute bottom-0 left-0 right-0 w-full"
              viewBox="0 0 1200 80"
              fill="none"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path d="M0 80L150 45L300 62L450 30L600 55L750 25L900 48L1050 18L1200 40V80H0Z" fill="white" fillOpacity="0.06" />
              <path d="M0 80L200 52L400 68L600 38L800 58L1000 32L1200 52V80H0Z" fill="white" fillOpacity="0.10" />
              <path d="M0 80L250 60L500 72L750 50L1000 65L1200 55V80H0Z" fill="white" fillOpacity="0.18" />
            </svg>
          </div>

          <div className="relative px-6 pb-7">
            {/* 头像 */}
            <div className="absolute -top-16 left-6">
              <div className="relative">
                <div className="h-32 w-32 rounded-full ring-4 ring-white shadow-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center overflow-hidden">
                  {user.avatar ? (
                    <img src={user.avatar} alt={displayName} className="w-full h-full object-cover" />
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
              <h1 className="text-2xl font-bold text-stone-900">{displayName}</h1>

              {/* 徽章行 */}
              <div className="flex flex-wrap gap-2 mt-3">
                {/* 等级徽章 */}
                <span className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold",
                  levelConfig.badge
                )}>
                  <span>{levelConfig.emoji}</span>
                  {copy.enums.level[user.level as keyof typeof copy.enums.level] ?? copy.enums.level.beginner}
                </span>

                {/* 性别 */}
                {genderText && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-stone-50 text-stone-600 border border-stone-200">
                    {user.gender === "male" ? "♂ " : "♀ "}{genderText}
                  </span>
                )}

                {/* 年龄 */}
                {age && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-stone-50 text-stone-600 border border-stone-200">
                    {age}
                  </span>
                )}

                {/* 加入时间 */}
                {joinDate && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-stone-50 text-stone-600 border border-stone-200">
                    <Calendar className="h-3 w-3" />
                    {joinDate} 加入
                  </span>
                )}
              </div>

              {/* 个人简介 */}
              {user.bio && (
                <p className="mt-4 text-stone-500 text-sm leading-relaxed border-t border-stone-100 pt-4">
                  {user.bio}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* 活动统计 */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <StatCard
            label={copy.profile.statsCreatedTeams}
            value={user.stats.createdTeams}
            icon={Briefcase}
            accent
          />
          <StatCard
            label={copy.profile.statsJoinedTeams}
            value={user.stats.joinedTeams}
            icon={Users}
            accent
          />
          <StatCard
            label={copy.profile.statsCompletedTeams}
            value={user.stats.completedTeams}
            icon={CheckCircle}
          />
        </div>

        {/* 基础信息 */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-stone-900 flex items-center gap-2 mb-4">
            <User className="h-5 w-5 text-stone-600" />
            {copy.profile.sectionBasicInfoTitle}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl">
              <Mountain className="h-5 w-5 text-stone-400" />
              <div>
                <div className="text-sm text-stone-500">{copy.profile.hikesCompleted}</div>
                <div className="font-medium text-stone-900">{user.completedHikes || 0} 次</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl">
              <Award className="h-5 w-5 text-stone-400" />
              <div>
                <div className="text-sm text-stone-500">{copy.profile.levelLabel}</div>
                <div className="font-medium text-stone-900">{copy.enums.level[user.level as keyof typeof copy.enums.level] ?? copy.enums.level.beginner}</div>
              </div>
            </div>
          </div>
        </div>

        {/* 户外经验 */}
        {(extra.equipment?.length || extra.experience) && (
          <div className="bg-white border border-stone-200 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-stone-900 flex items-center gap-2 mb-4">
              <Tent className="h-5 w-5 text-stone-600" />
              {copy.profile.sectionOutdoorInfoTitle}
            </h2>

            <div className="space-y-4">
              {extra.equipment && extra.equipment.length > 0 && (
                <div>
                  <div className="text-sm text-stone-500 mb-2 flex items-center gap-1">
                    <Mountain className="h-3.5 w-3.5" />
                    {copy.profile.equipmentLabel}
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
                    {copy.profile.experienceShareLabel}
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
