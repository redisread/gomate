import * as React from "react";
import {
  ArrowLeft, User, Mountain, Award, Calendar, Users,
  Briefcase, CheckCircle,
} from "lucide-react";
import type { UserPublicProfile } from "@gomate/types";
import { fetchAPI } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useI18n } from "@/hooks/useI18n";
import { formatJoinDate } from "@/lib/date-utils";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { LEVEL_CONFIG, StatCard, ProfileSkeleton } from "@/components/shared/profile-shared";

interface UserDetailClientProps {
  userId: string;
}

/**
 * 用户详情页客户端组件 - React Island
 */
export function UserDetailClient({ userId }: UserDetailClientProps) {
  const { t } = useI18n(["userDetail", "profile", "common", "enums", "errors"]);
  const [user, setUser] = React.useState<UserPublicProfile | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setIsLoading(true);
    fetchAPI(`/users/${userId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.user) {
          setUser(data.user);
        } else {
          setError(t("errors.userNotFound"));
        }
      })
      .catch(() => setError(t("errors.loadFailed")))
      .finally(() => setIsLoading(false));
  }, [userId, t]);

  if (isLoading) {
    return (
      <main className="min-h-screen bg-stone-50 dark:bg-stone-900">
        <Navbar />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-8">
          <ProfileSkeleton variant="amber" />
        </div>
      </main>
    );
  }

  if (error || !user) {
    return (
      <main className="min-h-screen bg-stone-50 dark:bg-stone-900">
        <Navbar />
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100 mb-2">{error || t("errors.userNotFound")}</h1>
            <button
              onClick={() => window.history.back()}
              className="text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 underline text-sm"
            >
              {t("common.back")}
            </button>
          </div>
        </div>
        <Footer />
      </main>
    );
  }

  const displayName = user.nickname || user.name;
  const levelConfig = LEVEL_CONFIG[user.extra.level] || LEVEL_CONFIG.beginner;

  const joinDate = user.createdAt ? formatJoinDate(user.createdAt) : null;

  const levelLabel = t(`enums.level.${user.extra.level}` as string) ?? t("enums.level.beginner");

  return (
    <main className="min-h-screen bg-stone-50 dark:bg-stone-900">
      <Navbar />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">

        {/* 返回按钮 */}
        <div className="mb-4">
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 transition-colors text-sm"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            {t("common.back")}
          </button>
        </div>

        {/* 用户信息卡 */}
        <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-100 dark:border-stone-800 overflow-hidden mb-6 shadow-sm">
          {/* Banner — 多层渐变 + SVG 山脉 */}
          <div
            className="relative h-40 overflow-hidden"
            style={{
              background: "linear-gradient(135deg, oklch(0.414 0.105 45.9) 0%, var(--accent-foreground) 30%, var(--primary) 65%, oklch(0.739 0.098 179.3) 90%, oklch(0.822 0.075 181.8) 100%)",
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
                <div className="h-32 w-32 rounded-full ring-4 ring-white dark:ring-stone-900 shadow-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center overflow-hidden">
                  {user.image ? (
                    <img src={user.image} alt={displayName} className="w-full h-full object-cover outline outline-1 -outline-offset-1 outline-[oklch(0_0_0_/_0.1)] dark:outline-[oklch(1_0_0_/_0.1)]" />
                  ) : (
                    <span className="text-4xl font-bold text-white" style={{ textShadow: "0 2px 8px color-mix(in oklab, black 20%, transparent)" }}>
                      {displayName?.[0]?.toUpperCase()}
                    </span>
                  )}
                </div>
                {/* 等级装饰点 */}
                <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center text-base shadow-md ring-2 ring-white dark:ring-stone-900 bg-white dark:bg-stone-900">
                  {levelConfig.emoji}
                </div>
              </div>
            </div>

            {/* 用户信息 */}
            <div className="pt-20 sm:pt-6 sm:pl-40">
              <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">{displayName}</h1>

              {/* 徽章行 */}
              <div className="flex flex-wrap gap-2 mt-3">
                {/* 等级徽章 */}
                <span className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold",
                  levelConfig.badge
                )}>
                  <span>{levelConfig.emoji}</span>
                  {levelLabel}
                </span>

                {/* 加入时间 */}
                {joinDate && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-stone-50 dark:bg-stone-800 text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-stone-700">
                    <Calendar className="h-3 w-3" />
                    {joinDate} {t("userDetail.joinDateSuffix")}
                  </span>
                )}
              </div>

              {/* 个人简介 */}
              {user.bio && (
                <p className="mt-4 text-stone-500 dark:text-stone-400 text-sm leading-relaxed border-t border-stone-100 dark:border-stone-800 pt-4">
                  {user.bio}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* 活动统计 */}
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          <StatCard
            label={t("profile.statsCreatedTeams")}
            value={user.stats.createdTeams}
            icon={Briefcase}
            accent
          />
          <StatCard
            label={t("profile.statsJoinedTeams")}
            value={user.stats.joinedTeams}
            icon={Users}
            accent
          />
          <StatCard
            label={t("profile.statsCompletedTeams")}
            value={user.stats.completedTeams}
            icon={CheckCircle}
          />
        </div>

        {/* 基础信息 */}
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-2 mb-4">
            <User className="h-5 w-5 text-stone-600 dark:text-stone-400" />
            {t("profile.sectionBasicInfoTitle")}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 bg-stone-50 dark:bg-stone-800 rounded-xl">
              <Mountain className="h-5 w-5 text-stone-400 dark:text-stone-500" />
              <div>
                <div className="text-sm text-stone-500 dark:text-stone-400">{t("profile.hikesCompleted")}</div>
                <div className="font-medium text-stone-900 dark:text-stone-100">{user.extra.completedHikes} {t("userDetail.timesSuffix")}</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-stone-50 dark:bg-stone-800 rounded-xl">
              <Award className="h-5 w-5 text-stone-400 dark:text-stone-500" />
              <div>
                <div className="text-sm text-stone-500 dark:text-stone-400">{t("profile.levelLabel")}</div>
                <div className="font-medium text-stone-900 dark:text-stone-100">{levelLabel}</div>
              </div>
            </div>
          </div>
        </div>

      </div>

      <Footer />
    </main>
  );
}
