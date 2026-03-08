"use client";

import * as React from "react";
import Link from "next/link";
import { Users, Calendar, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { Team } from "@/lib/types";
import {
  getLevelText,
  getLevelColor,
  getStatusText,
  getStatusColor,
  formatTeamDate,
} from "@/lib/team-display";
import { getUserDisplayName } from "@/lib/user-utils";

interface CompactTeamCardProps {
  team: Team;
  className?: string;
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
              <AvatarImage src={team.leader.avatar} alt={getUserDisplayName(team.leader)} />
              <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-sm">
                {getUserDisplayName(team.leader).charAt(0).toUpperCase()}
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
                  {formatTeamDate(team.date)}
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
