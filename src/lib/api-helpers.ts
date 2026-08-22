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
 * const data = await safeFetch<Location>("/locations/123");
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


