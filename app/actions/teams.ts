"use server";

import { db } from "@/db";
import {
  teams,
  teamMembers,
  users,
  locations,
  TeamStatus,
  TeamMemberStatus,
  TeamMemberRole,
} from "@/db/schema";
import { eq, and, desc, sql, ne } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// 获取当前用户
async function getCurrentUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session?.user || null;
}

// 获取队伍列表
export async function getTeams(locationId?: string) {
  const whereClause = locationId
    ? and(
        eq(teams.locationId, locationId),
        eq(teams.status, "recruiting")
      )
    : eq(teams.status, "recruiting");

  const data = await db.query.teams.findMany({
    where: whereClause,
    with: {
      location: {
        columns: {
          id: true,
          name: true,
          slug: true,
          coverImage: true,
          difficulty: true,
        },
      },
      leader: {
        columns: {
          id: true,
          name: true,
          image: true,
        },
      },
      members: {
        where: eq(teamMembers.status, "approved"),
        with: {
          user: {
            columns: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      },
    },
    orderBy: [desc(teams.createdAt)],
  });

  return data;
}

// 获取队伍详情
export async function getTeamById(id: string) {
  const team = await db.query.teams.findFirst({
    where: eq(teams.id, id),
    with: {
      location: true,
      leader: {
        columns: {
          id: true,
          name: true,
          image: true,
          bio: true,
          level: true,
        },
      },
      members: {
        with: {
          user: {
            columns: {
              id: true,
              name: true,
              image: true,
              bio: true,
              level: true,
            },
          },
        },
        orderBy: [desc(teamMembers.joinedAt)],
      },
    },
  });

  return team;
}

// 创建队伍
export async function createTeam(data: {
  locationId: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  maxMembers: number;
  requirements?: string;
}) {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("请先登录");
  }

  // 验证地点存在
  const location = await db.query.locations.findFirst({
    where: eq(locations.id, data.locationId),
  });

  if (!location) {
    throw new Error("地点不存在");
  }

  // 验证时间
  if (data.startTime >= data.endTime) {
    throw new Error("结束时间必须晚于开始时间");
  }

  if (data.startTime < new Date()) {
    throw new Error("开始时间不能是过去的时间");
  }

  // 验证人数
  if (data.maxMembers < 2 || data.maxMembers > 50) {
    throw new Error("队伍人数必须在 2-50 人之间");
  }

  // 创建队伍
  const [team] = await db
    .insert(teams)
    .values({
      locationId: data.locationId,
      leaderId: user.id,
      title: data.title,
      description: data.description || null,
      startTime: data.startTime,
      endTime: data.endTime,
      maxMembers: data.maxMembers,
      currentMembers: 1, // 队长算1人
      requirements: data.requirements || null,
      status: "recruiting",
    })
    .returning();

  // 创建队长成员记录
  await db.insert(teamMembers).values({
    teamId: team.id,
    userId: user.id,
    role: "leader",
    status: "approved",
    joinedAt: new Date(),
  });

  // 清除缓存
  revalidateTag("teams");
  revalidateTag(`location-${location.slug}`);

  return team;
}

// 申请加入队伍
export async function joinTeam(teamId: string) {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("请先登录");
  }

  // 获取队伍信息
  const team = await db.query.teams.findFirst({
    where: eq(teams.id, teamId),
    with: {
      location: true,
    },
  });

  if (!team) {
    throw new Error("队伍不存在");
  }

  // 检查队伍状态
  if (team.status !== "recruiting") {
    throw new Error("该队伍当前不接受新成员");
  }

  // 检查是否已满
  if (team.currentMembers >= team.maxMembers) {
    throw new Error("队伍已满");
  }

  // 检查是否已申请或已加入
  const existingMembership = await db.query.teamMembers.findFirst({
    where: and(
      eq(teamMembers.teamId, teamId),
      eq(teamMembers.userId, user.id)
    ),
  });

  if (existingMembership) {
    if (existingMembership.status === "approved") {
      throw new Error("你已经是该队伍的成员");
    }
    if (existingMembership.status === "pending") {
      throw new Error("你已经提交了申请，请等待审核");
    }
    if (existingMembership.status === "rejected") {
      // 更新为重新申请
      await db
        .update(teamMembers)
        .set({
          status: "pending",
          createdAt: new Date(),
        })
        .where(eq(teamMembers.id, existingMembership.id));

      return { success: true, message: "重新申请已提交" };
    }
  }

  // 创建申请
  await db.insert(teamMembers).values({
    teamId,
    userId: user.id,
    role: "member",
    status: "pending",
  });

  // 清除缓存
  revalidateTag(`team-${teamId}`);
  revalidateTag(`location-${team.location.slug}`);

  return { success: true, message: "申请已提交，等待队长审核" };
}

