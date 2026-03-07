import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq, desc } from "drizzle-orm";
import { getAuth } from "@/lib/auth";

/**
 * GET /api/user/created-teams
 * 获取当前用户创建的所有队伍（包括已取消和已完成的）
 */
export async function GET(request: NextRequest) {
  try {
    // 使用 Better Auth API 验证 session
    const auth = await getAuth();
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json(
        { error: "请先登录" },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    const { env } = await import("@opennextjs/cloudflare").then(m => m.getCloudflareContext({ async: true }));

    if (!env.DB) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    const db = env.DB as D1Database;

    // 使用 Drizzle ORM 查询
    const { drizzle } = await import("drizzle-orm/d1");
    const schema = await import("@/db/schema");
    const { sql } = await import("drizzle-orm");
    const ormDb = drizzle(db, { schema });

    // currentMembers 子查询：动态计算已审核通过的成员数
    const currentMembersSubquery = sql<number>`(
      SELECT COUNT(*) FROM team_members
      WHERE team_members.team_id = ${schema.teams.id}
      AND team_members.status = 'approved'
    )`;

    // 查询用户创建的所有队伍（不排除任何状态）
    const result = await ormDb
      .select({
        id: schema.teams.id,
        locationId: schema.teams.locationId,
        routeId: schema.teams.routeId,
        leaderId: schema.teams.leaderId,
        title: schema.teams.title,
        description: schema.teams.description,
        startTime: schema.teams.startTime,
        endTime: schema.teams.endTime,
        durationMin: schema.teams.durationMin,
        maxMembers: schema.teams.maxMembers,
        requirements: schema.teams.requirements,
        icon: schema.teams.icon,
        status: schema.teams.status,
        createdAt: schema.teams.createdAt,
        updatedAt: schema.teams.updatedAt,
        currentMembers: currentMembersSubquery,
        leaderImage: schema.users.image,
        leaderName: schema.users.name,
        leaderLevel: schema.users.level,
      })
      .from(schema.teams)
      .innerJoin(schema.users, eq(schema.users.id, schema.teams.leaderId))
      .where(eq(schema.teams.leaderId, userId))
      .orderBy(desc(schema.teams.createdAt));

    // 格式化返回数据
    const teams = result.map((row) => {
      const startDate = new Date(row.startTime);
      const date = startDate.toISOString().split('T')[0];
      const time = startDate.toTimeString().slice(0, 5);
      const endDate = new Date(row.endTime);
      const durationHours = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60));

      return {
        id: row.id,
        locationId: row.locationId,
        routeId: row.routeId,
        title: row.title,
        description: row.description || '',
        date,
        time,
        duration: `${durationHours}小时`,
        durationMin: row.durationMin || durationHours * 60,
        maxMembers: row.maxMembers,
        currentMembers: row.currentMembers,
        icon: row.icon || '⛰️',
        requirements: (() => {
          try {
            if (row.requirements && typeof row.requirements === 'string') {
              return JSON.parse(row.requirements);
            }
            return [];
          } catch (error) {
            console.error(`Failed to parse requirements for team ${row.id}:`, error);
            return [];
          }
        })(),
        status: row.status,
        createdAt: row.createdAt,
        leader: {
          id: row.leaderId,
          name: row.leaderName,
          avatar: row.leaderImage || '',
          level: (row.leaderLevel || 'beginner') as 'beginner' | 'intermediate' | 'advanced' | 'expert',
          completedHikes: 0,
          bio: '',
        },
      };
    });

    return NextResponse.json({
      success: true,
      teams,
    });
  } catch (error) {
    console.error("Get created teams error:", error);
    return NextResponse.json(
      { error: "获取创建的队伍失败", message: (error as Error).message },
      { status: 500 }
    );
  }
}
