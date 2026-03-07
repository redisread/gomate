import { NextRequest, NextResponse } from "next/server";
import { eq, and, ne, sql } from "drizzle-orm";
import { getDB } from "@/db";
import { users, teamMembers, teams } from "@/db/schema";

/**
 * 获取用户公开信息
 * GET /api/users/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;

    const db = await getDB();

    // 查询用户基本信息（排除敏感信息和已删除/禁用用户）
    const userResult = await db
      .select({
        id: users.id,
        name: users.name,
        nickname: users.nickname,
        image: users.image,
        bio: users.bio,
        gender: users.gender,
        birthday: users.birthday,
        level: users.level,
        completedHikes: users.completedHikes,
        extra: users.extra,
        createdAt: users.createdAt,
        status: users.status,
        deletedAt: users.deletedAt,
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (userResult.length === 0) {
      return NextResponse.json(
        { success: false, error: "用户不存在" },
        { status: 404 }
      );
    }

    const user = userResult[0];

    // 检查用户是否被软删除或禁用
    if (user.deletedAt !== null || user.status === "banned") {
      return NextResponse.json(
        { success: false, error: "用户不存在" },
        { status: 404 }
      );
    }

    // 统计用户队伍信息
    // 创建的队伍数（作为领队）
    const createdTeamsResult = await db
      .select({
        count: sql<number>`COUNT(*)`,
      })
      .from(teams)
      .where(eq(teams.leaderId, id));

    // 加入的队伍数（作为成员，不包括自己创建的队伍）
    const joinedTeamsResult = await db
      .select({
        count: sql<number>`COUNT(*)`,
      })
      .from(teamMembers)
      .innerJoin(teams, eq(teamMembers.teamId, teams.id))
      .where(
        and(
          eq(teamMembers.userId, id),
          eq(teamMembers.status, "approved"),
          ne(teams.leaderId, id) // 排除自己作为领队的队伍
        )
      );

    // 完成的队伍数（已完成的队伍中该用户是成员）
    const completedTeamsResult = await db
      .select({
        count: sql<number>`COUNT(*)`,
      })
      .from(teamMembers)
      .innerJoin(teams, eq(teamMembers.teamId, teams.id))
      .where(
        and(
          eq(teamMembers.userId, id),
          eq(teamMembers.status, "approved"),
          eq(teams.status, "completed")
        )
      );

    // 构建响应数据
    const userProfile = {
      id: user.id,
      name: user.name,
      nickname: user.nickname,
      image: user.image,
      bio: user.bio,
      gender: user.gender,
      birthday: user.birthday,
      level: user.level,
      completedHikes: user.completedHikes,
      extra: user.extra,
      createdAt: user.createdAt,
      stats: {
        createdTeams: createdTeamsResult[0]?.count || 0,
        joinedTeams: joinedTeamsResult[0]?.count || 0,
        completedTeams: completedTeamsResult[0]?.count || 0,
      },
    };

    return NextResponse.json({
      success: true,
      user: userProfile,
    });
  } catch (error) {
    console.error("[API Users] Get user profile error:", error);
    return NextResponse.json(
      { success: false, error: "获取用户信息失败" },
      { status: 500 }
    );
  }
}
