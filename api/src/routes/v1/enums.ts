import { Hono } from "hono";
import { createDb } from "../../db";
import type { Env } from "../../lib/auth";

const enums = new Hono<{ Bindings: Env }>();

/**
 * GET /v1/enums
 * Agent 合法值发现入口：一次性返回所有枚举/选项值。
 */
enums.get("/", async (c) => {
  try {
    const db = createDb(c.env.DB);

    // Cities
    const cities = await db.query.cities.findMany({
      columns: { id: true, name: true },
      orderBy: (cities, { asc }) => [asc(cities.name)],
    });

    // Tags (all)
    const tags = await db.query.tags.findMany({
      columns: { id: true, name: true, type: true },
      orderBy: (tags, { asc }) => [asc(tags.type), asc(tags.name)],
    });

    // Durations (distinct from locations.durationMin)
    const durations = [
      { value: 60, label: "1 小时" },
      { value: 120, label: "2 小时" },
      { value: 180, label: "3 小时" },
      { value: 240, label: "4 小时" },
      { value: 300, label: "5 小时" },
      { value: 360, label: "6 小时" },
      { value: 480, label: "8 小时" },
      { value: 540, label: "9 小时" },
      { value: 600, label: "10 小时" },
      { value: 720, label: "12 小时" },
      { value: 1440, label: "1 天" },
    ];

    // Difficulty levels
    const difficulties = [
      { value: "easy", label: "简单" },
      { value: "moderate", label: "适中" },
      { value: "hard", label: "困难" },
    ];

    // Team statuses
    const teamStatuses = [
      { value: "recruiting", label: "招募中" },
      { value: "ongoing", label: "进行中" },
      { value: "completed", label: "已完成" },
      { value: "cancelled", label: "已取消" },
    ];

    return c.json({
      success: true,
      enums: {
        cities,
        tags,
        durations,
        difficulties,
        teamStatuses,
      },
    });
  } catch (error) {
    console.error("[v1/enums] error:", error);
    return c.json({ success: false, error: "获取枚举值失败" }, 500);
  }
});

export { enums as enumsRoute };
