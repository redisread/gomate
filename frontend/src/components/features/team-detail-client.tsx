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
  Mountain,
} from "lucide-react";
import { copy } from "@/lib/copy";
import { fetchAPI } from "@/lib/api";
import type { Team } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

/**
 * 获取队伍状态显示信息
 * 返回：label（中文状态文字）+ className（徽章样式）
 */
function getStatusInfo(status: string, current: number, max: number) {
  if (status === "recruiting" && current < max) {
    return {
      label: "招募中",
      className: "bg-brand-subtle text-brand border border-brand/20",
    };
  }
  if (status === "full" || (status === "recruiting" && current >= max)) {
    return {
      label: "已满员",
      className: "bg-warning/10 text-warning border border-warning/20",
    };
  }
  if (status === "ongoing") {
    return {
      label: "进行中",
      className: "bg-accent text-accent-foreground border border-border",
    };
  }
  if (status === "completed") {
    return {
      label: "已完成",
      className: "bg-muted text-muted-foreground border border-border",
    };
  }
  if (status === "cancelled") {
    return {
      label: "已取消",
      className: "bg-destructive/10 text-destructive border border-destructive/20",
    };
  }
  return {
    label: "招募中",
    className: "bg-brand-subtle text-brand border border-brand/20",
  };
}

interface TeamDetailClientProps {
  teamId: string;
}

