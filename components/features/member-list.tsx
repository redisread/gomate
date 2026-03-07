"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Crown, MessageCircle, UserX, Loader2, LogOut, Check, X, User, Mountain } from "lucide-react";
import { useRouter } from "next/navigation";
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
import { getGenderText, getAgeText } from "@/lib/user-utils";
import { parseUserExtra } from "@/lib/user-extra";

interface MemberListProps {
  members: TeamMember[];
  leaderId?: string;
  teamId?: string;
  isLeader?: boolean;
  teamStatus?: string;
  onMemberRemoved?: () => void;
}

function MemberList({ members, leaderId, teamId, isLeader, teamStatus, onMemberRemoved }: MemberListProps) {
  const router = useRouter();
  const [removingMemberId, setRemovingMemberId] = React.useState<string | null>(null);
  const [approvingLeaveId, setApprovingLeaveId] = React.useState<string | null>(null);
  const [rejectingLeaveId, setRejectingLeaveId] = React.useState<string | null>(null);

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

  // 批准退出申请
  const handleApproveLeave = async (userId: string) => {
    if (!teamId) return;

    setApprovingLeaveId(userId);

    try {
      const response = await fetch(`/api/teams/${teamId}/members/${userId}/approve-leave`, {
        method: 'POST',
      });

      const result = await response.json() as { success?: boolean; error?: string };

      if (response.ok && result.success) {
        onMemberRemoved?.();
      } else {
        alert(result.error || "批准退出申请失败");
      }
    } catch (error) {
      console.error("Approve leave error:", error);
      alert(copy.api.networkError);
    } finally {
      setApprovingLeaveId(null);
    }
  };

  // 拒绝退出申请
  const handleRejectLeave = async (userId: string) => {
    if (!teamId) return;

    setRejectingLeaveId(userId);

    try {
      const response = await fetch(`/api/teams/${teamId}/members/${userId}/reject-leave`, {
        method: 'POST',
      });

      const result = await response.json() as { success?: boolean; error?: string };

      if (response.ok && result.success) {
        onMemberRemoved?.();
      } else {
        alert(result.error || "拒绝退出申请失败");
      }
    } catch (error) {
      console.error("Reject leave error:", error);
      alert(copy.api.networkError);
    } finally {
      setRejectingLeaveId(null);
    }
  };

  // 分离已批准成员和退出申请成员
  const approvedMembers = members.filter(m => m.status === "approved");
  const leavePendingMembers = members.filter(m => m.status === "leave_pending");

  if (members.length === 0) {
    return null;
  }

  return (
    <>
      {/* 退出申请列表 - 仅队长可见且队伍已组建 */}
      {isLeader && teamStatus === "formed" && leavePendingMembers.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-amber-800">
              <LogOut className="h-5 w-5" />
              {copy.teams.leaveRequestTitle}
              <Badge variant="secondary" className="ml-2 bg-amber-100 text-amber-800">
                {leavePendingMembers.length} 人
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <AnimatePresence>
                {leavePendingMembers.map((member, index) => {
                  const isApproving = approvingLeaveId === member.userId;
                  const isRejecting = rejectingLeaveId === member.userId;

                  return (
                    <motion.div
                      key={member.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -100 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className="flex items-center gap-3 p-3 bg-white rounded-lg border border-amber-200"
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
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs border-amber-300 text-amber-700">
                            申请退出
                          </Badge>
                        </div>
                      </div>

                      {/* 批准/拒绝按钮 */}
                      <div className="flex items-center gap-1">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                              disabled={isApproving || isRejecting}
                            >
                              {isApproving ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Check className="h-4 w-4" />
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{copy.teams.approveLeave}</AlertDialogTitle>
                              <AlertDialogDescription>
                                确定批准 {member.name} 的退出申请？批准后该成员将退出队伍。
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{copy.common.cancel}</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleApproveLeave(member.userId)}
                                className="bg-emerald-600 hover:bg-emerald-700"
                              >
                                {copy.common.confirm}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              disabled={isApproving || isRejecting}
                            >
                              {isRejecting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <X className="h-4 w-4" />
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{copy.teams.rejectLeaveRequest}</AlertDialogTitle>
                              <AlertDialogDescription>
                                确定拒绝 {member.name} 的退出申请？拒绝后该成员将继续留在队伍中。
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{copy.common.cancel}</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleRejectLeave(member.userId)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                {copy.common.confirm}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 已批准成员列表 */}
      <Card className="border-stone-200">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            队伍成员
            <Badge variant="secondary" className="ml-2">
              {approvedMembers.length} 人
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <AnimatePresence>
              {approvedMembers.map((member, index) => {
              const isMemberLeader = member.userId === leaderId;
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
                  className="flex items-center gap-3 p-3 bg-stone-50 rounded-lg border border-stone-100 hover:border-stone-300 hover:shadow-sm transition-all cursor-pointer"
                  onClick={() => router.push(`/users/${member.userId}`)}
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

                    {/* 等级徽章 */}
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {getLevelName(member.level)}
                      </Badge>

                      {/* 性别 + 年龄 */}
                      {(member.gender || member.birthday) && (
                        <span className="text-xs text-stone-500">
                          {member.gender && getGenderText(member.gender)}
                          {member.gender && member.birthday && " · "}
                          {member.birthday && getAgeText(member.birthday)}
                        </span>
                      )}
                    </div>

                    {/* 装备（简化显示前2个） */}
                    {member.extra && parseUserExtra(member.extra).equipment && parseUserExtra(member.extra).equipment!.length > 0 && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-stone-500">
                        <Mountain className="h-3 w-3" />
                        <span className="truncate">
                          {parseUserExtra(member.extra).equipment?.slice(0, 2).join("、")}
                        </span>
                      </div>
                    )}

                    {/* 微信号 */}
                    {member.wechat && (
                      <div className="flex items-center gap-1 text-xs text-stone-500 mt-1">
                        <MessageCircle className="h-3 w-3" />
                        <span className="truncate max-w-[100px]">{member.wechat}</span>
                      </div>
                    )}
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
                          onClick={(e) => e.stopPropagation()}
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
    </>
  );
}

export { MemberList };
export type { MemberListProps };