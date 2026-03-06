import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
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
 * POST /api/teams/[id]/form
 * 组建队伍（仅队长可操作）
 */
export async function POST(
  request: Request,
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

    // 解析请求体获取 isUnderfilled 参数
    const body = await request.json().catch(() => ({})) as { isUnderfilled?: boolean };
    const isUnderfilled = body.isUnderfilled === true;

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
        { success: false, error: "只有队长可以组建队伍" },
        { status: 403 }
      );
    }

    // 检查队伍状态
    if (team.status !== "recruiting" && team.status !== "full") {
      return NextResponse.json(
        { success: false, error: "当前队伍状态无法组建" },
        { status: 400 }
      );
    }

    // 检查是否有成员（至少需要队长自己，通过 SQL COUNT 动态计算）
    const [{ approvedCount }] = await ormDb
      .select({ approvedCount: sql<number>`count(*)` })
      .from(schema.teamMembers)
      .where(eq(schema.teamMembers.teamId, teamId));

    if (approvedCount < 1) {
      return NextResponse.json(
        { success: false, error: "队伍至少需要1人才能组建" },
        { status: 400 }
      );
    }

    // 更新队伍状态为已组建
    await ormDb
      .update(schema.teams)
      .set({
        status: "formed",
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
      message: copy.teams.formTeamSuccess,
      isUnderfilled,
    });
  } catch (error) {
    console.error("Form team error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : copy.teams.formTeamFailed,
      },
      { status: 500 }
    );
  }
}