import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Env } from "../lib/auth";

const mocks = vi.hoisted(() => ({
  createDb: vi.fn(),
  requireAdmin: vi.fn(),
}));

vi.mock("../db", () => ({ createDb: mocks.createDb }));
vi.mock("../lib/admin-access", () => ({
  requireAdmin: mocks.requireAdmin,
  adminAccessErrorResponse: (
    c: { json: (body: unknown, status: 401 | 403) => Response },
    error: unknown,
  ) => error === "forbidden"
    ? c.json({ success: false, error: { code: "FORBIDDEN" } }, 403)
    : null,
}));

const { activityTypesRoute } = await import("./activity-types");

const env = { DB: {} as D1Database } as Env;

function listDb(rows: unknown[]) {
  const orderBy = vi.fn().mockResolvedValue(rows);
  const where = vi.fn(() => ({ orderBy }));
  const from = vi.fn(() => ({ where, orderBy }));
  mocks.createDb.mockReturnValue({ select: vi.fn(() => ({ from })) });
  return { where };
}

describe("activity type catalog", () => {
  beforeEach(() => {
    mocks.createDb.mockReset();
    mocks.requireAdmin.mockReset();
  });

  it("returns only enabled activity types to public consumers", async () => {
    const { where } = listDb([
      {
        id: "hiking",
        name: "徒步",
        slug: "hiking",
        isActive: true,
        sortOrder: 10,
      },
    ]);

    const response = await activityTypesRoute.request("/", {}, env);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      activityTypes: [
        {
          id: "hiking",
          name: "徒步",
          slug: "hiking",
          isActive: true,
          sortOrder: 10,
        },
      ],
    });
    expect(where).toHaveBeenCalledOnce();
    expect(mocks.requireAdmin).not.toHaveBeenCalled();
  });

  it("requires an administrator before listing inactive types", async () => {
    mocks.requireAdmin.mockRejectedValue("forbidden");

    const response = await activityTypesRoute.request(
      "/?includeInactive=true",
      {},
      env,
    );

    expect(response.status).toBe(403);
    expect(mocks.createDb).not.toHaveBeenCalled();
  });

  it("creates a new activity type after administrator authorization", async () => {
    mocks.requireAdmin.mockResolvedValue({
      id: "admin-1",
      displayName: "Admin",
      image: null,
    });
    const returning = vi.fn().mockResolvedValue([
      {
        id: "activity-1",
        name: "攀岩",
        slug: "攀岩",
        isActive: true,
        sortOrder: 50,
      },
    ]);
    const values = vi.fn(() => ({ returning }));
    mocks.createDb.mockReturnValue({
      insert: vi.fn(() => ({ values })),
    });

    const response = await activityTypesRoute.request(
      "/",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "攀岩",
          sortOrder: 50,
        }),
      },
      env,
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      activityType: { name: "攀岩", slug: "攀岩", isActive: true },
    });
    expect(values).toHaveBeenCalledWith(expect.objectContaining({ slug: "攀岩" }));
    expect(mocks.requireAdmin).toHaveBeenCalledOnce();
  });

  it("can deactivate a type without deleting its historical identity", async () => {
    mocks.requireAdmin.mockResolvedValue({
      id: "admin-1",
      displayName: "Admin",
      image: null,
    });
    const returning = vi.fn().mockResolvedValue([
      {
        id: "hiking",
        name: "徒步",
        slug: "hiking",
        isActive: false,
        sortOrder: 10,
      },
    ]);
    const where = vi.fn(() => ({ returning }));
    const set = vi.fn(() => ({ where }));
    mocks.createDb.mockReturnValue({
      update: vi.fn(() => ({ set })),
    });

    const response = await activityTypesRoute.request(
      "/hiking",
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ isActive: false }),
      },
      env,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      activityType: { id: "hiking", isActive: false },
    });
    expect(set).toHaveBeenCalledWith(expect.objectContaining({
      isActive: false,
      updatedAt: expect.any(Date),
    }));
  });
});
