import { NextRequest, NextResponse } from "next/server";
import { eq, and, desc } from "drizzle-orm";
import { headers } from "next/headers";
import { getAuth } from "@/lib/auth";

// 动态导入 @opennextjs/cloudflare 以避免构建时错误
const getCloudflareContext = async () => {
  const mod = await import("@opennextjs/cloudflare");
  return mod.getCloudflareContext();
};

/**
 * GET /api/teams/[id]/applications
 * 获取队伍的待审核申请列表（仅队长可访问）
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: teamId } = await params;
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

    // 获取队伍信息，验证是否是队长
    const teams = await ormDb.query.teams.findMany({
      where: eq(schema.teams.id, teamId),
      limit: 1,
    });
    const team = teams[0];

    if (!team) {
      return NextResponse.json(
        { error: "队伍不存在" },
        { status: 404 }
      );
    }

    // 检查是否是队长
    if (team.leaderId !== session.user.id) {
      return NextResponse.json(
        { error: "只有队长可以查看申请列表" },
        { status: 403 }
      );
    }

    // 获取待审核申请列表
    const applications = await ormDb.query.teamMembers.findMany({
      where: and(
        eq(schema.teamMembers.teamId, teamId),
        eq(schema.teamMembers.status, "pending")
      ),
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
      orderBy: [desc(schema.teamMembers.createdAt)],
    });

    // 格式化返回数据
    const formattedApplications = applications.map((app) => ({
      id: app.id,
      userId: app.userId,
      createdAt: app.createdAt,
      user: app.user ? {
        id: app.user.id,
        name: app.user.name,
        image: app.user.image || null,
        bio: app.user.bio || null,
        level: app.user.level || "beginner",
      } : null,
    }));

    return NextResponse.json({
      success: true,
      applications: formattedApplications,
    });
  } catch (error) {
    console.error("Get applications error:", error);
    return NextResponse.json(
      { error: "获取申请列表失败", message: (error as Error).message },
      { status: 500 }
    );
  }
}