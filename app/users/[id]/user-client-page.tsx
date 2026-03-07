"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  User,
  Mountain,
  Award,
  Calendar,
  Users,
  Briefcase,
  CheckCircle,
  Tent,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { UserPublicProfile } from "@/lib/types";
import { leaderLevelLabels } from "@/lib/constants";
import { getGenderText, getAgeText } from "@/lib/user-utils";
import { parseUserExtra } from "@/lib/user-extra";
import { cn } from "@/lib/utils";
import { copy } from "@/lib/copy";

interface UserClientPageProps {
  user: UserPublicProfile;
}

const levelColors: Record<string, string> = {
  beginner: "bg-stone-100 text-stone-700",
  intermediate: "bg-blue-100 text-blue-700",
  advanced: "bg-purple-100 text-purple-700",
  expert: "bg-amber-100 text-amber-700",
};

function UserClientPage({ user }: UserClientPageProps) {
  const router = useRouter();
  const displayName = user.nickname || user.name;

  // 解析 extra 字段
  const extra = parseUserExtra(user.extra);

  // 计算年龄
  const age = user.birthday ? getAgeText(user.birthday) : null;

  // 格式化注册时间
  const joinDate = React.useMemo(() => {
    if (!user.createdAt) return null;
    const date = new Date(user.createdAt);
    return date.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "long",
    });
  }, [user.createdAt]);

  return (
    <div className="min-h-screen bg-stone-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 返回按钮 */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-6"
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="text-stone-600 hover:text-stone-900 -ml-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            {copy.common.back}
          </Button>
        </motion.div>

        {/* 用户头部信息 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-white border border-stone-200 rounded-xl p-6 mb-6"
        >
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* 头像 */}
            <Avatar className="h-24 w-24 border-4 border-stone-100">
              <AvatarImage src={user.image || undefined} />
              <AvatarFallback className="text-2xl bg-stone-200 text-stone-600">
                {user.name?.charAt(0) || "?"}
              </AvatarFallback>
            </Avatar>

            {/* 基本信息 */}
            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
                <h1 className="text-2xl font-bold text-stone-900">
                  {displayName}
                </h1>
                <Badge
                  className={cn("text-xs", levelColors[user.level])}
                >
                  {leaderLevelLabels[user.level]}
                </Badge>
              </div>

              {/* 性别年龄 */}
              {(user.gender || age) && (
                <div className="flex items-center justify-center sm:justify-start gap-2 mt-2 text-stone-500">
                  <User className="h-4 w-4" />
                  <span>
                    {getGenderText(user.gender)}
                    {user.gender && age && " · "}
                    {age}
                  </span>
                </div>
              )}

              {/* 注册时间 */}
              {joinDate && (
                <div className="flex items-center justify-center sm:justify-start gap-2 mt-1 text-sm text-stone-400">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{joinDate} 加入</span>
                </div>
              )}
            </div>
          </div>

          {/* 个人简介 */}
          {user.bio && (
            <div className="mt-6 pt-6 border-t border-stone-100">
              <p className="text-stone-600 leading-relaxed text-center sm:text-left">
                {user.bio}
              </p>
            </div>
          )}
        </motion.div>

        {/* 活动统计 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="grid grid-cols-3 gap-4 mb-6"
        >
          <Card className="border-stone-200">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 text-stone-400 mb-1">
                <Briefcase className="h-4 w-4" />
              </div>
              <div className="text-2xl font-bold text-stone-900">
                {user.stats.createdTeams}
              </div>
              <div className="text-xs text-stone-500">{copy.teams.createTeamBtn}</div>
            </CardContent>
          </Card>

          <Card className="border-stone-200">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 text-stone-400 mb-1">
                <Users className="h-4 w-4" />
              </div>
              <div className="text-2xl font-bold text-stone-900">
                {user.stats.joinedTeams}
              </div>
              <div className="text-xs text-stone-500">参加活动</div>
            </CardContent>
          </Card>

          <Card className="border-stone-200">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 text-stone-400 mb-1">
                <CheckCircle className="h-4 w-4" />
              </div>
              <div className="text-2xl font-bold text-stone-900">
                {user.stats.completedTeams}
              </div>
              <div className="text-xs text-stone-500">已完成</div>
            </CardContent>
          </Card>
        </motion.div>

        {/* 基础信息 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="bg-white border border-stone-200 rounded-xl p-6 mb-6"
        >
          <h2 className="text-lg font-semibold text-stone-900 flex items-center gap-2 mb-4">
            <User className="h-5 w-5 text-stone-600" />
            基础信息
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-lg">
              <Mountain className="h-5 w-5 text-stone-400" />
              <div>
                <div className="text-sm text-stone-500">已完成徒步</div>
                <div className="font-medium text-stone-900">
                  {user.completedHikes || 0} 次
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-lg">
              <Award className="h-5 w-5 text-stone-400" />
              <div>
                <div className="text-sm text-stone-500">户外等级</div>
                <div className="font-medium text-stone-900">
                  {leaderLevelLabels[user.level]}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* 户外经验 */}
        {(extra.equipment?.length > 0 || extra.experience) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="bg-white border border-stone-200 rounded-xl p-6"
          >
            <h2 className="text-lg font-semibold text-stone-900 flex items-center gap-2 mb-4">
              <Tent className="h-5 w-5 text-stone-600" />
              户外经验
            </h2>

            <div className="space-y-4">
              {/* 装备清单 */}
              {extra.equipment && extra.equipment.length > 0 && (
                <div>
                  <div className="text-sm text-stone-500 mb-2 flex items-center gap-1">
                    <Mountain className="h-3.5 w-3.5" />
                    装备清单
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {extra.equipment.map((item, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="bg-stone-100 text-stone-700"
                      >
                        {item}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* 经验描述 */}
              {extra.experience && (
                <div>
                  <div className="text-sm text-stone-500 mb-2 flex items-center gap-1">
                    <Award className="h-3.5 w-3.5" />
                    经验分享
                  </div>
                  <p className="text-sm text-stone-600 bg-stone-50 p-3 rounded-lg">
                    {extra.experience}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export { UserClientPage };
