import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { drizzle } from "drizzle-orm/sqlite-proxy";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TeamSchema } from "@/contracts";
import * as schema from "../../db/schema";
import type { Env } from "../../lib/auth";

const mocks = vi.hoisted(() => ({ createDb: vi.fn(), getSession: vi.fn() }));
vi.mock("../../db", () => ({ createDb: mocks.createDb }));
vi.mock("../../lib/auth", () => ({
  createAuth: () => ({ api: { getSession: mocks.getSession } }),
}));
const { default: teams } = await import("./index");
const env = {
  DB: {
    async batch(statements: { run: () => Promise<unknown> }[]) {
      sqlite.exec("BEGIN");
      try {
        const result = [];
        for (const statement of statements) result.push(await statement.run());
        sqlite.exec("COMMIT");
        return result;
      } catch (error) {
        sqlite.exec("ROLLBACK");
        throw error;
      }
    },
    prepare(query: string) {
      return {
        bind(...values: SQLInputValue[]) {
          return {
            async run() {
              const result = sqlite.prepare(query).run(...values);
              return { meta: { changes: Number(result.changes) } };
            },
          };
        },
      };
    },
  } as unknown as D1Database,
} as Env;
const migrationRoot = new URL("../../../../migrations/", import.meta.url);
const migrations = readdirSync(migrationRoot)
  .filter((file) => file.endsWith(".sql"))
  .sort()
  .map((file) => readFileSync(new URL(file, migrationRoot), "utf8"));
let sqlite: DatabaseSync;

function signIn(id: string) {
  mocks.getSession.mockResolvedValue({ user: { id } });
}

async function request(
  path: string,
  method = "GET",
  body?: string,
  contentType?: string,
) {
  return teams.request(
    path,
    {
      method,
      body,
      headers: contentType ? { "content-type": contentType } : undefined,
    },
    env,
  );
}

