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
    c: { json: (body: unknown, status: 403) => Response },
    error: unknown,
  ) => error === "forbidden"
    ? c.json({ success: false, error: { code: "FORBIDDEN" } }, 403)
    : null,
}));

const { adminUsersRoute } = await import("./admin-users");

const env = { DB: {} as D1Database } as Env;

describe("administrator user role management", () => {
  beforeEach(() => {
    mocks.createDb.mockReset();
    mocks.requireAdmin.mockReset();
  });

  it("rejects a non-administrator before reading users", async () => {
    mocks.requireAdmin.mockRejectedValue("forbidden");

    const response = await adminUsersRoute.request("/", {}, env);

    expect(response.status).toBe(403);
    expect(mocks.createDb).not.toHaveBeenCalled();
  });

  it("does not allow an administrator to change their own role", async () => {
    mocks.requireAdmin.mockResolvedValue({
      id: "admin-1",
      displayName: "Admin",
      image: null,
    });

    const response = await adminUsersRoute.request(
      "/admin-1/role",
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role: "user" }),
      },
      env,
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "CONFLICT",
        details: { reason: "admin_self_role_change" },
      },
    });
    expect(mocks.createDb).not.toHaveBeenCalled();
  });

  it("promotes another existing user with a final conditional update", async () => {
    mocks.requireAdmin.mockResolvedValue({
      id: "admin-1",
      displayName: "Admin",
      image: null,
    });
    const run = vi.fn().mockResolvedValue({ meta: { changes: 1 } });
    const bind = vi.fn(() => ({ run }));
    const requestEnv = {
      DB: { prepare: vi.fn(() => ({ bind })) } as unknown as D1Database,
    } as Env;

    const response = await adminUsersRoute.request(
      "/user-2/role",
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role: "admin" }),
      },
      requestEnv,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      id: "user-2",
      role: "admin",
    });
    expect(bind).toHaveBeenCalledWith(expect.any(Number), "user-2", "admin-1");
  });

  it("refuses to revoke the last active administrator", async () => {
    mocks.requireAdmin.mockResolvedValue({
      id: "admin-1",
      displayName: "Admin",
      image: null,
    });
    const run = vi.fn().mockResolvedValue({ meta: { changes: 0 } });
    const bind = vi.fn(() => ({ run }));
    const limit = vi.fn().mockResolvedValue([{ id: "admin-2", role: "admin" }]);
    const where = vi.fn(() => ({ limit }));
    const from = vi.fn(() => ({ where }));
    mocks.createDb.mockReturnValue({ select: vi.fn(() => ({ from })) });
    const requestEnv = {
      DB: { prepare: vi.fn(() => ({ bind })) } as unknown as D1Database,
    } as Env;

    const response = await adminUsersRoute.request(
      "/admin-2/role",
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role: "user" }),
      },
      requestEnv,
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "CONFLICT",
        details: { reason: "admin_last_active_revoke" },
      },
    });
  });
});
