import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { createTestDb } from "../helpers/db";
import { seedCity, seedLocation } from "../helpers/seed";
import * as schema from "../../db/schema";

/**
 * task #152 前置迁移 0011 测试：直接对 better-sqlite3 执行迁移文件里的语句，
 * 验证 extra.hiking 回填（json_patch 合并）+ 3 个对齐索引的真实行为。
 */

// 从迁移文件中提取全部语句（去注释行），调用方按类型过滤
function migrationStatements(prefix: "UPDATE" | "CREATE INDEX"): string[] {
  const path = new URL("../../../db/migrations/0011_locations_extra_backfill.sql", import.meta.url).pathname;
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
    .filter((stmt) => stmt.toUpperCase().startsWith(prefix));
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

describe("0011_locations_extra_backfill 迁移", () => {
  it("主路线 guide/extra 回填进 extra.hiking，并保留已有 extra 键", async () => {
    const { db, sqlite } = createTestDb();
    const city = await seedCity(db);
    const loc = await seedLocation(db, city.id, {
      name: "攻略山",
      extra: JSON.stringify({ facilities: ["停车场"], tips: ["早出发"] }),
    });
    await insertRoute(db, {
      locationId: loc.id, cityId: city.id, name: "主线",
      description: "主线描述",
      routeGuide: JSON.stringify({ overview: "从村口出发全程石阶", tips: ["前缓后陡", "山顶有补给"] }),
      extra: JSON.stringify({ equipmentNeeded: ["登山鞋", "登山杖"], warnings: ["雨天路滑"] }),
      createdAt: new Date("2026-01-01T00:00:00Z"),
    });

    for (const stmt of migrationStatements("UPDATE")) sqlite.exec(stmt);

    const row = sqlite.prepare("SELECT extra FROM locations WHERE id = ?").get(loc.id) as { extra: string };
    const extra = JSON.parse(row.extra);
    // 回填内容
    expect(extra.hiking).toEqual({
      overview: "从村口出发全程石阶",
      tips: ["前缓后陡", "山顶有补给"],
      equipmentNeeded: ["登山鞋", "登山杖"],
      warnings: ["雨天路滑"],
    });
    // 已有键保留
    expect(extra.facilities).toEqual(["停车场"]);
    expect(extra.tips).toEqual(["早出发"]);
  });

  it("created_at 并列时取 rowid 小者（与 0010 主路线规则一致）", async () => {
    const { db, sqlite } = createTestDb();
    const city = await seedCity(db);
    const loc = await seedLocation(db, city.id, { name: "并列山" });
    const sameTs = new Date("2026-01-01T00:00:00Z");
    await insertRoute(db, {
      locationId: loc.id, cityId: city.id, name: "第一条",
      routeGuide: JSON.stringify({ overview: "第一条的攻略" }),
      createdAt: sameTs,
    });
    await insertRoute(db, {
      locationId: loc.id, cityId: city.id, name: "第二条",
      routeGuide: JSON.stringify({ overview: "第二条的攻略" }),
      createdAt: sameTs,
    });

    for (const stmt of migrationStatements("UPDATE")) sqlite.exec(stmt);

    const row = sqlite.prepare("SELECT extra FROM locations WHERE id = ?").get(loc.id) as { extra: string };
    expect(JSON.parse(row.extra).hiking.overview).toBe("第一条的攻略");
  });

  it("guide.overview 缺失时回退 route.description（保持今日显示语义）", async () => {
    const { db, sqlite } = createTestDb();
    const city = await seedCity(db);
    const loc = await seedLocation(db, city.id, { name: "回退山" });
    await insertRoute(db, {
      locationId: loc.id, cityId: city.id, name: "无线",
      description: "这条路线风景优美",
      routeGuide: JSON.stringify({ tips: ["带够水"] }), // 无 overview
      createdAt: new Date("2026-01-01T00:00:00Z"),
    });

    for (const stmt of migrationStatements("UPDATE")) sqlite.exec(stmt);

    const row = sqlite.prepare("SELECT extra FROM locations WHERE id = ?").get(loc.id) as { extra: string };
    const hiking = JSON.parse(row.extra).hiking;
    expect(hiking.overview).toBe("这条路线风景优美");
    expect(hiking.tips).toEqual(["带够水"]);
  });

  it("无路线地点 extra 保持原值不动", async () => {
    const { db, sqlite } = createTestDb();
    const city = await seedCity(db);
    const loc = await seedLocation(db, city.id, {
      name: "城市点",
      extra: JSON.stringify({ facilities: ["地铁站"] }),
    });

    for (const stmt of migrationStatements("UPDATE")) sqlite.exec(stmt);

    const row = sqlite.prepare("SELECT extra FROM locations WHERE id = ?").get(loc.id) as { extra: string };
    expect(JSON.parse(row.extra)).toEqual({ facilities: ["地铁站"] });
  });

  it("幂等：重复执行不覆盖已有 hiking", async () => {
    const { db, sqlite } = createTestDb();
    const city = await seedCity(db);
    const loc = await seedLocation(db, city.id, { name: "幂等山" });
    await insertRoute(db, {
      locationId: loc.id, cityId: city.id, name: "主线",
      routeGuide: JSON.stringify({ overview: "原始攻略" }),
      createdAt: new Date("2026-01-01T00:00:00Z"),
    });

    const updates = migrationStatements("UPDATE");
    for (const stmt of updates) sqlite.exec(stmt);
    // 模拟内容侧已润色 hiking
    sqlite.prepare("UPDATE locations SET extra = json_set(extra, '$.hiking.overview', '人工润色后的攻略') WHERE id = ?").run(loc.id);
    for (const stmt of updates) sqlite.exec(stmt); // 第二遍不得覆盖

    const row = sqlite.prepare("SELECT extra FROM locations WHERE id = ?").get(loc.id) as { extra: string };
    expect(JSON.parse(row.extra).hiking.overview).toBe("人工润色后的攻略");
  });

  it("三个对齐索引被创建（task #159 决策）", () => {
    const { sqlite } = createTestDb();
    for (const stmt of migrationStatements("CREATE INDEX")) sqlite.exec(stmt);

    const names = (sqlite.prepare("SELECT name FROM sqlite_master WHERE type = 'index'").all() as { name: string }[])
      .map((r) => r.name);
    expect(names).toContain("locations_created_at_idx");
    expect(names).toContain("teams_title_idx");
    expect(names).toContain("users_nickname_idx");

    // IF NOT EXISTS：重复执行不炸
    for (const stmt of migrationStatements("CREATE INDEX")) sqlite.exec(stmt);
  });
});
