import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { headers } from "next/headers";
import { getAuth } from "@/lib/auth";

// 动态导入 @opennextjs/cloudflare 以避免构建时错误
const getCloudflareContext = async () => {
  const mod = await import("@opennextjs/cloudflare");
  return mod.getCloudflareContext({ async: true });
};

/**
 * GET /api/teams/[id]/my-status
 * 获取当前用户在该队伍中的成员状态
 */
export async function GET(
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
      return NextResponse.json({
        success: true,
        status: null,
      });
    }

    const { id: teamId } = await params;
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

    // 获取用户在该队伍中的成员记录
    const members = await ormDb.query.teamMembers.findMany({
      where: and(
        eq(schema.teamMembers.teamId, teamId),
        eq(schema.teamMembers.userId, session.user.id)
      ),
      limit: 1,
    });

    const membership = members[0];

    if (!membership) {
      return NextResponse.json({
        success: true,
        status: null,
      });
    }

    return NextResponse.json({
      success: true,
      status: membership.status,
    });
  } catch (error) {
    console.error("Get my status error:", error);
    return NextResponse.json(
      { error: "获取状态失败", message: (error as Error).message },
      { status: 500 }
    );
  }
}