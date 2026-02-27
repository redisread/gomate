import Database from "better-sqlite3";
import * as fs from "fs";
import * as path from "path";

// 查找本地 D1 数据库路径
function findLocalD1Path(): string {
  if (process.env.LOCAL_DB_PATH) {
    return process.env.LOCAL_DB_PATH;
  }
  const d1Dir = path.join(__dirname, "../.wrangler/state/v3/d1/miniflare-D1DatabaseObject");
  if (fs.existsSync(d1Dir)) {
    const files = fs.readdirSync(d1Dir).filter((f) => f.endsWith(".sqlite"));
    if (files.length > 0) {
      return path.join(d1Dir, files[0]);
    }
  }
  throw new Error(
    "找不到本地 D1 数据库。请先运行 `npm run dev` 初始化本地环境，或设置 LOCAL_DB_PATH 环境变量。"
  );
}

// 从 drizzle journal 中按顺序读取迁移文件
function getMigrationFiles(): string[] {
  const drizzleDir = path.join(__dirname, "../drizzle");
  const journalPath = path.join(drizzleDir, "meta/_journal.json");

  if (!fs.existsSync(journalPath)) {
    throw new Error("找不到 drizzle journal 文件。请先运行 `npm run db:generate`。");
  }

  const journal = JSON.parse(fs.readFileSync(journalPath, "utf-8"));
  const entries: { idx: number; tag: string }[] = journal.entries;

  return entries
    .sort((a, b) => a.idx - b.idx)
    .map((entry) => {
      const filePath = path.join(drizzleDir, `${entry.tag}.sql`);
      if (!fs.existsSync(filePath)) {
        throw new Error(`迁移文件不存在: ${filePath}`);
      }
      return filePath;
    });
}

const dbPath = findLocalD1Path();
console.log(`📂 数据库路径: ${dbPath}`);

const sqlite = new Database(dbPath);

console.log("🔄 开始执行数据库迁移...\n");

const migrationFiles = getMigrationFiles();
console.log(`📄 找到 ${migrationFiles.length} 个迁移文件\n`);

try {
  for (const filePath of migrationFiles) {
    const fileName = path.basename(filePath);
    console.log(`  ▸ 执行: ${fileName}`);

    const migrationSql = fs.readFileSync(filePath, "utf-8");
    const statements = migrationSql.split("--> statement-breakpoint");

    for (const stmt of statements) {
      const cleanStmt = stmt.trim();
      if (!cleanStmt) continue;
      sqlite.exec(cleanStmt);
    }
  }

  console.log("\n✅ 迁移完成！");
  console.log(`📁 数据库文件: ${dbPath}`);
} catch (error) {
  console.error("\n❌ 迁移失败:", error);
  process.exit(1);
}

sqlite.close();
