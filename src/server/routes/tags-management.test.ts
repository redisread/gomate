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

const { tagsRoute } = await import("./tags");
const env = { DB: {} as D1Database } as Env;

describe("tag catalog management", () => {
  beforeEach(() => {
    mocks.createDb.mockReset();
    mocks.requireAdmin.mockReset();
  });

  it.each([
    ["PATCH", "/tag-1", { name: "新标签" }],
    ["DELETE", "/tag-1", undefined],
  ] as const)("requires an administrator for %s %s", async (method, path, body) => {
    mocks.requireAdmin.mockRejectedValue("forbidden");

    const response = await tagsRoute.request(
      path,
      {
        method,
        headers: body ? { "content-type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      },
      env,
    );

    expect(response.status).toBe(403);
    expect(mocks.createDb).not.toHaveBeenCalled();
  });

  it("renames a tag while keeping its stable slug", async () => {
    mocks.requireAdmin.mockResolvedValue({ id: "admin-1" });
    const returning = vi.fn().mockResolvedValue([
      { id: "tag-1", name: "亲子友好", slug: "family-friendly" },
    ]);
    const where = vi.fn(() => ({ returning }));
    const set = vi.fn(() => ({ where }));
    mocks.createDb.mockReturnValue({ update: vi.fn(() => ({ set })) });

    const response = await tagsRoute.request(
      "/tag-1",
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "亲子友好" }),
      },
      env,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      tag: { id: "tag-1", name: "亲子友好", slug: "family-friendly" },
    });
  });

  it("detaches all references only after explicit delete confirmation", async () => {
    mocks.requireAdmin.mockResolvedValue({ id: "admin-1" });
    const limit = vi.fn().mockResolvedValue([
      { id: "tag-1", locationCount: 2, teamCount: 1, storyCount: 3 },
    ]);
    const selectWhere = vi.fn(() => ({ limit }));
    const from = vi.fn(() => ({ where: selectWhere }));
    const deleteWhere = vi.fn(() => ({ statement: true }));
    const batch = vi.fn().mockResolvedValue([]);
    mocks.createDb.mockReturnValue({
      select: vi.fn(() => ({ from })),
      delete: vi.fn(() => ({ where: deleteWhere })),
      batch,
    });

    const response = await tagsRoute.request(
      "/tag-1?confirmDetach=true",
      { method: "DELETE" },
      env,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      detached: { locations: 2, teams: 1, stories: 3 },
    });
    expect(batch).toHaveBeenCalledOnce();
    expect(batch.mock.calls[0]?.[0]).toHaveLength(4);
  });
});
