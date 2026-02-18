import type { NextRequest } from "next/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "@/db/schema";

// 动态导入 @opennextjs/cloudflare 以避免构建时错误
const getCloudflareContext = async () => {
  const mod = await import("@opennextjs/cloudflare");
  return mod.getCloudflareContext();
};

// 创建 D1 数据库 auth 实例
const createAuth = (d1Database: D1Database) => {
  const db = drizzle(d1Database, { schema });

  return betterAuth({
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
    user: {
      additionalFields: {
        bio: {
          type: "string",
          required: false,
          defaultValue: "",
        },
        experience: {
          type: "string",
          required: false,
          defaultValue: "beginner",
        },
      },
    },
    secret: process.env.BETTER_AUTH_SECRET || "dev-secret-key",
    baseURL: process.env.BETTER_AUTH_URL || "http://localhost:8787",
  });
};

export async function GET(request: NextRequest) {
  try {
    const { env } = await getCloudflareContext();
    if (!env.DB) {
      throw new Error("D1 database binding not found");
    }
    const auth = createAuth(env.DB as D1Database);
    return auth.handler(request);
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
    const auth = createAuth(env.DB as D1Database);
    return auth.handler(request);
  } catch (error) {
    console.error("Auth error:", error);
    return new Response(
      JSON.stringify({ error: "Internal Server Error", message: (error as Error).message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
