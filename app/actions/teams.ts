"use server";

import { getDB } from "@/db";
import {
  teams,
  teamMembers,
  locations,
  users,
  TeamStatus,
} from "@/db/schema";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { getAuth } from "@/lib/auth";
import { headers } from "next/headers";
import { copy } from "@/lib/copy";
import { nanoid } from "nanoid";

// 获取当前用户
async function getCurrentUser() {
  const auth = await getAuth();
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session?.user || null;
}

// 获取队伍列表
export async function getTeams(locationId?: string) {
  const db = await getDB();
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
  const db = await getDB();
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
  routeId: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  maxMembers: number;
  requirements?: string;
}) {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error(copy.errors.loginRequired);
  }

  const db = await getDB();

  // 检查用户是否已填写微信号
  const userRecord = await db.query.users.findFirst({
    where: eq(users.id, user.id),
    columns: { wechat: true },
  });

  if (!userRecord?.wechat) {
    throw new Error(copy.errors.wechatRequired);
  }

  // 验证地点存在
  const location = await db.query.locations.findFirst({
    where: eq(locations.id, data.locationId),
  });

  if (!location) {
    throw new Error(copy.errors.locationLoadFailed);
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

  // 创建队伍（使用事务保证原子性）
  const teamId = nanoid();
  const now = new Date();
  const [team] = await db.transaction(async (tx) => {
    const [newTeam] = await tx
      .insert(teams)
      .values({
        id: teamId,
        locationId: data.locationId,
        routeId: data.routeId,
        leaderId: user.id,
        title: data.title,
        description: data.description || null,
        startTime: data.startTime,
        endTime: data.endTime,
        maxMembers: data.maxMembers,
        requirements: data.requirements || null,
        status: "recruiting",
      })
      .returning();

    // 创建队长成员记录
    await tx.insert(teamMembers).values({
      id: nanoid(),
      teamId: newTeam.id,
      userId: user.id,
      status: "approved",
      joinedAt: now,
      statusUpdatedAt: now,
    });

    return [newTeam];
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
    throw new Error(copy.errors.loginRequired);
  }

  const db = await getDB();

  // 检查用户是否已填写微信号
  const userRecord = await db.query.users.findFirst({
    where: eq(users.id, user.id),
    columns: { wechat: true },
  });

  if (!userRecord?.wechat) {
    throw new Error(copy.errors.wechatRequired);
  }

  // 获取队伍信息
  const team = await db.query.teams.findFirst({
    where: eq(teams.id, teamId),
    with: {
      location: true,
    },
  });

  if (!team) {
    throw new Error(copy.errors.teamNotFound);
  }

  // 检查队伍状态
  if (team.status !== "recruiting") {
    throw new Error(copy.errors.teamNotAccepting);
  }

  // 检查是否已满（通过 SQL COUNT 动态计算）
  const [{ count: approvedCount }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.status, "approved")));
  if (approvedCount >= team.maxMembers) {
    throw new Error(copy.errors.teamFull);
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
      throw new Error(copy.errors.alreadyMemberDirect);
    }
    if (existingMembership.status === "pending") {
      throw new Error(copy.errors.alreadyApplied);
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

      return { success: true, message: copy.success.reapplied };
    }
  }

  // 创建申请
  await db.insert(teamMembers).values({
    id: nanoid(),
    teamId,
    userId: user.id,
    status: "pending",
  });

  // 清除缓存
  revalidateTag(`team-${teamId}`);
  revalidateTag(`location-${team.location.slug}`);

  return { success: true, message: copy.success.applied };
}

// 批准成员加入
export async function approveMember(teamId: string, userId: string) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    throw new Error("请先登录");
  }

  const db = await getDB();

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
    throw new Error(copy.errors.onlyLeaderCanReview);
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
    throw new Error(copy.errors.applicationNotFound);
  }

  // D1 不支持 transaction，先查询再执行更新
  const now = new Date();

  // 查询当前已审核通过的人数
  const [{ count: approvedCount }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.status, "approved")));

  if (approvedCount >= team.maxMembers) {
    throw new Error(copy.errors.teamAlreadyFull);
  }

  // 使用 batch 保证原子性（D1 支持）
  await db.batch([
    // 更新成员状态
    db
      .update(teamMembers)
      .set({
        status: "approved",
        joinedAt: now,
        statusUpdatedAt: now,
      })
      .where(eq(teamMembers.id, membership.id)),
    // 重新计算人数并更新队伍状态
    db
      .update(teams)
      .set({
        status: (approvedCount + 1) >= team.maxMembers ? "full" : "recruiting",
        updatedAt: now,
      })
      .where(eq(teams.id, teamId)),
  ]);

  // 清除缓存
  revalidateTag(`team-${teamId}`);
  revalidateTag("teams");
  revalidateTag(`location-${team.location.slug}`);

  return { success: true, message: copy.success.approved };
}

