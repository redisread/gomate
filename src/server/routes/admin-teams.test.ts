import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { drizzle } from "drizzle-orm/sqlite-proxy";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AdminTeamsResponse, AdminTeamResponse } from "@/contracts";
import * as schema from "../db/schema";
import { AdminAccessError } from "../lib/admin-access";
import type { Env } from "../lib/auth";

const mocks = vi.hoisted(() => ({ createDb: vi.fn(), requireAdmin: vi.fn() }));
vi.mock("../db", () => ({ createDb: mocks.createDb }));
vi.mock("../lib/admin-access", async (original) => ({
  ...(await original<typeof import("../lib/admin-access")>()),
  requireAdmin: mocks.requireAdmin,
}));

const { adminTeamsRoute } = await import("./admin-teams");
const now = Date.parse("2026-10-15T04:00:00Z");
const env = { DB: {} as D1Database } as Env;
const migrationRoot = new URL("../../../migrations/", import.meta.url);
const migrations = readdirSync(migrationRoot)
  .filter((file) => file.endsWith(".sql"))
  .sort()
  .map((file) => readFileSync(new URL(file, migrationRoot), "utf8"));
let sqlite: DatabaseSync;

async function list(query = ""): Promise<AdminTeamsResponse> {
  const response = await adminTeamsRoute.request(`/?${query}`, {}, env);
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  return response.json();
}

