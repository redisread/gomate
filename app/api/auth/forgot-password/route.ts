import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, formatRemainingTime } from "@/lib/rate-limit";

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

    // 速率限制：每个邮箱每小时最多5次请求（开发环境）
    // 生产环境建议改为 3次/小时
    const rateLimitKey = `forgot_password:${email.toLowerCase()}`;
    const rateLimit = checkRateLimit(rateLimitKey, 5, 60 * 60 * 1000);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: `请求过于频繁，请${formatRemainingTime(rateLimit.resetTime)}后再试`,
        },
        { status: 429 }
      );
    }

    const { env } = await getCloudflareContext();

    if (!env.DB) {
      return NextResponse.json(
        { error: "数据库未配置" },
        { status: 500 }
      );
    }

    const db = env.DB as D1Database;

    // 检查用户是否存在
    const user = await db.prepare(
      "SELECT id, name FROM users WHERE email = ?"
    ).bind(email.toLowerCase()).first();

    // 无论用户是否存在，都返回相同的成功消息（安全措施）
    if (!user) {
      // 记录尝试但返回成功（防止枚举用户）
      console.log(`Password reset requested for non-existent email: ${email}`);
      return NextResponse.json({
        success: true,
        message: "如果该邮箱已注册，我们将发送重置密码链接",
      });
    }

    // 调用 Better Auth 的 forgot-password API
    const baseUrl = process.env.BETTER_AUTH_URL || "http://localhost:8787";
    const response = await fetch(`${baseUrl}/api/auth/forgot-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: email.toLowerCase(),
        callbackURL: "/reset-password",
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("Better Auth forgot password error:", error);
      throw new Error(error.message || "发送失败");
    }

    return NextResponse.json({
      success: true,
      message: "重置密码链接已发送到您的邮箱",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      {
        error: "发送重置邮件失败，请稍后重试",
        message: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