// 拒绝成员申请
export async function rejectMember(teamId: string, userId: string) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    throw new Error("请先登录");
  }

  const db = await getDB();

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
    throw new Error(copy.errors.onlyLeaderCanReview);
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
    throw new Error(copy.errors.applicationNotFound);
  }

  // 更新成员状态为拒绝
  await db
    .update(teamMembers)
    .set({
      status: "rejected",
      statusUpdatedAt: new Date(),
    })
    .where(eq(teamMembers.id, membership.id));

  // 清除缓存
  revalidateTag(`team-${teamId}`);

  return { success: true, message: copy.success.rejected };
}

// 离开队伍
export async function leaveTeam(teamId: string) {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error(copy.errors.loginRequired);
  }

  const db = await getDB();

  // 获取队伍信息
  const team = await db.query.teams.findFirst({
    where: eq(teams.id, teamId),
    with: {
      location: true,
    },
  });

  if (!team) {
    throw new Error(copy.errors.teamNotFound);
  }

  // 检查队伍状态是否为已组建
  if (team.status === "formed") {
    throw new Error(copy.teams.cannotLeaveDirectly);
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
    throw new Error(copy.errors.notMember);
  }

  // 队长不能离开队伍（需要先转让队长或解散队伍）
  if (membership.userId === team.leaderId) {
    throw new Error(copy.errors.leaderCannotLeave);
  }

  // 使用事务保证原子性
  await db.transaction(async (tx) => {
    // 删除成员记录
    await tx.delete(teamMembers).where(eq(teamMembers.id, membership.id));

    // 重新计算剩余人数并更新队伍状态
    const [{ count: remainingCount }] = await tx
      .select({ count: sql<number>`count(*)` })
      .from(teamMembers)
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.status, "approved")));

    await tx
      .update(teams)
      .set({
        status: remainingCount < team.maxMembers ? "recruiting" : team.status,
        updatedAt: new Date(),
      })
      .where(eq(teams.id, teamId));
  });

  // 清除缓存
  revalidateTag(`team-${teamId}`);
  revalidateTag("teams");
  revalidateTag(`location-${team.location.slug}`);

  return { success: true, message: copy.success.leftTeam };
}

// 解散队伍（队长）
export async function dissolveTeam(teamId: string) {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error(copy.errors.loginRequired);
  }

  const db = await getDB();

  // 获取队伍信息
  const team = await db.query.teams.findFirst({
    where: eq(teams.id, teamId),
    with: {
      location: true,
    },
  });

  if (!team) {
    throw new Error(copy.errors.teamNotFound);
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

  return { success: true, message: copy.success.dissolved };
}

