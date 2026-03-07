import { NextRequest, NextResponse } from "next/server";
import { eq, and, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { getAuth } from "@/lib/auth";
import { copy } from "@/lib/copy";

/**
 * POST /api/teams/join
 * 申请加入队伍
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

    // 初始化 Drizzle ORM
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

    const body = await request.json() as { teamId?: string };
    const { teamId } = body;

    if (!teamId) {
      return NextResponse.json(
        { error: "缺少队伍ID" },
        { status: 400 }
      );
    }

    // 获取队伍信息
    const teamResult = await ormDb.query.teams.findFirst({
      where: eq(schema.teams.id, teamId),
    });

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

    // 检查是否已满（通过 SQL COUNT 动态计算）
    const [{ approvedCount }] = await ormDb
      .select({ approvedCount: sql<number>`count(*)` })
      .from(schema.teamMembers)
      .where(and(eq(schema.teamMembers.teamId, teamId), eq(schema.teamMembers.status, "approved")));

    if (approvedCount >= teamResult.maxMembers) {
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
