import { NextRequest, NextResponse } from "next/server";

// 动态导入 @opennextjs/cloudflare 以避免构建时错误
const getCloudflareContext = async () => {
  const mod = await import("@opennextjs/cloudflare");
  return mod.getCloudflareContext();
};

// 从 cookie 获取 session token
function getSessionTokenFromCookie(request: NextRequest): string | null {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(";");
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split("=");
    // Better Auth 使用 better-auth.session_token 作为 cookie 名称
    if (name === "better-auth.session_token") {
      // cookie 格式: tokenId.signature
      // 数据库存储的是 tokenId 部分
      const fullToken = decodeURIComponent(value);
      const tokenId = fullToken.split(".")[0];
      return tokenId;
    }
  }
  return null;
}

// 验证 session 并获取用户信息
async function validateSession(
  db: D1Database,
  token: string
): Promise<{ userId: string; user: Record<string, unknown> } | null> {
  try {
    // Better Auth 使用秒级时间戳，需要转换为秒进行比较
    const nowInSeconds = Math.floor(Date.now() / 1000);

    // 查询 session
    const session = await db.prepare(
      "SELECT * FROM sessions WHERE token = ? AND expires_at > ?"
    ).bind(token, nowInSeconds).first();

    if (!session) {
      return null;
    }

    // 查询用户
    const user = await db.prepare(
      "SELECT * FROM users WHERE id = ?"
    ).bind(session.user_id).first();

    if (!user) {
      return null;
    }

    return { userId: session.user_id as string, user };
  } catch (error) {
    console.error("Validate session error:", error);
    return null;
  }
}

/**
 * POST /api/teams
 * 创建新队伍
 */
export async function POST(request: NextRequest) {
  try {
    const { env } = await getCloudflareContext();

    if (!env.DB) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    const db = env.DB as D1Database;

    // 获取 session token
    const token = getSessionTokenFromCookie(request);
    if (!token) {
      return NextResponse.json(
        { error: "请先登录" },
        { status: 401 }
      );
    }

    // 验证 session
    const sessionData = await validateSession(db, token);
    if (!sessionData) {
      return NextResponse.json(
        { error: "登录已过期，请重新登录" },
        { status: 401 }
      );
    }

    const userId = sessionData.userId;

    const body = await request.json();
    const {
      locationId,
      title,
      description,
      date,
      time,
      maxMembers,
      requirements,
    } = body;

    // 验证必填字段
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

    // 估算结束时间（根据时长，默认为开始时间后4小时）
    const endTime = new Date(startTime.getTime() + 4 * 60 * 60 * 1000);

    // 生成队伍ID
    const teamId = `team-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // 使用 Drizzle ORM 插入队伍记录
    const { drizzle } = await import("drizzle-orm/d1");
    const schema = await import("@/db/schema");
    const ormDb = drizzle(db, { schema });

    const now = new Date();
    await ormDb.insert(schema.teams).values({
      id: teamId,
      locationId,
      leaderId: userId,
      title,
      description: description || null,
      startTime: startTime,
      endTime: endTime,
      maxMembers,
      currentMembers: 1,
      requirements: requirements ? JSON.stringify(requirements) : null,
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
      role: "leader",
      status: "approved",
      joinedAt: now,
      createdAt: now,
    });

    return NextResponse.json({
      success: true,
      team: {
        id: teamId,
        locationId,
        leaderId: userId,
        title,
        description,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        maxMembers,
        currentMembers: 1,
        requirements,
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
    const { eq, desc, and, ne } = await import("drizzle-orm");
    const ormDb = drizzle(db, { schema });

    let result: typeof schema.teams.$inferSelect[];

    if (userId && includeJoined) {
      // 查询用户加入的队伍（非自己创建的）
      // 使用 innerJoin 来获取团队成员信息并过滤
      const queryResult = await ormDb
        .select({
          teams: schema.teams,
          leader: schema.users,
        })
        .from(schema.teams)
        .innerJoin(schema.teamMembers, eq(schema.teamMembers.teamId, schema.teams.id))
        .innerJoin(schema.users, eq(schema.users.id, schema.teams.leaderId))
        .where(and(
          eq(schema.teamMembers.userId, userId),
          ne(schema.teams.leaderId, userId), // 排除用户自己创建的队伍
          eq(schema.teamMembers.status, "approved") // 只包含已批准的成员
        ))
        .orderBy(desc(schema.teams.createdAt));

      result = queryResult.map(({ teams, leader }) => ({
        ...teams,
        leader, // 添加关联的用户数据
      }));
    } else if (locationId) {
      // 按地点ID查询队伍
      result = await ormDb.query.teams.findMany({
        where: eq(schema.teams.locationId, locationId),
        with: {
          leader: true,
        },
        orderBy: desc(schema.teams.createdAt),
      });
    } else {
      // 获取所有队伍
      result = await ormDb.query.teams.findMany({
        with: {
          leader: true,
        },
        orderBy: desc(schema.teams.createdAt),
      });
    }

    // 状态映射
    const statusMap: Record<string, 'open' | 'full' | 'closed'> = {
      'recruiting': 'open',
      'full': 'full',
      'ongoing': 'closed',
      'completed': 'closed',
      'cancelled': 'closed',
    };

    // 格式化返回数据，符合前端 Team 类型
    const teams = result.map((row) => {
      const startDate = new Date(row.startTime);
      const date = startDate.toISOString().split('T')[0];
      const time = startDate.toTimeString().slice(0, 5);
      const endDate = new Date(row.endTime);
      const durationHours = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60));

      return {
        id: row.id,
        locationId: row.locationId,
        title: row.title,
        description: row.description || '',
        date,
        time,
        duration: `${durationHours}小时`,
        maxMembers: row.maxMembers,
        currentMembers: row.currentMembers,
        requirements: row.requirements ? JSON.parse(row.requirements) : [],
        status: statusMap[row.status] || 'open',
        createdAt: row.createdAt,
        leader: row.leader ? {
          id: row.leader.id,
          name: row.leader.name,
          avatar: row.leader.image || '',
          level: (row.leader.experience || 'beginner') as 'beginner' | 'intermediate' | 'advanced' | 'expert',
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
