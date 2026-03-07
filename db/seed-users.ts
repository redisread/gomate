import Database from "better-sqlite3";
import { hashPassword } from "better-auth/crypto";
import * as path from "path";
import * as fs from "fs";

// 查找本地 D1 数据库路径
function findLocalD1Path(): string {
  if (process.env.LOCAL_DB_PATH) {
    return process.env.LOCAL_DB_PATH;
  }
  const d1Dir = path.join(__dirname, "../.wrangler/state/v3/d1/miniflare-D1DatabaseObject");
  if (fs.existsSync(d1Dir)) {
    // 排除名为 "*.sqlite" 的无效文件，只选择有效的哈希文件名
    const files = fs.readdirSync(d1Dir).filter((f) =>
      f.endsWith(".sqlite") && f !== "*.sqlite" && f.length > 10
    );
    if (files.length > 0) {
      return path.join(d1Dir, files[0]);
    }
  }
  throw new Error(
    "找不到本地 D1 数据库。请先运行 `npm run dev` 初始化本地环境，或设置 LOCAL_DB_PATH 环境变量。"
  );
}

const dbPath = findLocalD1Path();
console.log(`📂 数据库路径: ${dbPath}\n`);

const sqlite = new Database(dbPath);

// 测试用户数据
const testUsers = [
  {
    id: "test-user-1",
    name: "测试用户1",
    email: "wujiahong2013@gmail.com",
    role: "admin",
  },
  {
    id: "test-user-2",
    name: "测试用户2",
    email: "1427298682@qq.com",
    role: "admin",
  },
  {
    id: "test-user-3",
    name: "测试用户3",
    email: "1427298683@qq.com",
    role: "user",
  },
];

async function seedUsers() {
  console.log("🌱 开始插入测试用户...\n");

  const now = Date.now();
  const password = await hashPassword("11111111");

  // 插入 users 表
  const insertUserStmt = sqlite.prepare(`
    INSERT OR IGNORE INTO users (id, name, email, email_verified, role, level, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // 插入 accounts 表（Better Auth 凭据）
  const insertAccountStmt = sqlite.prepare(`
    INSERT OR IGNORE INTO accounts (id, user_id, account_id, provider_id, password, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  for (let i = 0; i < testUsers.length; i++) {
    const user = testUsers[i];

    // 插入用户
    insertUserStmt.run(
      user.id,
      user.name,
      user.email,
      1, // email_verified
      user.role,
      "beginner", // level
      now,
      now
    );

    // 插入账号凭据
    insertAccountStmt.run(
      `acc-test-${i + 1}`,
      user.id,
      user.email,
      "credential",
      password,
      now,
      now
    );

    console.log(`  ✓ 用户: ${user.email} (${user.role})`);
  }

  console.log("\n✅ 测试用户插入完成！");
  console.log("\n📊 账号信息:");
  console.log("  • wujiahong2013@gmail.com (管理员) - 密码: 11111111");
  console.log("  • 1427298682@qq.com (管理员) - 密码: 11111111");
  console.log("  • 1427298683@qq.com (普通用户) - 密码: 11111111");

  sqlite.close();
}

seedUsers().catch((error) => {
  console.error("❌ 插入失败:", error);
  process.exit(1);
});
