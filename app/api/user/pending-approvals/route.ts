import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { getAuth } from "@/lib/auth";

// 动态导入 @opennextjs/cloudflare 以避免构建时错误
const getCloudflareContext = async () => {
  const mod = await import("@opennextjs/cloudflare");
  return mod.getCloudflareContext({ async: true });
};

/**
 * GET /api/user/pending-approvals
 * 获取当前用户作为队长需要审批的所有申请
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
    const { eq, and, desc, inArray } = await import("drizzle-orm");
    const ormDb = drizzle(db, { schema });

    // 获取用户作为队长的所有队伍
    const leaderTeams = await ormDb.query.teams.findMany({
      where: eq(schema.teams.leaderId, session.user.id),
      columns: {
        id: true,
        title: true,
        coverImage: true,
        startTime: true,
        maxMembers: true,
        currentMembers: true,
      },
    });

    if (leaderTeams.length === 0) {
      return NextResponse.json({
        success: true,
        approvals: [],
        total: 0,
      });
    }

    const teamIds = leaderTeams.map((t) => t.id);

    // 获取所有待审核的申请
    const applications = await ormDb.query.teamMembers.findMany({
      where: and(
        eq(schema.teamMembers.status, "pending"),
        inArray(schema.teamMembers.teamId, teamIds)
      ),
      with: {
        team: {
          columns: {
            id: true,
            title: true,
            startTime: true,
            maxMembers: true,
            currentMembers: true,
          },
          with: {
            location: {
              columns: {
                id: true,
                name: true,
                coverImage: true,
              },
            },
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
      orderBy: [desc(schema.teamMembers.createdAt)],
    });

    // 格式化返回数据
    const formattedApprovals = applications.map((app) => {
      const startDate = app.team?.startTime ? new Date(app.team.startTime) : null;

      return {
        id: app.id,
        teamId: app.teamId,
        userId: app.userId,
        createdAt: app.createdAt,
        team: app.team ? {
          id: app.team.id,
          title: app.team.title,
          date: startDate ? startDate.toISOString().split('T')[0] : null,
          time: startDate ? startDate.toTimeString().slice(0, 5) : null,
          currentMembers: app.team.currentMembers,
          maxMembers: app.team.maxMembers,
          location: app.team.location ? {
            id: app.team.location.id,
            name: app.team.location.name,
            coverImage: app.team.location.coverImage,
          } : null,
        } : null,
        applicant: app.user ? {
          id: app.user.id,
          name: app.user.name,
          image: app.user.image,
          bio: app.user.bio,
          level: app.user.level,
        } : null,
      };
    });

    return NextResponse.json({
      success: true,
      approvals: formattedApprovals,
      total: formattedApprovals.length,
    });
  } catch (error) {
    console.error("Get pending approvals error:", error);
    return NextResponse.json(
      { error: "获取待审批列表失败", message: (error as Error).message },
      { status: 500 }
    );
  }
}
