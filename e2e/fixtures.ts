/**
 * E2E fixture 自构造工具（staging 用）
 *
 * 背景：team-applications 等用例历史上依赖 seed 脚本预置的账号 + 队伍 + pending 申请，
 * 但 seed 体系 07-06 更换后旧账号（admin@test.com 等）在 staging D1 已不存在，
 * 且「申请 → 审批」是消耗性状态（approve/reject 一次即消失），预置种子天然不幂等。
 *
 * 本模块让每个用例自行构造隔离 fixture：
 *   signUpUser → patchWechat（建队/申请的前置条件）→ createTeamAs / applyToTeamAs
 * 用户名/队名带 RUN_ID 时间戳，多次运行互不干扰，无需清理。
 *
 * HTTP 模式与 scripts/seed-staging.mjs 一致（Origin 头 + set-cookie 会话），
 * 已在 staging 实证可用。
 */

const API_BASE = process.env.E2E_API_URL || "https://api-staging.gomate.live";
const STAGING_ORIGIN = process.env.E2E_ORIGIN || "https://staging.gomate.live";

export interface FixtureUser {
  email: string;
  password: string;
  name: string;
  userId: string;
  cookie: string;
}

interface ApiResult {
  status: number;
  ok: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  setCookie: string | null;
}

async function apiFetch(
  method: string,
  path: string,
  body?: Record<string, unknown>,
  cookie?: string,
): Promise<ApiResult> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    Origin: STAGING_ORIGIN,
  };
  if (cookie) headers.Cookie = cookie;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  return { status: res.status, ok: res.ok, data, setCookie: res.headers.get("set-cookie") };
}

/** 注册新用户（better-auth sign-up 自动登录，会话在 set-cookie 里） */
export async function signUpUser(email: string, password: string, name: string): Promise<FixtureUser> {
  const res = await apiFetch("POST", "/auth/sign-up/email", { email, password, name });
  const userId = res.data?.user?.id as string | undefined;
  if (!res.ok || !res.setCookie || !userId) {
    throw new Error(`sign-up failed for ${email}: ${res.status} ${JSON.stringify(res.data)}`);
  }
  return { email, password, name, userId, cookie: res.setCookie };
}

/** 补微信号（建队 / 申请加入的前置条件，API 强制校验） */
export async function patchWechat(user: FixtureUser, wechat: string): Promise<void> {
  const res = await apiFetch("PATCH", "/users/update", { userId: user.userId, wechat }, user.cookie);
  if (!res.ok) {
    throw new Error(`patch wechat failed for ${user.email}: ${res.status} ${JSON.stringify(res.data)}`);
  }
}

/** 以某个用户身份建队，返回 teamId */
export async function createTeamAs(
  user: FixtureUser,
  team: { locationId: string; title: string; date: string; time: string; maxMembers: number; description?: string },
): Promise<string> {
  const res = await apiFetch("POST", "/teams", team as unknown as Record<string, unknown>, user.cookie);
  const teamId = res.data?.team?.id as string | undefined;
  if (!res.ok || !teamId) {
    throw new Error(`create team failed for ${user.email}: ${res.status} ${JSON.stringify(res.data)}`);
  }
  return teamId;
}

/** 以某个用户身份申请加入队伍（构造 pending 状态用） */
export async function applyToTeamAs(user: FixtureUser, teamId: string, message = "E2E 申请"): Promise<void> {
  const res = await apiFetch("POST", `/teams/${teamId}/join`, { message }, user.cookie);
  if (!res.ok) {
    throw new Error(`apply to team failed for ${user.email}: ${res.status} ${JSON.stringify(res.data)}`);
  }
}

/** 取 staging 第一个 location id（种子保证至少一个） */
export async function getFirstLocationId(): Promise<string> {
  const res = await apiFetch("GET", "/locations?pageSize=1");
  const id = res.data?.locations?.[0]?.id as string | undefined;
  if (!res.ok || !id) {
    throw new Error(`list locations failed: ${res.status} ${JSON.stringify(res.data)}`);
  }
  return id;
}
