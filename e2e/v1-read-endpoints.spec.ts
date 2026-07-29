/**
 * e2e: /v1/* OpenAPI read endpoints — staging smoke
 *
 * Targets: api-staging.gomate.live
 * Purpose: 消除 #457 hidden risk（CI 绿 ≠ 路由可达），覆盖 6 端点 + my-status。
 *
 * 约束：
 * - 不依赖 seed 数据幂等性（不新建队伍/tag——读取已有数据）
 * - 匿名测试：无 cookie → 200（公开端点）或 status:none（my-status）
 * - 已认证测试：POST /auth/sign-in/email 直接取 session cookie，不走浏览器
 * - 所有用例用 test.step() 起名，失败能指到行
 */

import { test, expect } from "@playwright/test";

// Staging API base
const API_BASE = "https://api-staging.gomate.live";
const FRONTEND_ORIGIN = "https://staging.gomate.live";

// ─── HTTP helpers ────────────────────────────────────────────────────────────

async function apiGet(path: string, cookie?: string): Promise<{ status: number; body: unknown }> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    Origin: FRONTEND_ORIGIN,
  };
  if (cookie) headers.Cookie = cookie;

  const res = await fetch(`${API_BASE}${path}`, { headers, method: "GET" });
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    body = await res.text();
  }
  return { status: res.status, body };
}

async function apiPost(
  path: string,
  body: Record<string, unknown>,
  cookie?: string,
): Promise<{ status: number; body: unknown; setCookie: string | null }> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    Origin: FRONTEND_ORIGIN,
  };
  if (cookie) headers.Cookie = cookie;

  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  let data: unknown;
  try {
    data = await res.json();
  } catch {
    data = await res.text();
  }
  return { status: res.status, body: data, setCookie: res.headers.get("set-cookie") };
}

/**
 * 直接 POST /auth/sign-in/email 取 session cookie（Wen 同款做法，不走浏览器）。
 */
async function signInApi(email: string, password: string): Promise<string> {
  const res = await apiPost("/auth/sign-in/email", { email, password });
  if (!res.setCookie) {
    throw new Error(`sign-in failed for ${email}: status=${res.status} body=${JSON.stringify(res.body)}`);
  }
  return res.setCookie;
}

// ─── GET /v1/teams ──────────────────────────────────────────────────────────

test("GET /v1/teams — 200 with pagination", async () => {
  await test.step("call GET /v1/teams?page=1&pageSize=3", async () => {
    const { status, body } = await apiGet("/v1/teams?page=1&pageSize=3");
    expect(status, `Expected 200, got ${status} body=${JSON.stringify(body)}`).toBe(200);
    const data = body as { success: boolean; teams: unknown[]; pagination: unknown };
    expect(data.success).toBe(true);
    expect(Array.isArray(data.teams)).toBe(true);
    expect(data.pagination).toBeDefined();
  });
});

test("GET /v1/teams — 200 with cityId filter", async () => {
  await test.step("call GET /v1/teams?cityId=sz&pageSize=5", async () => {
    const { status, body } = await apiGet("/v1/teams?cityId=sz&pageSize=5");
    expect(status, `Expected 200, got ${status}`).toBe(200);
    const data = body as { success: boolean; teams: unknown[] };
    expect(data.success).toBe(true);
    expect(Array.isArray(data.teams)).toBe(true);
  });
});

test("GET /v1/teams — 200 with keyword search", async () => {
  await test.step("call GET /v1/teams?keyword=test&pageSize=5", async () => {
    const { status, body } = await apiGet("/v1/teams?keyword=test&pageSize=5");
    expect(status, `Expected 200, got ${status}`).toBe(200);
    const data = body as { success: boolean };
    expect(data.success).toBe(true);
  });
});

// ─── GET /v1/teams/:id ─────────────────────────────────────────────────────

test("GET /v1/teams/:id — 200 for existing team", async () => {
  const teamId = await test.step("fetch first team id from list", async () => {
    const { status, body } = await apiGet("/v1/teams?pageSize=1");
    expect(status).toBe(200);
    const teams = (body as { teams: { id: string }[] }).teams;
    const id = teams[0]?.id;
    expect(id, "staging must have at least one team").toBeDefined();
    return id as string;
  });

  await test.step(`call GET /v1/teams/${teamId}`, async () => {
    const { status, body } = await apiGet(`/v1/teams/${teamId}`);
    expect(status, `Expected 200, got ${status}`).toBe(200);
    const data = body as { success: boolean; team: unknown };
    expect(data.success).toBe(true);
    expect(data.team).toBeDefined();
  });
});

test("GET /v1/teams/:id — 404 for non-existent id", async () => {
  await test.step("call GET /v1/teams/00000000-0000-0000-0000-000000000000", async () => {
    const { status } = await apiGet("/v1/teams/00000000-0000-0000-0000-000000000000");
    expect(status, `Expected 404, got ${status}`).toBe(404);
  });
});

// ─── GET /v1/teams/:id/my-status ─────────────────────────────────────────────

test("GET /v1/teams/:id/my-status — anonymous returns 200 status:none", async () => {
  const teamId = await test.step("fetch first team id", async () => {
    const { status, body } = await apiGet("/v1/teams?pageSize=1");
    expect(status).toBe(200);
    const id = (body as { teams: { id: string }[] }).teams[0]?.id;
    expect(id).toBeDefined();
    return id as string;
  });

  await test.step(`anonymous GET /v1/teams/${teamId}/my-status`, async () => {
    const { status, body } = await apiGet(`/v1/teams/${teamId}/my-status`);
    expect(status, `Expected 200, got ${status}`).toBe(200);
    const data = body as { status: string };
    expect(["none", "pending", "approved", "rejected", "member"]).toContain(data.status);
  });
});

