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
    const teamResult = await db.prepare(
      "SELECT * FROM teams WHERE id = ?"
    ).bind(teamId).first();

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
    if (teamResult.current_members >= teamResult.max_members) {
      return NextResponse.json(
        { error: "队伍已满" },
        { status: 400 }
      );
    }

    // 检查是否已申请或已加入
    const existingResult = await db.prepare(
      "SELECT * FROM team_members WHERE team_id = ? AND user_id = ?"
    ).bind(teamId, userId).first();

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
        await db.prepare(
          "UPDATE team_members SET status = ?, created_at = ? WHERE id = ?"
        ).bind("pending", new Date().toISOString(), existingResult.id).run();

        return NextResponse.json({
          success: true,
          message: "重新申请已提交",
        });
      }
    }

    // 创建申请
    const memberId = `tm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    await db.prepare(
      "INSERT INTO team_members (id, team_id, user_id, role, status, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).bind(
      memberId,
      teamId,
      userId,
      "member",
      "pending",
      new Date().toISOString()
    ).run();

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
