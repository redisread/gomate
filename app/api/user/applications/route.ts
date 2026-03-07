import { NextRequest, NextResponse } from "next/server";
import { eq, and, desc, inArray } from "drizzle-orm";
import { headers } from "next/headers";
import { getAuth } from "@/lib/auth";

// 动态导入 @opennextjs/cloudflare 以避免构建时错误
const getCloudflareContext = async () => {
  const mod = await import("@opennextjs/cloudflare");
  return mod.getCloudflareContext({ async: true });
};

/**
 * GET /api/user/applications
 * 获取当前用户的所有申请记录
 */
export async function GET(request: NextRequest) {
  try {
    // 验证登录状态
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

    const { env } = await getCloudflareContext();

    if (!env.DB) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    const db = env.DB as D1Database;

    // 初始化 Drizzle ORM
    const { drizzle } = await import("drizzle-orm/d1");
    const schema = await import("@/db/schema");
    const ormDb = drizzle(db, { schema });

    // 获取用户的所有申请记录（包括 pending, approved, rejected）
    const allApplications = await ormDb.query.teamMembers.findMany({
      where: eq(schema.teamMembers.userId, session.user.id),
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
      orderBy: [desc(schema.teamMembers.createdAt)],
    });

    // 过滤掉用户自己是队长的申请记录
    const applications = allApplications.filter(
      (app) => app.team?.leaderId !== session.user.id
    );

    // 格式化返回数据
    const formattedApplications = applications.map((app) => {
      const team = app.team;
      const startDate = team ? new Date(team.startTime) : null;

      return {
        id: app.id,
        status: app.status,
        createdAt: app.createdAt,
        joinedAt: app.joinedAt,
        team: team ? {
          id: team.id,
          title: team.title,
          date: startDate ? startDate.toISOString().split('T')[0] : null,
          time: startDate ? startDate.toTimeString().slice(0, 5) : null,
          currentMembers: team.currentMembers,
          maxMembers: team.maxMembers,
          status: team.status,
          location: team.location ? {
            id: team.location.id,
            name: team.location.name,
            coverImage: team.location.coverImage,
          } : null,
          leader: team.leader ? {
            id: team.leader.id,
            name: team.leader.name,
            image: team.leader.image,
          } : null,
        } : null,
      };
    });

    // 按状态分组统计（基于过滤后的数据）
    const stats = {
      pending: applications.filter((a) => a.status === "pending").length,
      approved: applications.filter((a) => a.status === "approved").length,
      rejected: applications.filter((a) => a.status === "rejected").length,
    };

    return NextResponse.json({
      success: true,
      applications: formattedApplications,
      stats,
    });
  } catch (error) {
    console.error("Get user applications error:", error);
    return NextResponse.json(
      { error: "获取申请列表失败", message: (error as Error).message },
      { status: 500 }
    );
  }
}