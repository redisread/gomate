/**
 * 将本地 D1 数据同步到远程 D1 数据库
 * 使用方法: npx tsx db/seed-to-remote.ts
 */

import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

// 查找本地 D1 数据库路径
function findLocalD1Path(): string {
  const d1Dir = path.join(__dirname, "../.wrangler/state/v3/d1/miniflare-D1DatabaseObject");
  if (fs.existsSync(d1Dir)) {
    const files = fs
      .readdirSync(d1Dir)
      .filter((f) => f.endsWith(".sqlite") && f !== "*.sqlite")
      .sort((a, b) => {
        const statA = fs.statSync(path.join(d1Dir, a));
        const statB = fs.statSync(path.join(d1Dir, b));
        return statB.mtime.getTime() - statA.mtime.getTime();
      });
    if (files.length > 0) {
      return path.join(d1Dir, files[0]);
    }
  }
  throw new Error("找不到本地 D1 数据库");
}

// 定义每个表期望的列（与远程schema保持一致，排除本地旧列）
const tableColumns: Record<string, string[]> = {
  cities: ["id", "adcode", "name", "pinyin", "province", "level", "is_hot", "parent_id", "created_at", "updated_at"],
  locations: ["id", "name", "slug", "subtitle", "description", "address", "city_id", "city_name", "best_season", "cover_image", "images", "coordinates", "extra", "created_at", "updated_at"],
  routes: ["id", "location_id", "city_id", "name", "description", "difficulty", "duration_min", "duration_max", "distance", "elevation", "route_guide", "extra", "created_at", "updated_at"],
  pois: ["id", "name", "description", "coordinates", "category", "images", "extra", "created_at", "updated_at"],
  tags: ["id", "name", "type", "created_at"],
  entity_to_tags: ["id", "entity_id", "entity_type", "tag_id", "created_at"],
  entity_to_pois: ["id", "poi_id", "entity_type", "entity_id", "role_type", "order", "role_specific_data", "created_at"],
  users: ["id", "name", "nickname", "email", "email_verified", "image", "bio", "gender", "birthday", "level", "completed_hikes", "wechat", "role", "status", "extra", "created_at", "updated_at", "deleted_at"],
  sessions: ["id", "user_id", "token", "expires_at", "ip_address", "user_agent", "created_at", "updated_at"],
  accounts: ["id", "user_id", "account_id", "provider_id", "access_token", "refresh_token", "access_token_expires_at", "refresh_token_expires_at", "scope", "id_token", "password", "expires_at", "created_at", "updated_at"],
  verifications: ["id", "identifier", "value", "expires_at", "created_at", "updated_at"],
  teams: ["id", "location_id", "route_id", "leader_id", "title", "description", "start_time", "end_time", "duration_min", "max_members", "requirements", "icon", "status", "created_at", "updated_at"],
  team_members: ["id", "team_id", "user_id", "status", "joined_at", "status_updated_at", "created_at"],
  password_resets: ["id", "token", "user_id", "email", "expires_at", "used_at", "created_at"],
  user_favorites: ["id", "user_id", "entity_type", "entity_id", "created_at"],
};

