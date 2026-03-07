import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { getAuth } from "@/lib/auth";
import { getRandomTeamIcon } from "@/lib/constants";
import { updateExpiredTeams } from "@/lib/team-status";
import { copy } from "@/lib/copy";

/**
 * POST /api/teams
 * 创建新队伍
 */
export async function POST(request: NextRequest) {
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

    // 使用 Drizzle ORM 检查用户是否已填写微信号
    const { drizzle } = await import("drizzle-orm/d1");
    const schema = await import("@/db/schema");
    const ormDb = drizzle(db, { schema });

    // 检查用户是否已填写微信号
    const userRecord = await ormDb
      .select({ wechat: schema.users.wechat })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .then(rows => rows[0]);

    if (!userRecord?.wechat) {
      return NextResponse.json(
        { error: copy.errors.wechatRequired },
        { status: 400 }
      );
    }

    const body = await request.json() as {
      locationId?: string;
      routeId?: string;
      title?: string;
      description?: string;
      date?: string;
      time?: string;
      duration?: string;
      durationMin?: number;
      maxMembers?: number;
      requirements?: string[];
    };
    const {
      locationId,
      routeId,
      title,
      description,
      date,
      time,
      duration,
      durationMin,
      maxMembers,
      requirements,
    } = body;

    // 验证必填字段（routeId 改为可选）
    if (!locationId || !title || !date || !time || !maxMembers) {
      return NextResponse.json(
        { error: "缺少必填字段" },
        { status: 400 }
      );
    }

    // 解析日期时间
    const startTime = new Date(`${date}T${time}`);
    if (isNaN(startTime.getTime())) {
      return NextResponse.json(
        { error: "无效的日期或时间格式" },
        { status: 400 }
      );
    }

    // 计算活动时长（分钟），优先使用传入的 durationMin，否则解析 duration 字符串
    const durationMinutes = durationMin || (duration
      ? parseFloat(duration.replace(/[^0-9.]/g, "")) * 60 || 240
      : 240);
    const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

    // 生成队伍ID
    const teamId = `team-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const now = new Date();
    const teamIcon = getRandomTeamIcon();
    await ormDb.insert(schema.teams).values({
      id: teamId,
      locationId,
      routeId,
      leaderId: userId,
      title,
      description: description || null,
      startTime: startTime,
      endTime: endTime,
      durationMin: durationMinutes,
      maxMembers,
      requirements: requirements ? JSON.stringify(requirements) : null,
      icon: teamIcon,
      status: "recruiting",
      createdAt: now,
      updatedAt: now,
    });

    // 创建领队成员记录
    const memberId = `tm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    await ormDb.insert(schema.teamMembers).values({
      id: memberId,
      teamId,
      userId,
      status: "approved",
      joinedAt: now,
      createdAt: now,
    });

    return NextResponse.json({
      success: true,
      team: {
        id: teamId,
        locationId,
        routeId,
        leaderId: userId,
        title,
        description,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        durationMin: durationMinutes,
        maxMembers,
        currentMembers: 1, // 创建时队长为第一个成员
        requirements,
        icon: teamIcon,
        status: "recruiting",
        createdAt: now.toISOString(),
      },
    });
  } catch (error) {
    console.error("Create team error:", error);
    return NextResponse.json(
      { error: "创建队伍失败", message: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/teams
 * 获取队伍列表
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get("locationId");
    const userId = searchParams.get("userId"); // 新增：按用户ID查询用户加入的队伍
    const includeJoined = searchParams.get("includeJoined") === "true"; // 新增：是否包含用户加入的队伍

    const { env } = await import("@opennextjs/cloudflare").then(m => m.getCloudflareContext({ async: true }));

    if (!env.DB) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    const db = env.DB as D1Database;

    // 自动更新已过期的 formed 状态队伍为 completed
    await updateExpiredTeams(db);

    // 使用 Drizzle ORM 查询
    const { drizzle } = await import("drizzle-orm/d1");
    const schema = await import("@/db/schema");
    const { eq, desc, and, ne, sql, not } = await import("drizzle-orm");
    const ormDb = drizzle(db, { schema });

    // currentMembers 子查询：动态计算已审核通过的成员数
    const currentMembersSubquery = sql<number>`(
      SELECT COUNT(*) FROM team_members
      WHERE team_members.team_id = ${schema.teams.id}
      AND team_members.status = 'approved'
    )`;

    // 公共列选择（teams 字段 + currentMembers 子查询）
    const teamColumns = {
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
    };

    type TeamRow = {
      id: string;
      locationId: string;
      routeId: string;
      leaderId: string;
      title: string;
      description: string | null;
      startTime: Date;
      endTime: Date;
      durationMin: number | null;
      maxMembers: number;
      requirements: string | null;
      icon: string;
      status: string;
      createdAt: Date;
      updatedAt: Date;
      currentMembers: number;
      leaderImage: string | null;
      leaderName: string;
      leaderLevel: string | null;
    };

    let result: TeamRow[];

    if (userId && includeJoined) {
      result = await ormDb
        .select(teamColumns)
        .from(schema.teams)
        .innerJoin(schema.teamMembers, eq(schema.teamMembers.teamId, schema.teams.id))
        .innerJoin(schema.users, eq(schema.users.id, schema.teams.leaderId))
        .where(and(
          eq(schema.teamMembers.userId, userId),
          ne(schema.teams.leaderId, userId),
          eq(schema.teamMembers.status, "approved")
        ))
        .orderBy(desc(schema.teams.createdAt)) as TeamRow[];
    } else if (locationId) {
      result = await ormDb
        .select(teamColumns)
        .from(schema.teams)
        .innerJoin(schema.users, eq(schema.users.id, schema.teams.leaderId))
        .where(eq(schema.teams.locationId, locationId))
        .orderBy(desc(schema.teams.createdAt)) as TeamRow[];
    } else {
      // 探索队伍列表：排除已取消和已完成的队伍
      result = await ormDb
        .select(teamColumns)
        .from(schema.teams)
        .innerJoin(schema.users, eq(schema.users.id, schema.teams.leaderId))
        .where(and(
          ne(schema.teams.status, "cancelled"),
          ne(schema.teams.status, "completed")
        ))
        .orderBy(desc(schema.teams.createdAt)) as TeamRow[];
    }

    // 格式化返回数据，符合前端 Team 类型（直接使用数据库原始 status 值）
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
        icon: row.icon || '⭿️',
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
    console.error("Get teams error:", error);
    return NextResponse.json(
      { error: "获取队伍列表失败", message: (error as Error).message },
      { status: 500 }
    );
  }
}
