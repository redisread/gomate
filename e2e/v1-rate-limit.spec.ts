/**
 * e2e: /v1/* P2-4 rate limit contract (#220)
 *
 * Targets: api-staging.gomate.live
 * Spec: read=600/min, write=30/min per actor (apiKey or user). Anonymous → no limit.
 * 429 + X-RateLimit-* + Retry-After headers.
 *
 * 约束：
 * - 不写 idempotency-key 测试（#218 单独覆盖）
 * - 不跨用例 actorId（每用例自建 fixture 隔离）
 * - 仅验证写端点（30/min）— 读端点 #220 没挂 middleware 暂不测
 */

import { test, expect, request as pwRequest } from "@playwright/test";

const API_BASE = "https://api-staging.gomate.live";
const FRONTEND_ORIGIN = "https://staging.gomate.live";

// ─── helpers ────────────────────────────────────────────────────────────────

interface ApiResult {
  status: number;
  body: Record<string, unknown>;
  rateLimitHeaders: {
    limit: number | null;
    remaining: number | null;
    reset: number | null;
    retryAfter: number | null;
  };
}

async function apiPost(
  path: string,
  body: Record<string, unknown>,
  cookie?: string,
  idempotencyKey?: string,
): Promise<ApiResult> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    Origin: FRONTEND_ORIGIN,
  };
  if (cookie) headers.Cookie = cookie;
  // 写端点必传 Idempotency-Key（#218 中间件 400 if missing）。每个调用 unique key 以避免回放。
  headers["Idempotency-Key"] = idempotencyKey ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  let data: Record<string, unknown>;
  try {
    data = (await res.json()) as Record<string, unknown>;
  } catch {
    data = {};
  }
  const limit = res.headers.get("x-ratelimit-limit");
  const remaining = res.headers.get("x-ratelimit-remaining");
  const reset = res.headers.get("x-ratelimit-reset");
  const retryAfter = res.headers.get("retry-after");
  return {
    status: res.status,
    body: data,
    rateLimitHeaders: {
      limit: limit === null ? null : parseInt(limit, 10),
      remaining: remaining === null ? null : parseInt(remaining, 10),
      reset: reset === null ? null : parseInt(reset, 10),
      retryAfter: retryAfter === null ? null : parseInt(retryAfter, 10),
    },
  };
}

