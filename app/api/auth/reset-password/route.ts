import { NextRequest, NextResponse } from "next/server";

// 动态导入 @opennextjs/cloudflare 以避免构建时错误
const getCloudflareContext = async () => {
  const mod = await import("@opennextjs/cloudflare");
  return mod.getCloudflareContext();
};

/**
 * POST /api/auth/reset-password
 * 重置密码
 */
export async function POST(request: NextRequest) {
  try {
    const { token, newPassword } = await request.json();

    // 验证参数
    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { error: "重置令牌不能为空" },
        { status: 400 }
      );
    }

    if (!newPassword || typeof newPassword !== "string") {
      return NextResponse.json(
        { error: "新密码不能为空" },
        { status: 400 }
      );
    }

    // 密码长度验证
    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "密码长度至少为6位" },
        { status: 400 }
      );
    }

    if (newPassword.length > 128) {
      return NextResponse.json(
        { error: "密码长度不能超过128位" },
        { status: 400 }
      );
    }

    const { env } = await getCloudflareContext();

    if (!env.DB) {
      return NextResponse.json(
        { error: "数据库未配置" },
        { status: 500 }
      );
    }

    // 调用 Better Auth 的 reset-password API
    const baseUrl = process.env.BETTER_AUTH_URL || "http://localhost:8787";
    const response = await fetch(`${baseUrl}/api/auth/reset-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token,
        newPassword,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("Better Auth reset password error:", error);

      // 根据错误类型返回不同的消息
      if (error.code === "INVALID_TOKEN" || error.code === "TOKEN_EXPIRED") {
        return NextResponse.json(
          { error: "重置链接已过期或无效，请重新申请" },
          { status: 400 }
        );
      }

      throw new Error(error.message || "重置失败");
    }

    return NextResponse.json({
      success: true,
      message: "密码重置成功",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      {
        error: "重置密码失败，请稍后重试",
        message: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
