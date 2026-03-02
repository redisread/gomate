import { NextResponse } from "next/server";
import { leaveTeam } from "@/app/actions/teams";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function POST(_request: Request, { params }: RouteParams) {
  try {
    const { id: teamId } = await params;

    const result = await leaveTeam(teamId);

    return NextResponse.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error("Leave team error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "退出队伍失败",
      },
      { status: 400 }
    );
  }
}