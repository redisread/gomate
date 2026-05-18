/**
 * 请求超时处理工具
 * 为 fetch 和数据库查询提供超时控制
 */

/**
 * 带超时的 fetch 请求
 * @param url - 请求 URL
 * @param options - fetch 选项
 * @param timeoutMs - 超时时间（毫秒），默认 5000ms
 * @returns Promise<Response>
 * @throws Error 当请求超时时抛出 "Request timeout"
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 5000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Request timeout after ${timeoutMs}ms: ${url}`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * 带超时的异步函数包装器
 * @param fn - 异步函数
 * @param timeoutMs - 超时时间（毫秒）
 * @param errorMessage - 超时错误信息
 * @returns Promise<T>
 * @throws Error 当操作超时时抛出指定错误
 */
export async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  errorMessage: string = "Operation timeout"
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(errorMessage));
    }, timeoutMs);

    fn()
      .then((result) => {
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

/**
 * 数据库查询超时包装器
 * 用于为 Drizzle ORM 查询添加超时控制
 * @param query - 数据库查询 Promise
 * @param timeoutMs - 超时时间（毫秒），默认 10000ms
 * @param operation - 操作名称（用于错误信息）
 * @returns Promise<T>
 */
export async function withQueryTimeout<T>(
  query: Promise<T>,
  timeoutMs: number = 10000,
  operation: string = "Database query"
): Promise<T> {
  return withTimeout(
    () => query,
    timeoutMs,
    `${operation} timeout after ${timeoutMs}ms`
  );
}
