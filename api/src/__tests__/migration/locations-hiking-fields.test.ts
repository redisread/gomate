import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { createTestDb } from "../helpers/db";
import { seedCity, seedLocation } from "../helpers/seed";
import * as schema from "../../db/schema";

/**
 * task #151 迁移 SQL 测试：直接对 better-sqlite3 执行 0010 迁移文件里的 UPDATE 语句，
 * 验证主路线回填 + 多路线附录的真实行为（不走 drizzle，SQL 即被测对象）。
 */

// 从迁移文件中提取 UPDATE 语句（ALTER 列在测试 schema 里已存在，跳过）
function migrationUpdates(): string[] {
  const path = new URL("../../../db/migrations/0010_locations_hiking_fields.sql", import.meta.url).pathname;
  const sql = readFileSync(path, "utf-8");
  return sql
    .split("--> statement-breakpoint")
    .map((chunk) =>
      chunk
        .split("\n")
        .filter((line) => !line.trim().startsWith("--"))
        .join("\n")
        .trim()
    )
    .filter((stmt) => stmt.toUpperCase().startsWith("UPDATE"));
}

async function insertRoute(
  db: ReturnType<typeof createTestDb>["db"],
  overrides: Partial<schema.NewRoute> & { locationId: string; cityId: string }
) {
  const id = overrides.id ?? `route_${Math.random().toString(36).slice(2, 10)}`;
  const ts = new Date();
  await db.insert(schema.routes).values({
    id,
    name: `路线_${id}`,
    difficulty: "easy",
    durationMin: 60,
    durationMax: 120,
    distance: 5,
    elevation: 100,
    createdAt: ts,
    updatedAt: ts,
    ...overrides,
  });
  return id;
}

