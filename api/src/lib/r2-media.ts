import type { Env } from "./auth";

const MEDIA_FILENAME = /^[A-Za-z0-9_-]+\.(?:jpg|jpeg|png|gif|webp)$/u;

export function getR2PublicBaseUrl(env: Pick<Env, "R2_PUBLIC_URL">): string | null {
  if (!env.R2_PUBLIC_URL) return null;
  try {
    const url = new URL(env.R2_PUBLIC_URL);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) {
      return null;
    }
    return url.toString().replace(/\/+$/u, "");
  } catch {
    return null;
  }
}

export function r2PublicUrl(env: Pick<Env, "R2_PUBLIC_URL">, key: string) {
  const base = getR2PublicBaseUrl(env);
  return base ? `${base}/${key}` : null;
}

export function exactR2KeyFromPublicUrl(
  env: Pick<Env, "R2_PUBLIC_URL">,
  value: string,
): string | null {
  const base = getR2PublicBaseUrl(env);
  if (!base) return null;
  const prefix = `${base}/`;
  if (!value.startsWith(prefix)) return null;
  const key = value.slice(prefix.length);
  return value === `${base}/${key}` ? key : null;
}

export function ownedTempLocationKey(
  env: Pick<Env, "R2_PUBLIC_URL">,
  value: string,
  userId: string,
): string | null {
  const key = exactR2KeyFromPublicUrl(env, value);
  const prefix = `temp/locations/${userId}/`;
  if (!key?.startsWith(prefix)) return null;
  const filename = key.slice(prefix.length);
  return MEDIA_FILENAME.test(filename) ? key : null;
}

export function ownedFinalLocationKey(
  env: Pick<Env, "R2_PUBLIC_URL">,
  value: string,
  locationId: string,
): string | null {
  const key = exactR2KeyFromPublicUrl(env, value);
  const prefix = `locations/${locationId}/`;
  if (!key?.startsWith(prefix)) return null;
  const filename = key.slice(prefix.length);
  return MEDIA_FILENAME.test(filename) ? key : null;
}

/**
 * R2 delete is idempotent. Retrying the same exact keys is therefore the
 * safest compensation available without adding a twentieth persistence table.
 */
export async function deleteR2ObjectsWithRetry(
  bucket: R2Bucket,
  keys: string[],
  attempts = 3,
): Promise<void> {
  const uniqueKeys = [...new Set(keys)];
  if (uniqueKeys.length === 0) return;

  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      await bucket.delete(uniqueKeys);
      return;
    } catch (error) {
      lastError = error;
      if (attempt + 1 < attempts) {
        await new Promise((resolve) => {
          setTimeout(resolve, 25 * (2 ** attempt));
        });
      }
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("R2 media compensation failed");
}

export function mediaFilename(key: string): string | null {
  const filename = key.slice(key.lastIndexOf("/") + 1);
  return MEDIA_FILENAME.test(filename) ? filename : null;
}
