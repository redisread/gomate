import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Env } from "./auth";

const mocks = vi.hoisted(() => ({
  createDb: vi.fn(),
  getActiveSession: vi.fn(),
}));

vi.mock("../db", () => ({ createDb: mocks.createDb }));
vi.mock("./active-session", () => ({
  getActiveSession: mocks.getActiveSession,
}));

const {
  adminAccessErrorResponse,
  requireAdmin,
  resolveAdminAccess,
} = await import("./admin-access");

const env = { DB: {} as D1Database } as Env;

function currentUser(row: Record<string, unknown> | null) {
  mocks.createDb.mockReturnValue({
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue(row ? [row] : []),
        })),
      })),
    })),
  });
}

function session(user: Record<string, unknown> | null) {
  mocks.getActiveSession.mockResolvedValue(user ? { user } : null);
}

function adminApp() {
  const app = new Hono<{ Bindings: typeof env }>();
  app.get("/", async (c) => {
    try {
      return c.json({ success: true, admin: await requireAdmin(c) });
    } catch (error) {
      const denied = adminAccessErrorResponse(c, error);
      if (denied) return denied;
      throw error;
    }
  });
  return app;
}

describe("resolveAdminAccess", () => {
  beforeEach(() => {
    mocks.createDb.mockReset();
    mocks.getActiveSession.mockReset();
  });

  it("returns unauthenticated when no active session exists", async () => {
    session(null);

    await expect(resolveAdminAccess(env, new Headers())).resolves.toEqual({
      kind: "unauthenticated",
    });
  });

  it.each([
    ["missing", null],
    [
      "suspended",
      {
        id: "admin-1",
        name: "Admin",
        nickname: null,
        image: null,
        role: "admin",
        status: "suspended",
        deletedAt: null,
      },
    ],
    [
      "deleted",
      {
        id: "admin-1",
        name: "Admin",
        nickname: null,
        image: null,
        role: "admin",
        status: "active",
        deletedAt: new Date("2026-08-23T00:00:00.000Z"),
      },
    ],
  ])("returns unauthenticated when the current user is %s", async (_label, row) => {
    session({ id: "admin-1", role: "admin" });
    currentUser(row);

    await expect(resolveAdminAccess(env, new Headers())).resolves.toEqual({
      kind: "unauthenticated",
    });
  });

  it("uses the current database role instead of a stale session role", async () => {
    session({ id: "user-1", role: "admin" });
    currentUser({
      id: "user-1",
      name: "Former Admin",
      nickname: null,
      image: null,
      role: "user",
      status: "active",
      deletedAt: null,
    });

    await expect(resolveAdminAccess(env, new Headers())).resolves.toEqual({
      kind: "forbidden",
    });
  });

  it("returns only the minimal authorized administrator identity", async () => {
    session({ id: "admin-1", role: "user", email: "private@example.com" });
    currentUser({
      id: "admin-1",
      name: "Admin Name",
      nickname: "Visible Admin",
      image: "https://example.com/avatar.webp",
      role: "admin",
      status: "active",
      deletedAt: null,
    });

    await expect(resolveAdminAccess(env, new Headers())).resolves.toEqual({
      kind: "authorized",
      admin: {
        id: "admin-1",
        displayName: "Visible Admin",
        image: "https://example.com/avatar.webp",
      },
    });
  });
});

describe("Hono administrator adapter", () => {
  beforeEach(() => {
    mocks.createDb.mockReset();
    mocks.getActiveSession.mockReset();
  });

  it("maps an absent session to the standard 401 envelope", async () => {
    session(null);

    const response = await adminApp().request("/", undefined, env);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: { code: "UNAUTHORIZED" },
    });
  });

  it("maps a current non-admin role to the standard 403 envelope", async () => {
    session({ id: "user-1" });
    currentUser({
      id: "user-1",
      name: "User",
      nickname: null,
      image: null,
      role: "user",
      status: "active",
      deletedAt: null,
    });

    const response = await adminApp().request("/", undefined, env);

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: { code: "FORBIDDEN" },
    });
  });
});
