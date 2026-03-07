"use client";

import * as React from "react";
import Link from "next/link";
import { Users, Calendar, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { Team, UserLevel } from "@/lib/types";

interface CompactTeamCardProps {
  team: Team;
  className?: string;
}

// 获取等级标签颜色
function getLevelColor(level: UserLevel): string {
  const colorMap: Record<string, string> = {
    beginner: "bg-green-100 text-green-700 border-green-200",
    intermediate: "bg-blue-100 text-blue-700 border-blue-200",
    advanced: "bg-purple-100 text-purple-700 border-purple-200",
    expert: "bg-orange-100 text-orange-700 border-orange-200",
  };
  return colorMap[level] || "bg-stone-100 text-stone-700 border-stone-200";
}

// 获取等级标签文本
function getLevelText(level: UserLevel): string {
  const levelMap: Record<string, string> = {
    beginner: "新手",
    intermediate: "进阶",
    advanced: "资深",
    expert: "专家",
  };
  return levelMap[level] || "新手";
}

// 获取状态标签文本
function getStatusText(
  status: string,
  currentMembers: number,
  maxMembers: number
): string {
  if (status === "recruiting") {
    return currentMembers >= maxMembers ? "已满" : "招募中";
  }
  if (status === "full") return "已满";
  if (status === "formed") return "已组建";
  if (status === "completed") return "已完成";
  if (status === "cancelled") return "已取消";
  return "已关闭";
}

// 获取状态标签颜色
function getStatusColor(
  status: string,
  currentMembers: number,
  maxMembers: number
): string {
  if (status === "recruiting" && currentMembers < maxMembers) {
    return "bg-emerald-100 text-emerald-700 border-emerald-200";
  }
  return "bg-stone-100 text-stone-600 border-stone-200";
}

// 格式化日期（MM月DD日）
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}月${day}日`;
}

export function CompactTeamCard({ team, className }: CompactTeamCardProps) {
  const remainingSlots = team.maxMembers - team.currentMembers;
  const statusText = getStatusText(
    team.status,
    team.currentMembers,
    team.maxMembers
  );
  const statusColor = getStatusColor(
    team.status,
    team.currentMembers,
    team.maxMembers
  );

  return (
    <Link href={`/teams/${team.id}`}>
      <Card
        className={cn(
          "hover:shadow-md transition-shadow cursor-pointer border-l-4",
          team.status === "recruiting" && remainingSlots > 0
            ? "border-l-emerald-500"
            : "border-l-gray-300",
          className
        )}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            {/* 左侧：队长头像 */}
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarImage src={team.leader.avatar} alt={team.leader.name} />
              <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-sm">
                {team.leader.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            {/* 中间：队伍信息 */}
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm line-clamp-1" title={team.title}>
                {team.title}
              </h4>

              <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatDate(team.date)}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {team.time}
                </span>
              </div>

              <div className="flex items-center gap-2 mt-2">
                {/* 状态标签 */}
                <Badge
                  variant="outline"
                  className={cn("text-xs px-1.5 py-0 h-5", statusColor)}
                >
                  {statusText}
                </Badge>

                {/* 人数 */}
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {team.currentMembers}/{team.maxMembers}
                </span>

                {/* 队长等级 */}
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs px-1.5 py-0 h-5",
                    getLevelColor(team.leader.level)
                  )}
                >
                  {getLevelText(team.leader.level)}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

// 紧凑队伍列表组件
interface CompactTeamListProps {
  teams: Team[];
  maxDisplay?: number;
  className?: string;
}

export function CompactTeamList({
  teams,
  maxDisplay = 5,
  className,
}: CompactTeamListProps) {
  const displayTeams = teams.slice(0, maxDisplay);
  const remainingCount = teams.length - maxDisplay;

  if (teams.length === 0) {
    return (
      <div className="text-center py-6 border rounded-lg bg-muted/30">
        <p className="text-sm text-muted-foreground">暂无活跃队伍</p>
        <p className="text-xs text-muted-foreground mt-1">
          成为第一个创建队伍的人吧
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {displayTeams.map((team) => (
        <CompactTeamCard key={team.id} team={team} />
      ))}

      {remainingCount > 0 && (
        <Link href={`/teams?routeId=${teams[0]?.routeId || ""}`}>
          <div className="text-center py-3 border rounded-lg border-dashed hover:bg-muted/30 transition-colors cursor-pointer">
            <p className="text-sm text-muted-foreground">
              还有 {remainingCount} 个队伍
            </p>
            <p className="text-xs text-primary mt-0.5">查看全部 →</p>
          </div>
        </Link>
      )}
    </div>
  );
}