describe("0010_locations_hiking_fields 迁移", () => {
  it("五字段回填取最早创建的路线（主路线规则）", async () => {
    const { db, sqlite } = createTestDb();
    const city = await seedCity(db);
    const loc = await seedLocation(db, city.id, { name: "多路线山" });
    // 后创建的是 easy，先创建的是 hard —— 主路线应取 hard
    await insertRoute(db, {
      locationId: loc.id, cityId: city.id, name: "主峰线", difficulty: "hard",
      durationMin: 210, durationMax: 300, distance: 7, elevation: 801,
      createdAt: new Date("2026-01-01T00:00:00Z"),
    });
    await insertRoute(db, {
      locationId: loc.id, cityId: city.id, name: "休闲线", difficulty: "easy",
      durationMin: 60, durationMax: 90, distance: 2, elevation: 100,
      createdAt: new Date("2026-02-01T00:00:00Z"),
    });

    for (const stmt of migrationUpdates()) sqlite.exec(stmt);

    const row = sqlite.prepare("SELECT difficulty, duration_min, duration_max, distance, elevation FROM locations WHERE id = ?").get(loc.id) as Record<string, unknown>;
    expect(row).toEqual({ difficulty: "hard", duration_min: 210, duration_max: 300, distance: 7, elevation: 801 });
  });

  it("created_at 并列时取插入序（rowid 小者）", async () => {
    const { db, sqlite } = createTestDb();
    const city = await seedCity(db);
    const loc = await seedLocation(db, city.id, { name: "并列山" });
    const sameTs = new Date("2026-01-01T00:00:00Z");
    await insertRoute(db, { locationId: loc.id, cityId: city.id, name: "第一条", difficulty: "moderate", createdAt: sameTs });
    await insertRoute(db, { locationId: loc.id, cityId: city.id, name: "第二条", difficulty: "expert", createdAt: sameTs });

    for (const stmt of migrationUpdates()) sqlite.exec(stmt);

    const row = sqlite.prepare("SELECT difficulty FROM locations WHERE id = ?").get(loc.id) as { difficulty: string };
    expect(row.difficulty).toBe("moderate");
  });

  it("多路线地点追加「另有路线：」附录（不含主路线，按创建序，格式定稿）", async () => {
    const { db, sqlite } = createTestDb();
    const city = await seedCity(db);
    const loc = await seedLocation(db, city.id, { name: "附录山", description: "原始描述。" });
    await insertRoute(db, {
      locationId: loc.id, cityId: city.id, name: "主线",
      difficulty: "moderate", durationMin: 120, durationMax: 180, distance: 5,
      createdAt: new Date("2026-01-01T00:00:00Z"),
    });
    await insertRoute(db, {
      locationId: loc.id, cityId: city.id, name: "挑战线",
      difficulty: "hard", durationMin: 90, durationMax: 150, distance: 4,
      createdAt: new Date("2026-01-02T00:00:00Z"),
    });
    await insertRoute(db, {
      locationId: loc.id, cityId: city.id, name: "长线",
      difficulty: "expert", durationMin: 420, durationMax: 600, distance: 13.5,
      createdAt: new Date("2026-01-03T00:00:00Z"),
    });

    for (const stmt of migrationUpdates()) sqlite.exec(stmt);

    const row = sqlite.prepare("SELECT description FROM locations WHERE id = ?").get(loc.id) as { description: string };
    // 整点小时显示整数、半点显示一位小数；distance 用 %g；主路线「主线」不在附录中
    expect(row.description).toBe(
      "原始描述。\n\n另有路线：挑战线（挑战/1.5-2.5h/4km）；长线（专家/7-10h/13.5km）"
    );
  });

  it("单路线地点只回填五字段，不加附录", async () => {
    const { db, sqlite } = createTestDb();
    const city = await seedCity(db);
    const loc = await seedLocation(db, city.id, { name: "单线山", description: "只有一条路线。" });
    await insertRoute(db, {
      locationId: loc.id, cityId: city.id, name: "唯一线",
      difficulty: "easy", durationMin: 30, durationMax: 60, distance: 2,
      createdAt: new Date("2026-01-01T00:00:00Z"),
    });

    for (const stmt of migrationUpdates()) sqlite.exec(stmt);

    const row = sqlite.prepare("SELECT difficulty, duration_min, description FROM locations WHERE id = ?").get(loc.id) as Record<string, unknown>;
    expect(row.difficulty).toBe("easy");
    expect(row.duration_min).toBe(30);
    expect(row.description).toBe("只有一条路线。");
  });

  it("无路线地点字段保持 NULL，描述不变", async () => {
    const { db, sqlite } = createTestDb();
    const city = await seedCity(db);
    const loc = await seedLocation(db, city.id, { name: "城市探索点", description: "无路线。" });

    for (const stmt of migrationUpdates()) sqlite.exec(stmt);

    const row = sqlite.prepare("SELECT difficulty, duration_min, duration_max, distance, elevation, description FROM locations WHERE id = ?").get(loc.id) as Record<string, unknown>;
    expect(row).toEqual({
      difficulty: null, duration_min: null, duration_max: null,
      distance: null, elevation: null, description: "无路线。",
    });
  });

  it("附录幂等：重复执行不重复追加", async () => {
    const { db, sqlite } = createTestDb();
    const city = await seedCity(db);
    const loc = await seedLocation(db, city.id, { name: "幂等山", description: "描述。" });
    await insertRoute(db, { locationId: loc.id, cityId: city.id, name: "主线", createdAt: new Date("2026-01-01T00:00:00Z") });
    await insertRoute(db, { locationId: loc.id, cityId: city.id, name: "副线", createdAt: new Date("2026-01-02T00:00:00Z") });

    const updates = migrationUpdates();
    for (const stmt of updates) sqlite.exec(stmt);
    for (const stmt of updates) sqlite.exec(stmt); // 第二遍

    const row = sqlite.prepare("SELECT description FROM locations WHERE id = ?").get(loc.id) as { description: string };
    expect(row.description.match(/另有路线：/g)).toHaveLength(1);
  });
});
