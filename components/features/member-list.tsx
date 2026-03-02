"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Crown, MessageCircle, UserX, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { copy } from "@/lib/copy";
import type { TeamMember } from "@/lib/types";

interface MemberListProps {
  members: TeamMember[];
  leaderId?: string;
  teamId?: string;
  isLeader?: boolean;
  onMemberRemoved?: () => void;
}

function MemberList({ members, leaderId, teamId, isLeader, onMemberRemoved }: MemberListProps) {
  const [removingMemberId, setRemovingMemberId] = React.useState<string | null>(null);

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

  // 移除成员
  const handleRemoveMember = async (userId: string) => {
    if (!teamId) return;

    setRemovingMemberId(userId);

    try {
      const response = await fetch(`/api/teams/${teamId}/members/${userId}/remove`, {
        method: 'POST',
      });

      const result = await response.json() as { success?: boolean; error?: string };

      if (response.ok && result.success) {
        onMemberRemoved?.();
      } else {
        alert(result.error || copy.teams.removeMemberFailed);
      }
    } catch (error) {
      console.error("Remove member error:", error);
      alert(copy.api.networkError);
    } finally {
      setRemovingMemberId(null);
    }
  };

  if (members.length === 0) {
    return null;
  }

  return (
    <Card className="border-stone-200">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="h-5 w-5" />
          队伍成员
          <Badge variant="secondary" className="ml-2">
            {members.length} 人
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <AnimatePresence>
            {members.map((member, index) => {
              const isMemberLeader = member.role === "leader" || member.id === leaderId;
              const isRemoving = removingMemberId === member.userId;
              // 队长不能被移除，自己不能移除自己
              const canRemove = isLeader && !isMemberLeader && teamId;

              return (
                <motion.div
                  key={member.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
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
                      {isMemberLeader && (
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

                  {/* 移除按钮（仅队长可见，不显示在队长身上） */}
                  {canRemove && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          disabled={isRemoving}
                        >
                          {isRemoving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <UserX className="h-4 w-4" />
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{copy.teams.removeMemberConfirm}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {member.name} 将被移出队伍，移除后该成员需要重新申请才能加入。
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{copy.common.cancel}</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleRemoveMember(member.userId)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            {copy.common.confirm}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
}

export { MemberList };
export type { MemberListProps };