// 移除成员（队长踢人）
export async function removeMember(teamId: string, userId: string) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    throw new Error(copy.errors.loginRequired);
  }

  const db = await getDB();

  // 获取队伍信息
  const team = await db.query.teams.findFirst({
    where: eq(teams.id, teamId),
    with: {
      location: true,
    },
  });

  if (!team) {
    throw new Error(copy.errors.teamNotFound);
  }

  // 检查是否是队长
  if (team.leaderId !== currentUser.id) {
    throw new Error("只有队长可以移除成员");
  }

  // 不能移除自己
  if (userId === currentUser.id) {
    throw new Error(copy.teams.cannotRemoveSelf);
  }

  // 获取成员记录 - 同时检查 pending 和 approved 状态
  const membership = await db.query.teamMembers.findFirst({
    where: and(
      eq(teamMembers.teamId, teamId),
      eq(teamMembers.userId, userId)
    ),
  });

  if (!membership) {
    throw new Error("该用户不是队伍成员");
  }

  if (membership.status !== "approved") {
    throw new Error("该成员尚未通过审核");
  }

  // 不能移除队长（虽然理论上不会发生，但作为安全检查）
  if (membership.userId === team.leaderId) {
    throw new Error(copy.teams.cannotRemoveLeader);
  }

  // 使用事务保证原子性
  await db.transaction(async (tx) => {
    // 删除成员记录
    await tx.delete(teamMembers).where(eq(teamMembers.id, membership.id));

    // 重新计算剩余人数并更新队伍状态
    const [{ count: remainingCount }] = await tx
      .select({ count: sql<number>`count(*)` })
      .from(teamMembers)
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.status, "approved")));

    await tx
      .update(teams)
      .set({
        status: remainingCount < team.maxMembers ? "recruiting" : team.status,
        updatedAt: new Date(),
      })
      .where(eq(teams.id, teamId));
  });

  // 清除缓存
  revalidateTag(`team-${teamId}`);
  revalidateTag("teams");
  revalidateTag(`location-${team.location.slug}`);

  return { success: true, message: copy.teams.removeMemberSuccess };
}

// 获取用户的队伍列表
export async function getUserTeams() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error(copy.errors.loginRequired);
  }

  const db = await getDB();
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
    throw new Error(copy.errors.loginRequired);
  }

  const db = await getDB();
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
    throw new Error(copy.errors.loginRequired);
  }

  const db = await getDB();

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
      inArray(teamMembers.teamId, teamIds)
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

// 组建队伍
export async function formTeam(teamId: string, isUnderfilled: boolean) {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error(copy.errors.loginRequired);
  }

  const db = await getDB();

  // 获取队伍信息
  const team = await db.query.teams.findFirst({
    where: eq(teams.id, teamId),
    with: {
      location: true,
      members: {
        where: eq(teamMembers.status, "approved"),
        with: {
          user: {
            columns: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
  });

  if (!team) {
    throw new Error(copy.errors.teamNotFound);
  }

  // 检查是否是队长
  if (team.leaderId !== user.id) {
    throw new Error("只有队长可以组建队伍");
  }

  // 检查队伍状态
  if (team.status !== "recruiting" && team.status !== "full") {
    throw new Error("当前队伍状态无法组建");
  }

  // 检查是否有成员（至少需要队长自己，通过 SQL COUNT 动态计算）
  const [{ count: approvedCount }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.status, "approved")));

  if (approvedCount < 1) {
    throw new Error("队伍至少需要1人才能组建");
  }

  // 更新队伍状态为已组建
  await db
    .update(teams)
    .set({
      status: "formed",
      updatedAt: new Date(),
    })
    .where(eq(teams.id, teamId));

  // 清除缓存
  revalidateTag(`team-${teamId}`);
  revalidateTag("teams");
  revalidateTag(`location-${team.location.slug}`);

  return { success: true, message: copy.teams.formTeamSuccess, isUnderfilled };
}

// 申请退出队伍（已组建的队伍）
export async function requestLeave(teamId: string) {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error(copy.errors.loginRequired);
  }

  const db = await getDB();

  // 获取队伍信息
  const team = await db.query.teams.findFirst({
    where: eq(teams.id, teamId),
    with: {
      location: true,
    },
  });

  if (!team) {
    throw new Error(copy.errors.teamNotFound);
  }

  // 检查队伍状态是否为已组建
  if (team.status !== "formed") {
    throw new Error("只有已组建的队伍需要申请退出");
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
    throw new Error(copy.errors.notMember);
  }

  // 队长不能申请退出
  if (membership.userId === team.leaderId) {
    throw new Error(copy.errors.leaderCannotLeave);
  }

  // 检查是否已有退出申请
  const existingLeaveRequest = await db.query.teamMembers.findFirst({
    where: and(
      eq(teamMembers.teamId, teamId),
      eq(teamMembers.userId, user.id),
      eq(teamMembers.status, "leave_pending")
    ),
  });

  if (existingLeaveRequest) {
    throw new Error("您已提交退出申请，请等待队长审批");
  }

  // 更新成员状态为退出申请中
  await db
    .update(teamMembers)
    .set({
      status: "leave_pending",
      statusUpdatedAt: new Date(),
    })
    .where(eq(teamMembers.id, membership.id));

  // 清除缓存
  revalidateTag(`team-${teamId}`);

  return { success: true, message: copy.teams.requestLeaveSuccess };
}

