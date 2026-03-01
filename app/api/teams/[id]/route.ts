import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { headers } from "next/headers";

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
    const { eq, and } = await import("drizzle-orm");
    const ormDb = drizzle(db, { schema });

    const teams = await ormDb.query.teams.findMany({
      where: eq(schema.teams.id, id),
      with: {
        leader: true,
        members: {
          with: {
            user: true,
          },
        },
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

    // 获取当前用户（如果已登录）
    let currentUserId: string | null = null;
    try {
      const auth = await getAuth();
      const session = await auth.api.getSession({
        headers: await headers(),
      });
      currentUserId = session?.user?.id || null;
    } catch {
      // 用户未登录，忽略
    }

    // 检查当前用户是否是该队伍的成员（已审核通过）
    let isTeamMember = false;
    if (currentUserId) {
      const membership = team.members?.find(
        (m: { userId: string; status: string }) =>
          m.userId === currentUserId && m.status === "approved"
      );
      isTeamMember = !!membership;
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

    // 格式化已审核通过的成员列表
    const approvedMembers = team.members
      ?.filter((m: { status: string }) => m.status === "approved")
      .map((m: { userId: string; role: string; joinedAt: Date | null; user: { id: string; name: string; image: string | null; bio: string | null; level: string | null; wechat: string | null } }) => ({
        id: m.user?.id || m.userId,
        name: m.user?.name || '未知用户',
        image: m.user?.image || null,
        bio: m.user?.bio || null,
        level: m.user?.level || 'beginner',
        role: m.role,
        joinedAt: m.joinedAt,
        // 只有队伍成员可以看到其他成员的微信号
        wechat: isTeamMember ? (m.user?.wechat || undefined) : undefined,
      })) || [];

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
        level: (team.leader.level || 'beginner') as 'beginner' | 'intermediate' | 'advanced' | 'expert',
        completedHikes: 0,
        bio: team.leader.bio || '',
        // 只有队长自己或队伍成员可以看到队长的微信号
        wechat: (isTeamMember || currentUserId === team.leader.id) ? (team.leader.wechat || '') : undefined,
      } : {
        id: 'unknown',
        name: '未知用户',
        avatar: '',
        level: 'beginner' as const,
        completedHikes: 0,
        bio: '',
      },
      members: approvedMembers,
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
