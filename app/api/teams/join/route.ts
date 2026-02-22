import { NextRequest, NextResponse } from "next/server";
import { eq, and, gt } from "drizzle-orm";

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
    const { drizzle } = await import("drizzle-orm/d1");
    const schema = await import("@/db/schema");
    const ormDb = drizzle(db, { schema });

    // 查询 session（expiresAt 需大于当前时间，且 mode: "timestamp" 需传 Date 对象）
    const now = new Date();

    const sessions = await ormDb.query.sessions.findMany({
      where: and(
        eq(schema.sessions.token, token),
        gt(schema.sessions.expiresAt, now)
      ),
      limit: 1,
    });

    const session = sessions[0];
    if (!session) {
      return null;
    }

    // 查询用户
    const users = await ormDb.query.users.findMany({
      where: eq(schema.users.id, session.userId),
      limit: 1,
    });

    const user = users[0];
    if (!user) {
      return null;
    }

    return { userId: session.userId, user };
  } catch (error) {
    console.error("Validate session error:", error);
    return null;
  }
}

/**
 * POST /api/teams/join
 * 申请加入队伍
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

    // 初始化 Drizzle ORM
    const { drizzle } = await import("drizzle-orm/d1");
    const schema = await import("@/db/schema");
    const ormDb = drizzle(db, { schema });

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
    const { teamId } = body;

    if (!teamId) {
      return NextResponse.json(
        { error: "缺少队伍ID" },
        { status: 400 }
      );
    }

    // 获取队伍信息
    const teams = await ormDb.query.teams.findMany({
      where: eq(schema.teams.id, teamId),
      limit: 1,
    });
    const teamResult = teams[0];

    if (!teamResult) {
      return NextResponse.json(
        { error: "队伍不存在" },
        { status: 404 }
      );
    }

    // 检查队伍状态
    if (teamResult.status !== "recruiting") {
      return NextResponse.json(
        { error: "该队伍当前不接受新成员" },
        { status: 400 }
      );
    }

    // 检查是否已满
    if (teamResult.currentMembers >= teamResult.maxMembers) {
      return NextResponse.json(
        { error: "队伍已满" },
        { status: 400 }
      );
    }

    // 检查是否已申请或已加入
    const existingMembers = await ormDb.query.teamMembers.findMany({
      where: and(
        eq(schema.teamMembers.teamId, teamId),
        eq(schema.teamMembers.userId, userId)
      ),
      limit: 1,
    });
    const existingResult = existingMembers[0];

    if (existingResult) {
      if (existingResult.status === "approved") {
        return NextResponse.json(
          { error: "你已经是该队伍的成员" },
          { status: 400 }
        );
      }
      if (existingResult.status === "pending") {
        return NextResponse.json(
          { error: "你已经提交了申请，请等待审核" },
          { status: 400 }
        );
      }
      if (existingResult.status === "rejected") {
        // 更新为重新申请
        await ormDb.update(schema.teamMembers)
          .set({ status: "pending", createdAt: new Date() })
          .where(eq(schema.teamMembers.id, existingResult.id));

        return NextResponse.json({
          success: true,
          message: "重新申请已提交",
        });
      }
    }

    // 创建申请
    const memberId = `tm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    await ormDb.insert(schema.teamMembers).values({
      id: memberId,
      teamId,
      userId,
      role: "member",
      status: "pending",
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: "申请已提交，等待队长审核",
    });
  } catch (error) {
    console.error("Join team error:", error);
    return NextResponse.json(
      { error: "申请加入失败", message: (error as Error).message },
      { status: 500 }
    );
  }
}
