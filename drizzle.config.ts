import { defineConfig } from "drizzle-kit";

// 判断是否为生产环境
const isProduction = process.env.NODE_ENV === "production";
const hasCloudflareCreds =
  process.env.CLOUDFLARE_ACCOUNT_ID &&
  process.env.CLOUDFLARE_DATABASE_ID &&
  process.env.CLOUDFLARE_D1_TOKEN;

// 如果有 Cloudflare 凭证，使用 D1 HTTP 驱动；否则使用 SQLite 本地驱动
const driver = hasCloudflareCreds ? "d1-http" : undefined;

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  driver: driver as "d1-http" | undefined,
  dbCredentials: hasCloudflareCreds
    ? {
        accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
        databaseId: process.env.CLOUDFLARE_DATABASE_ID!,
        token: process.env.CLOUDFLARE_D1_TOKEN!,
      }
    : {
        url: process.env.LOCAL_DB_PATH || "./local.db",
      },
  verbose: true,
  strict: true,
});
