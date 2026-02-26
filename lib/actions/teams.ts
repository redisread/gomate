"use server";

import { getDB } from "@/db";
import { teams, teamMembers, type NewTeam, type NewTeamMember } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { CreateTeamInput, TeamFilters } from "@/types";

// 创建队伍 Schema
const createTeamSchema = z.object({
  locationId: z.string().uuid(),
  title: z.string().min(2, "标题至少2个字符").max(100, "标题最多100个字符"),
  description: z.string().max(1000, "描述最多1000个字符").optional(),
  maxMembers: z.number().min(2).max(50).default(10),
  startTime: z.date(),
  endTime: z.date().optional(),
  requirements: z.string().max(500, "要求最多500个字符").optional(),
});

// 获取队伍列表
export async function getTeams(filters?: TeamFilters) {
  try {
    const db = await getDB();
    const query = db.query.teams.findMany({
      orderBy: [desc(teams.createdAt)],
      with: {
        location: true,
        leader: true,
        members: true,
      },
    });

    // TODO: 应用筛选条件

    return { success: true, data: await query };
  } catch (error) {
    console.error("Failed to fetch teams:", error);
    return { success: false, error: "获取队伍列表失败" };
  }
}

// 获取单个队伍详情
export async function getTeamById(id: string) {
  try {
    const db = await getDB();
    const team = await db.query.teams.findFirst({
      where: eq(teams.id, id),
      with: {
        location: true,
        leader: true,
        members: {
          with: {
            user: true,
          },
        },
      },
    });

    if (!team) {
      return { success: false, error: "队伍不存在" };
    }

    return { success: true, data: team };
  } catch (error) {
    console.error("Failed to fetch team:", error);
    return { success: false, error: "获取队伍详情失败" };
  }
}

// 创建队伍
export async function createTeam(input: CreateTeamInput, leaderId: string) {
  try {
    const validated = createTeamSchema.parse(input);

    const newTeam: NewTeam = {
      ...validated,
      leaderId,
      status: "recruiting",
      currentMembers: 1,
    };

    const db = await getDB();
    const [team] = await db.insert(teams).values(newTeam).returning();

    // 自动将创建者添加为队长
    await db.insert(teamMembers).values({
      teamId: team.id,
      userId: leaderId,
      role: "leader",
      status: "approved",
      joinedAt: new Date(),
    });

    revalidatePath("/teams");
    revalidatePath(`/locations/${validated.locationId}`);

    return { success: true, data: team };
  } catch (error) {
    console.error("Failed to create team:", error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    return { success: false, error: "创建队伍失败" };
  }
}

// 加入队伍
export async function joinTeam(teamId: string, userId: string, message?: string) {
  try {
    const db = await getDB();
    // 检查队伍是否存在且正在招募
    const team = await db.query.teams.findFirst({
      where: eq(teams.id, teamId),
    });

    if (!team) {
      return { success: false, error: "队伍不存在" };
    }

    if (team.status !== "recruiting") {
      return { success: false, error: "队伍不在招募中" };
    }

    if (team.currentMembers >= team.maxMembers) {
      return { success: false, error: "队伍已满员" };
    }

    // 检查是否已申请或已是成员
    const existing = await db.query.teamMembers.findFirst({
      where: and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)),
    });

    if (existing) {
      return { success: false, error: "您已申请加入或已是成员" };
    }

    // 创建成员申请
    const newMember: NewTeamMember = {
      teamId,
      userId,
      role: "member",
      status: "pending",
    };

    await db.insert(teamMembers).values(newMember);

    revalidatePath(`/teams/${teamId}`);

    return { success: true, message: "申请已提交，等待队长审核" };
  } catch (error) {
    console.error("Failed to join team:", error);
    return { success: false, error: "申请加入失败" };
  }
}

// 退出队伍
export async function leaveTeam(teamId: string, userId: string) {
  try {
    const db = await getDB();
    await db
      .delete(teamMembers)
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)));

    // 更新队伍当前人数
    await db
      .update(teams)
      .set({ currentMembers: db.$count(teamMembers, eq(teamMembers.teamId, teamId)) })
      .where(eq(teams.id, teamId));

    revalidatePath(`/teams/${teamId}`);

    return { success: true, message: "已退出队伍" };
  } catch (error) {
    console.error("Failed to leave team:", error);
    return { success: false, error: "退出队伍失败" };
  }
}

// 审核成员申请
export async function reviewMemberApplication(
  teamId: string,
  memberId: string,
  leaderId: string,
  approve: boolean
) {
  try {
    const db = await getDB();
    // 验证操作者是队长
    const team = await db.query.teams.findFirst({
      where: eq(teams.id, teamId),
    });

    if (!team || team.leaderId !== leaderId) {
      return { success: false, error: "无权限操作" };
    }

    const newStatus = approve ? "approved" : "rejected";

    await db
      .update(teamMembers)
      .set({
        status: newStatus,
        joinedAt: approve ? new Date() : null,
      })
      .where(eq(teamMembers.id, memberId));

    if (approve) {
      // 更新队伍人数
      await db
        .update(teams)
        .set({ currentMembers: team.currentMembers + 1 })
        .where(eq(teams.id, teamId));
    }

    revalidatePath(`/teams/${teamId}`);

    return { success: true, message: approve ? "已通过申请" : "已拒绝申请" };
  } catch (error) {
    console.error("Failed to review application:", error);
    return { success: false, error: "审核失败" };
  }
}