// 批准成员加入
export async function approveMember(teamId: string, userId: string) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    throw new Error("请先登录");
  }

  // 获取队伍信息
  const team = await db.query.teams.findFirst({
    where: eq(teams.id, teamId),
    with: {
      location: true,
    },
  });

  if (!team) {
    throw new Error("队伍不存在");
  }

  // 检查是否是队长
  if (team.leaderId !== currentUser.id) {
    throw new Error("只有队长可以审核成员");
  }

  // 检查队伍是否已满
  if (team.currentMembers >= team.maxMembers) {
    throw new Error("队伍已满，无法批准新成员");
  }

  // 获取成员申请
  const membership = await db.query.teamMembers.findFirst({
    where: and(
      eq(teamMembers.teamId, teamId),
      eq(teamMembers.userId, userId),
      eq(teamMembers.status, "pending")
    ),
  });

  if (!membership) {
    throw new Error("未找到该成员的申请");
  }

  // 更新成员状态
  await db
    .update(teamMembers)
    .set({
      status: "approved",
      joinedAt: new Date(),
    })
    .where(eq(teamMembers.id, membership.id));

  // 更新队伍当前人数
  const newMemberCount = team.currentMembers + 1;
  const newStatus: TeamStatus =
    newMemberCount >= team.maxMembers ? "full" : "recruiting";

  await db
    .update(teams)
    .set({
      currentMembers: newMemberCount,
      status: newStatus,
      updatedAt: new Date(),
    })
    .where(eq(teams.id, teamId));

  // 清除缓存
  revalidateTag(`team-${teamId}`);
  revalidateTag("teams");
  revalidateTag(`location-${team.location.slug}`);

  return { success: true, message: "已批准该成员加入" };
}

// 拒绝成员申请
export async function rejectMember(teamId: string, userId: string) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    throw new Error("请先登录");
  }

  // 获取队伍信息
  const team = await db.query.teams.findFirst({
    where: eq(teams.id, teamId),
    with: {
      location: true,
    },
  });

  if (!team) {
    throw new Error("队伍不存在");
  }

  // 检查是否是队长
  if (team.leaderId !== currentUser.id) {
    throw new Error("只有队长可以审核成员");
  }

  // 获取成员申请
  const membership = await db.query.teamMembers.findFirst({
    where: and(
      eq(teamMembers.teamId, teamId),
      eq(teamMembers.userId, userId),
      eq(teamMembers.status, "pending")
    ),
  });

  if (!membership) {
    throw new Error("未找到该成员的申请");
  }

  // 更新成员状态为拒绝
  await db
    .update(teamMembers)
    .set({
      status: "rejected",
    })
    .where(eq(teamMembers.id, membership.id));

  // 清除缓存
  revalidateTag(`team-${teamId}`);

  return { success: true, message: "已拒绝该成员的申请" };
}

