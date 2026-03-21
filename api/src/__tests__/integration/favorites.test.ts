import { describe, it, expect, beforeEach, vi } from "vitest";
import { Hono } from "hono";
import { createTestDb } from "../helpers/db";
import { seedUser, seedCity, seedLocation } from "../helpers/seed";
import { eq, and } from "drizzle-orm";
import * as schema from "../../db/schema";

let currentSession: { user: { id: string; email: string; name: string } } | null = null;
let testDb: ReturnType<typeof createTestDb>["db"];

vi.mock("../../lib/auth", () => ({
  createAuth: (_env: unknown) => ({
    api: {
      getSession: async (_opts: unknown) => currentSession,
    },
  }),
}));

vi.mock("../../db", () => ({
  createDb: (_d1: unknown) => testDb,
}));

const { favoritesRoute } = await import("../../routes/favorites");

function createApp() {
  const app = new Hono<{ Bindings: { DB: unknown } }>();
  app.route("/favorites", favoritesRoute);
  return app;
}

async function req(app: ReturnType<typeof createApp>, path: string, options: RequestInit = {}) {
  return app.fetch(new Request(`http://localhost${path}`, options), { DB: {} });
}

function setSession(user: { id: string; email: string; name: string } | null) {
  currentSession = user ? { user } : null;
}

describe("Favorites API 集成测试", () => {
  let app: ReturnType<typeof createApp>;
  let user: schema.User;
  let city: schema.City;
  let location: schema.Location;

  beforeEach(async () => {
    const fresh = createTestDb();
    testDb = fresh.db;
    app = createApp();
    currentSession = null;

    user = await seedUser(testDb, { name: "测试用户" });
    city = await seedCity(testDb);
    location = await seedLocation(testDb, city.id);
  });

  describe("GET /favorites - 获取收藏列表", () => {
    it("未登录用户获取收藏列表返回 401", async () => {
      setSession(null);
      const res = await req(app, "/favorites");
      expect(res.status).toBe(401);
    });

    it("已登录用户获取收藏列表返回 200", async () => {
      setSession({ id: user.id, email: user.email, name: user.name });
      const res = await req(app, "/favorites");
      expect(res.status).toBe(200);
      const json = await res.json() as { success: boolean; favorites: unknown[] };
      expect(json.success).toBe(true);
      expect(Array.isArray(json.favorites)).toBe(true);
    });

    it("按 entityType=location 筛选收藏", async () => {
      // 预先插入一个收藏
      await testDb.insert(schema.userFavorites).values({
        id: "fav1",
        userId: user.id,
        entityType: "location",
        entityId: location.id,
        createdAt: new Date(),
      });
      setSession({ id: user.id, email: user.email, name: user.name });

      const res = await req(app, "/favorites?entityType=location");
      expect(res.status).toBe(200);
      const json = await res.json() as { favorites: { entityType: string }[] };
      expect(json.favorites.every((f) => f.entityType === "location")).toBe(true);
    });
  });

  describe("POST /favorites - 收藏地点", () => {
    it("未登录用户收藏地点返回 401", async () => {
      setSession(null);
      const res = await req(app, "/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityType: "location", entityId: location.id }),
      });
      expect(res.status).toBe(401);
    });

    it("已登录用户成功收藏地点", async () => {
      setSession({ id: user.id, email: user.email, name: user.name });

      const res = await req(app, "/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityType: "location", entityId: location.id }),
      });
      expect(res.status).toBe(200);
      const json = await res.json() as { success: boolean };
      expect(json.success).toBe(true);

      // 验证数据库中有收藏记录
      const favs = await testDb.select().from(schema.userFavorites)
        .where(and(eq(schema.userFavorites.userId, user.id), eq(schema.userFavorites.entityId, location.id)));
      expect(favs).toHaveLength(1);
    });

    it("重复收藏返回 409", async () => {
      // 先插入一条收藏
      await testDb.insert(schema.userFavorites).values({
        id: "fav_dup",
        userId: user.id,
        entityType: "location",
        entityId: location.id,
        createdAt: new Date(),
      });
      setSession({ id: user.id, email: user.email, name: user.name });

      const res = await req(app, "/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityType: "location", entityId: location.id }),
      });
      expect(res.status).toBe(409);
    });
  });

  describe("DELETE /favorites - 取消收藏", () => {
    it("成功取消收藏", async () => {
      await testDb.insert(schema.userFavorites).values({
        id: "fav_del",
        userId: user.id,
        entityType: "location",
        entityId: location.id,
        createdAt: new Date(),
      });
      setSession({ id: user.id, email: user.email, name: user.name });

      const res = await req(app, `/favorites?entityType=location&entityId=${location.id}`, {
        method: "DELETE",
      });
      expect(res.status).toBe(200);

      const favs = await testDb.select().from(schema.userFavorites)
        .where(and(eq(schema.userFavorites.userId, user.id), eq(schema.userFavorites.entityId, location.id)));
      expect(favs).toHaveLength(0);
    });

    it("未登录用户取消收藏返回 401", async () => {
      setSession(null);
      const res = await req(app, `/favorites?entityType=location&entityId=${location.id}`, {
        method: "DELETE",
      });
      expect(res.status).toBe(401);
    });
  });
});
