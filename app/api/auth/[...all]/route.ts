import type { NextRequest } from "next/server";
import { betterAuth } from "better-auth";

// 动态导入 @opennextjs/cloudflare 以避免构建时错误
const getCloudflareContext = async () => {
  const mod = await import("@opennextjs/cloudflare");
  return mod.getCloudflareContext();
};

// 动态导入 drizzle 相关依赖（仅在 Cloudflare Workers 环境中使用）
const createAuth = async (d1Database: D1Database) => {
  const { drizzleAdapter } = await import("better-auth/adapters/drizzle");
  const { drizzle } = await import("drizzle-orm/d1");
  const schema = await import("@/db/schema");

  console.log("Schema loaded:", Object.keys(schema));

  const db = drizzle(d1Database, { schema });

  // 测试查询
  try {
    const result = await db.select().from(schema.users).limit(1);
    console.log("Test query result:", result);
  } catch (e) {
    console.error("Test query failed:", e);
  }

  const auth = betterAuth({
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
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
    },
    secret: process.env.BETTER_AUTH_SECRET || "dev-secret-key",
    baseURL: process.env.BETTER_AUTH_URL || "http://localhost:8787",
  });

  return auth;
};

export async function GET(request: NextRequest) {
  try {
    const { env } = await getCloudflareContext();
    if (!env.DB) {
      throw new Error("D1 database binding not found");
    }
    const auth = await createAuth(env.DB as D1Database);
    // @ts-ignore - handler might be in different location
    const handler = auth.handler || auth.api?.handler;
    if (!handler || typeof handler !== 'function') {
      throw new Error("Auth handler not found");
    }
    return handler(request);
  } catch (error) {
    console.error("Auth error:", error);
    return new Response(
      JSON.stringify({ error: "Internal Server Error", message: (error as Error).message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { env } = await getCloudflareContext();
    if (!env.DB) {
      throw new Error("D1 database binding not found");
    }
    const auth = await createAuth(env.DB as D1Database);
    // @ts-ignore - handler might be in different location
    const handler = auth.handler || auth.api?.handler;
    if (!handler || typeof handler !== 'function') {
      throw new Error("Auth handler not found");
    }
    const response = await handler(request);

    // 如果响应是错误，记录详细信息
    if (!response.ok) {
      const clonedResponse = response.clone();
      const body = await clonedResponse.json();
      console.error("Better Auth error:", JSON.stringify(body));
    }

    return response;
  } catch (error) {
    console.error("Auth error:", error);
    return new Response(
      JSON.stringify({ error: "Internal Server Error", message: (error as Error).message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
