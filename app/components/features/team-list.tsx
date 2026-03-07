"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Calendar,
  Clock,
  Users,
  ChevronRight,
  Plus,
  Route,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { leaderLevelLabels } from "@/lib/constants";
import { useTeams } from "@/lib/teams-context";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

interface TeamListProps {
  className?: string;
  locationId?: string;
  routeId?: string;
}

function TeamList({ className, locationId, routeId }: TeamListProps) {
  const { getTeamsByLocationId, getTeamsByRouteId } = useTeams();
  const { isAuthenticated } = useAuth();
  const [showUnboundOnly, setShowUnboundOnly] = React.useState(false);

  // 根据 routeId 或 locationId 获取队伍列表
  let teams = [];
  if (routeId) {
    teams = getTeamsByRouteId(routeId);
  } else if (locationId) {
    teams = getTeamsByLocationId(locationId);
  }

  // 筛选未绑定路线的队伍
  if (showUnboundOnly) {
    teams = teams.filter((t) => !t.routeId);
  }

  const openTeams = teams.filter((t) => t.status === "recruiting");
  const fullTeams = teams.filter((t) => t.status === "full");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className={cn("space-y-6", className)}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-stone-900">可加入的队伍</h2>
          <p className="text-sm text-stone-500 mt-1">
            共有 {openTeams.length} 个队伍正在招募
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* 仅看未绑定路线的队伍筛选开关 */}
          {!routeId && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-stone-100 rounded-full">
              <Route className="h-3.5 w-3.5 text-stone-500" />
              <span className="text-sm text-stone-600">仅未绑定路线</span>
              <Switch
                checked={showUnboundOnly}
                onCheckedChange={setShowUnboundOnly}
                className="data-[state=checked]:bg-stone-900"
              />
            </div>
          )}
          <Button className="bg-stone-900 hover:bg-stone-800" asChild>
            <Link href={
              isAuthenticated
                ? (routeId
                    ? `/teams/create?routeId=${routeId}`
                    : locationId
                    ? `/teams/create?locationId=${locationId}`
                    : "/teams/create")
                : "/login"
            }>
              <Plus className="h-4 w-4 mr-2" />
              {isAuthenticated ? "发布队伍" : "登录后发布"}
            </Link>
          </Button>
        </div>
      </div>

      {/* Open Teams */}
      <div className="space-y-3">
        {openTeams.map((team, index) => {
          const remainingSlots = team.maxMembers - team.currentMembers;
          return (
            <motion.div
              key={team.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.5 + index * 0.1 }}
            >
              <Link href={`/teams/${team.id}`}>
                <Card className="group hover:shadow-md transition-all duration-300 border-stone-200 cursor-pointer hover:border-stone-300">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      {/* Team Icon (Emoji) */}
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 border-2 border-stone-100 flex-shrink-0 flex items-center justify-center text-lg">
                        {team.icon || '⭿️'}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {/* First Row: Title + Status Badge */}
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-semibold text-stone-900 group-hover:text-stone-700 transition-colors line-clamp-1 text-sm sm:text-base">
                            {team.title}
                          </h3>
                          <Badge
                            className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-0 text-xs flex-shrink-0"
                          >
                            组队中
                          </Badge>
                        </div>

                        {/* Second Row: Date, Time, Members */}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-stone-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {team.date}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {team.time}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            <span className="text-emerald-600 font-medium">
                              {team.currentMembers}/{team.maxMembers}人
                            </span>
                            {remainingSlots > 0 && (
                              <span className="text-amber-600">
                                还差{remainingSlots}人
                              </span>
                            )}
                          </span>
                        </div>

                        {/* Third Row: Leader Info + Requirements */}
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-xs text-stone-500">
                            领队:{team.leader.name}
                          </span>
                          <Badge
                            variant="outline"
                            className="text-xs border-emerald-200 text-emerald-700 px-1 py-0 h-4"
                          >
                            {leaderLevelLabels[team.leader.level]}
                          </Badge>
                          {team.requirements.length > 0 && (
                            <>
                              <span className="text-stone-300">|</span>
                              <div className="flex items-center gap-1 overflow-hidden">
                                {team.requirements.slice(0, 2).map((req) => (
                                  <Badge
                                    key={req}
                                    variant="secondary"
                                    className="bg-stone-100 text-stone-600 text-xs px-1 py-0 h-4 flex-shrink-0"
                                  >
                                    {req}
                                  </Badge>
                                ))}
                                {team.requirements.length > 2 && (
                                  <span className="text-xs text-stone-400 flex-shrink-0">
                                    +{team.requirements.length - 2}
                                  </span>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Arrow */}
                      <ChevronRight className="h-5 w-5 text-stone-300 group-hover:text-stone-500 group-hover:translate-x-1 transition-all flex-shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          );
        })}
      </div>

      {/* Full Teams */}
      {fullTeams.length > 0 && (
        <div className="pt-4 border-t border-stone-200">
          <h3 className="text-sm font-medium text-stone-500 mb-3">已满员</h3>
          <div className="space-y-3 opacity-70">
            {fullTeams.map((team) => (
              <Card
                key={team.id}
                className="border-stone-200 bg-stone-50/80"
              >
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    {/* Team Icon (Emoji) */}
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-stone-200 to-stone-300 border-2 border-stone-100 flex-shrink-0 flex items-center justify-center text-lg opacity-70">
                      {team.icon || '⭿️'}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* First Row: Title + Status Badge */}
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-medium text-stone-600 line-clamp-1 text-sm sm:text-base">
                          {team.title}
                        </h4>
                        <Badge
                          variant="secondary"
                          className="bg-stone-300 text-stone-600 border-0 text-xs flex-shrink-0"
                        >
                          已满员
                        </Badge>
                      </div>

                      {/* Second Row: Date, Time, Members */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-stone-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {team.date}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {team.time}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          <span className="text-stone-500">
                            {team.currentMembers}/{team.maxMembers}人
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {openTeams.length === 0 && (
        <Card className="border-dashed border-stone-300 bg-stone-50/50">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="h-8 w-8 text-stone-400" />
            </div>
            <h3 className="text-lg font-medium text-stone-900 mb-2">
              {showUnboundOnly ? "暂无未绑定路线的队伍" : "暂无招募中的队伍"}
            </h3>
            <p className="text-sm text-stone-500 mb-4">
              {showUnboundOnly
                ? "该地点下所有队伍都已绑定路线，试试关闭筛选查看全部队伍"
                : "成为第一个发布队伍的人，开启你的户外之旅"}
            </p>
            {showUnboundOnly ? (
              <Button
                variant="outline"
                className="border-stone-300"
                onClick={() => setShowUnboundOnly(false)}
              >
                查看全部队伍
              </Button>
            ) : (
              <Button className="bg-stone-900 hover:bg-stone-800" asChild>
                <Link href={
                  isAuthenticated
                    ? (locationId ? `/teams/create?locationId=${locationId}` : "/teams/create")
                    : "/login"
                }>
                  <Plus className="h-4 w-4 mr-2" />
                  {isAuthenticated ? "发布队伍" : "登录后发布"}
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}

export { TeamList };