// 离开队伍
export async function leaveTeam(teamId: string) {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("请先登录");
  }

  // 获取队伍信息
  const team = await db.query.teams.findFirst({
    where: eq(teams.id, teamId),
    with: {
      location: true,
    },
  });

  if (!team) {
    throw new Error("队伍不存在");
  }

  // 获取成员关系
  const membership = await db.query.teamMembers.findFirst({
    where: and(
      eq(teamMembers.teamId, teamId),
      eq(teamMembers.userId, user.id),
      eq(teamMembers.status, "approved")
    ),
  });

  if (!membership) {
    throw new Error("你不是该队伍的成员");
  }

  // 队长不能离开队伍（需要先转让队长或解散队伍）
  if (membership.role === "leader") {
    throw new Error("队长无法直接离开队伍，请先转让队长权限或解散队伍");
  }

  // 删除成员记录
  await db.delete(teamMembers).where(eq(teamMembers.id, membership.id));

  // 更新队伍人数
  const newMemberCount = Math.max(0, team.currentMembers - 1);

  await db
    .update(teams)
    .set({
      currentMembers: newMemberCount,
      status: newMemberCount < team.maxMembers ? "recruiting" : team.status,
      updatedAt: new Date(),
    })
    .where(eq(teams.id, teamId));

  // 清除缓存
  revalidateTag(`team-${teamId}`);
  revalidateTag("teams");
  revalidateTag(`location-${team.location.slug}`);

  return { success: true, message: "已成功离开队伍" };
}

// 解散队伍（队长）
export async function dissolveTeam(teamId: string) {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("请先登录");
  }

  // 获取队伍信息
  const team = await db.query.teams.findFirst({
    where: eq(teams.id, teamId),
    with: {
      location: true,
    },
  });

  if (!team) {
    throw new Error("队伍不存在");
  }

  // 检查是否是队长
  if (team.leaderId !== user.id) {
    throw new Error("只有队长可以解散队伍");
  }

  // 更新队伍状态为取消
  await db
    .update(teams)
    .set({
      status: "cancelled",
      updatedAt: new Date(),
    })
    .where(eq(teams.id, teamId));

  // 清除缓存
  revalidateTag(`team-${teamId}`);
  revalidateTag("teams");
  revalidateTag(`location-${team.location.slug}`);

  return { success: true, message: "队伍已解散" };
}

// 获取用户的队伍列表
export async function getUserTeams() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("请先登录");
  }

  const memberships = await db.query.teamMembers.findMany({
    where: and(
      eq(teamMembers.userId, user.id),
      eq(teamMembers.status, "approved")
    ),
    with: {
      team: {
        with: {
          location: {
            columns: {
              id: true,
              name: true,
              slug: true,
              coverImage: true,
            },
          },
        },
      },
    },
    orderBy: [desc(teamMembers.joinedAt)],
  });

  return memberships;
}

// 获取用户的待审核申请
export async function getUserPendingApplications() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("请先登录");
  }

  const applications = await db.query.teamMembers.findMany({
    where: and(
      eq(teamMembers.userId, user.id),
      eq(teamMembers.status, "pending")
    ),
    with: {
      team: {
        with: {
          location: {
            columns: {
              id: true,
              name: true,
              slug: true,
              coverImage: true,
            },
          },
          leader: {
            columns: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      },
    },
    orderBy: [desc(teamMembers.createdAt)],
  });

  return applications;
}

// 获取队长需要审核的申请列表
export async function getPendingApplicationsForLeader() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("请先登录");
  }

  // 获取用户作为队长的所有队伍
  const leaderTeams = await db.query.teams.findMany({
    where: eq(teams.leaderId, user.id),
  });

  if (leaderTeams.length === 0) {
    return [];
  }

  const teamIds = leaderTeams.map((t) => t.id);

  // 获取所有待审核的申请
  const applications = await db.query.teamMembers.findMany({
    where: and(
      eq(teamMembers.status, "pending"),
      sql`${teamMembers.teamId} IN (${sql.join(teamIds)})`
    ),
    with: {
      team: {
        columns: {
          id: true,
          title: true,
        },
      },
      user: {
        columns: {
          id: true,
          name: true,
          image: true,
          bio: true,
          level: true,
        },
      },
    },
    orderBy: [desc(teamMembers.createdAt)],
  });

  return applications;
}
