"use client";

import * as React from "react";
import Link from "next/link";
import { Users, Calendar, Clock, Route } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  getLevelText,
  getLevelColor,
  getStatusText,
  getStatusColor,
  formatTeamDate,
} from "@/lib/team-display";
import { getUserDisplayName } from "@/lib/user-utils";

interface Team {
  id: string;
  locationId?: string;
  routeId?: string;
  title: string;
  description?: string;
  date: string;
  time: string;
  duration: string;
  maxMembers: number;
  currentMembers: number;
  requirements: string[];
  status: "recruiting" | "full" | "formed" | "cancelled" | "completed";
  leader: {
    id: string;
    name: string;
    nickname?: string | null;
    avatar?: string;
    level: "beginner" | "intermediate" | "advanced" | "expert";
    completedHikes?: number;
  };
  route?: {
    name: string;
    difficulty?: string;
  };
}

interface TeamCardProps {
  team: Team;
  className?: string;
  showLocation?: boolean;
}

export function TeamCard({ team, className, showLocation = false }: TeamCardProps) {
  const remainingSlots = team.maxMembers - team.currentMembers;
  const statusText = getStatusText(team.status, team.currentMembers, team.maxMembers);
  const statusColor = getStatusColor(team.status, team.currentMembers, team.maxMembers);

  return (
    <Card className={cn("hover:shadow-lg transition-shadow", className)}>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg line-clamp-2">
              <Link href={`/teams/${team.id}`} className="hover:text-primary transition-colors">
                {team.title}
              </Link>
            </CardTitle>
          </div>
          <Badge variant="outline" className={cn("text-xs shrink-0", statusColor)}>
            {statusText}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 队长信息 */}
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={team.leader.avatar} alt={getUserDisplayName(team.leader)} />
            <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
              {getUserDisplayName(team.leader).charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm truncate">{getUserDisplayName(team.leader)}</span>
              <Badge variant="outline" className={cn("text-xs px-1.5 py-0", getLevelColor(team.leader.level))}>
                {getLevelText(team.leader.level)}
              </Badge>
            </div>
            {team.leader.completedHikes !== undefined && team.leader.completedHikes > 0 && (
              <span className="text-xs text-muted-foreground">
                完成 {team.leader.completedHikes} 次徒步
              </span>
            )}
          </div>
        </div>

        {/* 活动信息 */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4 shrink-0" />
            <span>{formatTeamDate(team.date, team.time)}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4 shrink-0" />
            <span>{team.duration}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-4 w-4 shrink-0" />
            <span>
              {team.currentMembers}/{team.maxMembers} 人
              {remainingSlots > 0 && ` · 还差 ${remainingSlots} 人`}
            </span>
          </div>
          {/* 路线信息 */}
          {team.routeId ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Route className="h-4 w-4 shrink-0" />
              <span className="truncate">{team.route?.name || "已选路线"}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Route className="h-4 w-4 shrink-0 text-amber-500" />
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                自由组队
              </span>
            </div>
          )}
        </div>

        {/* 描述 */}
        {team.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{team.description}</p>
        )}

        {/* 要求标签 */}
        {team.requirements && team.requirements.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {team.requirements.slice(0, 3).map((req, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {req}
              </Badge>
            ))}
            {team.requirements.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{team.requirements.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* 操作按钮 */}
        <Button className="w-full" variant={team.status === "recruiting" && remainingSlots > 0 ? "default" : "outline"} asChild>
          <Link href={`/teams/${team.id}`}>
            {team.status === "recruiting" && remainingSlots > 0 ? "加入队伍" : "查看详情"}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
