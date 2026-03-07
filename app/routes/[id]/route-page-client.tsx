"use client";

import { Route } from "@/lib/types";
import { RouteInfoCard } from "@/app/components/features/route-info-card";
import { CompactTeamList } from "@/app/components/features/compact-team-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Users, MapPin, Clock, TrendingUp, Navigation, CheckCircle, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useTeams } from "@/lib/teams-context";
import { motion } from "framer-motion";

// 扩展 Route 类型以包含 POI
interface RouteWithPois extends Route {
  pois?: Array<{
    id: string;
    name: string;
    description?: string | null;
    category?: string | null;
    coordinates: { lat: number; lng: number };
    images?: string[];
    extra?: Record<string, any> | null;
    order?: number | null;
    roleType: "waypoint" | "checkpoint" | "viewpoint" | "facility" | "poi";
    roleSpecificData?: Record<string, any> | null;
  }>;
}

// 用户在路线中的队伍
interface UserTeamInRoute {
  id: string;
  title: string;
  status: string;
  startTime: Date;
  locationId: string;
  locationName: string;
  joinedAt: Date;
}

interface RoutePageClientProps {
  route: RouteWithPois;
  userTeamsInRoute?: UserTeamInRoute[];
}

// 队伍状态映射
const teamStatusConfig: Record<string, { label: string; color: string }> = {
  recruiting: { label: "招募中", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" },
  full: { label: "已满员", color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300" },
  ongoing: { label: "进行中", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300" },
  completed: { label: "已完成", color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300" },
  cancelled: { label: "已取消", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300" },
};

// 格式化日期
function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const difficultyConfig = {
  easy: { label: "简单", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300", icon: "🟢" },
  moderate: { label: "中等", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300", icon: "🔵" },
  hard: { label: "困难", color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300", icon: "🟠" },
  expert: { label: "专家", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300", icon: "🔴" },
};

export function RoutePageClient({ route, userTeamsInRoute = [] }: RoutePageClientProps) {
  const { teams } = useTeams();
  const routeTeams = teams.filter(
    (team) => team.routeId === route.id && team.status === "recruiting"
  );

  const difficulty = difficultyConfig[route.difficulty];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href={`/locations/${route.locationId}`}>
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold">{route.name}</h1>
            </div>
          </div>

          {route.description && (
            <p className="text-muted-foreground max-w-3xl">{route.description}</p>
          )}
        </div>
      </div>

      {/* Content - 单栏居中布局 */}
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="space-y-6">
          {/* 路线概览卡片 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="rounded-lg border bg-card overflow-hidden"
          >
            {/* 概览头部 */}
            <div className="p-6 border-b bg-gradient-to-r from-primary/5 to-transparent">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{difficulty.icon}</span>
                  <div>
                    <h2 className="text-xl font-semibold">路线概览</h2>
                    <Badge className={difficulty.color}>{difficulty.label}</Badge>
                  </div>
                </div>
                {route.location && (
                  <Link
                    href={`/locations/${route.locationId}`}
                    className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
                  >
                    <MapPin className="h-4 w-4" />
                    {route.location.name}
                  </Link>
                )}
              </div>
            </div>

            {/* 核心数据 */}
            <div className="p-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <Clock className="h-5 w-5 mx-auto mb-2 text-primary" />
                  <div className="text-2xl font-bold">{route.duration}</div>
                  <div className="text-xs text-muted-foreground">预计用时</div>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <Navigation className="h-5 w-5 mx-auto mb-2 text-primary" />
                  <div className="text-2xl font-bold">{route.distance}</div>
                  <div className="text-xs text-muted-foreground">路线长度</div>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <TrendingUp className="h-5 w-5 mx-auto mb-2 text-primary" />
                  <div className="text-2xl font-bold">{route.elevation || "-"}</div>
                  <div className="text-xs text-muted-foreground">累计爬升</div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* 路线详细信息卡片 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <RouteInfoCard route={route} />
          </motion.div>

          {/* 我已参加的队伍卡片 */}
          {userTeamsInRoute.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.25 }}
              className="rounded-lg border bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <h2 className="text-lg font-semibold">我已参加的队伍</h2>
              </div>
              <div className="space-y-3">
                {userTeamsInRoute.map((team) => {
                  const statusConfig = teamStatusConfig[team.status] || { label: team.status, color: "bg-gray-100 text-gray-800" };
                  return (
                    <Link key={team.id} href={`/teams/${team.id}`}>
                      <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg hover:shadow-md transition-shadow cursor-pointer">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{team.title}</div>
                          <div className="text-sm text-muted-foreground">
                            {formatDate(team.startTime)} 出发
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-2">
                          <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* 活跃队伍卡片 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="rounded-lg border bg-card p-6"
          >
            {/* 头部和创建按钮 */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">活跃队伍</h2>
                <span className="text-muted-foreground text-sm">
                  ({routeTeams.length})
                </span>
              </div>
              <Button size="sm" asChild>
                <Link href={`/teams/create?routeId=${route.id}`}>
                  <Users className="h-4 w-4 mr-1" />
                  创建队伍
                </Link>
              </Button>
            </div>

            {/* 队伍列表 */}
            <CompactTeamList teams={routeTeams} maxDisplay={5} />
          </motion.div>
        </div>
      </div>
    </div>
  );
}