async function signUp(email: string, password: string, name: string): Promise<string> {
  const r = await fetch(`${API_BASE}/auth/sign-up/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: FRONTEND_ORIGIN },
    body: JSON.stringify({ email, password, name }),
  });
  const setCookie = r.headers.get("set-cookie");
  if (!setCookie) {
    throw new Error(`sign-up failed: status=${r.status} body=${await r.text()}`);
  }
  return setCookie;
}

async function setWechat(cookie: string, userId: string, wechat: string): Promise<void> {
  const r = await fetch(`${API_BASE}/users/update`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Origin: FRONTEND_ORIGIN, Cookie: cookie },
    body: JSON.stringify({ userId, wechat }),
  });
  if (r.status !== 200) {
    throw new Error(`set wechat failed: ${r.status} ${await r.text()}`);
  }
}

async function getSessionUserId(cookie: string): Promise<string> {
  const r = await fetch(`${API_BASE}/auth/get-session`, {
    headers: { Cookie: cookie },
  });
  const j = (await r.json()) as { user: { id: string } };
  return j.user.id;
}

async function getFirstLocationId(cookie: string): Promise<string> {
  const r = await fetch(`${API_BASE}/locations?pageSize=1`, {
    headers: { Cookie: cookie },
  });
  const j = (await r.json()) as { locations: { id: string }[] };
  if (!j.locations?.length) throw new Error("no locations on staging");
  return j.locations[0].id;
}

// ─── tests ──────────────────────────────────────────────────────────────────

test.describe("P2-4 rate limit (write 30/min)", () => {
  test("write endpoint returns 429 after 30 requests in window + Retry-After header", async () => {
    const RUN_ID = `rl-${Date.now()}`;
    const email = `${RUN_ID}@gomate.test`;
    const password = "TestPass123";
    const name = `RL ${RUN_ID}`;

    const cookie = await signUp(email, password, name);
    const userId = await getSessionUserId(cookie);
    await setWechat(cookie, userId, `wx_${RUN_ID}`);
    const locationId = await getFirstLocationId(cookie);

    await test.step("first 30 requests within window should NOT 429", async () => {
      for (let i = 1; i <= 30; i++) {
        const r = await apiPost(
          "/v1/teams",
          {
            locationId,
            title: `RL Test ${i} ${RUN_ID}`,
            startTime: new Date(Date.now() + 86400000).toISOString(),
            durationMin: 60,
            maxMembers: 4,
          },
          cookie,
        );
        if (r.status === 429) {
          throw new Error(
            `请求 ${i}/30 提前触发 429 — 应 30 次都不限流；headers=${JSON.stringify(r.rateLimitHeaders)} body=${JSON.stringify(r.body)}`,
          );
        }
        // 期望 201（创建）或 4xx 业务错误（wechat/location 校验等），但**绝不能是 429**
        if (r.status !== 201 && r.status < 400) {
          throw new Error(`请求 ${i}/30 状态异常: ${r.status} body=${JSON.stringify(r.body)}`);
        }
        // X-RateLimit-* 头应在成功响应附带
        expect(r.rateLimitHeaders.limit, `请求 ${i} 应带 X-RateLimit-Limit`).toBe(30);
        expect(r.rateLimitHeaders.remaining, `请求 ${i} 应带 X-RateLimit-Remaining`).toBe(30 - i);
      }
    });

    await test.step("request 31 should 429 + Retry-After + X-RateLimit-Remaining=0", async () => {
      const r = await apiPost(
        "/v1/teams",
        {
          locationId,
          title: `RL Test 31 ${RUN_ID}`,
          startTime: new Date(Date.now() + 86400000).toISOString(),
          durationMin: 60,
          maxMembers: 4,
        },
        cookie,
      );
      expect(r.status, `请求 31 应返 429, 实际 ${r.status} body=${JSON.stringify(r.body)}`).toBe(429);
      expect(r.body.error, "错误码应是 RATE_LIMIT_EXCEEDED").toBe("RATE_LIMIT_EXCEEDED");
      expect(r.rateLimitHeaders.remaining).toBe(0);
      expect(r.rateLimitHeaders.retryAfter, "应带 Retry-After 头").not.toBeNull();
      expect(r.rateLimitHeaders.retryAfter ?? 0).toBeGreaterThanOrEqual(1);
      expect(r.rateLimitHeaders.retryAfter ?? 60).toBeLessThanOrEqual(60);
    });
  }, { timeout: 90_000 });

  test("anonymous write request NOT rate-limited (5 anon requests all non-429)", async () => {
    // 匿名 → middleware 直接 next（不计入限流）
    // 实证：连续 5 次匿名 POST 全部 4xx（401/400 业务错误），但**绝不是 429**
    for (let i = 1; i <= 5; i++) {
      const r = await apiPost("/v1/teams", {
        locationId: "loc_doesnotmatter",
        title: `anon ${i}`,
        startTime: new Date(Date.now() + 86400000).toISOString(),
        durationMin: 60,
        maxMembers: 4,
      });
      expect(
        r.status,
        `匿名请求 ${i} 应是 4xx 业务错误（401/400），不能是 429`,
      ).toBeGreaterThanOrEqual(400);
      expect(r.status).toBeLessThan(500);
      expect(r.status, `匿名请求 ${i} 不应是 429`).not.toBe(429);
    }
  });

  test("two different users have independent counters", async () => {
    const RUN_ID = `rl-iso-${Date.now()}`;
    const cookieA = await signUp(`${RUN_ID}-a@gomate.test`, "TestPass123", `RL iso A`);
    const cookieB = await signUp(`${RUN_ID}-b@gomate.test`, "TestPass123", `RL iso B`);
    const userIdA = await getSessionUserId(cookieA);
    const userIdB = await getSessionUserId(cookieB);
    await setWechat(cookieA, userIdA, `wx_${RUN_ID}_a`);
    await setWechat(cookieB, userIdB, `wx_${RUN_ID}_b`);
    const locationId = await getFirstLocationId(cookieA);

    await test.step("user A 满 30/min", async () => {
      for (let i = 1; i <= 30; i++) {
        await apiPost(
          "/v1/teams",
          { locationId, title: `iso A ${i}`, startTime: new Date(Date.now() + 86400000).toISOString(), durationMin: 60, maxMembers: 4 },
          cookieA,
        );
      }
      const r = await apiPost(
        "/v1/teams",
        { locationId, title: `iso A 31`, startTime: new Date(Date.now() + 86400000).toISOString(), durationMin: 60, maxMembers: 4 },
        cookieA,
      );
      expect(r.status).toBe(429);
    });

    await test.step("user B 不应被 user A 影响（应能成功）", async () => {
      // user B 第一次请求：counter 从 1 开始
      const r = await apiPost(
        "/v1/teams",
        { locationId, title: `iso B 1`, startTime: new Date(Date.now() + 86400000).toISOString(), durationMin: 60, maxMembers: 4 },
        cookieB,
      );
      expect(r.status, `user B 应不被 user A 影响, 实际 ${r.status}`).not.toBe(429);
      expect(r.rateLimitHeaders.remaining).toBe(29);
    });
  }, { timeout: 90_000 });
});