"use client";

import * as React from "react";
import { Team, teams as mockTeams } from "@/lib/data/mock";
import { useAuth } from "@/lib/auth-context";

// 重新导出 Team 类型
export type { Team };

interface TeamsContextType {
  teams: Team[];
  isLoading: boolean;
  addTeam: (team: Omit<Team, "id" | "status" | "createdAt" | "leader" | "currentMembers">) => Promise<Team>;
  getTeamsByLocationId: (locationId: string) => Team[];
  getTeamById: (id: string) => Team | undefined;
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
  return {
    id: apiTeam.id as string,
    locationId: apiTeam.locationId as string,
    title: apiTeam.title as string,
    description: apiTeam.description as string || "",
    date: apiTeam.date as string || (apiTeam.startTime ? new Date(apiTeam.startTime as string).toISOString().split("T")[0] : getCurrentDate()),
    time: apiTeam.time as string || (apiTeam.startTime ? new Date(apiTeam.startTime as string).toTimeString().slice(0, 5) : "08:00"),
    duration: apiTeam.duration as string || "4小时",
    maxMembers: apiTeam.maxMembers as number,
    currentMembers: apiTeam.currentMembers as number,
    requirements: Array.isArray(apiTeam.requirements) ? apiTeam.requirements : (apiTeam.requirements ? JSON.parse(apiTeam.requirements as string) : []),
    status: (apiTeam.status === "recruiting" ? "open" : apiTeam.status) as Team["status"],
    createdAt: apiTeam.createdAt ? new Date(apiTeam.createdAt as string).toISOString().split("T")[0] : getCurrentDate(),
    leader: apiTeam.leader ? {
      id: (apiTeam.leader as Record<string, unknown>).id as string,
      name: (apiTeam.leader as Record<string, unknown>).name as string,
      avatar: (apiTeam.leader as Record<string, unknown>).avatar as string || (apiTeam.leader as Record<string, unknown>).image as string || "",
      level: ((apiTeam.leader as Record<string, unknown>).level as string) || ((apiTeam.leader as Record<string, unknown>).experience as string) || "beginner",
      completedHikes: 0,
      bio: (apiTeam.leader as Record<string, unknown>).bio as string || "",
    } : {
      id: "unknown",
      name: "未知用户",
      avatar: "",
      level: "beginner",
      completedHikes: 0,
      bio: "",
    },
  };
}

export function TeamsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [teams, setTeams] = React.useState<Team[]>(mockTeams);
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
          // 合并 mock 数据和数据库数据
          setTeams([...mockTeams, ...dbTeams]);
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
      throw new Error(error.error || "创建队伍失败");
    }

    const result = await response.json();
    const apiTeam = result.team;

    // 转换为前端使用的 Team 格式
    const newTeam: Team = {
      id: apiTeam.id,
      locationId: apiTeam.locationId,
      title: apiTeam.title,
      description: apiTeam.description,
      date: teamData.date,
      time: teamData.time,
      duration: teamData.duration,
      maxMembers: apiTeam.maxMembers,
      currentMembers: apiTeam.currentMembers,
      requirements: apiTeam.requirements || [],
      status: apiTeam.status === "recruiting" ? "open" : apiTeam.status,
      createdAt: apiTeam.createdAt ? new Date(apiTeam.createdAt).toISOString().split("T")[0] : getCurrentDate(),
      leader: apiTeam.leader ? {
        id: apiTeam.leader.id,
        name: apiTeam.leader.name,
        avatar: apiTeam.leader.avatar || apiTeam.leader.image || "",
        level: apiTeam.leader.level || apiTeam.leader.experience || "beginner",
        completedHikes: 0,
        bio: apiTeam.leader.bio || "",
      } : {
        id: user?.id || "unknown",
        name: user?.name || "未知用户",
        avatar: user?.avatar || "",
        level: user?.level || "beginner",
        completedHikes: 0,
        bio: "",
      },
    };

    setTeams((prev) => [newTeam, ...prev]);
    return newTeam;
  }, [user]);

  const getTeamsByLocationId = React.useCallback((locationId: string) => {
    return teams.filter((team) => team.locationId === locationId);
  }, [teams]);

  const getTeamById = React.useCallback((id: string) => {
    return teams.find((team) => team.id === id);
  }, [teams]);

  // 刷新队伍列表
  const refreshTeams = React.useCallback(async () => {
    await loadTeams();
  }, [loadTeams]);

  return (
    <TeamsContext.Provider value={{ teams, isLoading, addTeam, getTeamsByLocationId, getTeamById, refreshTeams }}>
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
