import { NextResponse } from "next/server";
import { eq, and, sql } from "drizzle-orm";
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
 * POST /api/teams/[id]/leave
 * 成员退出队伍
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
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

    if (!teamId) {
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

    // 获取成员关系
    const members = await ormDb.query.teamMembers.findMany({
      where: and(
        eq(schema.teamMembers.teamId, teamId),
        eq(schema.teamMembers.userId, session.user.id),
        eq(schema.teamMembers.status, "approved")
      ),
      limit: 1,
    });
    const membership = members[0];

    if (!membership) {
      return NextResponse.json(
        { success: false, error: copy.errors.notMember },
        { status: 400 }
      );
    }

    // 队长不能离开队伍（需要先转让队长或解散队伍）
    if (membership.userId === team.leaderId) {
      return NextResponse.json(
        { success: false, error: copy.errors.leaderCannotLeave },
        { status: 400 }
      );
    }

    // 检查队伍状态是否为已组建
    if (team.status === "formed") {
      return NextResponse.json(
        { success: false, error: copy.teams.cannotLeaveDirectly },
        { status: 400 }
      );
    }

    // 删除成员记录
    await ormDb
      .delete(schema.teamMembers)
      .where(eq(schema.teamMembers.id, membership.id));

    // 重新计算剩余人数并更新队伍状态
    const [{ remainingCount }] = await ormDb
      .select({ remainingCount: sql<number>`count(*)` })
      .from(schema.teamMembers)
      .where(and(eq(schema.teamMembers.teamId, teamId), eq(schema.teamMembers.status, "approved")));

    await ormDb
      .update(schema.teams)
      .set({
        status: remainingCount < team.maxMembers ? "recruiting" : team.status,
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
      message: copy.success.leftTeam,
    });
  } catch (error) {
    console.error("Leave team error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : copy.teams.leaveTeamFailed,
      },
      { status: 500 }
    );
  }
}