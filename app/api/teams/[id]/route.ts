import { NextRequest, NextResponse } from "next/server";
import { teams as mockTeams, getLocationById } from "@/lib/data/mock";

// 动态导入 @opennextjs/cloudflare 以避免构建时错误
const getCloudflareContext = async () => {
  const mod = await import("@opennextjs/cloudflare");
  return mod.getCloudflareContext();
};

// 从 mock 数据获取队伍
function getMockTeamById(id: string) {
  const team = mockTeams.find(t => t.id === id);
  if (!team) return null;

  // 获取地点信息
  const location = getLocationById(team.locationId);

  return {
    ...team,
    leader: {
      ...team.leader,
      avatar: team.leader.avatar || '',
      level: team.leader.level,
      completedHikes: team.leader.completedHikes || 0,
      bio: team.leader.bio || '',
    },
  };
}

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

    // 如果数据库中没有找到，尝试从 mock 数据获取
    if (!team) {
      const mockTeam = getMockTeamById(id);
      if (mockTeam) {
        return NextResponse.json({
          success: true,
          team: mockTeam,
        });
      }
      return NextResponse.json(
        { error: "队伍不存在" },
        { status: 404 }
      );
    }

    // 从 startTime 提取日期和时间
    const startDate = new Date(team.startTime);
    const date = startDate.toISOString().split('T')[0];
    const time = startDate.toTimeString().slice(0, 5);

    // 计算活动时长
    const endDate = new Date(team.endTime);
    const durationHours = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60));
    const duration = `${durationHours}小时`;

    // 映射状态
    const statusMap: Record<string, 'open' | 'full' | 'closed'> = {
      'recruiting': 'open',
      'full': 'full',
      'ongoing': 'closed',
      'completed': 'closed',
      'cancelled': 'closed',
    };

    // 格式化返回数据，符合前端 Team 类型
    const formattedTeam = {
      id: team.id,
      locationId: team.locationId,
      title: team.title,
      description: team.description || '',
      date,
      time,
      duration,
      maxMembers: team.maxMembers,
      currentMembers: team.currentMembers,
      requirements: team.requirements ? JSON.parse(team.requirements) : [],
      status: statusMap[team.status] || 'open',
      createdAt: team.createdAt,
      leader: team.leader ? {
        id: team.leader.id,
        name: team.leader.name,
        avatar: team.leader.image || '',
        level: (team.leader.experience || 'beginner') as 'beginner' | 'intermediate' | 'advanced' | 'expert',
        completedHikes: 0,
        bio: '',
      } : {
        id: 'unknown',
        name: '未知用户',
        avatar: '',
        level: 'beginner' as const,
        completedHikes: 0,
        bio: '',
      },
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
