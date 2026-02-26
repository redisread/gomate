import { NextRequest, NextResponse } from "next/server";

// 动态导入 @opennextjs/cloudflare 以避免构建时错误
const getCloudflareContext = async () => {
  const mod = await import("@opennextjs/cloudflare");
  return mod.getCloudflareContext();
};

/**
 * POST /api/auth/forgot-password
 * 发送密码重置邮件
 */
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "邮箱地址不能为空" },
        { status: 400 }
      );
    }

    // 邮箱格式验证
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "邮箱格式不正确" },
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

    // 构建重置链接的回调 URL
    const baseUrl = env.NEXT_PUBLIC_APP_URL || "http://localhost:8787";
    const redirectTo = `${baseUrl}/reset-password`;

    // 使用 Better Auth 的 requestPasswordReset 方法
    // 注意：即使邮箱不存在，也会返回成功（防止枚举用户）
    await auth.api.requestPasswordReset({
      body: { email, redirectTo }
    });

    return NextResponse.json({
      success: true,
      message: "如果该邮箱已注册，我们将发送重置密码链接",
    });
  } catch (error) {
    console.error("Forgot password error:", error);

    // 如果用户不存在，Better Auth 会抛出错误
    // 但为了安全，我们仍然返回成功消息
    const errorMessage = (error as Error).message;

    if (errorMessage.includes("user") || errorMessage.includes("not found")) {
      return NextResponse.json({
        success: true,
        message: "如果该邮箱已注册，我们将发送重置密码链接",
      });
    }

    return NextResponse.json(
      {
        error: "发送重置邮件失败，请稍后重试",
        message: errorMessage,
      },
      { status: 500 }
    );
  }
}