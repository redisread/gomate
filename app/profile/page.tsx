"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
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
} from "lucide-react";

import { Navbar } from "@/app/components/layout/navbar";
import { Footer } from "@/app/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import { useTeams } from "@/lib/teams-context";
import { locations } from "@/lib/data/mock";

// 经验等级映射
const levelLabels: Record<string, { label: string; color: string; description: string }> = {
  beginner: { label: "初级", color: "bg-emerald-100 text-emerald-700", description: "刚开始徒步之旅" },
  intermediate: { label: "中级", color: "bg-blue-100 text-blue-700", description: "有一定徒步经验" },
  advanced: { label: "高级", color: "bg-purple-100 text-purple-700", description: "经验丰富的徒步者" },
  expert: { label: "资深", color: "bg-amber-100 text-amber-700", description: "资深户外专家" },
};

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const { teams } = useTeams();

  // 未登录重定向
  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || !user) {
    return (
      <main className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="animate-pulse text-stone-400">加载中...</div>
      </main>
    );
  }

  // 获取用户创建的队伍
  const createdTeams = teams.filter((t) => t.leader.id === user.id);

  // 获取用户加入的队伍（非自己创建的）
  const joinedTeams: typeof teams = []; // 暂时为空，需要后端支持

  const levelInfo = levelLabels[user.level] || levelLabels.beginner;

  return (
    <main className="min-h-screen bg-stone-50">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Button
            variant="ghost"
            className="mb-6 text-stone-600 hover:text-stone-900"
            asChild
          >
            <Link href="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回首页
            </Link>
          </Button>
        </motion.div>

        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <Card className="border-stone-200 overflow-hidden">
            {/* Cover Background */}
            <div className="h-32 bg-gradient-to-r from-stone-800 to-stone-600" />

            <CardContent className="relative px-6 pb-6">
              {/* Avatar */}
              <div className="absolute -top-16 left-6">
                <Avatar className="h-32 w-32 border-4 border-white shadow-lg">
                  <AvatarImage src={user.avatar} />
                  <AvatarFallback className="text-3xl bg-stone-200 text-stone-600">
                    {user.name[0]}
                  </AvatarFallback>
                </Avatar>
              </div>

              {/* User Info */}
              <div className="pt-20 sm:pt-4 sm:pl-40">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-bold text-stone-900">{user.name}</h1>
                    <p className="text-stone-500 flex items-center gap-2 mt-1">
                      <Mail className="h-4 w-4" />
                      {user.email}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/profile/edit">
                        <Edit3 className="h-4 w-4 mr-2" />
                        编辑资料
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={logout}>
                      <LogOut className="h-4 w-4 mr-2" />
                      退出
                    </Button>
                  </div>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-2 mt-4">
                  <Badge className={levelInfo.color}>
                    <Award className="h-3 w-3 mr-1" />
                    {levelInfo.label}徒步者
                  </Badge>
                  <Badge variant="secondary" className="bg-stone-100">
                    <Mountain className="h-3 w-3 mr-1" />
                    已完成 {user.completedHikes} 次徒步
                  </Badge>
                </div>

                {/* Bio */}
                {user.bio && (
                  <p className="mt-4 text-stone-600 leading-relaxed">
                    {user.bio}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8"
        >
          <Link href="/my-teams?tab=created">
            <Card className="border-stone-200 hover:shadow-md hover:border-stone-300 transition-all cursor-pointer group">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-stone-500 group-hover:text-stone-700">我创建的队伍</p>
                    <p className="text-3xl font-bold text-stone-900 mt-1">{createdTeams.length}</p>
                  </div>
                  <div className="h-12 w-12 bg-stone-100 rounded-full flex items-center justify-center group-hover:bg-stone-200 transition-colors">
                    <Users className="h-6 w-6 text-stone-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/my-teams?tab=joined">
            <Card className="border-stone-200 hover:shadow-md hover:border-stone-300 transition-all cursor-pointer group">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-stone-500 group-hover:text-stone-700">我加入的队伍</p>
                    <p className="text-3xl font-bold text-stone-900 mt-1">{joinedTeams.length}</p>
                  </div>
                  <div className="h-12 w-12 bg-stone-100 rounded-full flex items-center justify-center group-hover:bg-stone-200 transition-colors">
                    <User className="h-6 w-6 text-stone-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Card className="border-stone-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-stone-500">注册时间</p>
                  <p className="text-lg font-bold text-stone-900 mt-1">
                    {new Date(user.createdAt).toLocaleDateString("zh-CN")}
                  </p>
                </div>
                <div className="h-12 w-12 bg-stone-100 rounded-full flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-stone-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* My Teams Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-stone-900">最近创建的队伍</h2>
              <p className="text-sm text-stone-500 mt-1">你作为领队创建的队伍</p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/my-teams">
                查看全部
              </Link>
            </Button>
          </div>

          {createdTeams.length === 0 && joinedTeams.length === 0 ? (
            <Card className="border-dashed border-stone-300 bg-stone-50/50">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-stone-400" />
                </div>
                <h3 className="text-lg font-medium text-stone-900 mb-2">
                  还没有队伍
                </h3>
                <p className="text-sm text-stone-500 mb-4">
                  创建或加入一个队伍，开始你的户外之旅
                </p>
                <Button className="bg-stone-900 hover:bg-stone-800" asChild>
                  <Link href="/teams/create">创建队伍</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Created Teams */}
              {createdTeams.slice(0, 3).map((team) => {
                const location = locations.find((l) => l.id === team.locationId);
                return (
                  <Link key={team.id} href={`/teams/${team.id}`}>
                    <Card className="border-stone-200 hover:shadow-md transition-all cursor-pointer mb-4">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div
                            className="w-16 h-16 rounded-lg bg-cover bg-center flex-shrink-0"
                            style={{ backgroundImage: `url(${location?.coverImage})` }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-stone-900 truncate">
                                {team.title}
                              </h3>
                              <Badge variant="secondary" className="text-xs">
                                队长
                              </Badge>
                            </div>
                            <p className="text-sm text-stone-500 mt-1">
                              {location?.name} · {team.date} · {team.currentMembers}/{team.maxMembers}人
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>

      <Footer />
    </main>
  );
}
