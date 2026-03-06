import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidateTag } from "next/cache";
import { copy } from "@/lib/copy";

// 动态导入 @opennextjs/cloudflare 以避免构建时错误
const getCloudflareContext = async () => {
  const mod = await import("@opennextjs/cloudflare");
  return mod.getCloudflareContext({ async: true });
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
    const { eq, sql } = await import("drizzle-orm");
    const ormDb = drizzle(db, { schema });

    // currentMembers 子查询：动态计算已审核通过的成员数
    const currentMembersSubquery = sql<number>`(
      SELECT COUNT(*) FROM team_members
      WHERE team_members.team_id = ${schema.teams.id}
      AND team_members.status = 'approved'
    )`;

    const teamsWithCount = await ormDb
      .select({
        id: schema.teams.id,
        locationId: schema.teams.locationId,
        routeId: schema.teams.routeId,
        leaderId: schema.teams.leaderId,
        title: schema.teams.title,
        description: schema.teams.description,
        startTime: schema.teams.startTime,
        endTime: schema.teams.endTime,
        maxMembers: schema.teams.maxMembers,
        requirements: schema.teams.requirements,
        status: schema.teams.status,
        createdAt: schema.teams.createdAt,
        updatedAt: schema.teams.updatedAt,
        currentMembers: currentMembersSubquery,
      })
      .from(schema.teams)
      .where(eq(schema.teams.id, id))
      .limit(1);

    const teamRow = teamsWithCount[0];

    if (!teamRow) {
      return NextResponse.json(
        { error: "队伍不存在" },
        { status: 404 }
      );
    }

    // 单独查询 leader、members 和 route
    const teamWithRelations = await ormDb.query.teams.findFirst({
      where: eq(schema.teams.id, id),
      with: {
        leader: true,
        members: {
          with: {
            user: true,
          },
        },
        route: true,
      },
    });

    const team = teamWithRelations ? { ...teamRow, ...teamWithRelations, currentMembers: teamRow.currentMembers } : null;

    if (!team || !teamWithRelations) {
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

    // 格式化已审核通过和退出申请中的成员列表
    const relevantMembers = team.members
      ?.filter((m: { status: string }) => m.status === "approved" || m.status === "leave_pending")
      .map((m: { userId: string; status: string; joinedAt: Date | null; user: { id: string; name: string; image: string | null; bio: string | null; level: string | null; wechat: string | null; gender: string | null; birthday: Date | number | null; extra: string | null } }) => ({
        id: m.user?.id || m.userId,
        userId: m.userId,
        name: m.user?.name || '未知用户',
        image: m.user?.image || null,
        bio: m.user?.bio || null,
        level: m.user?.level || 'beginner',
        status: m.status,
        joinedAt: m.joinedAt,
        // 只有队伍成员可以看到其他成员的微信号
        wechat: isTeamMember ? (m.user?.wechat || undefined) : undefined,
        gender: m.user?.gender || null,
        birthday: m.user?.birthday || null,
        extra: m.user?.extra || null,
      })) || [];

    // 格式化返回数据，符合前端 Team 类型
    const formattedTeam = {
      id: team.id,
      locationId: team.locationId,
      routeId: team.routeId,
      title: team.title,
      description: team.description || '',
      date,
      time,
      duration,
      maxMembers: team.maxMembers,
      currentMembers: team.currentMembers,
      requirements: team.requirements ? JSON.parse(team.requirements) : [],
      status: team.status,
      createdAt: team.createdAt,
      route: team.route || undefined,
      leader: team.leader ? {
        id: team.leader.id,
        name: team.leader.name,
        avatar: team.leader.image || '',
        level: (team.leader.level || 'beginner') as 'beginner' | 'intermediate' | 'advanced' | 'expert',
        completedHikes: 0,
        bio: team.leader.bio || '',
        // 只有队长自己或队伍成员可以看到队长的微信号
        wechat: (isTeamMember || currentUserId === team.leader.id) ? (team.leader.wechat || '') : undefined,
        gender: team.leader.gender || null,
        birthday: team.leader.birthday || null,
        extra: team.leader.extra || null,
      } : {
        id: 'unknown',
        name: '未知用户',
        avatar: '',
        level: 'beginner' as const,
        completedHikes: 0,
        bio: '',
      },
      members: relevantMembers,
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

/**
 * PUT /api/teams/[id]
 * 更新队伍信息（仅队长可操作）
 */
export async function PUT(
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
        { success: false, error: copy.errors.loginRequired },
        { status: 401 }
      );
    }

    const { id: teamId } = await params;
    const { env } = await getCloudflareContext();

    if (!env.DB) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 500 }
      );
    }

    const db = env.DB as D1Database;

    // 初始化 Drizzle ORM
    const { drizzle } = await import("drizzle-orm/d1");
    const schema = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    const ormDb = drizzle(db, { schema });

    // 获取队伍信息
    const teams = await ormDb.query.teams.findMany({
      where: eq(schema.teams.id, teamId),
      with: {
        location: true,
      },
      limit: 1,
    });
    const team = teams[0];

    if (!team) {
      return NextResponse.json(
        { success: false, error: copy.errors.teamNotFound },
        { status: 404 }
      );
    }

    // 检查是否是队长
    if (team.leaderId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: copy.teams.notLeader },
        { status: 403 }
      );
    }

    // 解析请求体
    const body = await request.json();
    const { title, description, date, time, maxMembers, requirements } = body;

    // 验证必填字段
    if (!title || !date || !time || !maxMembers) {
      return NextResponse.json(
        { success: false, error: "缺少必填字段" },
        { status: 400 }
      );
    }

    // 解析日期时间
    const startTime = new Date(`${date}T${time}`);
    if (isNaN(startTime.getTime())) {
      return NextResponse.json(
        { success: false, error: "无效的日期或时间格式" },
        { status: 400 }
      );
    }

    // 估算结束时间（保持原有时长或默认4小时）
    const originalDuration = team.endTime
      ? new Date(team.endTime).getTime() - new Date(team.startTime).getTime()
      : 4 * 60 * 60 * 1000;
    const endTime = new Date(startTime.getTime() + originalDuration);

    // 更新队伍信息
    await ormDb
      .update(schema.teams)
      .set({
        title,
        description: description || null,
        startTime,
        endTime,
        maxMembers,
        requirements: requirements ? JSON.stringify(requirements) : null,
        status: team.status,
        updatedAt: new Date(),
      })
      .where(eq(schema.teams.id, teamId));

    // 清除缓存
    revalidateTag(`team-${teamId}`);
    revalidateTag("teams");
    if (team.location?.slug) {
      revalidateTag(`location-${team.location.slug}`);
    }

    return NextResponse.json({
      success: true,
      message: copy.teams.editSuccess,
    });
  } catch (error) {
    console.error("Update team error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : copy.teams.editFailed,
      },
      { status: 500 }
    );
  }
}
