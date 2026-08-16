/**
 * E2E fixture 自构造工具
 *
 * 背景：team-applications 等用例历史上依赖 seed 脚本预置的账号 + 队伍 + pending 申请，
 * 但「申请 → 审批」是消耗性状态（approve/reject 一次即消失），预置种子天然不幂等。
 *
 * 本模块让每个用例自行构造隔离 fixture：
 *   signUpUser（注册、验证邮箱、登录）→ patchWechat（建队/申请的前置条件）
 *   → createTeamAs / applyToTeamAs
 * 用户名/队名带 RUN_ID 时间戳，多次运行互不干扰，无需清理。
 *
 * 默认连接统一 Worker 的 /api，可用环境变量覆盖。HTTP 使用 Origin 头和
 * set-cookie 会话。
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { createEmailVerificationToken } from "better-auth/api";

const API_BASE = process.env.E2E_API_URL || "http://localhost:5432/api";
const FRONTEND_ORIGIN = process.env.E2E_ORIGIN || "http://localhost:5432";
let syntheticIpSequence = 10;

function requireLocalOrigin() {
  const hostname = new URL(FRONTEND_ORIGIN).hostname;
  if (hostname !== "localhost" && hostname !== "127.0.0.1") {
    throw new Error(
      `Synthetic email verification is restricted to localhost; received ${hostname}`,
    );
  }
}

function localAuthSecret() {
  requireLocalOrigin();
  const fromEnvironment = process.env.BETTER_AUTH_SECRET?.trim();
  if (fromEnvironment) return fromEnvironment;

  const devVarsPath = path.join(process.cwd(), "frontend", ".dev.vars");
  if (existsSync(devVarsPath)) {
    const match = readFileSync(devVarsPath, "utf8").match(
      /^BETTER_AUTH_SECRET=(.+)$/mu,
    );
    if (match?.[1]?.trim()) return match[1].trim();
  }

  throw new Error(
    "BETTER_AUTH_SECRET is required to verify local E2E fixture accounts",
  );
}

function nextSyntheticClientIp() {
  const octet = syntheticIpSequence;
  syntheticIpSequence = syntheticIpSequence >= 249 ? 10 : syntheticIpSequence + 1;
  return `198.51.100.${octet}`;
}

function cookiePair(setCookie: string) {
  return setCookie.split(";", 1)[0] ?? setCookie;
}

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
  clientIp?: string,
): Promise<ApiResult> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    Origin: FRONTEND_ORIGIN,
  };
  if (cookie) headers.Cookie = cookie;
  if (clientIp) headers["CF-Connecting-IP"] = clientIp;

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
  return {
    status: res.status,
    ok: res.ok,
    data,
    setCookie: res.headers.get("set-cookie"),
  };
}

/** 注册、验证邮箱并登录一个仅用于本地 E2E 的用户。 */
export async function signUpUser(
  email: string,
  password: string,
  name: string,
): Promise<FixtureUser> {
  const clientIp = nextSyntheticClientIp();
  const registration = await apiFetch("POST", "/auth/sign-up/email", {
    email,
    password,
    name,
  }, undefined, clientIp);
  if (
    !registration.ok ||
    registration.setCookie ||
    (registration.data?.token !== undefined && registration.data?.token !== null) ||
    registration.data?.user?.id !== undefined
  ) {
    throw new Error(
      `unverified sign-up contract failed for ${email}: ${registration.status} ${JSON.stringify(registration.data)}`,
    );
  }

  const token = await createEmailVerificationToken(
    localAuthSecret(),
    email,
    undefined,
    60 * 60,
  );
  const verification = await apiFetch(
    "POST",
    "/auth/confirm-email",
    { token },
    undefined,
    clientIp,
  );
  if (!verification.ok || verification.data?.success !== true) {
    throw new Error(
      `email verification failed for ${email}: ${verification.status} ${JSON.stringify(verification.data)}`,
    );
  }

  const login = await apiFetch("POST", "/auth/sign-in/email", {
    email,
    password,
  }, undefined, clientIp);
  const userId = login.data?.user?.id as string | undefined;
  if (!login.ok || !login.setCookie || !userId) {
    throw new Error(
      `verified sign-in failed for ${email}: ${login.status} ${JSON.stringify(login.data)}`,
    );
  }

  return {
    email,
    password,
    name,
    userId,
    cookie: cookiePair(login.setCookie),
  };
}

/** 补微信号（建队 / 申请加入的前置条件，API 强制校验） */
export async function patchWechat(
  user: FixtureUser,
  wechat: string,
): Promise<void> {
  const res = await apiFetch(
    "PATCH",
    "/users/me",
    { extra: { wechat } },
    user.cookie,
  );
  if (!res.ok) {
    throw new Error(
      `patch wechat failed for ${user.email}: ${res.status} ${JSON.stringify(res.data)}`,
    );
  }
}

/** 以某个用户身份建队，返回 teamId */
export async function createTeamAs(
  user: FixtureUser,
  team: {
    locationId: string;
    activityType: "hiking" | "explore" | "leisure" | "travel";
    title: string;
    startAt: string;
    endAt: string;
    maxParticipants: number;
    description?: string;
    requirements?: string[];
    tagIds?: string[];
  },
): Promise<string> {
  const res = await apiFetch(
    "POST",
    "/teams",
    team as unknown as Record<string, unknown>,
    user.cookie,
  );
  const teamId = res.data?.team?.id as string | undefined;
  if (!res.ok || !teamId) {
    throw new Error(
      `create team failed for ${user.email}: ${res.status} ${JSON.stringify(res.data)}`,
    );
  }
  return teamId;
}

/** 以某个用户身份申请加入队伍（构造 pending 状态用） */
export async function applyToTeamAs(
  user: FixtureUser,
  teamId: string,
  message = "E2E 申请",
): Promise<void> {
  const res = await apiFetch(
    "POST",
    `/teams/${teamId}/join`,
    { message },
    user.cookie,
  );
  if (!res.ok) {
    throw new Error(
      `apply to team failed for ${user.email}: ${res.status} ${JSON.stringify(res.data)}`,
    );
  }
}

/** 取本地种子数据中的第一个 location id。 */
export async function getFirstLocationId(): Promise<string> {
  const res = await apiFetch("GET", "/locations?limit=1");
  const id = res.data?.locations?.[0]?.id as string | undefined;
  if (!res.ok || !id) {
    throw new Error(
      `list locations failed: ${res.status} ${JSON.stringify(res.data)}`,
    );
  }
  return id;
}
