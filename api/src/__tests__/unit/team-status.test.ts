import { describe, it, expect, beforeEach } from "vitest";
import { createTestDb } from "../helpers/db";
import { seedUser, seedCity, seedLocation, seedTeam } from "../helpers/seed";
import { updateExpiredTeams } from "../../lib/team-status";
import { eq } from "drizzle-orm";
import * as schema from "../../db/schema";

describe("team-status: updateExpiredTeams()", () => {
  let db: ReturnType<typeof createTestDb>["db"];

  beforeEach(() => {
    const testDb = createTestDb();
    db = testDb.db;
  });

  async function setupBaseData() {
    const user = await seedUser(db);
    const city = await seedCity(db);
    const location = await seedLocation(db, city.id);
    return { user, city, location };
  }

  it("recruiting 状态 + 已过期 → 变为 cancelled", async () => {
    const { user, location } = await setupBaseData();
    // 创建时间超过 1 天前，endTime 已过期
    const pastCreatedAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const pastEndTime = new Date(Date.now() - 25 * 60 * 60 * 1000);

    const team = await seedTeam(db, user.id, location.id, {
      status: "recruiting",
      createdAt: pastCreatedAt,
      updatedAt: pastCreatedAt,
      startTime: new Date(pastCreatedAt.getTime() + 60 * 60 * 1000),
      endTime: pastEndTime,
    });

    const updated = await updateExpiredTeams(db);

    expect(updated).toContain(team.id);
    const [result] = await db.select().from(schema.teams).where(eq(schema.teams.id, team.id));
    expect(result.status).toBe("cancelled");
  });

  it("formed 状态 + 已过期 → 变为 completed", async () => {
    const { user, location } = await setupBaseData();
    const pastCreatedAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const pastEndTime = new Date(Date.now() - 25 * 60 * 60 * 1000);

    const team = await seedTeam(db, user.id, location.id, {
      status: "formed",
      createdAt: pastCreatedAt,
      updatedAt: pastCreatedAt,
      startTime: new Date(pastCreatedAt.getTime() + 60 * 60 * 1000),
      endTime: pastEndTime,
    });

    const updated = await updateExpiredTeams(db);

    expect(updated).toContain(team.id);
    const [result] = await db.select().from(schema.teams).where(eq(schema.teams.id, team.id));
    expect(result.status).toBe("completed");
  });

  it("未过期的 recruiting 队伍不应变更状态", async () => {
    const { user, location } = await setupBaseData();
    const futureEndTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const team = await seedTeam(db, user.id, location.id, {
      status: "recruiting",
      endTime: futureEndTime,
    });

    const updated = await updateExpiredTeams(db);

    expect(updated).not.toContain(team.id);
    const [result] = await db.select().from(schema.teams).where(eq(schema.teams.id, team.id));
    expect(result.status).toBe("recruiting");
  });

  it("endTime 已过期但 createdAt 不足 1 天的队伍不应变更状态", async () => {
    const { user, location } = await setupBaseData();
    // createdAt 只有 12 小时前，不满足 1 天条件
    const recentCreatedAt = new Date(Date.now() - 12 * 60 * 60 * 1000);
    const pastEndTime = new Date(Date.now() - 1 * 60 * 60 * 1000);

    const team = await seedTeam(db, user.id, location.id, {
      status: "recruiting",
      createdAt: recentCreatedAt,
      updatedAt: recentCreatedAt,
      startTime: recentCreatedAt,
      endTime: pastEndTime,
    });

    const updated = await updateExpiredTeams(db);

    expect(updated).not.toContain(team.id);
    const [result] = await db.select().from(schema.teams).where(eq(schema.teams.id, team.id));
    expect(result.status).toBe("recruiting");
  });

  it("指定 teamId 时只更新该队伍，不影响其他队伍", async () => {
    const { user, location } = await setupBaseData();
    const pastCreatedAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const pastEndTime = new Date(Date.now() - 25 * 60 * 60 * 1000);

    const team1 = await seedTeam(db, user.id, location.id, {
      status: "recruiting",
      createdAt: pastCreatedAt,
      updatedAt: pastCreatedAt,
      startTime: new Date(pastCreatedAt.getTime() + 60 * 60 * 1000),
      endTime: pastEndTime,
    });
    const team2 = await seedTeam(db, user.id, location.id, {
      status: "recruiting",
      createdAt: pastCreatedAt,
      updatedAt: pastCreatedAt,
      startTime: new Date(pastCreatedAt.getTime() + 60 * 60 * 1000),
      endTime: pastEndTime,
    });

    // 只更新 team1
    const updated = await updateExpiredTeams(db, team1.id);

    expect(updated).toContain(team1.id);
    expect(updated).not.toContain(team2.id);

    const [result1] = await db.select().from(schema.teams).where(eq(schema.teams.id, team1.id));
    const [result2] = await db.select().from(schema.teams).where(eq(schema.teams.id, team2.id));
    expect(result1.status).toBe("cancelled");
    expect(result2.status).toBe("recruiting"); // 未被更新
  });

  it("full 状态的队伍不应被 updateExpiredTeams 处理（只处理 recruiting/formed）", async () => {
    const { user, location } = await setupBaseData();
    const pastCreatedAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const pastEndTime = new Date(Date.now() - 25 * 60 * 60 * 1000);

    const team = await seedTeam(db, user.id, location.id, {
      status: "full",
      createdAt: pastCreatedAt,
      updatedAt: pastCreatedAt,
      startTime: new Date(pastCreatedAt.getTime() + 60 * 60 * 1000),
      endTime: pastEndTime,
    });

    const updated = await updateExpiredTeams(db);

    expect(updated).not.toContain(team.id);
    const [result] = await db.select().from(schema.teams).where(eq(schema.teams.id, team.id));
    expect(result.status).toBe("full");
  });
});
