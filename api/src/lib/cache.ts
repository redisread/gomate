/**
 * API 响应缓存工具
 *
 * 使用 Cloudflare Cache API 减少数据库查询负载
 */

const CACHE_TTL = 300; // 5 minutes

/**
 * 从缓存获取数据，如果缓存不存在则执行 fetcher 函数并缓存结果
 *
 * @param key 缓存键（通常是请求的 URL + 查询参数）
 * @param fetcher 获取数据的函数
 * @returns 缓存的数据或新获取的数据
 */
export async function getCachedOrFetch<T>(
  key: string,
  fetcher: () => Promise<T>
): Promise<T> {
  const cache = caches.default;

  // 尝试从缓存获取
  const cacheKey = new Request(`https://cache.internal/${key}`);
  const cachedResponse = await cache.match(cacheKey);

  if (cachedResponse) {
    const data = await cachedResponse.json();
    return data as T;
  }

  // 缓存未命中，执行 fetcher 获取数据
  const data = await fetcher();

  // 创建新的响应并缓存
  const newResponse = new Response(JSON.stringify(data), {
    headers: {
      'Cache-Control': `public, max-age=${CACHE_TTL}`,
      'Content-Type': 'application/json',
    },
  });

  // 异步缓存，不阻塞响应
  cache.put(cacheKey, newResponse.clone()).catch((err) => {
    console.warn('[Cache] Failed to cache response:', err);
  });

  return data;
}

/**
 * 清除指定键的缓存
 *
 * @param key 缓存键
 */
export async function invalidateCache(key: string): Promise<void> {
  const cache = caches.default;
  const cacheKey = new Request(`https://cache.internal/${key}`);
  await cache.delete(cacheKey);
}

/**
 * 清除所有缓存
 */
export async function clearAllCache(): Promise<void> {
  // Cloudflare Cache API 不支持清除所有缓存
  // 需要使用特定的缓存键模式来管理
  console.warn('[Cache] clearAllCache is not fully supported by Cloudflare Cache API');
}
