"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Clock, Loader2, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { copy } from "@/lib/copy";

interface Applicant {
  id: string;
  userId: string;
  createdAt: Date | string;
  user: {
    id: string;
    name: string;
    image: string | null;
    bio: string | null;
    level: string;
  } | null;
}

interface ApplicantListProps {
  teamId: string;
  initialApplications?: Applicant[];
  onApprove?: () => void;
  onReject?: () => void;
}

function ApplicantList({ teamId, initialApplications = [], onApprove, onReject }: ApplicantListProps) {
  const [applications, setApplications] = React.useState<Applicant[]>(initialApplications);
  const [loadingIds, setLoadingIds] = React.useState<Set<string>>(new Set());
  const [error, setError] = React.useState<string | null>(null);

  // 当 initialApplications 变化时更新列表
  React.useEffect(() => {
    setApplications(initialApplications);
  }, [initialApplications]);

  // 格式化申请时间
  const formatTime = (date: Date | string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) {
      return copy.myTeams.minutesAgoTemplate.replace("{count}", String(minutes));
    } else if (hours < 24) {
      return copy.myTeams.hoursAgoTemplate.replace("{count}", String(hours));
    } else {
      return copy.myTeams.daysAgoTemplate.replace("{count}", String(days));
    }
  };

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

  // 批准申请
  const handleApprove = async (applicationId: string, userId: string) => {
    if (loadingIds.has(applicationId)) return;

    if (!confirm(copy.teams.approveConfirm)) return;

    setLoadingIds((prev) => new Set(prev).add(applicationId));
    setError(null);

    try {
      const response = await fetch(`/api/teams/${teamId}/members/${userId}/approve`, {
        method: "POST",
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // 从列表中移除已处理的申请
        setApplications((prev) => prev.filter((app) => app.id !== applicationId));
        // 调用回调刷新队伍成员列表
        onApprove?.();
      } else {
        setError(result.error || copy.api.failed);
      }
    } catch (err) {
      console.error("Approve error:", err);
      setError(copy.api.networkError);
    } finally {
      setLoadingIds((prev) => {
        const next = new Set(prev);
        next.delete(applicationId);
        return next;
      });
    }
  };

  // 拒绝申请
  const handleReject = async (applicationId: string, userId: string) => {
    if (loadingIds.has(applicationId)) return;

    if (!confirm(copy.teams.rejectConfirm)) return;

    setLoadingIds((prev) => new Set(prev).add(applicationId));
    setError(null);

    try {
      const response = await fetch(`/api/teams/${teamId}/members/${userId}/reject`, {
        method: "POST",
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // 从列表中移除已处理的申请
        setApplications((prev) => prev.filter((app) => app.id !== applicationId));
      } else {
        setError(result.error || copy.api.failed);
      }
    } catch (err) {
      console.error("Reject error:", err);
      setError(copy.api.networkError);
    } finally {
      setLoadingIds((prev) => {
        const next = new Set(prev);
        next.delete(applicationId);
        return next;
      });
    }
  };

  if (applications.length === 0) {
    return (
      <Card className="border-stone-200">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            {copy.teams.reviewTitle}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-stone-500">
            <Clock className="h-12 w-12 mx-auto mb-3 text-stone-300" />
            <p className="text-sm">{copy.teams.reviewEmpty}</p>
            <p className="text-xs text-stone-400 mt-1">{copy.teams.reviewEmptyDesc}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-stone-200">
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {copy.teams.reviewTitle}
          </div>
          <Badge variant="secondary" className="bg-amber-100 text-amber-800">
            {applications.length} {copy.teams.applicationCount}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}
        <div className="space-y-4">
          <AnimatePresence>
            {applications.map((application) => {
              const isLoading = loadingIds.has(application.id);
              const user = application.user;

              if (!user) return null;

              return (
                <motion.div
                  key={application.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ duration: 0.3 }}
                  className="p-4 bg-stone-50 rounded-xl border border-stone-100"
                >
                  <div className="flex items-start gap-3">
                    {/* 用户头像 */}
                    <Avatar size="lg">
                      {user.image ? (
                        <AvatarImage src={user.image} alt={user.name} />
                      ) : null}
                      <AvatarFallback className="bg-stone-200 text-stone-600">
                        {user.name?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>

                    {/* 用户信息 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-stone-900 truncate">
                          {user.name}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {getLevelName(user.level)}
                        </Badge>
                      </div>
                      <p className="text-sm text-stone-500 line-clamp-2 mb-2">
                        {user.bio || copy.teams.noBio}
                      </p>
                      <p className="text-xs text-stone-400">
                        {copy.teams.appliedAt}: {formatTime(application.createdAt)}
                      </p>
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        className="bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => handleApprove(application.id, user.id)}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Check className="h-4 w-4 mr-1" />
                            {copy.teams.approveBtn}
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-200 text-red-600 hover:bg-red-50"
                        onClick={() => handleReject(application.id, user.id)}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <X className="h-4 w-4 mr-1" />
                            {copy.teams.rejectBtn}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
}

export { ApplicantList };
export type { Applicant, ApplicantListProps };