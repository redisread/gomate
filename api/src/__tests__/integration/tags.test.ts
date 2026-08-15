import { beforeEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";
import { createTestDb } from "../helpers/db";
import { seedUser } from "../helpers/seed";

let currentSession: { user: { id: string; email: string; name: string } } | null = null;
let testDb: ReturnType<typeof createTestDb>["db"];

vi.mock("../../lib/auth", () => ({
  createAuth: () => ({
    api: {
      getSession: async () => currentSession,
    },
  }),
}));

vi.mock("../../db", () => ({
  createDb: () => testDb,
}));

const { tagsRoute } = await import("../../routes/tags");

function createApp() {
  const app = new Hono<{ Bindings: { DB: unknown } }>();
  app.route("/tags", tagsRoute);
  return app;
}

describe("Tags API 集成测试", () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    testDb = createTestDb().db;
    app = createApp();

    const admin = await seedUser(testDb, {
      name: "管理员",
      role: "admin",
      email: "admin@test.com",
    });
    currentSession = {
      user: { id: admin.id, email: admin.email, name: admin.name },
    };
  });

  it("非法标签类型在进入数据库前返回 400", async () => {
    const response = await app.fetch(
      new Request("http://localhost/tags", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "错误类型", type: "route" }),
      }),
      { DB: {} },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ success: false });
  });

  it.each(["location", "activity", "story"])("允许 %s 标签类型", async (type) => {
    const response = await app.fetch(
      new Request("http://localhost/tags", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: `${type}-标签`, type }),
      }),
      { DB: {} },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      existing: false,
    });
  });
});
