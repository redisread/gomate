import type { NextRequest } from "next/server";
import { createAuth } from "@/lib/auth";

// 动态导入 @opennextjs/cloudflare 以避免构建时错误
const getCloudflareContext = async () => {
  const mod = await import("@opennextjs/cloudflare");
  return mod.getCloudflareContext();
};

// 统一的请求处理器
async function handleRequest(request: NextRequest) {
  try {
    const { env } = await getCloudflareContext();
    if (!env.DB) {
      throw new Error("D1 database binding not found");
    }

    // 使用共享的 createAuth，传入完整的 env（包含 RESEND_API_KEY 等）
    const auth = createAuth({
      DB: env.DB as D1Database,
      RESEND_API_KEY: env.RESEND_API_KEY as string | undefined,
      RESEND_FROM_EMAIL: env.RESEND_FROM_EMAIL as string | undefined,
      NEXT_PUBLIC_APP_URL: env.NEXT_PUBLIC_APP_URL as string | undefined,
    });

    // Better Auth 1.1.0 的 handler 在 auth 对象上
    const handler = (auth as unknown as { handler: (req: NextRequest) => Promise<Response> }).handler;

    if (!handler || typeof handler !== 'function') {
      throw new Error("Auth handler not found");
    }

    const response = await handler(request);

    // 如果响应是错误，记录详细信息用于调试
    if (!response.ok) {
      try {
        const clonedResponse = response.clone();
        const body = await clonedResponse.json();
        console.error("Better Auth error:", JSON.stringify(body));
      } catch {
        // 忽略解析错误
      }
    }

    return response;
  } catch (error) {
    console.error("Auth error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: (error as Error).message
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}

export async function GET(request: NextRequest) {
  return handleRequest(request);
}

export async function POST(request: NextRequest) {
  return handleRequest(request);
}

// 支持其他 HTTP 方法
export async function PUT(request: NextRequest) {
  return handleRequest(request);
}

export async function PATCH(request: NextRequest) {
  return handleRequest(request);
}

export async function DELETE(request: NextRequest) {
  return handleRequest(request);
}
