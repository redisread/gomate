import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { users } from "@/db/schema";
import { copy } from "@/lib/copy";

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
        { error: copy.errors.emailEmpty },
        { status: 400 }
      );
    }

    // 邮箱格式验证
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: copy.errors.emailInvalid },
        { status: 400 }
      );
    }

    const { env } = await getCloudflareContext();

    if (!env.DB) {
      return NextResponse.json(
        { error: copy.errors.dbNotConfigured },
        { status: 500 }
      );
    }

    // 动态导入 Drizzle 客户端
    const { createD1Client } = await import("@/db");
    const db = createD1Client(env.DB as D1Database);

    // 先检查用户是否存在
    const existingUser = await db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (existingUser.length === 0) {
      return NextResponse.json(
        { error: copy.errors.emailNotRegistered },
        { status: 400 }
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
    const baseUrl = env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const redirectTo = `${baseUrl}/reset-password`;

    // 使用 Better Auth 的 requestPasswordReset 方法
    await auth.api.requestPasswordReset({
      body: { email, redirectTo }
    });

    return NextResponse.json({
      success: true,
      message: copy.errors.resetEmailSent,
    });
  } catch (error) {
    console.error("Forgot password error:", error);

    return NextResponse.json(
      {
        error: copy.errors.resetEmailFailed,
        message: (error as Error).message,
      },
      { status: 500 }
    );
  }
}