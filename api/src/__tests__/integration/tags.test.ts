import { beforeEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";
import { createTestDb, type TestDb } from "../helpers/db";
import { seedTag, seedUser } from "../helpers/seed";
import type { Env } from "../../lib/auth";

let currentUserId: string | null = null;
let db: TestDb;

vi.mock("../../lib/auth", () => ({
  createAuth: () => ({
    api: {
      getSession: async () =>
        currentUserId ? { user: { id: currentUserId } } : null,
    },
  }),
}));

vi.mock("../../db", () => ({ createDb: () => db }));

const { tagsRoute } = await import("../../routes/tags");

function createApp() {
  const app = new Hono<{ Bindings: Env }>();
  app.route("/tags", tagsRoute);
  return app;
}

describe("tags V2", () => {
  beforeEach(() => {
    db = createTestDb().db;
    currentUserId = null;
  });

  it("lists shared tags without the removed type dimension", async () => {
    await seedTag(db, { name: "Trail", slug: "trail" });
    const app = createApp();
    const response = await app.request("/tags", {}, {} as Env);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      tags: [{ name: "Trail", slug: "trail" }],
    });
    expect((await app.request("/tags?type=activity", {}, {} as Env)).status).toBe(400);
  });

  it("allows only admins to create a normalized unique tag", async () => {
    const user = await seedUser(db);
    const admin = await seedUser(db, { role: "admin" });
    const app = createApp();

    expect(
      (
        await app.request(
          "/tags",
          { method: "POST", body: JSON.stringify({ name: "Mountain Fun" }) },
          {} as Env,
        )
      ).status,
    ).toBe(401);

    currentUserId = user.id;
    expect(
      (
        await app.request(
          "/tags",
          { method: "POST", body: JSON.stringify({ name: "Mountain Fun" }) },
          {} as Env,
        )
      ).status,
    ).toBe(403);

    currentUserId = admin.id;
    const created = await app.request(
      "/tags",
      { method: "POST", body: JSON.stringify({ name: "Mountain Fun" }) },
      {} as Env,
    );
    expect(created.status).toBe(201);
    await expect(created.json()).resolves.toMatchObject({
      success: true,
      existing: false,
    });

    const repeated = await app.request(
      "/tags",
      { method: "POST", body: JSON.stringify({ name: "Mountain Fun" }) },
      {} as Env,
    );
    await expect(repeated.json()).resolves.toMatchObject({
      success: true,
      existing: true,
    });
  });

  it("rejects the V1 type payload instead of silently accepting it", async () => {
    const admin = await seedUser(db, { role: "admin" });
    currentUserId = admin.id;
    const response = await createApp().request(
      "/tags",
      {
        method: "POST",
        body: JSON.stringify({ name: "Legacy", type: "activity" }),
      },
      {} as Env,
    );
    expect(response.status).toBe(400);
  });
});
