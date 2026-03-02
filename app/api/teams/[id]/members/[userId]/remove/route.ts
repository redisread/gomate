import { NextResponse } from "next/server";
import { removeMember } from "@/app/actions/teams";
import { copy } from "@/lib/copy";

interface RouteParams {
  params: Promise<{
    id: string;
    userId: string;
  }>;
}

export async function POST(_request: Request, { params }: RouteParams) {
  try {
    const { id: teamId, userId } = await params;

    if (!teamId || !userId) {
      return NextResponse.json(
        { success: false, error: copy.errors.missingTeamId },
        { status: 400 }
      );
    }

    const result = await removeMember(teamId, userId);

    return NextResponse.json(result);
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