"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Users,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Info,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Team } from "@/lib/data/mock";
import { cn } from "@/lib/utils";

interface TeamInfoProps {
  team: Team;
  className?: string;
}

function TeamInfo({ team, className }: TeamInfoProps) {
  const fillPercentage = (team.currentMembers / team.maxMembers) * 100;
  const isAlmostFull = fillPercentage >= 80;
  const isFull = team.currentMembers >= team.maxMembers;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      <Card className={cn("border-stone-200", className)}>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-stone-900">
            队伍信息
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Description */}
          <p className="text-stone-600 leading-relaxed">{team.description}</p>

          {/* Member Progress */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-stone-700">
                队伍人数
              </span>
              <span
                className={cn(
                  "text-sm font-medium",
                  isAlmostFull && !isFull ? "text-amber-600" : "text-stone-900"
                )}
              >
                {team.currentMembers}/{team.maxMembers}人
              </span>
            </div>
            <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${fillPercentage}%` }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className={cn(
                  "h-full rounded-full",
                  isFull
                    ? "bg-amber-500"
                    : isAlmostFull
                    ? "bg-amber-400"
                    : "bg-emerald-500"
                )}
              />
            </div>
            {isAlmostFull && !isFull && (
              <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" />
                即将满员，抓紧报名
              </p>
            )}
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-stone-50 rounded-xl">
              <div className="flex items-center gap-2 text-stone-500 mb-1">
                <Calendar className="h-4 w-4" />
                <span className="text-xs">出发日期</span>
              </div>
              <p className="font-semibold text-stone-900">{team.date}</p>
            </div>
            <div className="p-4 bg-stone-50 rounded-xl">
              <div className="flex items-center gap-2 text-stone-500 mb-1">
                <Clock className="h-4 w-4" />
                <span className="text-xs">集合时间</span>
              </div>
              <p className="font-semibold text-stone-900">{team.time}</p>
            </div>
          </div>

          {/* Requirements */}
          <div>
            <h4 className="text-sm font-medium text-stone-700 mb-3 flex items-center gap-2">
              <Info className="h-4 w-4 text-stone-400" />
              参与要求
            </h4>
            <ul className="space-y-2">
              {team.requirements.map((req, index) => (
                <li
                  key={index}
                  className="flex items-center gap-2 text-sm text-stone-600"
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                  {req}
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export { TeamInfo };
