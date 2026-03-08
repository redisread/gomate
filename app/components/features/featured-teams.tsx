"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Users, Calendar, TrendingUp } from "lucide-react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTeams } from "@/lib/teams-context";
import { cn } from "@/lib/utils";
import {
  getLevelText,
  getLevelColor,
  getStatusText,
  getStatusColor,
  formatTeamDate,
} from "@/lib/team-display";
import { getUserDisplayName } from "@/lib/user-utils";

interface FeaturedTeamsProps {
  routeId: string;
  limit?: number;
  className?: string;
}

export function FeaturedTeams({ routeId, limit = 3, className }: FeaturedTeamsProps) {
  const { getTeamsByRouteId } = useTeams();

  // 获取该路线的热门队伍
  const featuredTeams = React.useMemo(() => {
    return getTeamsByRouteId(routeId)
      .filter(team => {
        // 筛选条件：状态为 recruiting，且未过期
        const isOpen = team.status === 'recruiting';
        const isFuture = new Date(`${team.date}T${team.time}`) > new Date();
        return isOpen && isFuture;
      })
      .sort((a, b) => {
        // 按开始时间升序排序（最近出发的优先）
        const dateA = new Date(`${a.date}T${a.time}`).getTime();
        const dateB = new Date(`${b.date}T${b.time}`).getTime();
        return dateA - dateB;
      })
      .slice(0, limit);
  }, [routeId, limit, getTeamsByRouteId]);

  // 如果没有队伍，不显示该模块
  if (featuredTeams.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.5 }}
      className={cn("space-y-6", className)}
    >
      <Card className="border-stone-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-stone-900 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-emerald-600" />
            热门队伍精选
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {featuredTeams.map((team, index) => (
            <motion.div
              key={team.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.6 + index * 0.1 }}
            >
              <Link href={`/teams/${team.id}`}>
                <div className="flex flex-col gap-3 p-4 rounded-xl border border-stone-200 hover:border-emerald-300 hover:bg-emerald-50/30 transition-all group">
                  {/* 队长信息 */}
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full bg-cover bg-center flex-shrink-0"
                      style={{
                        backgroundImage: team.leader.avatar
                          ? `url(${team.leader.avatar})`
                          : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                      }}
                    >
                      {!team.leader.avatar && (
                        <div className="w-full h-full flex items-center justify-center text-white font-semibold text-sm">
                          {getUserDisplayName(team.leader).charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-stone-900 truncate">
                          {getUserDisplayName(team.leader)}
                        </span>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs px-1.5 py-0",
                            getLevelColor(team.leader.level)
                          )}
                        >
                          {getLevelText(team.leader.level)}
                        </Badge>
                      </div>
                      <p className="text-xs text-stone-500 truncate">
                        {team.title}
                      </p>
                    </div>
                  </div>

                  {/* 队伍信息 */}
                  <div className="flex items-center gap-4 text-sm text-stone-600">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4 text-stone-400" />
                      <span>{formatTeamDate(team.date, team.time)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="h-4 w-4 text-stone-400" />
                      <span>
                        {team.currentMembers}/{team.maxMembers}人
                      </span>
                    </div>
                  </div>

                  {/* 状态标签和按钮 */}
                  <div className="flex items-center justify-between">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs px-2 py-0.5",
                        getStatusColor(team.status, team.currentMembers, team.maxMembers)
                      )}
                    >
                      {getStatusText(team.status, team.currentMembers, team.maxMembers)}
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 group-hover:bg-emerald-100"
                    >
                      查看详情 →
                    </Button>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </CardContent>
      </Card>
    </motion.div>
  );
}
