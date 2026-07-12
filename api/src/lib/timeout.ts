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
 * @param signal - 可选的 AbortController signal，用于取消底层操作
 * @returns Promise<T>
 * @throws Error 当操作超时时抛出指定错误
 * @note 若 fn 返回的 Promise 不支持取消（如数据库查询），超时后该 Promise 仍会在后台运行。
 *       传入 signal 可在超时或外部取消时协同中断支持 AbortController 的操作（如 fetch）。
 */
export async function withTimeout<T>(
  fn: (signal?: AbortSignal) => Promise<T>,
  timeoutMs: number,
  errorMessage: string = "Operation timeout",
  signal?: AbortSignal
): Promise<T> {
  const controller = new AbortController();
  const combinedSignal = signal
    ? AbortSignal.any?.([controller.signal, signal]) ?? controller.signal
    : controller.signal;

  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      controller.abort();
      reject(new Error(errorMessage));
    }, timeoutMs);

    fn(combinedSignal)
      .then((result) => {
        clearTimeout(timeoutId);
        if (!controller.signal.aborted) {
          resolve(result);
        }
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
 * @note 数据库查询本身不可取消，超时后 Promise 仍会在后台执行完毕，
 *       但结果会被丢弃。适用于防止请求长时间挂起，不适用于节省 DB 资源。
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
