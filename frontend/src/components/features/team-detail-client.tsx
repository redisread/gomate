"use client";

import * as React from "react";
import {
  MapPin,
  ArrowRight,
  Users,
  Calendar,
  Clock,
  AlertCircle,
  Loader2,
  CheckCircle,
} from "lucide-react";
import { copy } from "@/lib/copy";
import { fetchAPI } from "@/lib/api";
import type { Team } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

function getStatusInfo(status: string, current: number, max: number) {
  if (status === "recruiting" && current < max) return { label: "招募中", color: "bg-emerald-100 text-emerald-700" };
  if (status === "full" || (status === "recruiting" && current >= max)) return { label: "已满员", color: "bg-amber-100 text-amber-700" };
  if (status === "ongoing") return { label: "进行中", color: "bg-blue-100 text-blue-700" };
  if (status === "completed") return { label: "已完成", color: "bg-stone-100 text-stone-600" };
  if (status === "cancelled") return { label: "已取消", color: "bg-red-100 text-red-700" };
  return { label: "招募中", color: "bg-stone-100 text-stone-600" };
}

interface TeamDetailClientProps {
  teamId: string;
}

/**
 * 队伍详情页客户端组件 - React Island
 */
export function TeamDetailClient({ teamId }: TeamDetailClientProps) {
  const [team, setTeam] = React.useState<Team | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = React.useState<string | null>(null);
  const [userMemberStatus, setUserMemberStatus] = React.useState<string | null>(null);
  const [isJoining, setIsJoining] = React.useState(false);
  const [joinMessage, setJoinMessage] = React.useState("");
  const [joinSuccess, setJoinSuccess] = React.useState(false);
  const [otherTeams, setOtherTeams] = React.useState<Team[]>([]);

  React.useEffect(() => {
    loadTeam();
    checkCurrentUser();
  }, [teamId]);

  const checkCurrentUser = async () => {
    try {
      const res = await fetchAPI("/auth/get-session");
      const data = await res.json();
      if (data?.user?.id) {
        setCurrentUserId(data.user.id);
        fetchUserMemberStatus();
      }
    } catch {}
  };

  const fetchUserMemberStatus = async () => {
    try {
      const res = await fetchAPI(`/api/teams/${teamId}/my-status`);
      const data = await res.json();
      if (data.success) setUserMemberStatus(data.status);
    } catch {}
  };

  const loadTeam = async () => {
    setIsLoading(true);
    try {
      const res = await fetchAPI(`/api/teams/${teamId}`);
      if (res.status === 404) { setError(copy.teams.notFound); return; }
      const data = await res.json();
      if (data.success && data.team) {
        setTeam(data.team);
        fetchOtherTeams(data.team.locationId, teamId);
      } else {
        setError(copy.teams.notFound);
      }
    } catch {
      setError(copy.teams.loadFailed);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOtherTeams = async (locationId: string, currentId: string) => {
    try {
      const res = await fetchAPI(`/api/teams?locationId=${locationId}&status=recruiting&pageSize=3`);
      const data = await res.json();
      if (data.success) {
        setOtherTeams((data.teams || []).filter((t: Team) => t.id !== currentId).slice(0, 2));
      }
    } catch {}
  };

  const handleJoin = async () => {
    if (!currentUserId) { window.location.href = `/login?redirect=/teams/${teamId}`; return; }
    setIsJoining(true);
    try {
      const res = await fetchAPI(`/api/teams/${teamId}/join`, {
        method: "POST",
        body: JSON.stringify({ message: joinMessage }),
      });
      const data = await res.json();
      if (data.success) {
        setJoinSuccess(true);
        setUserMemberStatus("pending");
        loadTeam();
      } else {
        alert(data.error || "申请失败，请稍后重试");
      }
    } catch {
      alert("申请失败，请稍后重试");
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeave = async () => {
    if (!confirm("确定要退出队伍吗？")) return;
    try {
      const res = await fetchAPI(`/api/teams/${teamId}/leave`, { method: "POST" });
      const data = await res.json();
      if (data.success) { setUserMemberStatus(null); loadTeam(); }
      else alert(data.error || "退出失败");
    } catch { alert("退出失败，请稍后重试"); }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-stone-50">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-stone-400" />
        </div>
      </main>
    );
  }

  if (error || !team) {
    return (
      <main className="min-h-screen bg-stone-50">
        <Navbar />
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-stone-900 mb-2">{error || copy.teams.notFound}</h1>
            <a href="/teams" className="text-stone-600 hover:text-stone-900 underline">{copy.nav.teams}</a>
          </div>
        </div>
        <Footer />
      </main>
    );
  }

  const statusInfo = getStatusInfo(team.status, team.currentMembers, team.maxMembers);
  const isLeader = currentUserId && team.leader?.id === currentUserId;
  const isMember = userMemberStatus === "approved";
  const isPending = userMemberStatus === "pending";
  const canJoin = !isLeader && !isMember && !isPending && team.status === "recruiting" && team.currentMembers < team.maxMembers;

  return (
    <main className="min-h-screen bg-stone-50">
      <Navbar />

      {/* Cover Banner */}
      {(team as any).location?.coverImage && (
        <div className="relative h-48 sm:h-64 overflow-hidden">
          <img src={(team as any).location.coverImage} alt={(team as any).location.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
            <div className="max-w-7xl mx-auto">
              <a href={`/locations/${(team as any).location.id}`} className="inline-flex items-center gap-1 text-white/80 hover:text-white text-sm transition-colors">
                <MapPin className="h-4 w-4" />
                {(team as any).location.name}
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Team Header */}
      <div className="bg-white border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium mb-2 ${statusInfo.color}`}>{statusInfo.label}</span>
          <h1 className="text-2xl sm:text-3xl font-bold text-stone-900">{team.title}</h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-32">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Team Info */}
            <div className="bg-white rounded-2xl border border-stone-200 p-6">
              <h2 className="text-xl font-semibold text-stone-900 mb-4">队伍信息</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-stone-400" />
                  <div>
                    <p className="text-xs text-stone-400">日期</p>
                    <p className="font-medium text-stone-900">{team.date}</p>
                  </div>
                </div>
                {team.time && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-stone-400" />
                    <div>
                      <p className="text-xs text-stone-400">集合时间</p>
                      <p className="font-medium text-stone-900">{team.time}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-stone-400" />
                  <div>
                    <p className="text-xs text-stone-400">人数</p>
                    <p className={cn("font-medium", team.currentMembers >= team.maxMembers ? "text-amber-600" : "text-emerald-600")}>
                      {team.currentMembers}/{team.maxMembers}人
                    </p>
                  </div>
                </div>
              </div>
              {team.description && <p className="text-stone-600 leading-relaxed">{team.description}</p>}
            </div>

            {/* Route Info */}
            {!(team as any).routeId && (
              <div className="bg-amber-50/50 rounded-2xl border border-amber-200 p-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-stone-900 mb-1">路线未定</h3>
                    <p className="text-sm text-stone-600">这是一支自由组队的队伍，具体路线可在组建后与队员们共同商议决定。</p>
                  </div>
                </div>
              </div>
            )}

            {/* Members */}
            {team.members && team.members.length > 0 && (
              <div className="bg-white rounded-2xl border border-stone-200 p-6">
                <h2 className="text-xl font-semibold text-stone-900 mb-4">队伍成员</h2>
                <div className="space-y-3">
                  {team.members.map((member: any) => {
                    const displayName = member.nickname || member.name;
                    return (
                      <div key={member.id} className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-stone-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {member.avatar ? (
                            <img src={member.avatar} alt={displayName} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-stone-600 font-medium text-sm">{displayName?.[0] || "?"}</span>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-stone-900 text-sm">
                            {displayName}
                            {member.userId === team.leader?.id && (
                              <span className="ml-2 text-xs bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded">队长</span>
                            )}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Location Summary */}
            {(team as any).location && (
              <div className="bg-white rounded-2xl border border-stone-200 p-5">
                <div className="flex items-start gap-4">
                  {(team as any).location.coverImage && (
                    <div className="w-20 h-20 rounded-xl bg-cover bg-center flex-shrink-0"
                      style={{ backgroundImage: `url(${(team as any).location.coverImage})` }} />
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold text-stone-900 mb-1">{(team as any).location.name}</h3>
                    <a href={`/locations/${(team as any).location.id}`} className="inline-flex items-center text-sm font-medium text-stone-700 hover:text-stone-900 transition-colors">
                      查看地点详情 <ArrowRight className="ml-1 h-4 w-4" />
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Other Teams */}
            {otherTeams.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-stone-900 mb-4">{copy.teams.otherTeamsAtLocation}</h3>
                <div className="space-y-3">
                  {otherTeams.map((t) => {
                    const s = getStatusInfo(t.status, t.currentMembers, t.maxMembers);
                    return (
                      <a key={t.id} href={`/teams/${t.id}`} className="block p-4 rounded-xl border border-stone-200 hover:border-stone-300 hover:shadow-md transition-all bg-white">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-semibold text-stone-900 text-sm">{t.title}</h4>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.color}`}>{s.label}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-2 text-xs text-stone-500">
                          <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {t.date}</span>
                          <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {t.currentMembers}/{t.maxMembers}人</span>
                        </div>
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right Column */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              {team.leader && (
                <div className="bg-white rounded-2xl border border-stone-200 p-6">
                  <h3 className="font-semibold text-stone-900 mb-4">队长</h3>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-stone-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {team.leader.avatar ? (
                        <img src={team.leader.avatar} alt={team.leader.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-stone-600 font-medium">{(team.leader.nickname || team.leader.name || "?")[0]}</span>
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-stone-900">{team.leader.nickname || team.leader.name}</p>
                    </div>
                  </div>
                </div>
              )}
              <div className="bg-amber-50/50 rounded-2xl border border-amber-200 p-5">
                <h4 className="font-medium text-amber-800 mb-2">{copy.teams.safetyTips}</h4>
                <ul className="text-sm text-amber-700 space-y-1">
                  <li>{copy.teams.safetyTip1}</li>
                  <li>{copy.teams.safetyTip2}</li>
                  <li>{copy.teams.safetyTip3}</li>
                  <li>{copy.teams.safetyTip4}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Join Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 p-4 z-40">
        <div className="max-w-7xl mx-auto">
          {isLeader ? (
            <div className="flex items-center justify-center gap-2 text-stone-600 text-sm">
              <CheckCircle className="h-5 w-5 text-emerald-500" /> 你是这支队伍的队长
            </div>
          ) : isMember ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-600 text-sm">
                <CheckCircle className="h-5 w-5" /> 你已加入这支队伍
              </div>
              <button onClick={handleLeave} className="text-sm text-stone-500 hover:text-red-600 transition-colors underline">退出队伍</button>
            </div>
          ) : isPending ? (
            <div className="flex items-center gap-2 text-amber-600 text-sm justify-center">
              <Loader2 className="h-5 w-5 animate-spin" /> 申请待审核中，请耐心等待队长审核
            </div>
          ) : joinSuccess ? (
            <div className="flex items-center gap-2 text-emerald-600 text-sm justify-center">
              <CheckCircle className="h-5 w-5" /> 申请已提交，等待队长审核
            </div>
          ) : canJoin ? (
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="申请留言（可选）"
                value={joinMessage}
                onChange={(e) => setJoinMessage(e.target.value)}
                className="flex-1 px-4 py-2.5 border border-stone-200 rounded-lg focus:outline-none focus:border-stone-400 text-stone-900 text-sm"
              />
              <button
                onClick={handleJoin}
                disabled={isJoining}
                className="bg-stone-900 hover:bg-stone-800 text-white px-6 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isJoining && <Loader2 className="h-4 w-4 animate-spin" />}
                申请加入
              </button>
            </div>
          ) : (
            <div className="text-center text-stone-500 text-sm">
              {team.status === "completed" ? "该队伍已完成活动" :
               team.status === "cancelled" ? "该队伍已取消" :
               team.currentMembers >= team.maxMembers ? "该队伍已满员" : "暂无法加入"}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </main>
  );
}
