import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { drizzle } from "drizzle-orm/sqlite-proxy";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TeamSchema, TeamJoinRequestSchema } from "@/contracts";
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
      INSERT INTO teams (id, location_id, leader_id, activity_type, title, start_at, end_at, checklist)
        VALUES ('t', 'l', 'leader', 'hiking', '队伍', 2000000000000, 2000003600000, '{"notes":"private"}');
    `);
  });
  afterEach(() => {
    sqlite.close();
    vi.restoreAllMocks();
  });

  it("keeps unauthorized malformed writes at 401", async () => {
    for (const [method, path] of [
      ["POST", "/"],
      ["PUT", "/t"],
      ["POST", "/t/join"],
      ["PUT", "/t/checklist"],
    ]) {
      const response = await request(path, method, "{", "application/json");
      expect(response.status).toBe(401);
      expect(await response.json()).toMatchObject({
        success: false,
        error: { code: "UNAUTHORIZED", message: "请先登录" },
      });
    }
  });

  it("checks checklist existence and leader access before reading malformed JSON", async () => {
    signIn("outsider");
    expect(
      (await request("/missing/checklist", "PUT", "{", "application/json"))
        .status,
    ).toBe(404);
    const forbidden = await request(
      "/t/checklist",
      "PUT",
      "{",
      "application/json",
    );
    expect(forbidden.status).toBe(403);
    expect(await forbidden.json()).toMatchObject({
      error: { message: "只有队长可以编辑行动本" },
    });
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

  it("keeps checklist field issue details and malformed-body envelopes", async () => {
    signIn("leader");
    const invalid = await request(
      "/t/checklist",
      "PUT",
      '{"notes":123}',
      "text/plain",
    );
    expect(invalid.status).toBe(400);
    expect(await invalid.json()).toMatchObject({
      error: {
        details: [
          {
            code: "invalid_type",
            path: ["notes"],
            expected: "string",
            received: "number",
          },
        ],
      },
    });
    const malformed = await request(
      "/t/checklist",
      "PUT",
      "{",
      "application/json",
    );
    expect(malformed.status).toBe(400);
    expect(await malformed.json()).toEqual({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "输入无效" },
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
        { id: "t", checklist: null, leader: { extra: { wechat: null } } },
      ],
    });
    expect(TeamSchema.safeParse(body.teams[0]).success).toBe(true);
    const detail = await request("/t");
    expect(detail.status).toBe(200);
    expect(TeamSchema.safeParse((await detail.json()).team).success).toBe(true);
    signIn("leader");
    expect((await (await request("/t")).json()).team).toMatchObject({
      checklist: { notes: "private" },
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
      joinRequest: null,
    });
  });

  it("creates an application with ISO timestamps and rejects a duplicate without widening the contract", async () => {
    signIn("outsider");
    const response = await request(
      "/t/join",
      "POST",
      '{"message":" hello "}',
      "text/plain",
    );
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body).toMatchObject({
      success: true,
      joinRequest: {
        teamId: "t",
        userId: "outsider",
        status: "pending",
        message: "hello",
        decidedAt: null,
      },
    });
    expect(TeamJoinRequestSchema.safeParse(body.joinRequest).success).toBe(
      true,
    );
    const duplicate = await request(
      "/t/join",
      "POST",
      "{}",
      "application/json",
    );
    expect(duplicate.status).toBe(409);
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
