import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { headers } from "next/headers";
import { getAuth } from "@/lib/auth";
import { revalidateTag } from "next/cache";
import { copy } from "@/lib/copy";

// 动态导入 @opennextjs/cloudflare 以避免构建时错误
const getCloudflareContext = async () => {
  const mod = await import("@opennextjs/cloudflare");
  return mod.getCloudflareContext({ async: true });
};

/**
 * POST /api/teams/[id]/members/[userId]/remove
 * 移除队伍成员（仅队长可操作）
 */
export async function POST(
  _request: Request,
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
        { success: false, error: copy.errors.loginRequired },
        { status: 401 }
      );
    }

    const { id: teamId, userId } = await params;

    if (!teamId || !userId) {
      return NextResponse.json(
        { success: false, error: copy.errors.missingTeamId },
        { status: 400 }
      );
    }

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
        { success: false, error: "只有队长可以移除成员" },
        { status: 403 }
      );
    }

    // 不能移除自己
    if (userId === session.user.id) {
      return NextResponse.json(
        { success: false, error: copy.teams.cannotRemoveSelf },
        { status: 400 }
      );
    }

    // 获取成员记录
    const members = await ormDb.query.teamMembers.findMany({
      where: and(
        eq(schema.teamMembers.teamId, teamId),
        eq(schema.teamMembers.userId, userId),
        eq(schema.teamMembers.status, "approved")
      ),
      limit: 1,
    });
    const membership = members[0];

    if (!membership) {
      return NextResponse.json(
        { success: false, error: "该用户不是队伍成员" },
        { status: 404 }
      );
    }

    // 不能移除队长
    if (membership.userId === team.leaderId) {
      return NextResponse.json(
        { success: false, error: copy.teams.cannotRemoveLeader },
        { status: 400 }
      );
    }

    // 删除成员记录
    await ormDb
      .delete(schema.teamMembers)
      .where(eq(schema.teamMembers.id, membership.id));

    // 更新队伍人数
    const newMemberCount = Math.max(1, team.currentMembers - 1);

    await ormDb
      .update(schema.teams)
      .set({
        currentMembers: newMemberCount,
        status: newMemberCount < team.maxMembers ? "recruiting" : team.status,
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
      message: copy.teams.removeMemberSuccess,
    });
  } catch (error) {
    console.error("Remove member error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : copy.teams.removeMemberFailed,
      },
      { status: 500 }
    );
  }
}