/**
 * 队伍详情页客户端组件 - React Island
 * 视觉规范：GoMate Design System v2.0
 *  - 封面：h-[420px] + 双层渐变遮罩，标题定位在底部
 *  - 信息卡片：-mt-12 breakout，rounded-2xl shadow-4
 *  - 成员头像：-space-x-3 叠加，ring-2 ring-white
 *  - 加入按钮：移动端 fixed bottom-0，桌面端 sticky top-24 侧边栏
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
      if (res.status === 404) {
        setError(copy.teams.notFound);
        return;
      }
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
      const res = await fetchAPI(
        `/api/teams?locationId=${locationId}&status=recruiting&pageSize=3`
      );
      const data = await res.json();
      if (data.success) {
        setOtherTeams(
          (data.teams || [])
            .filter((t: Team) => t.id !== currentId)
            .slice(0, 2)
        );
      }
    } catch {}
  };

  const handleJoin = async () => {
    if (!currentUserId) {
      window.location.href = `/login?redirect=/teams/${teamId}`;
      return;
    }
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
      const res = await fetchAPI(`/api/teams/${teamId}/leave`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        setUserMemberStatus(null);
        loadTeam();
      } else {
        alert(data.error || "退出失败");
      }
    } catch {
      alert("退出失败，请稍后重试");
    }
  };

  /* ---- Loading 态 ---- */
  if (isLoading) {
    return (
      <main className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-brand" />
        </div>
      </main>
    );
  }

  /* ---- Error 态 ---- */
  if (error || !team) {
    return (
      <main className="min-h-screen bg-background">
        <Navbar />
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-2">
              {error || copy.teams.notFound}
            </h1>
            <a
              href="/teams"
              className="text-muted-foreground hover:text-brand underline transition-colors"
            >
              {copy.nav.teams}
            </a>
          </div>
        </div>
        <Footer />
      </main>
    );
  }

  const statusInfo = getStatusInfo(
    team.status,
    team.currentMembers,
    team.maxMembers
  );
  const isLeader = currentUserId && team.leader?.id === currentUserId;
  const isMember = userMemberStatus === "approved";
  const isPending = userMemberStatus === "pending";
  const canJoin =
    !isLeader &&
    !isMember &&
    !isPending &&
    team.status === "recruiting" &&
    team.currentMembers < team.maxMembers;

  const fillRatio =
    team.maxMembers > 0
      ? Math.round((team.currentMembers / team.maxMembers) * 100)
      : 0;
  const isFull = team.currentMembers >= team.maxMembers;

  return (
    <main className="min-h-screen bg-background">
      <Navbar />

      {/* ================================================================
          封面图区域 — h-[420px]，双层渐变遮罩
          ================================================================ */}
      <div className="relative h-[320px] sm:h-[420px] overflow-hidden bg-muted">
        {(team as any).location?.coverImage ? (
          <img
            src={(team as any).location.coverImage}
            alt={(team as any).location.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-50 to-muted">
            <Mountain className="h-20 w-20 text-brand/20" />
          </div>
        )}
        {/* 顶部暗化渐变（保护导航栏可读性） */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-transparent" />
        {/* 底部暗化渐变（衬托标题文字） */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />

        {/* 封面底部：地点链接 */}
        {(team as any).location && (
          <div className="absolute bottom-16 left-0 right-0 px-4 sm:px-8">
            <div className="max-w-7xl mx-auto">
              <a
                href={`/locations/${(team as any).location.id}`}
                className="inline-flex items-center gap-1.5 text-white/80 hover:text-white text-sm transition-colors duration-150"
              >
                <MapPin className="h-4 w-4" />
                {(team as any).location.name}
              </a>
            </div>
          </div>
        )}

        {/* 封面底部：队伍标题 */}
        <div className="absolute bottom-5 left-0 right-0 px-4 sm:px-8">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight">
              {team.title}
            </h1>
          </div>
        </div>
      </div>

      {/* ================================================================
          主内容区：-mt-12 信息卡片 breakout
          ================================================================ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-32">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ---- 左/中栏：主信息 ---- */}
          <div className="lg:col-span-2 space-y-6">

            {/* 信息卡片（-mt-12 breakout） */}
            <div
              className="bg-card rounded-2xl p-6 -mt-12 relative z-10"
              style={{
                boxShadow:
                  "0 8px 24px rgba(30,24,18,0.12), 0 3px 8px rgba(30,24,18,0.07)",
                border: "1px solid var(--border)",
              }}
            >
              {/* 状态 + 4列数据 */}
              <div className="flex items-center gap-3 mb-5 flex-wrap">
                <span className={cn("badge-base text-xs font-medium", statusInfo.className)}>
                  {statusInfo.label}
                </span>
              </div>

              {/* 4 列数据网格 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-border pt-5">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">日期</p>
                  <p className="font-semibold text-foreground text-sm">{team.date}</p>
                </div>
                {team.time && (
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">集合</p>
                    <p className="font-semibold text-foreground text-sm">{team.time}</p>
                  </div>
                )}
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">人数</p>
                  <p
                    className={cn(
                      "font-semibold text-sm",
                      isFull ? "text-warm" : "text-brand"
                    )}
                  >
                    {team.currentMembers}/{team.maxMembers}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">进度</p>
                  <div className="flex items-center justify-center gap-1.5">
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden max-w-[60px]">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${fillRatio}%`,
                          background: isFull ? "#ff7a65" : "#249a87",
                        }}
                      />
                    </div>
                    <span className={cn("text-xs font-medium", isFull ? "text-warm" : "text-brand")}>
                      {fillRatio}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 队伍描述 */}
            {team.description && (
              <div className="bg-card rounded-2xl border border-border p-6">
                <h2 className="text-lg font-semibold text-foreground mb-3">队伍介绍</h2>
                <p className="text-muted-foreground leading-relaxed">{team.description}</p>
              </div>
            )}

            {/* 路线未定提示 */}
            {!(team as any).routeId && (
              <div
                className="rounded-2xl p-5"
                style={{
                  background: "rgba(255,122,101,0.06)",
                  border: "1px solid rgba(255,122,101,0.2)",
                }}
              >
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-warm flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-foreground mb-1">路线未定</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      这是一支自由组队的队伍，具体路线可在组建后与队员们共同商议决定。
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 队伍成员 */}
            {team.members && team.members.length > 0 && (
              <div className="bg-card rounded-2xl border border-border p-6">
                <h2 className="text-lg font-semibold text-foreground mb-4">
                  队伍成员
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    {team.members.length}人
                  </span>
                </h2>

                {/* 头像叠加列表 */}
                <div className="flex -space-x-3 mb-4">
                  {team.members.slice(0, 8).map((member: any) => {
                    const displayName = member.nickname || member.name;
                    return (
                      <div
                        key={member.id}
                        className="w-10 h-10 rounded-full ring-2 ring-card overflow-hidden flex-shrink-0 bg-muted flex items-center justify-center"
                        title={displayName}
                      >
                        {member.avatar ? (
                          <img
                            src={member.avatar}
                            alt={displayName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-muted-foreground font-medium text-sm">
                            {displayName?.[0] || "?"}
                          </span>
                        )}
                      </div>
                    );
                  })}
                  {team.members.length > 8 && (
                    <div className="w-10 h-10 rounded-full ring-2 ring-card bg-muted flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-medium text-muted-foreground">
                        +{team.members.length - 8}
                      </span>
                    </div>
                  )}
                </div>

                {/* 成员详细列表 */}
                <div className="space-y-3">
                  {team.members.map((member: any) => {
                    const displayName = member.nickname || member.name;
                    const isTeamLeader = member.userId === team.leader?.id;
                    return (
                      <div key={member.id} className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                          {member.avatar ? (
                            <img
                              src={member.avatar}
                              alt={displayName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-muted-foreground font-medium text-sm">
                              {displayName?.[0] || "?"}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-foreground text-sm flex items-center gap-1.5">
                            {displayName}
                            {isTeamLeader && (
                              <span className="text-xs bg-brand-subtle text-brand px-1.5 py-0.5 rounded-full">
                                队长
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 地点简介 */}
            {(team as any).location && (
              <a href={`/locations/${(team as any).location.id}`}>
                <div className="card-interactive p-5 group flex items-center gap-4">
                  {(team as any).location.coverImage && (
                    <div
                      className="w-20 h-20 rounded-xl bg-cover bg-center flex-shrink-0"
                      style={{
                        backgroundImage: `url(${(team as any).location.coverImage})`,
                      }}
                    />
                  )}
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-1">活动地点</p>
                    <h3 className="font-semibold text-foreground group-hover:text-brand transition-colors duration-150 mb-2">
                      {(team as any).location.name}
                    </h3>
                    <span className="inline-flex items-center text-sm font-medium text-brand">
                      查看地点详情 <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform duration-150" />
                    </span>
                  </div>
                </div>
              </a>
            )}

            {/* 同地点其他队伍 */}
            {otherTeams.length > 0 && (
              <div>
                <h3 className="text-base font-semibold text-foreground mb-3">
                  {copy.teams.otherTeamsAtLocation}
                </h3>
                <div className="space-y-3">
                  {otherTeams.map((t) => {
                    const s = getStatusInfo(
                      t.status,
                      t.currentMembers,
                      t.maxMembers
                    );
                    return (
                      <a key={t.id} href={`/teams/${t.id}`}>
                        <div className="card-interactive p-4 group">
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <h4 className="font-semibold text-foreground text-sm group-hover:text-brand transition-colors duration-150">
                              {t.title}
                            </h4>
                            <span className={cn("badge-base text-xs", s.className)}>
                              {s.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" /> {t.date}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="h-3.5 w-3.5" />{" "}
                              {t.currentMembers}/{t.maxMembers}人
                            </span>
                          </div>
                        </div>
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ================================================================
              右栏：桌面端 sticky 侧边栏
              ================================================================ */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-5">

              {/* 队长信息卡 */}
              {team.leader && (
                <div className="bg-card rounded-2xl border border-border p-5">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
                    队长
                  </h3>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0 ring-2 ring-brand/20">
                      {team.leader.avatar ? (
                        <img
                          src={team.leader.avatar}
                          alt={team.leader.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-muted-foreground font-medium">
                          {(team.leader.nickname || team.leader.name || "?")[0]}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">
                        {team.leader.nickname || team.leader.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">队伍发起人</p>
                    </div>
                  </div>
                </div>
              )}

              {/* 桌面端加入操作卡（仅在可加入时显示） */}
              {canJoin && (
                <div
                  className="bg-card rounded-2xl p-5"
                  style={{
                    border: "1px solid var(--border)",
                    boxShadow: "0 4px 14px rgba(30,24,18,0.10)",
                  }}
                >
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-foreground">名额进度</p>
                      <span className="text-xs text-muted-foreground">
                        还剩 {team.maxMembers - team.currentMembers} 个名额
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${fillRatio}%`,
                          background: "linear-gradient(90deg, #249a87, #3fb5a0)",
                        }}
                      />
                    </div>
                  </div>

                  <textarea
                    placeholder="申请留言（可选，向队长介绍一下自己）"
                    value={joinMessage}
                    onChange={(e) => setJoinMessage(e.target.value)}
                    rows={2}
                    className="w-full px-4 py-2.5 border border-border rounded-xl text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-brand resize-none mb-3 bg-background"
                  />

                  <button
                    onClick={handleJoin}
                    disabled={isJoining}
                    className="w-full py-3 font-medium text-brand-foreground rounded-xl transition-all duration-150 disabled:opacity-50 flex items-center justify-center gap-2"
                    style={{
                      background: "linear-gradient(135deg, #249a87, #3fb5a0)",
                      boxShadow: "0 4px 14px rgba(36,154,135,0.30)",
                    }}
                  >
                    {isJoining && <Loader2 className="h-4 w-4 animate-spin" />}
                    申请加入
                  </button>
                </div>
              )}

              {/* 安全提示卡 */}
              <div
                className="rounded-2xl p-5"
                style={{
                  background: "rgba(255,122,101,0.06)",
                  border: "1px solid rgba(255,122,101,0.18)",
                }}
              >
                <h4 className="font-medium text-foreground mb-2 text-sm">
                  {copy.teams.safetyTips}
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1.5 leading-relaxed">
                  <li className="flex items-start gap-1.5">
                    <span className="text-warm mt-0.5">•</span> {copy.teams.safetyTip1}
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-warm mt-0.5">•</span> {copy.teams.safetyTip2}
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-warm mt-0.5">•</span> {copy.teams.safetyTip3}
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-warm mt-0.5">•</span> {copy.teams.safetyTip4}
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================
          移动端底部固定加入栏（含 safe-area-inset-bottom）
          ================================================================ */}
      <div
        className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-40 lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="max-w-7xl mx-auto px-4 py-3">
          {isLeader ? (
            <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm py-1">
              <CheckCircle className="h-5 w-5 text-brand" />
              你是这支队伍的队长
            </div>
          ) : isMember ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-brand text-sm">
                <CheckCircle className="h-5 w-5" />
                你已加入这支队伍
              </div>
              <button
                onClick={handleLeave}
                className="text-sm text-muted-foreground hover:text-destructive transition-colors underline"
              >
                退出队伍
              </button>
            </div>
          ) : isPending ? (
            <div className="flex items-center gap-2 text-warning text-sm justify-center py-1">
              <Loader2 className="h-5 w-5 animate-spin" />
              申请待审核中，请耐心等待队长审核
            </div>
          ) : joinSuccess ? (
            <div className="flex items-center gap-2 text-brand text-sm justify-center py-1">
              <CheckCircle className="h-5 w-5" />
              申请已提交，等待队长审核
            </div>
          ) : canJoin ? (
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="申请留言（可选）"
                value={joinMessage}
                onChange={(e) => setJoinMessage(e.target.value)}
                className="flex-1 px-4 py-2.5 border border-border rounded-xl focus:outline-none focus:border-brand text-foreground text-sm bg-background"
              />
              <button
                onClick={handleJoin}
                disabled={isJoining}
                className="px-6 py-2.5 rounded-xl font-medium text-brand-foreground transition-all duration-150 disabled:opacity-50 flex items-center gap-2"
                style={{
                  background: "linear-gradient(135deg, #249a87, #3fb5a0)",
                  boxShadow: "0 4px 14px rgba(36,154,135,0.30)",
                }}
              >
                {isJoining && <Loader2 className="h-4 w-4 animate-spin" />}
                申请加入
              </button>
            </div>
          ) : (
            <div className="text-center text-muted-foreground text-sm py-1">
              {team.status === "completed"
                ? "该队伍已完成活动"
                : team.status === "cancelled"
                ? "该队伍已取消"
                : team.currentMembers >= team.maxMembers
                ? "该队伍已满员"
                : "暂无法加入"}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </main>
  );
}
