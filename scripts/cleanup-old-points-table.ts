/**
 * 清理旧的 points 表
 * 在确认迁移成功并测试通过后，删除旧的 points 表
 *
 * ⚠️ 警告：此操作不可逆，请确保已备份数据
 */

import Database from "better-sqlite3";
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

// 查找数据库文件
const dbDir = ".wrangler/state/v3/d1/miniflare-D1DatabaseObject";
const files = fs.readdirSync(dbDir).filter((f) => f.endsWith(".sqlite"));
if (files.length === 0) {
  console.error("❌ 未找到数据库文件");
  process.exit(1);
}

const dbPath = path.join(dbDir, files[0]);
console.log(`📁 使用数据库: ${dbPath}\n`);

const db = new Database(dbPath);

// 创建 readline 接口用于用户确认
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function askQuestion(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function main() {
  console.log("⚠️  警告：此操作将删除旧的 points 表\n");

  // 检查 points 表是否存在
  const pointsTableExists = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='points'"
    )
    .get();

  if (!pointsTableExists) {
    console.log("✅ points 表已不存在，无需清理");
    rl.close();
    db.close();
    return;
  }

  // 显示 points 表信息
  const pointsCount = db
    .prepare("SELECT COUNT(*) as count FROM points")
    .get() as { count: number };
  console.log(`📊 points 表信息:`);
  console.log(`   - 记录数: ${pointsCount.count}\n`);

  // 检查新表
  const poisCount = db.prepare("SELECT COUNT(*) as count FROM pois").get() as {
    count: number;
  };
  const entityToPoisCount = db
    .prepare("SELECT COUNT(*) as count FROM entity_to_pois")
    .get() as { count: number };

  console.log(`📊 新表信息:`);
  console.log(`   - POI 记录数: ${poisCount.count}`);
  console.log(`   - 角色关联记录数: ${entityToPoisCount.count}\n`);

  // 验证数据迁移是否完整
  if (entityToPoisCount.count !== pointsCount.count) {
    console.error(
      "❌ 错误：新表的角色关联数量与旧表的 point 数量不一致"
    );
    console.error("   请先运行 verify-pois-migration.ts 验证数据完整性");
    rl.close();
    db.close();
    process.exit(1);
  }

  console.log("✅ 数据数量验证通过\n");

  // 第一次确认
  const answer1 = await askQuestion(
    "❓ 确认要删除 points 表吗？此操作不可逆！(yes/no): "
  );

  if (answer1.toLowerCase() !== "yes") {
    console.log("❌ 取消操作");
    rl.close();
    db.close();
    return;
  }

  // 第二次确认
  const answer2 = await askQuestion(
    "❓ 再次确认：您确定已经测试过应用功能正常吗？(yes/no): "
  );

  if (answer2.toLowerCase() !== "yes") {
    console.log("❌ 取消操作");
    rl.close();
    db.close();
    return;
  }

  console.log("\n🗑️  开始删除 points 表...\n");

  try {
    // 备份 points 表数据到临时表
    console.log("📦 创建备份...");
    db.prepare("CREATE TABLE points_backup AS SELECT * FROM points").run();
    console.log("✅ 备份已创建（表名：points_backup）\n");

    // 删除 points 表
    console.log("🗑️  删除 points 表...");
    db.prepare("DROP TABLE points").run();
    console.log("✅ points 表已删除\n");

    console.log("✅ 清理完成！\n");
    console.log("💡 提示：");
    console.log("   - 备份表 points_backup 已创建，如需恢复可使用该表");
    console.log(
      "   - 如果确认一切正常，可以手动删除 points_backup 表以释放空间"
    );
    console.log(
      "   - 删除命令：sqlite3 <数据库文件> 'DROP TABLE points_backup;'\n"
    );
  } catch (error) {
    console.error("❌ 删除失败:", error);
    console.error("   如果已创建备份，可以使用以下命令恢复：");
    console.error(
      "   sqlite3 <数据库文件> 'CREATE TABLE points AS SELECT * FROM points_backup; DROP TABLE points_backup;'\n"
    );
    rl.close();
    db.close();
    process.exit(1);
  }

  rl.close();
  db.close();
}

main();
