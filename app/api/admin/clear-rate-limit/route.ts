import { NextRequest, NextResponse } from "next/server";
import { resetRateLimit } from "@/lib/rate-limit";

/**
 * POST /api/admin/clear-rate-limit
 * 清除速率限制（仅用于开发和测试）
 */
export async function POST(request: NextRequest) {
  try {
    const { identifier } = await request.json();

    if (!identifier || typeof identifier !== "string") {
      return NextResponse.json(
        { error: "请提供要清除的标识符（邮箱）" },
        { status: 400 }
      );
    }

    // 清除忘记密码的速率限制
    const rateLimitKey = `forgot_password:${identifier.toLowerCase()}`;
    resetRateLimit(rateLimitKey);

    return NextResponse.json({
      success: true,
      message: `已清除 ${identifier} 的速率限制`,
    });
  } catch (error) {
    console.error("Clear rate limit error:", error);
    return NextResponse.json(
      { error: "清除失败", message: (error as Error).message },
      { status: 500 }
    );
  }
}
