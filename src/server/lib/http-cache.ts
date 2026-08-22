/**
 * Shared cache policy for responses that are explicitly public.
 *
 * This module only emits HTTP cache headers. It does not maintain an
 * application cache or use a Cloudflare KV/Cache API as a data store.
 */
export const PUBLIC_CACHE_CONTROL =
  "public, max-age=60, s-maxage=300, stale-while-revalidate=600";

export function setPublicCacheHeaders(c: {
  header: (name: string, value: string) => void;
}): void {
  c.header("Cache-Control", PUBLIC_CACHE_CONTROL);
}
