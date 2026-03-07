"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { MapPin, ArrowRight, Route, AlertCircle, Users, Calendar, Clock } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

import { Navbar } from "@/app/components/layout/navbar";
import { Footer } from "@/app/components/layout/footer";
import { TeamHeader } from "@/app/components/features/team-header";
import { TeamInfo } from "@/app/components/features/team-info";
import { LeaderCard } from "@/app/components/features/leader-card";
import { JoinButton } from "@/components/features/join-button";
import { ApplicantList } from "@/components/features/applicant-list";
import { MemberList } from "@/components/features/member-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocations } from "@/lib/locations-context";
import { useAuth } from "@/lib/auth-context";
import type { Team } from "@/lib/types";
import type { Location } from "@/lib/types";
import { copy } from "@/lib/copy";

interface Application {
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

interface TeamClientPageProps {
  teamId: string;
}

// 获取状态标签文本
function getStatusText(status: string, current: number, max: number): string {
  if (status === "recruiting") return current >= max ? "已满" : "招募中";
  if (status === "full") return "已满";
  if (status === "formed" || status === "ongoing") return "进行中";
  if (status === "completed") return "已完成";
  if (status === "cancelled") return "已取消";
  return "招募中";
}

// 获取状态标签颜色
function getStatusColor(status: string, current: number, max: number): string {
  if (status === "recruiting" && current < max) {
    return "bg-emerald-100 text-emerald-700 border-emerald-200";
  }
  if (status === "full" || (status === "recruiting" && current >= max)) {
    return "bg-amber-100 text-amber-700 border-amber-200";
  }
  if (status === "formed" || status === "ongoing") {
    return "bg-blue-100 text-blue-700 border-blue-200";
  }
  if (status === "completed") {
    return "bg-stone-100 text-stone-600 border-stone-200";
  }
  if (status === "cancelled") {
    return "bg-red-100 text-red-700 border-red-200";
  }
  return "bg-stone-100 text-stone-600 border-stone-200";
}

// 格式化日期
function formatDate(dateStr: string, timeStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}月${d.getDate()}日 ${timeStr}`;
}

export function TeamClientPage({ teamId }: TeamClientPageProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [team, setTeam] = React.useState<Team | null>(null);
  const [location, setLocation] = React.useState<Location | undefined>(undefined);
  const { getLocationById, isLoading: locationsLoading } = useLocations();
  const [otherTeams, setOtherTeams] = React.useState<Team[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [userMemberStatus, setUserMemberStatus] = React.useState<"pending" | "approved" | "rejected" | "leave_pending" | null>(null);
  const [applications, setApplications] = React.useState<Application[]>([]);

  React.useEffect(() => {
    if (teamId) {
      fetchTeam(teamId);
    }
  }, [teamId]);

  // 当用户登录状态变化时，获取用户成员状态和申请列表
  React.useEffect(() => {
    if (teamId && user) {
      fetchUserMemberStatus(teamId);
      fetchApplications(teamId);
    }
  }, [teamId, user]);

  const fetchTeam = async (id: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/teams/${id}`);

      if (response.status === 404) {
        setError(copy.teams.notFound);
        setIsLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error(copy.teams.loadFailed);
      }

      const result = await response.json();
      if (result.success && result.team) {
        const teamData = result.team;
        setTeam(teamData);

        // 获取该地点的其他队伍
        fetchOtherTeams(id, teamData.locationId);
      } else {
        setError(copy.teams.notFound);
      }
    } catch (err) {
      console.error("获取队伍详情失败:", err);
      setError(copy.teams.loadFailed);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserMemberStatus = async (id: string) => {
    try {
      const response = await fetch(`/api/teams/${id}/my-status`);
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setUserMemberStatus(result.status);
        }
      }
    } catch (err) {
      console.error("获取成员状态失败:", err);
    }
  };

  const fetchApplications = async (id: string) => {
    try {
      const response = await fetch(`/api/teams/${id}/applications`);
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setApplications(result.applications || []);
        }
      }
    } catch (err) {
      console.error("获取申请列表失败:", err);
    }
  };

  const fetchOtherTeams = async (currentId: string, locationId: string) => {
    try {
      const response = await fetch(`/api/teams?locationId=${locationId}`);
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.teams) {
          const filtered = result.teams
            .filter((t: Team) => t.id !== currentId && t.status === "recruiting")
            .slice(0, 2);
          setOtherTeams(filtered);
        }
      }
    } catch (err) {
      console.error("获取其他队伍失败:", err);
    }
  };

  // 当 team 数据和 locations 都加载完成后，查找对应的 location
  React.useEffect(() => {
    if (team && !locationsLoading) {
      const loc = getLocationById(team.locationId);
      setLocation(loc);
    }
  }, [team, locationsLoading, getLocationById]);

  // 判断是否是队长
  const isLeader = user && team?.leader?.id === user?.id;

  if (isLoading || (team && locationsLoading)) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="animate-pulse text-stone-400">{copy.common.loading}</div>
      </div>
    );
  }

  if (error || !team || !location) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-stone-900 mb-2">{error || copy.teams.notFound}</h1>
          <button
            onClick={() => router.push("/teams")}
            className="text-stone-600 hover:text-stone-900 underline"
          >
            {copy.nav.teams}
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-stone-50">
      <Navbar />

      {/* Location Preview Banner */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="relative h-48 sm:h-64"
      >
        <Image
          src={location.coverImage}
          alt={location.name}
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
          <div className="max-w-7xl mx-auto">
            <Link
              href={`/locations/${location.id}`}
              className="inline-flex items-center gap-1 text-white/80 hover:text-white text-sm mb-2 transition-colors"
            >
              <MapPin className="h-4 w-4" />
              {location.name}
            </Link>
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              {location.subtitle}
            </h2>
          </div>
        </div>
      </motion.div>

      {/* Team Header */}
      <TeamHeader team={team} location={location} isLeader={isLeader} />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-32">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Team Info */}
          <div className="lg:col-span-2 space-y-6">
            <TeamInfo team={team} />

            {/* 路线信息 */}
            {team.routeId ? (
              <Link href={`/routes/${team.routeId}`} className="block">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.12 }}
                >
                  <Card className="border-stone-200 hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg font-semibold text-stone-900 flex items-center gap-2">
                        <Route className="h-5 w-5 text-stone-500" />
                        路线信息
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium text-stone-900">
                            {team.route?.name || "已选路线"}
                          </h3>
                          {team.route?.difficulty && (
                            <p className="text-sm text-stone-500 mt-1">
                              难度：
                              {team.route.difficulty === "easy"
                                ? copy.enums.difficulty.easy
                                : team.route.difficulty === "moderate"
                                ? copy.enums.difficulty.moderate
                                : team.route.difficulty === "hard"
                                ? copy.enums.difficulty.hard
                                : copy.enums.difficulty.expert}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                            已确定
                          </Badge>
                          <ArrowRight className="h-4 w-4 text-stone-400" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </Link>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.12 }}
              >
                <Card className="border-amber-200 bg-amber-50/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-semibold text-stone-900 flex items-center gap-2">
                      <Route className="h-5 w-5 text-amber-500" />
                      路线信息
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-stone-700">路线未定，可与队员协商</p>
                        <p className="text-sm text-stone-500 mt-1">
                          这是一支自由组队的队伍，具体路线可在队伍组建后与队员们共同商议决定。
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* 队伍成员列表 */}
            {team.members && team.members.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.15 }}
              >
                <MemberList
                  members={team.members}
                  leaderId={team.leader?.id}
                  teamId={teamId}
                  isLeader={isLeader}
                  teamStatus={team.status}
                  onMemberRemoved={() => {
                    // 移除成员后刷新队伍数据
                    if (teamId) {
                      fetchTeam(teamId);
                    }
                  }}
                />
              </motion.div>
            )}

            {/* 队长审核申请面板 */}
            {isLeader && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <ApplicantList
                  teamId={teamId}
                  initialApplications={applications}
                  onApprove={() => {
                    // 审核通过后刷新队伍数据（包含成员列表）和申请列表
                    if (teamId) {
                      fetchTeam(teamId);
                      fetchApplications(teamId);
                    }
                  }}
                />
              </motion.div>
            )}

            {/* Location Info Summary */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.25 }}
            >
              <Card className="border-stone-200">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div
                      className="w-20 h-20 rounded-xl bg-cover bg-center flex-shrink-0"
                      style={{ backgroundImage: `url(${location.coverImage})` }}
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold text-stone-900 mb-1">
                        {location.name}
                      </h3>
                      <Link
                        href={`/locations/${location.id}`}
                        className="inline-flex items-center text-sm font-medium text-stone-700 hover:text-stone-900 transition-colors"
                      >
                        {copy.teams.viewLocationDetail}
                        <ArrowRight className="ml-1 h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Other Teams */}
            {otherTeams.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.35 }}
              >
                <h3 className="text-lg font-semibold text-stone-900 mb-4">
                  {copy.teams.otherTeamsAtLocation}
                </h3>
                <div className="space-y-3">
                  {otherTeams.map((otherTeam) => {
                    const statusText = getStatusText(
                      otherTeam.status,
                      otherTeam.currentMembers,
                      otherTeam.maxMembers
                    );
                    const statusColor = getStatusColor(
                      otherTeam.status,
                      otherTeam.currentMembers,
                      otherTeam.maxMembers
                    );

                    return (
                      <Link
                        key={otherTeam.id}
                        href={`/teams/${otherTeam.id}`}
                        className="block p-4 rounded-xl border border-stone-200 hover:border-stone-300 hover:shadow-md transition-all bg-white"
                      >
                        {/* 第一行：队伍标题 + 状态Badge */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <Users className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                            <span className="text-sm font-semibold text-stone-900 truncate">
                              {otherTeam.title}
                            </span>
                          </div>
                          <Badge
                            className={statusColor}
                            variant="secondary"
                          >
                            {statusText}
                          </Badge>
                        </div>

                        {/* 第二行：描述（如有，2行截断） */}
                        {otherTeam.description && (
                          <p className="text-xs text-stone-600 line-clamp-2 mb-3 leading-relaxed">
                            {otherTeam.description}
                          </p>
                        )}

                        {/* 第三行：日期、时长、人数 */}
                        <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5 text-stone-400" />
                            <span>
                              {formatDate(otherTeam.date, otherTeam.time)}
                            </span>
                          </div>
                          {otherTeam.duration && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5 text-stone-400" />
                              <span>{otherTeam.duration}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Users className="h-3.5 w-3.5 text-stone-400" />
                            <span>
                              {otherTeam.currentMembers}/{otherTeam.maxMembers}人
                            </span>
                          </div>
                        </div>

                        {/* 第四行：队长信息 */}
                        {otherTeam.leader && (
                          <div className="mt-3 pt-3 border-t border-stone-100 flex items-center gap-2">
                            <Avatar className="h-5 w-5">
                              <AvatarImage
                                src={otherTeam.leader.avatar}
                                alt={otherTeam.leader.name}
                              />
                              <AvatarFallback className="text-[10px] bg-stone-200">
                                {otherTeam.leader.name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs text-stone-600">
                              {otherTeam.leader.name}
                            </span>
                          </div>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </div>

          {/* Right Column - Leader & Actions */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              <LeaderCard team={team} isTeamMember={userMemberStatus === "approved"} />

              {/* Safety Notice */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <Card className="border-amber-200 bg-amber-50/50">
                  <CardContent className="p-4">
                    <h4 className="font-medium text-amber-800 mb-2">
                      {copy.teams.safetyTips}
                    </h4>
                    <ul className="text-sm text-amber-700 space-y-1">
                      <li>{copy.teams.safetyTip1}</li>
                      <li>{copy.teams.safetyTip2}</li>
                      <li>{copy.teams.safetyTip3}</li>
                      <li>{copy.teams.safetyTip4}</li>
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Join Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 p-4 z-40">
        <div className="max-w-7xl mx-auto">
          <JoinButton
            team={team}
            userMemberStatus={userMemberStatus}
            onJoin={() => {
              // 申请成功后刷新状态和申请列表
              if (teamId) {
                fetchUserMemberStatus(teamId);
                fetchApplications(teamId);
              }
            }}
          />
        </div>
      </div>

      <Footer />
    </main>
  );
}