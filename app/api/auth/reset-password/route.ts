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

    // 动态导入 auth 配置（避免构建时依赖 DB）
    const { createAuth } = await import("@/lib/auth");
    const auth = createAuth({
      DB: env.DB as D1Database,
      RESEND_API_KEY: env.RESEND_API_KEY as string | undefined,
      RESEND_FROM_EMAIL: env.RESEND_FROM_EMAIL as string | undefined,
      NEXT_PUBLIC_APP_URL: env.NEXT_PUBLIC_APP_URL as string | undefined,
    });

    // 使用 Better Auth 的 resetPassword 方法
    await auth.api.resetPassword({
      body: { token, newPassword }
    });

    return NextResponse.json({
      success: true,
      message: "密码重置成功",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    const errorMessage = (error as Error).message;

    // 根据错误类型返回不同的消息
    if (errorMessage.includes("token") || errorMessage.includes("expired") || errorMessage.includes("invalid")) {
      return NextResponse.json(
        { error: "重置链接已过期或无效，请重新申请" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: "重置密码失败，请稍后重试",
        message: errorMessage,
      },
      { status: 500 }
    );
  }
}