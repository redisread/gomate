"use client";

import * as React from "react";
import type { Team } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";
import { copy } from "@/lib/copy";

// 重新导出 Team 类型
export type { Team };

interface TeamsContextType {
  teams: Team[];
  isLoading: boolean;
  addTeam: (team: Omit<Team, "id" | "status" | "createdAt" | "leader" | "currentMembers">) => Promise<Team>;
  getTeamsByLocationId: (locationId: string) => Team[];
  getTeamsByRouteId: (routeId: string) => Team[];
  getTeamById: (id: string) => Team | undefined;
  getUserJoinedTeams: () => Promise<Team[]>;
  refreshTeams: () => Promise<void>;
}

const TeamsContext = React.createContext<TeamsContextType | undefined>(undefined);

// 生成唯一ID
function generateId(): string {
  return `team-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// 获取当前日期字符串
function getCurrentDate(): string {
  return new Date().toISOString().split("T")[0];
}

// 将数据库队伍格式转换为前端 Team 格式
function formatTeamFromDB(apiTeam: Record<string, unknown>): Team {
  // 计算活动时长字符串
  const durationMin = (apiTeam.durationMin as number) || 240;
  const durationHours = Math.round(durationMin / 60);
  const duration = `${durationHours}小时`;

  return {
    id: apiTeam.id as string,
    locationId: apiTeam.locationId as string,
    routeId: apiTeam.routeId as string | undefined, // 新增路线 ID（可选）
    title: apiTeam.title as string,
    description: apiTeam.description as string || "",
    date: apiTeam.date as string || (apiTeam.startTime ? new Date(apiTeam.startTime as string).toISOString().split("T")[0] : getCurrentDate()),
    time: apiTeam.time as string || (apiTeam.startTime ? new Date(apiTeam.startTime as string).toTimeString().slice(0, 5) : "08:00"),
    duration: duration,
    durationMin: durationMin,
    maxMembers: apiTeam.maxMembers as number,
    currentMembers: apiTeam.currentMembers as number,
    requirements: Array.isArray(apiTeam.requirements) ? apiTeam.requirements : (apiTeam.requirements ? JSON.parse(apiTeam.requirements as string) : []),
    icon: (apiTeam.icon as string) || "⛰️",
    status: apiTeam.status as Team["status"],
    createdAt: apiTeam.createdAt ? new Date(apiTeam.createdAt as string).toISOString().split("T")[0] : getCurrentDate(),
    leader: apiTeam.leader ? {
      id: (apiTeam.leader as Record<string, unknown>).id as string,
      name: (apiTeam.leader as Record<string, unknown>).name as string,
      nickname: ((apiTeam.leader as Record<string, unknown>).nickname as string | null) || null,
      avatar: (apiTeam.leader as Record<string, unknown>).avatar as string || (apiTeam.leader as Record<string, unknown>).image as string || "",
      level: (((apiTeam.leader as Record<string, unknown>).level as string) || "beginner") as "beginner" | "intermediate" | "advanced" | "expert",
      completedHikes: ((apiTeam.leader as Record<string, unknown>).completedHikes as number) || 0,
      bio: (apiTeam.leader as Record<string, unknown>).bio as string || "",
    } : {
      id: "unknown",
      name: "未知用户",
      avatar: "",
      level: "beginner",
      completedHikes: 0,
      bio: "",
    },
    // 如果 API 返回了 route 对象，一并包含
    route: apiTeam.route ? apiTeam.route as Team["route"] : undefined,
    location: apiTeam.location ? apiTeam.location as Team["location"] : undefined,
  };
}

export function TeamsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [teams, setTeams] = React.useState<Team[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // 从数据库加载队伍列表
  const loadTeams = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/teams");
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.teams) {
          const dbTeams = result.teams.map(formatTeamFromDB);
          setTeams(dbTeams);
        }
      }
    } catch (error) {
      console.error("加载队伍列表失败:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 初始加载
  React.useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  const addTeam = React.useCallback(async (
    teamData: Omit<Team, "id" | "status" | "createdAt" | "leader" | "currentMembers">
  ): Promise<Team> => {
    // 调用 API 创建队伍
    const response = await fetch("/api/teams", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(teamData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || copy.teams.createBtnLoading);
    }

    const result = await response.json();
    const apiTeam = result.team;

    // 计算活动时长字符串
    const newTeamDurationMin = apiTeam.durationMin || teamData.durationMin || 240;
    const newTeamDurationHours = Math.round(newTeamDurationMin / 60);
    const newTeamDuration = `${newTeamDurationHours}小时`;

    // 转换为前端使用的 Team 格式
    const newTeam: Team = {
      id: apiTeam.id,
      locationId: apiTeam.locationId,
      routeId: apiTeam.routeId, // 新增路线 ID
      title: apiTeam.title,
      description: apiTeam.description,
      date: teamData.date,
      time: teamData.time,
      duration: newTeamDuration,
      durationMin: newTeamDurationMin,
      maxMembers: apiTeam.maxMembers,
      currentMembers: apiTeam.currentMembers,
      requirements: apiTeam.requirements || [],
      icon: apiTeam.icon || "⛰️",
      status: apiTeam.status,
      createdAt: apiTeam.createdAt ? new Date(apiTeam.createdAt).toISOString().split("T")[0] : getCurrentDate(),
      leader: apiTeam.leader ? {
        id: apiTeam.leader.id,
        name: apiTeam.leader.name,
        nickname: apiTeam.leader.nickname || null,
        avatar: apiTeam.leader.avatar || apiTeam.leader.image || "",
        level: apiTeam.leader.level || "beginner",
        completedHikes: apiTeam.leader.completedHikes || 0,
        bio: apiTeam.leader.bio || "",
      } : {
        id: user?.id || "unknown",
        name: user?.name || copy.common.unknown,
        avatar: user?.avatar || "",
        level: user?.level || "beginner",
        completedHikes: user?.completedHikes || 0,
        bio: "",
      },
      route: apiTeam.route,
      location: apiTeam.location,
    };

    setTeams((prev) => [newTeam, ...prev]);
    return newTeam;
  }, [user]);

  const getTeamsByLocationId = React.useCallback((locationId: string) => {
    return teams.filter((team) => team.locationId === locationId);
  }, [teams]);

  const getTeamsByRouteId = React.useCallback((routeId: string) => {
    return teams.filter((team) => team.routeId === routeId);
  }, [teams]);

  const getTeamById = React.useCallback((id: string) => {
    return teams.find((team) => team.id === id);
  }, [teams]);

  // 刷新队伍列表
  const refreshTeams = React.useCallback(async () => {
    await loadTeams();
  }, [loadTeams]);

  // 获取用户加入的队伍（非自己创建的）
  const getUserJoinedTeams = React.useCallback(async (): Promise<Team[]> => {
    if (!user?.id) {
      return [];
    }

    try {
      const response = await fetch(`/api/teams?userId=${user.id}&includeJoined=true&activeOnly=true`);
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.teams) {
          return result.teams.map(formatTeamFromDB);
        }
      }
      return [];
    } catch (error) {
      console.error("获取用户加入的队伍失败:", error);
      return [];
    }
  }, [user?.id]);

  return (
    <TeamsContext.Provider value={{ teams, isLoading, addTeam, getTeamsByLocationId, getTeamsByRouteId, getTeamById, getUserJoinedTeams, refreshTeams }}>
      {children}
    </TeamsContext.Provider>
  );
}

export function useTeams() {
  const context = React.useContext(TeamsContext);
  if (context === undefined) {
    throw new Error("useTeams must be used within a TeamsProvider");
  }
  return context;
}
