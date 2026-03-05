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
 * POST /api/teams/[id]/leave-request
 * 申请退出队伍（已组建的队伍）
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
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
      limit: 1,
    });
    const team = teams[0];

    if (!team) {
      return NextResponse.json(
        { success: false, error: copy.errors.teamNotFound },
        { status: 404 }
      );
    }

    // 检查队伍状态是否为已组建
    if (team.status !== "formed") {
      return NextResponse.json(
        { success: false, error: "只有已组建的队伍需要申请退出" },
        { status: 400 }
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

    // 队长不能申请退出
    if (membership.userId === team.leaderId) {
      return NextResponse.json(
        { success: false, error: copy.errors.leaderCannotLeave },
        { status: 400 }
      );
    }

    // 检查是否已有退出申请
    const leaveRequests = await ormDb.query.teamMembers.findMany({
      where: and(
        eq(schema.teamMembers.teamId, teamId),
        eq(schema.teamMembers.userId, session.user.id),
        eq(schema.teamMembers.status, "leave_pending")
      ),
      limit: 1,
    });

    if (leaveRequests.length > 0) {
      return NextResponse.json(
        { success: false, error: "您已提交退出申请，请等待队长审批" },
        { status: 400 }
      );
    }

    // 更新成员状态为退出申请中
    await ormDb
      .update(schema.teamMembers)
      .set({
        status: "leave_pending",
      })
      .where(eq(schema.teamMembers.id, membership.id));

    // 清除缓存
    revalidateTag(`team-${teamId}`);

    return NextResponse.json({
      success: true,
      message: copy.teams.requestLeaveSuccess,
    });
  } catch (error) {
    console.error("Request leave error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : copy.teams.requestLeaveFailed,
      },
      { status: 500 }
    );
  }
}