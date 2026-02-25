import { NextRequest, NextResponse } from "next/server";

const getCloudflareContext = async () => {
  const mod = await import("@opennextjs/cloudflare");
  return mod.getCloudflareContext();
};

/**
 * GET /api/locations-debug
 * 调试端点，用于记录 locations 加载状态
 */
export async function POST(request: NextRequest) {
  try {
    const { env } = await getCloudflareContext();
    console.error("[Debug API] Received:", await request.json());
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Debug API] Error:", error);
    return NextResponse.json({ error: "Debug API error" }, { status: 500 });
  }
}
