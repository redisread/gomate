"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Mountain,
  MessageCircle,
  Shield,
  Copy,
  Check,
  Lock,
  User,
  Award,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Team } from "@/lib/types";
import { leaderLevelLabels } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { copy as copyText } from "@/lib/copy";
import { getGenderText, getAgeText } from "@/lib/user-utils";
import { parseUserExtra } from "@/lib/user-extra";

interface LeaderCardProps {
  team: Team;
  isTeamMember?: boolean; // 是否是队伍成员（已批准）
  className?: string;
}

const levelColors: Record<string, string> = {
  beginner: "bg-stone-100 text-stone-700",
  intermediate: "bg-blue-100 text-blue-700",
  advanced: "bg-purple-100 text-purple-700",
  expert: "bg-amber-100 text-amber-700",
};

function LeaderCard({ team, isTeamMember = false, className }: LeaderCardProps) {
  const { leader } = team;
  const [copied, setCopied] = React.useState(false);

  const handleCopyWechat = async () => {
    if (leader.wechat) {
      await navigator.clipboard.writeText(leader.wechat);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <Card className={cn("border-stone-200", className)}>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-stone-900 flex items-center gap-2">
            <Shield className="h-5 w-5 text-stone-600" />
            领队信息
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Leader Profile */}
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16 border-2 border-stone-100">
              <AvatarImage src={leader.avatar} />
              <AvatarFallback className="text-lg">
                {leader.name[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-semibold text-stone-900">
                  {leader.name}
                </h3>
                <Badge
                  className={cn(
                    "text-xs",
                    levelColors[leader.level]
                  )}
                >
                  {leaderLevelLabels[leader.level]}
                </Badge>
              </div>

              {/* 带队次数 + 性别年龄 */}
              <div className="flex items-center gap-3 mt-2 text-sm text-stone-500">
                <span className="flex items-center gap-1">
                  <Mountain className="h-3.5 w-3.5" />
                  {leader.completedHikes}次带队
                </span>
                {(leader.gender || leader.birthday) && (
                  <>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <User className="h-3.5 w-3.5" />
                      {getGenderText(leader.gender)}
                      {leader.birthday && ` · ${getAgeText(leader.birthday)}`}
                    </span>
                  </>
                )}
              </div>

              {/* 简介 */}
              {leader.bio && (
                <p className="text-sm text-stone-600 mt-2 leading-relaxed">
                  {leader.bio}
                </p>
              )}

              {/* 装备和经验（折叠显示） */}
              {leader.extra && (parseUserExtra(leader.extra).equipment || parseUserExtra(leader.extra).experience) && (
                <div className="mt-3 p-3 bg-stone-50 rounded-lg space-y-2">
                  {parseUserExtra(leader.extra).equipment && parseUserExtra(leader.extra).equipment!.length > 0 && (
                    <div className="flex items-start gap-2 text-xs text-stone-600">
                      <Mountain className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                      <span className="line-clamp-1">
                        {parseUserExtra(leader.extra).equipment?.join("、")}
                      </span>
                    </div>
                  )}
                  {parseUserExtra(leader.extra).experience && (
                    <div className="flex items-start gap-2 text-xs text-stone-600">
                      <Award className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                      <span className="line-clamp-2">
                        {parseUserExtra(leader.extra).experience}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Contact Section */}
          {isTeamMember && leader.wechat ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-stone-100 rounded-lg">
                <div>
                  <p className="text-xs text-stone-500">微信号</p>
                  <p className="font-medium text-stone-900">{leader.wechat}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyWechat}
                  className="h-8 w-8 p-0"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Copy className="h-4 w-4 text-stone-600" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-stone-400 text-center">
                复制微信号，添加领队为好友
              </p>
            </div>
          ) : (
            <div className="p-4 bg-stone-50 rounded-xl text-center">
              <div className="flex items-center justify-center gap-2 text-stone-400 mb-2">
                <Lock className="h-4 w-4" />
                <span className="text-sm">{copyText.teams.contactAfterJoin}</span>
              </div>
              <p className="text-xs text-stone-400">
                成为队伍成员后即可查看领队微信号
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export { LeaderCard };