// 导出表数据为 SQL INSERT 语句
function exportTableToSql(dbPath: string, tableName: string): string[] {
  try {
    const expectedColumns = tableColumns[tableName];
    if (!expectedColumns) {
      console.log(`  ⚠️ 表 ${tableName} 未定义列配置，跳过`);
      return [];
    }

    // 获取所有数据
    const dataOutput = execSync(
      `sqlite3 "${dbPath}" "SELECT * FROM ${tableName}"`,
      { encoding: "utf-8" }
    );

    if (!dataOutput.trim()) {
      console.log(`  表 ${tableName} 为空，跳过`);
      return [];
    }

    // 获取本地列名
    const columnsOutput = execSync(
      `sqlite3 "${dbPath}" "PRAGMA table_info(${tableName})"`,
      { encoding: "utf-8" }
    );

    const localColumns = columnsOutput
      .trim()
      .split("\n")
      .map((line) => line.split("|")[1]);

    // 创建本地列名到索引的映射
    const columnIndexMap = new Map(localColumns.map((col, idx) => [col, idx]));

    // 生成 INSERT OR IGNORE 语句
    const lines = dataOutput.trim().split("\n");
    const sqlStatements: string[] = [];

    for (const line of lines) {
      // 分割值
      const allValues = line.split("|");

      // 只选择期望列对应的值
      const values = expectedColumns.map(col => {
        const idx = columnIndexMap.get(col);
        if (idx === undefined) return "NULL";
        const v = allValues[idx];
        if (v === "" || v === undefined) return "NULL";
        // 转义单引号
        const escaped = v.replace(/'/g, "''");
        return `'${escaped}'`;
      });

      const sql = `INSERT OR IGNORE INTO ${tableName} (${expectedColumns.map(c => `"${c}"`).join(", ")}) VALUES (${values.join(", ")});`;
      sqlStatements.push(sql);
    }

    console.log(`  ✓ ${tableName}: ${sqlStatements.length} 行`);
    return sqlStatements;
  } catch (error) {
    console.error(`  ✗ 导出 ${tableName} 失败:`, error);
    return [];
  }
}

// 主函数
async function main() {
  console.log("🚀 开始同步数据到远程 D1...\n");

  // 1. 查找本地数据库
  const dbPath = findLocalD1Path();
  console.log(`📂 本地数据库: ${dbPath}\n`);

  // 2. 检查本地是否有数据
  const tables = [
    "cities",
    "locations",
    "routes",
    "pois",
    "tags",
    "entity_to_tags",
    "entity_to_pois",
    "users",
    "accounts",
    "teams",
    "team_members",
  ];

  console.log("📊 检查本地数据...");
  const allSqlStatements: string[] = [];

  // 按依赖顺序导出（先导出无依赖的表）
  const exportOrder = [
    "cities", // 无依赖
    "locations", // 依赖 cities
    "routes", // 依赖 locations, cities
    "pois", // 无依赖
    "tags", // 无依赖
    "users", // 无依赖
    "accounts", // 依赖 users
    "entity_to_tags", // 依赖 tags, locations/routes
    "entity_to_pois", // 依赖 pois, locations/routes
    "teams", // 依赖 locations, routes, users
    "team_members", // 依赖 teams, users
  ];

  for (const table of exportOrder) {
    const statements = exportTableToSql(dbPath, table);
    allSqlStatements.push(...statements);
  }

  console.log(`\n📋 共生成 ${allSqlStatements.length} 条 SQL 语句\n`);

  if (allSqlStatements.length === 0) {
    console.log("⚠️ 没有数据需要同步");
    console.log("请先运行: npm run db:seed");
    process.exit(1);
  }

  // 3. 将 SQL 写入临时文件
  const tempSqlFile = path.join(__dirname, "../.temp-sync-data.sql");
  fs.writeFileSync(tempSqlFile, allSqlStatements.join("\n"));
  console.log(`📝 SQL 文件已生成: ${tempSqlFile}\n`);

  // 4. 执行到远程 D1
  console.log("☁️ 正在同步到远程 D1...");
  console.log("⚠️ 这可能需要一些时间，请耐心等待...\n");

  try {
    const output = execSync(
      `npx wrangler d1 execute gomate-db --remote --file="${tempSqlFile}"`,
      {
        encoding: "utf-8",
        stdio: "inherit",
        timeout: 300000, // 5 分钟超时
      }
    );
    console.log(output);
    console.log("\n✅ 数据同步完成！");
  } catch (error) {
    console.error("\n❌ 同步失败:", error);
    process.exit(1);
  } finally {
    // 清理临时文件
    if (fs.existsSync(tempSqlFile)) {
      fs.unlinkSync(tempSqlFile);
      console.log("🧹 临时文件已清理");
    }
  }
}

main().catch((error) => {
  console.error("程序错误:", error);
  process.exit(1);
});
