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
      "SELECT * FROM sessions WHERE token = ? AND expiresAt > ?"
    ).bind(token, nowInSeconds).first();

    if (!session) {
      return null;
    }

    // 查询用户
    const user = await db.prepare(
      "SELECT * FROM users WHERE id = ?"
    ).bind(session.userId).first();

    if (!user) {
      return null;
    }

    return { userId: session.userId as string, user };
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

    // 使用 D1 直接插入队伍记录
    await db.prepare(`
      INSERT INTO teams (
        id, location_id, leader_id, title, description,
        start_time, end_time, max_members, current_members,
        requirements, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      teamId,
      locationId,
      userId,
      title,
      description || null,
      startTime.toISOString(),
      endTime.toISOString(),
      maxMembers,
      1, // currentMembers: 领队自己
      requirements ? JSON.stringify(requirements) : null,
      "recruiting",
      new Date().toISOString(),
      new Date().toISOString()
    ).run();

    // 创建领队成员记录
    const memberId = `tm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    await db.prepare(`
      INSERT INTO team_members (
        id, team_id, user_id, role, status, joined_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      memberId,
      teamId,
      userId,
      "leader",
      "approved",
      new Date().toISOString(),
      new Date().toISOString()
    ).run();

    const now = new Date().toISOString();
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
        createdAt: now,
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

    const { env } = await getCloudflareContext();

    if (!env.DB) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    const db = env.DB as D1Database;

    let query = `
      SELECT
        t.*,
        u.name as leader_name,
        u.image as leader_image,
        u.experience as leader_experience
      FROM teams t
      LEFT JOIN users u ON t.leader_id = u.id
    `;

    const params: string[] = [];

    if (locationId) {
      query += " WHERE t.location_id = ?";
      params.push(locationId);
    }

    query += " ORDER BY t.created_at DESC";

    const result = await db.prepare(query).bind(...params).all();

    // 格式化返回数据
    const teams = result.results?.map((row: Record<string, unknown>) => ({
      id: row.id,
      locationId: row.location_id,
      leaderId: row.leader_id,
      title: row.title,
      description: row.description,
      startTime: row.start_time,
      endTime: row.end_time,
      maxMembers: row.max_members,
      currentMembers: row.current_members,
      requirements: row.requirements ? JSON.parse(row.requirements as string) : [],
      status: row.status,
      createdAt: row.created_at,
      leader: {
        id: row.leader_id,
        name: row.leader_name,
        avatar: row.leader_image,
        level: row.leader_experience,
      },
    }));

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