// 批准退出申请
export async function approveLeave(teamId: string, userId: string) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    throw new Error(copy.errors.loginRequired);
  }

  const db = await getDB();

  // 获取队伍信息
  const team = await db.query.teams.findFirst({
    where: eq(teams.id, teamId),
    with: {
      location: true,
    },
  });

  if (!team) {
    throw new Error(copy.errors.teamNotFound);
  }

  // 检查是否是队长
  if (team.leaderId !== currentUser.id) {
    throw new Error("只有队长可以批准退出申请");
  }

  // 获取成员的退出申请
  const membership = await db.query.teamMembers.findFirst({
    where: and(
      eq(teamMembers.teamId, teamId),
      eq(teamMembers.userId, userId),
      eq(teamMembers.status, "leave_pending")
    ),
  });

  if (!membership) {
    throw new Error("未找到该成员的退出申请");
  }

  // 使用事务保证原子性
  await db.transaction(async (tx) => {
    // 删除成员记录
    await tx.delete(teamMembers).where(eq(teamMembers.id, membership.id));

    // 重新计算剩余人数并更新队伍状态
    const [{ count: remainingCount }] = await tx
      .select({ count: sql<number>`count(*)` })
      .from(teamMembers)
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.status, "approved")));

    await tx
      .update(teams)
      .set({
        status: remainingCount < team.maxMembers ? "recruiting" : team.status,
        updatedAt: new Date(),
      })
      .where(eq(teams.id, teamId));
  });

  // 清除缓存
  revalidateTag(`team-${teamId}`);
  revalidateTag("teams");
  revalidateTag(`location-${team.location.slug}`);

  return { success: true, message: "已批准退出申请" };
}

// 拒绝退出申请
export async function rejectLeave(teamId: string, userId: string) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    throw new Error(copy.errors.loginRequired);
  }

  const db = await getDB();

  // 获取队伍信息
  const team = await db.query.teams.findFirst({
    where: eq(teams.id, teamId),
  });

  if (!team) {
    throw new Error(copy.errors.teamNotFound);
  }

  // 检查是否是队长
  if (team.leaderId !== currentUser.id) {
    throw new Error("只有队长可以拒绝退出申请");
  }

  // 获取成员的退出申请
  const membership = await db.query.teamMembers.findFirst({
    where: and(
      eq(teamMembers.teamId, teamId),
      eq(teamMembers.userId, userId),
      eq(teamMembers.status, "leave_pending")
    ),
  });

  if (!membership) {
    throw new Error("未找到该成员的退出申请");
  }

  // 将成员状态改回已通过
  await db
    .update(teamMembers)
    .set({
      status: "approved",
      statusUpdatedAt: new Date(),
    })
    .where(eq(teamMembers.id, membership.id));

  // 清除缓存
  revalidateTag(`team-${teamId}`);

  return { success: true, message: "已拒绝退出申请" };
}

// 取消申请（用户在审核中主动取消自己的申请）
export async function cancelApplication(teamId: string) {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error(copy.errors.loginRequired);
  }

  const db = await getDB();

  // 获取队伍信息
  const team = await db.query.teams.findFirst({
    where: eq(teams.id, teamId),
    with: {
      location: true,
    },
  });

  if (!team) {
    throw new Error(copy.errors.teamNotFound);
  }

  // 查询用户的 pending 申请记录
  const membership = await db.query.teamMembers.findFirst({
    where: and(
      eq(teamMembers.teamId, teamId),
      eq(teamMembers.userId, user.id),
      eq(teamMembers.status, "pending")
    ),
  });

  if (!membership) {
    throw new Error(copy.errors.applicationNotFound);
  }

  // 删除申请记录
  await db.delete(teamMembers).where(eq(teamMembers.id, membership.id));

  // 清除缓存
  revalidateTag(`team-${teamId}`);
  revalidateTag("teams");
  revalidateTag(`location-${team.location.slug}`);

  return { success: true, message: copy.success.applicationCancelled };
}
