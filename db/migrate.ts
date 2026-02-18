import Database from "better-sqlite3";
import * as fs from "fs";
import * as path from "path";

const localDbPath = process.env.LOCAL_DB_PATH || "./local.db";
const sqlite = new Database(localDbPath);

console.log("🔄 开始执行数据库迁移...\n");

// 读取迁移文件
const migrationPath = path.join(__dirname, "../drizzle/0000_zippy_bulldozer.sql");
const migrationSql = fs.readFileSync(migrationPath, "utf-8");

// 分割 SQL 语句
const statements = migrationSql.split(";--> statement-breakpoint");

console.log(`📄 找到 ${statements.length} 个迁移语句\n`);

// 执行每个语句
try {
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i].trim();
    if (!stmt) continue;

    // 清理语句
    const cleanStmt = stmt.replace(/--> statement-breakpoint/g, "").trim();
    if (!cleanStmt) continue;

    console.log(`  [${i + 1}/${statements.length}] 执行 SQL...`);
    sqlite.exec(cleanStmt);
  }

  console.log("\n✅ 迁移完成！");
  console.log(`📁 数据库文件: ${localDbPath}`);

} catch (error) {
  console.error("\n❌ 迁移失败:", error);
  process.exit(1);
}

sqlite.close();
