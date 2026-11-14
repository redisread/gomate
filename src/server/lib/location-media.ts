import type { Env } from "./auth";
import { beginMediaWrite, completeMediaWrite, recoverMediaObjects, registerExistingMedia } from "./media-recovery";
import {
  exactR2KeyFromPublicUrl,
  getR2PublicBaseUrl,
  mediaFilename,
  ownedFinalLocationKey,
  ownedTempLocationKey,
} from "./r2-media";

export class LocationMediaError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 403 | 500,
  ) {
    super(message);
    this.name = "LocationMediaError";
  }
}

export type LocationMediaValues = {
  coverImageUrl: string | null;
  images: string[];
};

export type PreparedLocationMedia = LocationMediaValues & {
  tempKeys: string[];
  finalKeys: string[];
};

export async function prepareLocationMedia(
  env: Env,
  userId: string,
  locationId: string,
  values: LocationMediaValues,
): Promise<PreparedLocationMedia> {
  const replacements = new Map<string, string>();
  const tempKeys: string[] = [];
  const finalKeys: string[] = [];
  const urls = [...new Set([values.coverImageUrl, ...values.images])]
    .filter((value): value is string => value !== null);
  if (urls.length === 0) {
    return { ...values, tempKeys, finalKeys };
  }

  const publicBaseUrl = getR2PublicBaseUrl(env);
  if (!publicBaseUrl) {
    throw new LocationMediaError("Location media storage is not safely configured", 500);
  }

  for (const value of urls) {
    const anyR2Key = exactR2KeyFromPublicUrl(env, value);
    if (anyR2Key?.startsWith("temp/locations/")) {
      const tempKey = ownedTempLocationKey(env, value, userId);
      if (!tempKey) {
        throw new LocationMediaError("Temporary location media is not owned by this administrator", 403);
      }
      tempKeys.push(tempKey);
    }
  }

  if (tempKeys.length === 0) {
    return { ...values, tempKeys, finalKeys };
  }
  if (!env.R2) {
    throw new LocationMediaError("Location media storage is not configured", 500);
  }

  try {
    for (const tempKey of tempKeys) {
      const object = await env.R2.get(tempKey);
      if (!object) {
        throw new LocationMediaError("Temporary location media is missing or expired", 400);
      }
      const filename = mediaFilename(tempKey);
      if (!filename) {
        throw new LocationMediaError("Temporary location media key is invalid", 400);
      }
      const extension = filename.slice(filename.lastIndexOf(".") + 1);
      const finalKey = `locations/${locationId}/${crypto.randomUUID()}.${extension}`;
      await beginMediaWrite(env, finalKey, `${publicBaseUrl}/${finalKey}`);
      finalKeys.push(finalKey);
      await env.R2.put(finalKey, object.body, {
        httpMetadata: object.httpMetadata,
        customMetadata: object.customMetadata,
      });
      await completeMediaWrite(env, finalKey);
      replacements.set(`${publicBaseUrl}/${tempKey}`, `${publicBaseUrl}/${finalKey}`);
    }
  } catch (error) {
    await recoverMediaObjects(env, Date.now(), [...finalKeys, ...tempKeys]).catch(
      () => undefined,
    );
    if (error instanceof LocationMediaError) throw error;
    throw new LocationMediaError("Failed to archive location media", 500);
  }

  return {
    coverImageUrl: values.coverImageUrl === null
      ? null
      : replacements.get(values.coverImageUrl) ?? values.coverImageUrl,
    images: values.images.map((url) => replacements.get(url) ?? url),
    tempKeys,
    finalKeys,
  };
}

export async function discardPreparedLocationMedia(
  env: Env,
  prepared: Pick<PreparedLocationMedia, "tempKeys" | "finalKeys">,
) {
  if (!env.R2) return;
  await recoverMediaObjects(env, Date.now(), [...prepared.finalKeys, ...prepared.tempKeys]);
}

export async function finalizeLocationMedia(
  env: Env,
  prepared: Pick<PreparedLocationMedia, "tempKeys">,
  staleKeys: string[] = [],
) {
  if (!env.R2) return;
  await recoverMediaObjects(env, Date.now(), [...prepared.tempKeys, ...staleKeys]);
}

export function ownedLocationMediaKeys(
  env: Env,
  locationId: string,
  values: LocationMediaValues,
) {
  return [...new Set([values.coverImageUrl, ...values.images]
    .filter((url): url is string => url !== null)
    .map((url) => ownedFinalLocationKey(env, url, locationId))
    .filter((key): key is string => Boolean(key)))];
}

/** Register exact current objects before the reference-changing D1 statement. */
export async function registerLocationMedia(env: Env, keys: string[]) {
  const base = getR2PublicBaseUrl(env);
  if (keys.length && !base) throw new LocationMediaError("Location media storage is not safely configured", 500);
  for (const key of keys) await registerExistingMedia(env, key, `${base}/${key}`);
}
