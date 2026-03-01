import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { headers } from "next/headers";
import { getAuth } from "@/lib/auth";
import { revalidateTag } from "next/cache";

// 动态导入 @opennextjs/cloudflare 以避免构建时错误
const getCloudflareContext = async () => {
  const mod = await import("@opennextjs/cloudflare");
  return mod.getCloudflareContext();
};

/**
 * POST /api/teams/[id]/members/[userId]/reject
 * 拒绝成员申请（仅队长可操作）
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    // 验证登录状态
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

    const { id: teamId, userId } = await params;
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

    // 获取队伍信息
    const teams = await ormDb.query.teams.findMany({
      where: eq(schema.teams.id, teamId),
      limit: 1,
    });
    const team = teams[0];

    if (!team) {
      return NextResponse.json(
        { error: "队伍不存在" },
        { status: 404 }
      );
    }

    // 检查是否是队长
    if (team.leaderId !== session.user.id) {
      return NextResponse.json(
        { error: "只有队长可以审核成员" },
        { status: 403 }
      );
    }

    // 获取成员申请
    const members = await ormDb.query.teamMembers.findMany({
      where: and(
        eq(schema.teamMembers.teamId, teamId),
        eq(schema.teamMembers.userId, userId),
        eq(schema.teamMembers.status, "pending")
      ),
      limit: 1,
    });
    const membership = members[0];

    if (!membership) {
      return NextResponse.json(
        { error: "未找到该成员的申请" },
        { status: 404 }
      );
    }

    // 更新成员状态为拒绝
    await ormDb
      .update(schema.teamMembers)
      .set({
        status: "rejected",
      })
      .where(eq(schema.teamMembers.id, membership.id));

    // 清除缓存
    revalidateTag(`team-${teamId}`);

    return NextResponse.json({
      success: true,
      message: "已拒绝申请",
    });
  } catch (error) {
    console.error("Reject member error:", error);
    return NextResponse.json(
      { error: "拒绝申请失败", message: (error as Error).message },
      { status: 500 }
    );
  }
}