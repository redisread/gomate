import type { NextRequest } from "next/server";
import { betterAuth } from "better-auth";

// 动态导入 @opennextjs/cloudflare 以避免构建时错误
const getCloudflareContext = async () => {
  const mod = await import("@opennextjs/cloudflare");
  return mod.getCloudflareContext();
};

// 缓存 auth 实例（在 Workers 环境中，每个 isolate 会保持这个缓存）
let authInstance: ReturnType<typeof betterAuth> | null = null;
let dbInstance: D1Database | null = null;

// 动态导入 drizzle 相关依赖（仅在 Cloudflare Workers 环境中使用）
const getAuth = async (d1Database: D1Database) => {
  // 如果数据库实例相同，直接返回缓存的 auth 实例
  if (authInstance && dbInstance === d1Database) {
    return authInstance;
  }

  const { drizzleAdapter } = await import("better-auth/adapters/drizzle");
  const { drizzle } = await import("drizzle-orm/d1");
  const schema = await import("@/db/schema");

  const db = drizzle(d1Database, { schema });

  authInstance = betterAuth({
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema: {
        user: schema.users,
        session: schema.sessions,
        account: schema.accounts,
        verification: schema.verifications,
      },
    }),
    emailAndPassword: {
      enabled: true,
      autoSignIn: true,
      minPasswordLength: 6,
      maxPasswordLength: 128,
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7 天
      updateAge: 60 * 60 * 24, // 1 天
    },
    user: {
      additionalFields: {
        bio: {
          type: "string",
          required: false,
          defaultValue: "",
        },
        level: {
          type: "string",
          required: false,
          defaultValue: "beginner",
        },
      },
    },
    secret: process.env.BETTER_AUTH_SECRET || "dev-secret-key",
    baseURL: process.env.BETTER_AUTH_URL || "http://localhost:8787",
  });

  dbInstance = d1Database;
  return authInstance;
};

// 统一的请求处理器
async function handleRequest(request: NextRequest) {
  try {
    const { env } = await getCloudflareContext();
    if (!env.DB) {
      throw new Error("D1 database binding not found");
    }

    const auth = await getAuth(env.DB as D1Database);

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
