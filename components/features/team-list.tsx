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
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { Team } from "@/lib/types";
import { leaderLevelLabels } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface TeamListProps {
  teams: Team[];
  className?: string;
}

function TeamList({ teams, className }: TeamListProps) {
  const openTeams = teams.filter((t) => t.status === "open");
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
        <Button className="bg-stone-900 hover:bg-stone-800">
          <Plus className="h-4 w-4 mr-2" />
          发布队伍
        </Button>
      </div>

      {/* Open Teams */}
      <div className="space-y-4">
        {openTeams.map((team, index) => (
          <motion.div
            key={team.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.5 + index * 0.1 }}
          >
            <Link href={`/teams/${team.id}`}>
              <Card className="group hover:shadow-md transition-all duration-300 border-stone-200 cursor-pointer">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    {/* Leader Avatar */}
                    <Avatar className="h-12 w-12 border-2 border-stone-100">
                      <AvatarImage src={team.leader.avatar} />
                      <AvatarFallback>{team.leader.name[0]}</AvatarFallback>
                    </Avatar>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold text-stone-900 group-hover:text-stone-700 transition-colors line-clamp-1">
                            {team.title}
                          </h3>
                          <p className="text-sm text-stone-500 mt-1 line-clamp-2">
                            {team.description}
                          </p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-stone-400 group-hover:text-stone-600 group-hover:translate-x-1 transition-all flex-shrink-0" />
                      </div>

                      {/* Meta Info */}
                      <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-stone-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {team.date}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {team.time}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          <span
                            className={cn(
                              team.currentMembers >= team.maxMembers
                                ? "text-amber-600"
                                : "text-emerald-600"
                            )}
                          >
                            {team.currentMembers}/{team.maxMembers}人
                          </span>
                        </span>
                      </div>

                      {/* Requirements */}
                      <div className="flex flex-wrap gap-2 mt-3">
                        {team.requirements.map((req) => (
                          <Badge
                            key={req}
                            variant="secondary"
                            className="bg-stone-100 text-stone-600 hover:bg-stone-200"
                          >
                            {req}
                          </Badge>
                        ))}
                      </div>

                      {/* Leader Info */}
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-stone-100">
                        <span className="text-sm text-stone-500">领队:</span>
                        <span className="text-sm font-medium text-stone-700">
                          {team.leader.name}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-xs border-emerald-200 text-emerald-700"
                        >
                          {leaderLevelLabels[team.leader.level]}
                        </Badge>
                        <span className="text-xs text-stone-400">
                          {team.leader.completedHikes}次带队
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Full Teams */}
      {fullTeams.length > 0 && (
        <div className="pt-4 border-t border-stone-200">
          <h3 className="text-sm font-medium text-stone-500 mb-4">已满员</h3>
          <div className="space-y-3 opacity-60">
            {fullTeams.map((team) => (
              <Card
                key={team.id}
                className="border-stone-200 bg-stone-50"
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={team.leader.avatar} />
                        <AvatarFallback>{team.leader.name[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="font-medium text-stone-700 line-clamp-1">
                          {team.title}
                        </h4>
                        <p className="text-xs text-stone-500">
                          {team.date} · {team.currentMembers}/{team.maxMembers}人
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant="secondary"
                      className="bg-stone-200 text-stone-500"
                    >
                      已满员
                    </Badge>
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
              暂无招募中的队伍
            </h3>
            <p className="text-sm text-stone-500 mb-4">
              成为第一个发布队伍的人，开启你的户外之旅
            </p>
            <Button className="bg-stone-900 hover:bg-stone-800">
              <Plus className="h-4 w-4 mr-2" />
              发布队伍
            </Button>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}

export { TeamList };
