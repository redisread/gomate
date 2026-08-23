/**
 * Same-origin browser API client. Callers pass resource paths without `/api`.
 */

export const API_BASE = "/api";

type APIRequestInit = RequestInit & {
  /**
   * Whether to send cookies with the request. Defaults to true for
   * authenticated same-origin calls.
   */
  auth?: boolean;
};

function assertResourcePath(path: string): void {
  if (!path.startsWith("/") || path === "/api" || path.startsWith("/api/")) {
    throw new Error(`API resource path must start with '/' and must not include '/api': ${path}`);
  }
}

function isJsonRequest(method: string, body: BodyInit | null | undefined): boolean {
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  return method !== "GET" && method !== "HEAD" && body !== undefined && !isFormData;
}

function buildHeaders(options: APIRequestInit, method: string): HeadersInit | undefined {
  const headers = new Headers(options.headers);
  if (isJsonRequest(method, options.body as BodyInit | null | undefined) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const entries = Array.from(headers.entries());
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

async function requestAPI(path: string, options: APIRequestInit = {}): Promise<Response> {
  const { auth = true, ...fetchOptions } = options;
  assertResourcePath(path);
  const method = (fetchOptions.method || "GET").toUpperCase();

  return fetch(`${API_BASE}${path}`, {
    ...fetchOptions,
    headers: buildHeaders(options, method),
    credentials: auth ? "include" : "omit",
  });
}

/**
 * 通用 fetch 封装，默认携带 credentials；GET 不默认添加 JSON header，避免跨域预检。
 */
export async function fetchAPI(
  path: string,
  options?: APIRequestInit
): Promise<Response> {
  return requestAPI(path, options);
}

/**
 * 公开数据 fetch 封装：不携带 credentials，也不为 GET 添加自定义 header。
 */
export async function fetchPublicAPI(
  path: string,
  options?: Omit<APIRequestInit, "auth">
): Promise<Response> {
  return requestAPI(path, { ...options, auth: false });
}

/**
 * 公开 GET 请求。
 */
export async function publicApiGet<T>(path: string): Promise<T> {
  const res = await fetchPublicAPI(path);
  if (!res.ok) {
    throw new Error(`API GET ${path} failed: ${res.status}`);
  }
  return res.json();
}

/**
 * 通用 GET 请求，携带当前登录态。
 */
export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetchAPI(path);
  if (!res.ok) {
    throw new Error(`API GET ${path} failed: ${res.status}`);
  }
  return res.json();
}

/**
 * POST 请求
 */
export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetchAPI(path, {
    method: "POST",
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    throw new Error(await readErrorMessage(res, `API POST ${path} failed: ${res.status}`));
  }
  return res.json();
}

/**
 * PUT 请求
 */
export async function apiPut<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetchAPI(path, {
    method: "PUT",
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    throw new Error(await readErrorMessage(res, `API PUT ${path} failed: ${res.status}`));
  }
  return res.json();
}

export async function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetchAPI(path, {
    method: "PATCH",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(await readErrorMessage(res, `API PATCH ${path} failed: ${res.status}`));
  }
  return res.json();
}

/**
 * DELETE 请求
 */
export async function apiDelete<T>(path: string): Promise<T> {
  const res = await fetchAPI(path, { method: "DELETE" });
  if (!res.ok) {
    throw new Error(`API DELETE ${path} failed: ${res.status}`);
  }
  return res.json();
}

/**
 * 加载当前登录用户的最新数据库数据。
 *
 * task #183：模块级 promise memo —— 同页并发 dedupe + 会话内复用。
 * 首页 navbar + use-local-circle 同时调用时复用同一个 `/users/me` 请求。
 * Astro MPA 整页刷新天然重置 memo，无跨页脏读面；
 * profile 保存走 PATCH 后 location.replace 整页跳转，memo 同样重置（无同页脏读）。
 * redirect 副作用在 memo 外层处理，缓存值保持纯净（不含跳转行为）。
 *
 * @param redirectOnFail 未登录或出错时跳转的 URL，不传则静默返回 null
 */
let currentUserMemo: Promise<import("./types").SessionUser | null> | null = null;

async function loadCurrentUser(): Promise<import("./types").SessionUser | null> {
  try {
    const userRes = await fetchAPI("/users/me", { cache: "no-store" });
    if (!userRes.ok) return null;
    const userData = await userRes.json();
    return userData.user ?? null;
  } catch {
    return null;
  }
}

export function fetchCurrentUser(redirectOnFail?: string): Promise<import("./types").SessionUser | null> {
  if (!currentUserMemo) currentUserMemo = loadCurrentUser();
  return currentUserMemo.then((user) => {
    if (!user && redirectOnFail) window.location.href = redirectOnFail;
    return user;
  });
}

/**
 * 重新读取当前登录用户，绕过同页 memo。
 *
 * 登录发生在其他标签页、页面从 bfcache 恢复或认证 Cookie 刚刚建立时，
 * 旧的访客结果不能继续代表当前会话；调用方应在这些状态边界使用本函数。
 */
export function refreshCurrentUser(
  redirectOnFail?: string,
): Promise<import("./types").SessionUser | null> {
  currentUserMemo = loadCurrentUser();
  return currentUserMemo.then((user) => {
    if (!user && redirectOnFail) window.location.href = redirectOnFail;
    return user;
  });
}

/**
 * 提交用户反馈（功能建议 / Bug 反馈）
 */
export async function submitFeedback(data: {
  type: "suggestion" | "bug";
  name: string;
  email: string;
  content: string;
  device?: string;
  browser?: string;
  steps?: string;
  pageUrl?: string;
}): Promise<{ success: boolean; message: string }> {
  return apiPost("/feedback", data);
}

export function getApiErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") return fallback;
  const candidate = payload as {
    message?: unknown;
    error?: { message?: unknown } | string;
  };
  if (
    typeof candidate.error === "object" &&
    candidate.error !== null &&
    typeof candidate.error.message === "string"
  ) {
    return candidate.error.message;
  }
  if (typeof candidate.error === "string") return candidate.error;
  if (typeof candidate.message === "string") return candidate.message;
  return fallback;
}

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  const payload = await response.json().catch(() => null);
  return getApiErrorMessage(payload, fallback);
}
