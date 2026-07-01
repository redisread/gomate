/**
 * API 调用辅助函数
 * 统一错误处理和加载状态管理
 */

import { fetchAPI } from "./api";

interface ApiCallOptions<T> {
  /** 成功回调 */
  onSuccess?: (data: T) => void;
  /** 错误回调 */
  onError?: (error: Error) => void;
  /** 静默模式：不打印错误到 console */
  silent?: boolean;
}

/**
 * 安全的 API 调用包装器
 * 自动处理 try-catch 和错误日志
 *
 * @example
 * const data = await safeFetch<Location>("/api/locations/123");
 * if (data) setLocation(data.location);
 */
export async function safeFetch<T = unknown>(
  endpoint: string,
  options?: RequestInit & ApiCallOptions<T>
): Promise<T | null> {
  const { onSuccess, onError, silent, ...fetchOptions } = options ?? {};

  try {
    const res = await fetchAPI(endpoint, fetchOptions);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    const data = await res.json();
    onSuccess?.(data);
    return data;
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    if (!silent) {
      console.error(`[API] ${endpoint}:`, error);
    }
    onError?.(error);
    return null;
  }
}

/**
 * 带加载状态的 API 调用
 * 自动管理 loading 状态
 *
 * @example
 * await fetchWithLoading(setIsLoading, async () => {
 *   const data = await safeFetch("/api/locations/123");
 *   if (data) setLocation(data.location);
 * });
 */
export async function fetchWithLoading<T>(
  setLoading: (loading: boolean) => void,
  fetcher: () => Promise<T>
): Promise<T | null> {
  setLoading(true);
  try {
    return await fetcher();
  } catch (err) {
    console.error("[FetchWithLoading]:", err);
    return null;
  } finally {
    setLoading(false);
  }
}

/**
 * 带重试的 API 调用
 *
 * @example
 * const data = await fetchWithRetry<Location>("/api/locations/123", { retries: 3 });
 */
export async function fetchWithRetry<T = unknown>(
  endpoint: string,
  options?: RequestInit & { retries?: number; retryDelay?: number }
): Promise<T | null> {
  const { retries = 3, retryDelay = 1000, ...fetchOptions } = options ?? {};

  for (let attempt = 0; attempt <= retries; attempt++) {
    const result = await safeFetch<T>(endpoint, { ...fetchOptions, silent: attempt < retries });
    if (result !== null) return result;

    if (attempt < retries) {
      await new Promise((resolve) => setTimeout(resolve, retryDelay * (attempt + 1)));
    }
  }

  return null;
}
