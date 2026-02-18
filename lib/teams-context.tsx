"use client";

import * as React from "react";
import { Team, teams as mockTeams } from "@/lib/data/mock";
import { useAuth } from "@/lib/auth-context";

// 重新导出 Team 类型
export type { Team };

interface TeamsContextType {
  teams: Team[];
  addTeam: (team: Omit<Team, "id" | "status" | "createdAt" | "leader" | "currentMembers">) => Team;
  getTeamsByLocationId: (locationId: string) => Team[];
  getTeamById: (id: string) => Team | undefined;
}

const TeamsContext = React.createContext<TeamsContextType | undefined>(undefined);

const STORAGE_KEY = "gomate_teams";

// 生成唯一ID
function generateId(): string {
  return `team-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// 获取当前日期字符串
function getCurrentDate(): string {
  return new Date().toISOString().split("T")[0];
}

export function TeamsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  const [teams, setTeams] = React.useState<Team[]>(() => {
    // 从 localStorage 加载数据
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          return [...mockTeams, ...parsed];
        } catch {
          return mockTeams;
        }
      }
    }
    return mockTeams;
  });

  // 持久化到 localStorage
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const userTeams = teams.filter((t) => !mockTeams.find((m) => m.id === t.id));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userTeams));
    }
  }, [teams]);

  const addTeam = React.useCallback((
    teamData: Omit<Team, "id" | "status" | "createdAt" | "leader" | "currentMembers">
  ): Team => {
    // 使用当前登录用户作为领队，如果没有登录则使用默认用户
    const leader = user ? {
      id: user.id,
      name: user.name,
      avatar: user.avatar,
      level: user.level,
      completedHikes: user.completedHikes,
      bio: user.bio,
    } : {
      id: "user-anonymous",
      name: "匿名用户",
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face",
      level: "beginner" as const,
      completedHikes: 0,
      bio: "新人户外爱好者。",
    };

    const newTeam: Team = {
      ...teamData,
      id: generateId(),
      status: "open",
      createdAt: getCurrentDate(),
      leader,
      currentMembers: 1, // 领队自己
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

  return (
    <TeamsContext.Provider value={{ teams, addTeam, getTeamsByLocationId, getTeamById }}>
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
