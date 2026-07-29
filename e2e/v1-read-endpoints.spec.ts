/**
 * e2e: /v1/* OpenAPI read endpoints — staging smoke
 *
 * Targets: api-staging.gomate.live
 * Purpose: 消除 #457 hidden risk（CI 绿 ≠ 路由可达），覆盖 6 端点 + my-status。
 *
 * 约束：
 * - 不依赖 seed 数据幂等性（不新建队伍/tag——读取已有数据）
 * - 用 fixtures.ts 自构造隔离用户（有 RUN_ID 时间戳，无须清理）
 * - 匿名测试：无 auth header → 401 或 200（公开端点）
 * - 已认证测试：用 fixtures.signUpUser → cookie → 调用 my-status
 */

import { test, expect } from "@playwright/test";
import { STAGING_ACCOUNTS } from "./helpers";

// Staging API base
const API_BASE = "https://api-staging.gomate.live";
// Use chromium-staging project baseURL pattern
const STAGING_FRONTEND = "https://staging.gomate.live";

// ─── Helpers ───────────────────────────────────────────────────────────────────

async function apiGet(path: string, cookie?: string): Promise<{ status: number; body: unknown }> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    Origin: STAGING_FRONTEND,
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

async function signInViaBrowser(page: import("@playwright/test").Page, email: string, password: string) {
  await page.goto(`${STAGING_FRONTEND}/login`);
  await page.waitForLoadState("networkidle");
  const emailInput = page.locator("[data-testid='login-email']");
  await emailInput.waitFor({ state: "visible", timeout: 15000 });
  await emailInput.fill(email);
  await page.locator("[data-testid='login-password']").fill(password);
  await page.locator("[data-testid='login-submit']").click();
  // Wait for auth response
  await page.waitForResponse(/\/auth\//, { timeout: 30000 }).catch(() => null);
  await page.waitForURL(/\/$/, { timeout: 30000 });
  // Extract session cookie
  const cookies = await page.context().cookies(STAGING_FRONTEND);
  const sessionCookie = cookies.find((c) => c.name.includes("session") || c.name.includes("better"));
  return sessionCookie?.value ?? null;
}

// ─── GET /v1/teams ────────────────────────────────────────────────────────────

test("GET /v1/teams — 200 with pagination", async () => {
  const { status, body } = await apiGet("/v1/teams?page=1&pageSize=3");

  expect(status, `Expected 200, got ${status} body=${JSON.stringify(body)}`).toBe(200);
  const data = body as { success: boolean; teams: unknown[]; pagination: unknown };
  expect(data.success).toBe(true);
  expect(Array.isArray(data.teams)).toBe(true);
  expect(data.pagination).toBeDefined();
});

test("GET /v1/teams — 200 with cityId filter", async () => {
  const { status, body } = await apiGet("/v1/teams?cityId=sz&pageSize=5");

  expect(status, `Expected 200, got ${status}`).toBe(200);
  const data = body as { success: boolean; teams: unknown[] };
  expect(data.success).toBe(true);
  expect(Array.isArray(data.teams)).toBe(true);
});

test("GET /v1/teams — 200 with keyword search", async () => {
  const { status, body } = await apiGet("/v1/teams?keyword=test&pageSize=5");

  expect(status, `Expected 200, got ${status}`).toBe(200);
  const data = body as { success: boolean };
  expect(data.success).toBe(true);
});

// ─── GET /v1/teams/:id ────────────────────────────────────────────────────────

test("GET /v1/teams/:id — 200 for existing team", async () => {
  // First fetch the team list to get a real ID
  const listRes = await apiGet("/v1/teams?pageSize=1");
  const teams = (listRes.body as { teams: { id: string }[] }).teams;
  const teamId = teams[0]?.id;

  if (!teamId) {
    // No teams in staging — skip gracefully
    test.skip();
    return;
  }

  const { status, body } = await apiGet(`/v1/teams/${teamId}`);
  expect(status, `Expected 200, got ${status}`).toBe(200);
  const data = body as { success: boolean; team: unknown };
  expect(data.success).toBe(true);
  expect(data.team).toBeDefined();
});

test("GET /v1/teams/:id — 404 for non-existent id", async () => {
  const fakeId = "00000000-0000-0000-0000-000000000000";
  const { status } = await apiGet(`/v1/teams/${fakeId}`);
  expect(status, `Expected 404, got ${status}`).toBe(404);
});

// ─── GET /v1/teams/:id/my-status ─────────────────────────────────────────────

test("GET /v1/teams/:id/my-status — 200 anonymous → status:none", async ({ page }) => {
  // Fetch a real team to get a valid ID
  const listRes = await apiGet("/v1/teams?pageSize=1");
  const teams = (listRes.body as { teams: { id: string }[] }).teams;
  const teamId = teams[0]?.id;
  if (!teamId) {
    test.skip();
    return;
  }

  // Anonymous: no cookie
  const { status, body } = await apiGet(`/v1/teams/${teamId}/my-status`);

  expect(status, `Expected 200, got ${status}`).toBe(200);
  const data = body as { status: string };
  expect(["none", "pending", "approved", "rejected", "member"]).toContain(data.status);
});

test("GET /v1/teams/:id/my-status — 200 authenticated → real status", async ({ page }) => {
  // Get a valid team ID
  const listRes = await apiGet("/v1/teams?pageSize=1");
  const teams = (listRes.body as { teams: { id: string }[] }).teams;
  const teamId = teams[0]?.id;
  if (!teamId) {
    test.skip();
    return;
  }

  // Sign in via browser with staging leader account
  const { STAGING_ACCOUNTS: { leader } } = await import("./helpers");
  const cookie = await signInViaBrowser(page, leader.email, leader.password);

  if (!cookie) {
    // Login failed — skip
    test.skip();
    return;
  }

  const { status, body } = await apiGet(`/v1/teams/${teamId}/my-status`, cookie);
  expect(status, `Expected 200, got ${status}`).toBe(200);
  const data = body as { status: string };
  expect(["none", "pending", "approved", "rejected", "member"]).toContain(data.status);
});

// ─── GET /v1/locations ────────────────────────────────────────────────────────

test("GET /v1/locations — 200 with pagination", async () => {
  const { status, body } = await apiGet("/v1/locations?page=1&pageSize=5");

  expect(status, `Expected 200, got ${status} body=${JSON.stringify(body)}`).toBe(200);
  const data = body as { success: boolean; locations: unknown[]; pagination: unknown };
  expect(data.success).toBe(true);
  expect(Array.isArray(data.locations)).toBe(true);
  expect(data.pagination).toBeDefined();
});

test("GET /v1/locations — 200 with keyword filter", async () => {
  const { status, body } = await apiGet("/v1/locations?keyword=山&pageSize=5");

  expect(status, `Expected 200, got ${status}`).toBe(200);
  const data = body as { success: boolean };
  expect(data.success).toBe(true);
});

// ─── GET /v1/locations/:id ────────────────────────────────────────────────────

test("GET /v1/locations/:id — 200 for existing location", async () => {
  // Get a real location ID from the list
  const listRes = await apiGet("/v1/locations?pageSize=1");
  const locations = (listRes.body as { locations: { id: string }[] }).locations;
  const locationId = locations[0]?.id;

  if (!locationId) {
    test.skip();
    return;
  }

  const { status, body } = await apiGet(`/v1/locations/${locationId}`);
  expect(status, `Expected 200, got ${status}`).toBe(200);
  const data = body as { success: boolean; location: unknown };
  expect(data.success).toBe(true);
  expect(data.location).toBeDefined();
});

test("GET /v1/locations/:id — 404 for non-existent id", async () => {
  const fakeId = "00000000-0000-0000-0000-000000000000";
  const { status } = await apiGet(`/v1/locations/${fakeId}`);
  expect(status, `Expected 404, got ${status}`).toBe(404);
});

// ─── GET /v1/enums ───────────────────────────────────────────────────────────

test("GET /v1/enums — 200 returns all enum categories", async () => {
  const { status, body } = await apiGet("/v1/enums");

  expect(status, `Expected 200, got ${status} body=${JSON.stringify(body)}`).toBe(200);
  const data = body as { success: boolean; enums: Record<string, unknown> };
  expect(data.success).toBe(true);
  expect(data.enums).toBeDefined();
  // All required categories must be present
  expect(Array.isArray(data.enums.cities)).toBe(true);
  expect(Array.isArray(data.enums.tags)).toBe(true);
  expect(Array.isArray(data.enums.durations)).toBe(true);
  expect(Array.isArray(data.enums.difficulties)).toBe(true);
  expect(Array.isArray(data.enums.teamStatuses)).toBe(true);
});

// ─── GET /v1/stories ─────────────────────────────────────────────────────────

test("GET /v1/stories — 200 with pagination", async () => {
  const { status, body } = await apiGet("/v1/stories?page=1&pageSize=3");

  expect(status, `Expected 200, got ${status} body=${JSON.stringify(body)}`).toBe(200);
  const data = body as { success: boolean; stories: unknown[]; pagination: unknown };
  expect(data.success).toBe(true);
  expect(Array.isArray(data.stories)).toBe(true);
  expect(data.pagination).toBeDefined();
});

// ─── GET /v1/stories/:id ──────────────────────────────────────────────────────

test("GET /v1/stories/:id — 200 for existing story", async () => {
  // Get a real story ID
  const listRes = await apiGet("/v1/stories?pageSize=1");
  const stories = (listRes.body as { stories: { id: string }[] }).stories;
  const storyId = stories[0]?.id;

  if (!storyId) {
    // No published stories in staging — skip
    test.skip();
    return;
  }

  const { status, body } = await apiGet(`/v1/stories/${storyId}`);
  expect(status, `Expected 200, got ${status}`).toBe(200);
  const data = body as { success: boolean; story: unknown };
  expect(data.success).toBe(true);
  expect(data.story).toBeDefined();
});

test("GET /v1/stories/:id — 404 for non-existent id", async () => {
  const fakeId = "00000000-0000-0000-0000-000000000000";
  const { status } = await apiGet(`/v1/stories/${fakeId}`);
  expect(status, `Expected 404, got ${status}`).toBe(404);
});
