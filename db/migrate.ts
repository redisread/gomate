import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

// 数据库连接
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("请设置 DATABASE_URL 环境变量");
  process.exit(1);
}

// 迁移函数
async function runMigration() {
  console.log("开始数据库迁移...\n");

  // 创建连接
  const migrationClient = postgres(connectionString, { max: 1 });
  const db = drizzle(migrationClient);

  try {
    // 执行迁移
    await migrate(db, { migrationsFolder: "./drizzle" });
    console.log("✅ 数据库迁移完成！");
  } catch (error) {
    console.error("❌ 迁移失败:", error);
    process.exit(1);
  } finally {
    await migrationClient.end();
  }
}

runMigration();
