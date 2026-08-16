import type { Env } from "./auth";
import { getR2PublicBaseUrl } from "./r2-media";

const AVATAR_FILE = /^[A-Za-z0-9_-]+\.(?:jpg|jpeg|png|gif|webp)$/u;

export function isOwnedAvatarKey(key: string, userId: string): boolean {
  const prefix = `avatars/${userId}/`;
  if (!key.startsWith(prefix)) return false;
  return AVATAR_FILE.test(key.slice(prefix.length));
}

function localR2BaseUrl(requestUrl: URL): string | null {
  if (!["localhost", "127.0.0.1", "[::1]"].includes(requestUrl.hostname)) {
    return null;
  }
  return `${requestUrl.origin}/api/r2`;
}

/**
 * Resolve a stored avatar value only when it is the exact canonical URL (or
 * raw key) for an object in the authenticated user's avatar namespace.
 */
export function ownedAvatarKeyFromStoredValue(
  env: Env,
  requestUrl: URL,
  value: string,
  userId: string,
): string | null {
  if (isOwnedAvatarKey(value, userId)) return value;

  const bases = [getR2PublicBaseUrl(env), localR2BaseUrl(requestUrl)].filter(
    (base): base is string => Boolean(base),
  );
  for (const base of bases) {
    const prefix = `${base}/`;
    if (!value.startsWith(prefix)) continue;
    const key = value.slice(prefix.length);
    if (isOwnedAvatarKey(key, userId) && value === `${base}/${key}`) {
      return key;
    }
  }
  return null;
}
