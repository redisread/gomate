/**
 * API 客户端 - 统一封装对后端 api/ 服务的 fetch 请求
 *
 * Note: 分享图功能已迁移到服务端生成 (PR #151)
 */

export const API_BASE =
  typeof window !== "undefined"
    ? (import.meta.env.PUBLIC_API_URL as string) || "http://localhost:8799"
    : (import.meta.env.PUBLIC_API_URL as string) || "http://localhost:8799";

type APIRequestInit = RequestInit & {
  /**
   * Whether to send cookies with the request. Defaults to true for backwards
   * compatibility with authenticated API calls.
   */
  auth?: boolean;
};

function normalizePath(path: string): string {
  return path.startsWith("/api/") ? path.slice(4) : path;
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
  const normalizedPath = normalizePath(path);
  const method = (fetchOptions.method || "GET").toUpperCase();

  return fetch(`${API_BASE}${normalizedPath}`, {
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
 * 通用 GET 请求，保留登录态兼容。
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
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || `API POST ${path} failed: ${res.status}`);
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
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || `API PUT ${path} failed: ${res.status}`);
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
 * 两步加载当前登录用户的最新数据，绕过 Cloudflare KV 会话缓存。
 * 1. /auth/get-session → 验证登录状态，取 userId
 * 2. /api/users?id=xxx → 直接读数据库，取最新字段
 *
 * @param redirectOnFail 未登录或出错时跳转的 URL，不传则静默返回 null
 */
export async function fetchCurrentUser(redirectOnFail?: string): Promise<import("./types").SessionUser | null> {
  try {
    const sessionRes = await fetchAPI("/auth/get-session");
    const sessionData = await sessionRes.json();
    if (!sessionData?.user?.id) throw new Error("no session");

    const userRes = await fetchAPI(`/api/users?id=${sessionData.user.id}`);
    const userData = await userRes.json();

    return {
      ...sessionData.user,
      ...userData.user,
      image: userData.user?.avatar ?? sessionData.user.image,
    };
  } catch {
    if (redirectOnFail) window.location.href = redirectOnFail;
    return null;
  }
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
  return apiPost("/api/feedback", data);
}

