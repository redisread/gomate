/**
 * API 客户端 - 统一封装对后端 api/ 服务的 fetch 请求
 */

const API_BASE =
  typeof window !== "undefined"
    ? (import.meta.env.PUBLIC_API_URL as string) || "http://localhost:8799"
    : (import.meta.env.PUBLIC_API_URL as string) || "http://localhost:8799";

/**
 * 通用 fetch 封装，自动携带 credentials 和 Content-Type
 */
export async function fetchAPI(
  path: string,
  options?: RequestInit
): Promise<Response> {
  const normalizedPath = path.startsWith("/api/") ? path.slice(4) : path;
  return fetch(`${API_BASE}${normalizedPath}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    credentials: "include",
  });
}

/**
 * GET 请求
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
 * 获取地点关联的打卡点（POI）列表
 */
export async function getLocationPois(
  locationId: string
): Promise<import("./types").RoutePoi[]> {
  try {
    const res = await fetchAPI(`/api/locations/${locationId}/pois`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.pois ?? [];
  } catch {
    return [];
  }
}

/**
 * 两步加载当前登录用户的最新数据，绕过 Cloudflare KV 会话缓存。
 * 1. /auth/get-session → 验证登录状态，取 userId
 * 2. /api/users?id=xxx → 直接读数据库，取最新字段
 *
 * @param redirectOnFail 未登录或出错时跳转的 URL，不传则静默返回 null
 */
export async function fetchCurrentUser(redirectOnFail?: string): Promise<Record<string, unknown> | null> {
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
