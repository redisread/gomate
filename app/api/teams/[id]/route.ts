import { NextRequest, NextResponse } from "next/server";

// 动态导入 @opennextjs/cloudflare 以避免构建时错误
const getCloudflareContext = async () => {
  const mod = await import("@opennextjs/cloudflare");
  return mod.getCloudflareContext();
};

/**
 * GET /api/teams/[id]
 * 获取单个队伍详情
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { env } = await getCloudflareContext();

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
    const { eq } = await import("drizzle-orm");
    const ormDb = drizzle(db, { schema });

    const teams = await ormDb.query.teams.findMany({
      where: eq(schema.teams.id, id),
      with: {
        leader: true,
      },
      limit: 1,
    });

    const team = teams[0];

    if (!team) {
      return NextResponse.json(
        { error: "队伍不存在" },
        { status: 404 }
      );
    }

    // 格式化返回数据
    const formattedTeam = {
      id: team.id,
      locationId: team.locationId,
      leaderId: team.leaderId,
      title: team.title,
      description: team.description,
      startTime: team.startTime,
      endTime: team.endTime,
      maxMembers: team.maxMembers,
      currentMembers: team.currentMembers,
      requirements: team.requirements ? JSON.parse(team.requirements) : [],
      status: team.status,
      createdAt: team.createdAt,
      leader: team.leader ? {
        id: team.leader.id,
        name: team.leader.name,
        avatar: team.leader.image,
        level: team.leader.experience,
      } : null,
    };

    return NextResponse.json({
      success: true,
      team: formattedTeam,
    });
  } catch (error) {
    console.error("Get team error:", error);
    return NextResponse.json(
      { error: "获取队伍详情失败", message: (error as Error).message },
      { status: 500 }
    );
  }
}
