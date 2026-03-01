"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Users, Crown, MessageCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { copy } from "@/lib/copy";
import type { TeamMember } from "@/lib/types";

interface MemberListProps {
  members: TeamMember[];
  leaderId?: string;
}

function MemberList({ members, leaderId }: MemberListProps) {
  // 获取等级显示名称
  const getLevelName = (level: string) => {
    const levelMap: Record<string, string> = {
      beginner: copy.enums.level.beginner,
      intermediate: copy.enums.level.intermediate,
      advanced: copy.enums.level.advanced,
      expert: copy.enums.level.expert,
    };
    return levelMap[level] || copy.enums.level.beginner;
  };

  if (members.length === 0) {
    return null;
  }

  return (
    <Card className="border-stone-200">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="h-5 w-5" />
          {copy.teams.membersTitle || "队伍成员"}
          <Badge variant="secondary" className="ml-2">
            {members.length} 人
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {members.map((member, index) => {
            const isLeader = member.role === "leader" || member.id === leaderId;

            return (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="flex items-center gap-3 p-3 bg-stone-50 rounded-lg border border-stone-100"
              >
                {/* 用户头像 */}
                <Avatar className="h-10 w-10">
                  {member.image ? (
                    <AvatarImage src={member.image} alt={member.name} />
                  ) : null}
                  <AvatarFallback className="bg-stone-200 text-stone-600 text-sm">
                    {member.name?.charAt(0) || "?"}
                  </AvatarFallback>
                </Avatar>

                {/* 用户信息 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-stone-900 truncate text-sm">
                      {member.name}
                    </span>
                    {isLeader && (
                      <Crown className="h-4 w-4 text-amber-500" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {getLevelName(member.level)}
                    </Badge>
                    {/* 显示微信号（仅队友可见） */}
                    {member.wechat && (
                      <div className="flex items-center gap-1 text-xs text-stone-500">
                        <MessageCircle className="h-3 w-3" />
                        <span className="truncate max-w-[100px]">{member.wechat}</span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export { MemberList };
export type { MemberListProps };