describe("read-only administrator teams", () => {
  beforeEach(() => {
    vi.spyOn(Date, "now").mockReturnValue(now);
    mocks.requireAdmin.mockReset().mockResolvedValue({ id: "admin" });
    sqlite = new DatabaseSync(":memory:");
    for (const migration of migrations)
      sqlite.exec(`BEGIN; PRAGMA defer_foreign_keys=ON; ${migration}; COMMIT;`);
    const db = drizzle(
      async (query, params) => {
        const statement = sqlite.prepare(query);
        statement.setReturnArrays(true);
        return { rows: statement.all(...params) as unknown as unknown[][] };
      },
      { schema },
    );
    mocks.createDb.mockReset().mockReturnValue(db);
    sqlite.exec(`
      INSERT INTO users (id, name, nickname, email, extra) VALUES
        ('leader', 'Leader Name', '山野领队', 'leader@example.com', '{"wechat":"private"}'),
        ('member', 'Member', NULL, 'member@example.com', '{}'),
        ('departed', 'Departed', NULL, 'departed@example.com', '{}');
      INSERT INTO region (id, country_code, name, slug, level) VALUES ('r', 'CN', '深圳', 'sz', 'city');
      INSERT INTO locations (id, region_id, name, slug, description, status)
        VALUES ('l', 'r', '旧地点', 'place', 'description', 'archived');
    `);
    const insert = sqlite.prepare(`INSERT INTO teams
      (id, location_id, leader_id, activity_type, title, start_at, end_at, formed_at,
       cancelled_at, recruitment_status, created_at, meeting_point)
      VALUES (?, 'l', 'leader', 'hiking', ?, ?, ?, ?, ?, ?, ?, '集合说明')`);
    for (const [id, start, end, formed, cancelled, recruitment, created] of [
      ["pending", now + 1000, now + 2000, null, null, "open", 1000],
      ["closed", now + 1000, now + 2000, null, null, "closed", 2000],
      ["formed", now + 1000, now + 2000, now - 1000, null, "open", 3000],
      ["ongoing", now, now + 2000, now - 1000, null, "closed", 4000],
      ["completed", now - 2000, now, now - 3000, null, "closed", 5000],
      ["expired", now, now + 1000, null, null, "open", 6000],
      ["cancelled", now + 1000, now + 2000, null, now - 1000, "closed", 6000],
    ] as const) {
      insert.run(
        id,
        `队伍 ${id}`,
        start,
        end,
        formed,
        cancelled,
        recruitment,
        created,
      );
    }
    sqlite.exec(`
      INSERT INTO team_members (team_id, user_id, joined_at, left_at) VALUES
        ('completed', 'member', 200, NULL),
        ('completed', 'departed', 100, 300);
      INSERT INTO tags (id, name, slug) VALUES ('tag', '户外', 'outdoor');
      INSERT INTO team_tags (team_id, tag_id) VALUES ('completed', 'tag');
    `);
  });

  afterEach(() => {
    sqlite.close();
    vi.restoreAllMocks();
  });

  it.each(["/", "/completed"])(
    "checks administrator access before reading %s",
    async (path) => {
      for (const [kind, status] of [
        ["unauthenticated", 401],
        ["forbidden", 403],
      ] as const) {
        mocks.requireAdmin.mockRejectedValue(new AdminAccessError(kind));
        const response = await adminTeamsRoute.request(path, {}, env);
        expect(response.status).toBe(status);
      }
      expect(mocks.createDb).not.toHaveBeenCalled();
    },
  );

  it("includes every lifecycle and archived locations in deterministic descending pages", async () => {
    const first = await list("limit=3");
    expect(first.teams.map((team) => team.id)).toEqual([
      "expired",
      "cancelled",
      "completed",
    ]);
    expect(first.teams[2]).toMatchObject({
      activeParticipantCount: 2,
      location: { name: "旧地点" },
    });
    const second = await list(`limit=3&cursor=${first.nextCursor}`);
    expect(second.teams.map((team) => team.id)).toEqual([
      "ongoing",
      "formed",
      "closed",
    ]);
    const last = await list(`limit=3&cursor=${second.nextCursor}`);
    expect(last.teams.map((team) => team.id)).toEqual(["pending"]);
    expect(last.nextCursor).toBeNull();
    expect(first.teams[0]).not.toHaveProperty("checklist");
    expect(first.teams[0].leader).not.toHaveProperty("email");
  });

  it.each([
    [
      "recruitmentStatus=closed",
      ["cancelled", "completed", "ongoing", "closed"],
    ],
    ["lifecycle=in_progress", ["ongoing"]],
    ["lifecycle=completed", ["completed"]],
    ["lifecycle=pending", ["closed", "pending"]],
    ["lifecycle=formed", ["formed"]],
    ["lifecycle=expired_unformed", ["expired"]],
    ["lifecycle=cancelled", ["cancelled"]],
    ["lifecycle=completed&recruitmentStatus=open", []],
  ])("filters before pagination with %s", async (query, ids) => {
    expect((await list(query)).teams.map((team) => team.id)).toEqual(ids);
  });

  it.each(["山野", "Leader Name", "leader", "队伍"])(
    "searches team and leader fields with %s",
    async (q) => {
      expect((await list(`q=${encodeURIComponent(q)}`)).teams).toHaveLength(7);
    },
  );

  it("applies status filters before the page limit and keeps them across cursors", async () => {
    const first = await list("lifecycle=pending&limit=1");
    expect(first.teams.map((team) => team.id)).toEqual(["closed"]);
    const second = await list(
      `lifecycle=pending&limit=1&cursor=${first.nextCursor}`,
    );
    expect(second.teams.map((team) => team.id)).toEqual(["pending"]);
    expect(second.nextCursor).toBeNull();
  });

  it("finds a team by ID and treats LIKE wildcards literally", async () => {
    expect((await list("q=ongoing")).teams.map((team) => team.id)).toEqual([
      "ongoing",
    ]);
    expect((await list("q=%25")).teams).toEqual([]);
    expect((await list("q=_")).teams).toEqual([]);
    expect((await list("q=%27%20OR%201%3D1--")).teams).toEqual([]);
  });

  it.each([
    "limit=0",
    "limit=51",
    "limit=1.5",
    "lifecycle=bad",
    "recruitmentStatus=bad",
    "cursor=bad",
    "cursor=",
    "page=1",
    `q=${"a".repeat(101)}`,
  ])("rejects invalid input %s without querying", async (query) => {
    const response = await adminTeamsRoute.request(`/?${query}`, {}, env);
    expect(response.status).toBe(400);
    expect(mocks.createDb).not.toHaveBeenCalled();
  });

  it("reads a completed team's actionbook, tags and current members without contacts", async () => {
    const response = await adminTeamsRoute.request("/completed", {}, env);
    expect(response.status).toBe(200);
    const { team }: AdminTeamResponse = await response.json();
    expect(team).toMatchObject({
      lifecycle: "completed",
      meetingPoint: "集合说明",
      activeParticipantCount: 2,
    });
    expect(team.participants?.map((member) => member.userId)).toEqual([
      "member",
    ]);
    expect(team.tags?.map((tag) => tag.id)).toEqual(["tag"]);
    expect(team.leader?.extra?.wechat).toBeNull();
    expect(team.leader).not.toHaveProperty("email");
    expect((await adminTeamsRoute.request("/missing", {}, env)).status).toBe(
      404,
    );
  });

  it.each(["POST", "PUT", "PATCH", "DELETE"])(
    "does not expose %s writes",
    async (method) => {
      expect(
        (await adminTeamsRoute.request("/completed", { method }, env)).status,
      ).toBe(404);
      expect(mocks.createDb).not.toHaveBeenCalled();
    },
  );
});
