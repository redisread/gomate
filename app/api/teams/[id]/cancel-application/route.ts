import { cancelApplication } from "@/app/actions/teams";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: teamId } = await params;
    const result = await cancelApplication(teamId);
    return Response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "取消申请失败";
    return Response.json({ error: message }, { status: 400 });
  }
}