describe("team API wire compatibility", () => {
  beforeEach(() => {
    mocks.getSession.mockReset().mockResolvedValue(null);
    sqlite = new DatabaseSync(":memory:");
    for (const migration of migrations)
      sqlite.exec(`BEGIN; PRAGMA defer_foreign_keys=ON; ${migration}; COMMIT;`);
    const db = drizzle(
      async (query, params, method) => {
        const statement = sqlite.prepare(query);
        statement.setReturnArrays(true);
        return {
          rows: (method === "get"
            ? statement.get(...params)
            : statement.all(...params)) as unknown as unknown[][],
        };
      },
      { schema },
    );
    mocks.createDb.mockReset().mockReturnValue(db);
    sqlite.exec(`
      INSERT INTO users (id, name, email, extra) VALUES
        ('leader', 'Leader', 'leader@example.com', '{"wechat":"private"}'),
        ('outsider', 'Outsider', 'outsider@example.com', '{}');
      INSERT INTO region (id, country_code, name, slug, level) VALUES ('r', 'CN', '深圳', 'sz', 'city');
      INSERT INTO locations (id, region_id, name, slug, description, status)
        VALUES ('l', 'r', '地点', 'place', 'description', 'published');
      INSERT INTO teams (id, location_id, leader_id, activity_type, title, start_at, end_at, meeting_point)
        VALUES ('t', 'l', 'leader', 'hiking', '队伍', 2000000000000, 2000003600000, 'private');
    `);
  });
  afterEach(() => {
    sqlite.close();
    vi.restoreAllMocks();
  });

  it("reopens recruitment without undoing formation and permits joining", async () => {
    signIn("leader");
    expect((await request("/t/form", "POST")).status).toBe(200);
    const formedAt = (await (await request("/t")).json()).team.formedAt;
    for (let i = 0; i < 2; i++) {
      const response = await request(
        "/t/recruitment",
        "PUT",
        JSON.stringify({ recruitmentStatus: "open" }),
        "application/json",
      );
      expect(response.status).toBe(200);
      expect((await response.json()).team).toMatchObject({
        lifecycle: "formed",
        formedAt,
        recruitmentStatus: "open",
      });
    }
    signIn("outsider");
    expect((await request("/t/join", "POST")).status).toBe(201);
    expect((await request("/t/join", "POST")).status).toBe(200);
    expect(
      (
        await request(
          "/t/recruitment",
          "PUT",
          JSON.stringify({ recruitmentStatus: "closed" }),
          "application/json",
        )
      ).status,
    ).toBe(403);
    signIn("leader");
    expect(
      (
        await request(
          "/t/recruitment",
          "PUT",
          JSON.stringify({ recruitmentStatus: "closed" }),
          "application/json",
        )
      ).status,
    ).toBe(200);
    expect((await (await request("/t")).json()).team).toMatchObject({
      formedAt,
      recruitmentStatus: "closed",
    });
  });

  it("rejects invalid or unrelated recruitment updates", async () => {
    signIn("leader");
    for (const body of [
      {},
      { recruitmentStatus: "invalid" },
      { recruitmentStatus: "open", title: "overwrite" },
    ]) {
      expect(
        (
          await request(
            "/t/recruitment",
            "PUT",
            JSON.stringify(body),
            "application/json",
          )
        ).status,
      ).toBe(400);
    }
    expect(
      (
        await request(
          "/missing/recruitment",
          "PUT",
          JSON.stringify({ recruitmentStatus: "open" }),
          "application/json",
        )
      ).status,
    ).toBe(404);
  });

  it.each(["cancelled_at = 1", "start_at = 1"])(
    "blocks recruitment changes when %s",
    async (condition) => {
      signIn("leader");
      sqlite.exec(`UPDATE teams SET ${condition} WHERE id = 't'`);
      expect(
        (
          await request(
            "/t/recruitment",
            "PUT",
            JSON.stringify({ recruitmentStatus: "open" }),
            "application/json",
          )
        ).status,
      ).toBe(409);
    },
  );

  it("keeps unauthorized malformed writes at 401", async () => {
    for (const [method, path] of [
      ["POST", "/"],
      ["PUT", "/t"],
      ["POST", "/t/join"],
      ["PUT", "/t/recruitment"],
    ]) {
      const response = await request(path, method, "{", "application/json");
      expect(response.status).toBe(401);
      expect(await response.json()).toMatchObject({
        success: false,
        error: { code: "UNAUTHORIZED", message: "请先登录" },
      });
    }
  });

  it.each([
    undefined,
    "text/plain",
    "application/json",
    "application/json; charset=utf-8",
    "application/vnd.api+json",
  ])("retains body validation with %s media type", async (contentType) => {
    signIn("leader");
    const response = await request(
      "/",
      "POST",
      JSON.stringify({ title: 123 }),
      contentType,
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: {
        code: "VALIDATION_ERROR",
        message: "输入无效",
        details: {
          fieldErrors: { title: ["Expected string, received number"] },
        },
      },
    });
  });

  it("serves typed list/detail responses and hides private data from anonymous viewers", async () => {
    const response = await request(
      "/?limit=1&limit=invalid&tagIds=,,&activityType=%20hiking%20",
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      total: 1,
      nextCursor: null,
      teams: [
        { id: "t", meetingPoint: null, leader: { extra: { wechat: null } } },
      ],
    });
    expect(TeamSchema.safeParse(body.teams[0]).success).toBe(true);
    const detail = await request("/t");
    expect(detail.status).toBe(200);
    expect(TeamSchema.safeParse((await detail.json()).team).success).toBe(true);
    signIn("leader");
    expect((await (await request("/t")).json()).team).toMatchObject({
      meetingPoint: "private",
      leader: { extra: { wechat: "private" } },
    });
  });

  it("retains custom query error codes and the anonymous membership result", async () => {
    const invalid = await request("/?limit=0");
    expect(invalid.status).toBe(400);
    expect(await invalid.json()).toMatchObject({
      error: {
        code: "BAD_REQUEST",
        message: "limit must be an integer between 1 and 100",
      },
    });
    expect(await (await request("/missing/my-status")).json()).toEqual({
      success: true,
      status: null,
    });
  });

  it("joins immediately and retries without consuming another place", async () => {
    signIn("outsider");
    const joined = await request("/t/join", "POST");
    expect(joined.status).toBe(201);
    expect(await joined.json()).toEqual({ success: true, status: "joined" });
    expect(await (await request("/t/my-status")).json()).toEqual({
      success: true,
      status: "member",
    });
    const retry = await request("/t/join", "POST");
    expect(retry.status).toBe(200);
    expect(await retry.json()).toEqual({
      success: true,
      status: "already_member",
    });
    expect(
      (await (await request("/t")).json()).team.activeParticipantCount,
    ).toBe(2);
  });

  it("counts the leader and admits only one competitor for the last place", async () => {
    sqlite.exec(
      "UPDATE teams SET max_participants=2 WHERE id='t'; INSERT INTO users(id,name,email) VALUES('second','Second','second@example.com')",
    );
    mocks.getSession.mockImplementation(({ headers }: { headers: Headers }) =>
      Promise.resolve({ user: { id: headers.get("x-user") } }),
    );
    const responses = await Promise.all(
      ["outsider", "second"].map((id) =>
        teams.request(
          "/t/join",
          { method: "POST", headers: { "x-user": id } },
          env,
        ),
      ),
    );
    expect(responses.map((r) => r.status).sort()).toEqual([201, 409]);
    const detail = await teams.request(
      "/t",
      { headers: { "x-user": "leader" } },
      env,
    );
    expect((await detail.json()).team.activeParticipantCount).toBe(2);
  });

  it("releases a place on exit and permits a single rejoin", async () => {
    signIn("outsider");
    expect((await request("/t/join", "POST")).status).toBe(201);
    expect((await request("/t/leave", "POST")).status).toBe(200);
    expect((await request("/t/join", "POST")).status).toBe(201);
    expect(
      (await (await request("/t")).json()).team.activeParticipantCount,
    ).toBe(2);
    signIn("leader");
    expect((await request("/t/leave", "POST")).status).toBe(409);
    expect((await request("/t/join", "POST")).status).toBe(200);
    expect(
      (await (await request("/t")).json()).team.activeParticipantCount,
    ).toBe(2);
  });

  it.each(["recruitment_status='closed'", "cancelled_at=1", "start_at=1"])(
    "rejects joining when %s",
    async (state) => {
      sqlite.exec(`UPDATE teams SET ${state} WHERE id='t'`);
      signIn("outsider");
      expect((await request("/t/join", "POST")).status).toBe(409);
    },
  );

  it("requires active identity, guards member removal, and rejects removal after departure", async () => {
    signIn("outsider");
    expect((await request("/t/join", "POST")).status).toBe(201);
    expect((await request("/t/members/outsider/remove", "POST")).status).toBe(
      403,
    );
    signIn("leader");
    expect((await request("/t/members/outsider/remove", "POST")).status).toBe(
      200,
    );
    signIn("outsider");
    expect((await request("/t/join", "POST")).status).toBe(201);
    sqlite.exec("UPDATE teams SET start_at=1 WHERE id='t'");
    expect((await request("/t/leave", "POST")).status).toBe(409);
    signIn("leader");
    expect((await request("/t/members/outsider/remove", "POST")).status).toBe(
      404,
    );
    sqlite.exec("UPDATE users SET status='suspended' WHERE id='outsider'");
    signIn("outsider");
    expect((await request("/t/join", "POST")).status).toBe(401);
  });

  it("removes approval and checklist operations", async () => {
    signIn("leader");
    for (const [path, method] of [
      ["/t/join-requests", "GET"],
      ["/t/join-requests/x/approve", "POST"],
      ["/t/join-requests/x/reject", "POST"],
      ["/t/join-requests/x/cancel", "POST"],
      ["/t/checklist", "PUT"],
    ]) {
      expect((await request(path, method)).status).toBe(404);
    }
  });

  it("saves only simple meeting information and reveals it after joining", async () => {
    signIn("leader");
    const response = await request(
      "/t",
      "PUT",
      JSON.stringify({ meetingPoint: "Station exit A\n09:00" }),
      "application/json",
    );
    expect(response.status).toBe(200);
    expect((await response.json()).team.meetingPoint).toBe(
      "Station exit A\n09:00",
    );
    signIn("outsider");
    expect((await (await request("/t")).json()).team.meetingPoint).toBeNull();
    await request("/t/join", "POST");
    expect((await (await request("/t")).json()).team.meetingPoint).toBe(
      "Station exit A\n09:00",
    );
    await request("/t/leave", "POST");
    expect((await (await request("/t")).json()).team.meetingPoint).toBeNull();
  });

  it("preserves the route-specific error when authentication lookup fails", async () => {
    mocks.getSession.mockRejectedValue(new Error("authentication unavailable"));
    const response = await request("/", "POST", "{", "application/json");
    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({
      error: { message: "创建队伍失败" },
    });
  });
});