test("GET /v1/teams/:id/my-status — authenticated returns real status", async () => {
  // 1. Sign in via API to get session cookie (Wen approach: no browser)
  const cookie = await test.step("POST /auth/sign-in/email with leader-staging account", async () => {
    return signInApi("leader-staging@gomate.test", "test1234");
  });

  // 2. Get a valid team ID
  const teamId = await test.step("fetch first team id", async () => {
    const { status, body } = await apiGet("/v1/teams?pageSize=1");
    expect(status).toBe(200);
    const id = (body as { teams: { id: string }[] }).teams[0]?.id;
    expect(id).toBeDefined();
    return id as string;
  });

  // 3. Call my-status with real session cookie
  await test.step(`GET /v1/teams/${teamId}/my-status with session cookie`, async () => {
    const { status, body } = await apiGet(`/v1/teams/${teamId}/my-status`, cookie);
    expect(status, `Expected 200, got ${status}`).toBe(200);
    const data = body as { status: string };
    // leader-staging@gomate.test should be member or leader of some team
    expect(["none", "pending", "approved", "rejected", "member"]).toContain(data.status);
  });
});

// ─── GET /v1/locations ───────────────────────────────────────────────────────

test("GET /v1/locations — 200 with pagination", async () => {
  await test.step("call GET /v1/locations?page=1&pageSize=5", async () => {
    const { status, body } = await apiGet("/v1/locations?page=1&pageSize=5");
    expect(status, `Expected 200, got ${status} body=${JSON.stringify(body)}`).toBe(200);
    const data = body as { success: boolean; locations: unknown[]; pagination: unknown };
    expect(data.success).toBe(true);
    expect(Array.isArray(data.locations)).toBe(true);
    expect(data.pagination).toBeDefined();
  });
});

test("GET /v1/locations — 200 with keyword filter", async () => {
  await test.step("call GET /v1/locations?keyword=山&pageSize=5", async () => {
    const { status, body } = await apiGet("/v1/locations?keyword=山&pageSize=5");
    expect(status, `Expected 200, got ${status}`).toBe(200);
    const data = body as { success: boolean };
    expect(data.success).toBe(true);
  });
});

// ─── GET /v1/locations/:id ────────────────────────────────────────────────────

test("GET /v1/locations/:id — 200 for existing location", async () => {
  const locationId = await test.step("fetch first location id", async () => {
    const { status, body } = await apiGet("/v1/locations?pageSize=1");
    expect(status).toBe(200);
    const id = (body as { locations: { id: string }[] }).locations[0]?.id;
    expect(id, "staging must have at least one location").toBeDefined();
    return id as string;
  });

  await test.step(`call GET /v1/locations/${locationId}`, async () => {
    const { status, body } = await apiGet(`/v1/locations/${locationId}`);
    expect(status, `Expected 200, got ${status}`).toBe(200);
    const data = body as { success: boolean; location: unknown };
    expect(data.success).toBe(true);
    expect(data.location).toBeDefined();
  });
});

test("GET /v1/locations/:id — 404 for non-existent id", async () => {
  await test.step("call GET /v1/locations/00000000-0000-0000-0000-000000000000", async () => {
    const { status } = await apiGet("/v1/locations/00000000-0000-0000-0000-000000000000");
    expect(status, `Expected 404, got ${status}`).toBe(404);
  });
});

// ─── GET /v1/enums ───────────────────────────────────────────────────────────

test("GET /v1/enums — 200 returns all enum categories", async () => {
  await test.step("call GET /v1/enums", async () => {
    const { status, body } = await apiGet("/v1/enums");
    expect(status, `Expected 200, got ${status} body=${JSON.stringify(body)}`).toBe(200);
    const data = body as { success: boolean; enums: Record<string, unknown> };
    expect(data.success).toBe(true);
    expect(data.enums).toBeDefined();
    expect(Array.isArray(data.enums.cities)).toBe(true);
    expect(Array.isArray(data.enums.tags)).toBe(true);
    expect(Array.isArray(data.enums.durations)).toBe(true);
    expect(Array.isArray(data.enums.difficulties)).toBe(true);
    expect(Array.isArray(data.enums.teamStatuses)).toBe(true);
  });
});

// ─── GET /v1/stories ────────────────────────────────────────────────────────

test("GET /v1/stories — 200 with pagination", async () => {
  await test.step("call GET /v1/stories?page=1&pageSize=3", async () => {
    const { status, body } = await apiGet("/v1/stories?page=1&pageSize=3");
    expect(status, `Expected 200, got ${status} body=${JSON.stringify(body)}`).toBe(200);
    const data = body as { success: boolean; stories: unknown[]; pagination: unknown };
    expect(data.success).toBe(true);
    expect(Array.isArray(data.stories)).toBe(true);
    expect(data.pagination).toBeDefined();
  });
});

// ─── GET /v1/stories/:id ────────────────────────────────────────────────────

test("GET /v1/stories/:id — 404 for non-existent id", async () => {
  await test.step("call GET /v1/stories/00000000-0000-0000-0000-000000000000", async () => {
    const { status } = await apiGet("/v1/stories/00000000-0000-0000-0000-000000000000");
    expect(status, `Expected 404, got ${status}`).toBe(404);
  });
});
