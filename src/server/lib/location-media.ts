import type { Env } from "./auth";
import {
  deleteR2ObjectsWithRetry,
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
  coverImageUrl: string;
  images: string[];
};

export type PreparedLocationMedia = LocationMediaValues & {
  tempKeys: string[];
  finalKeys: string[];
};

export type LocationMediaBackup = {
  sourceKey: string;
  backupKey: string;
};

export async function prepareLocationMedia(
  env: Env,
  userId: string,
  locationId: string,
  values: LocationMediaValues,
): Promise<PreparedLocationMedia> {
  const publicBaseUrl = getR2PublicBaseUrl(env);
  if (!publicBaseUrl) {
    throw new LocationMediaError("Location media storage is not safely configured", 500);
  }

  const replacements = new Map<string, string>();
  const tempKeys: string[] = [];
  const finalKeys: string[] = [];
  const urls = [...new Set([values.coverImageUrl, ...values.images])];

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
      finalKeys.push(finalKey);
      await env.R2.put(finalKey, object.body, {
        httpMetadata: object.httpMetadata,
        customMetadata: object.customMetadata,
      });
      replacements.set(`${publicBaseUrl}/${tempKey}`, `${publicBaseUrl}/${finalKey}`);
    }
  } catch (error) {
    await deleteR2ObjectsWithRetry(env.R2, [...finalKeys, ...tempKeys]).catch(
      () => undefined,
    );
    if (error instanceof LocationMediaError) throw error;
    throw new LocationMediaError("Failed to archive location media", 500);
  }

  return {
    coverImageUrl: replacements.get(values.coverImageUrl) ?? values.coverImageUrl,
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
  await deleteR2ObjectsWithRetry(env.R2, [
    ...prepared.finalKeys,
    ...prepared.tempKeys,
  ]);
}

export async function finalizeLocationMedia(
  env: Env,
  prepared: Pick<PreparedLocationMedia, "tempKeys">,
  staleKeys: string[] = [],
) {
  if (!env.R2) return;
  await deleteR2ObjectsWithRetry(env.R2, [...prepared.tempKeys, ...staleKeys]);
}

export function ownedLocationMediaKeys(
  env: Env,
  locationId: string,
  values: LocationMediaValues,
) {
  return [...new Set([values.coverImageUrl, ...values.images]
    .map((url) => ownedFinalLocationKey(env, url, locationId))
    .filter((key): key is string => Boolean(key)))];
}

/** Stream each object to a temporary R2 backup before destructive deletion. */
export async function backupLocationMedia(
  bucket: R2Bucket,
  locationId: string,
  sourceKeys: string[],
): Promise<LocationMediaBackup[]> {
  const operationId = crypto.randomUUID();
  const backups: LocationMediaBackup[] = [];
  try {
    for (const [index, sourceKey] of sourceKeys.entries()) {
      const object = await bucket.get(sourceKey);
      if (!object) {
        throw new LocationMediaError("Location media is missing", 500);
      }
      const filename = mediaFilename(sourceKey);
      if (!filename) {
        throw new LocationMediaError("Location media key is invalid", 500);
      }
      const backupKey = `temp/location-delete-backups/${locationId}/${operationId}/${index}-${filename}`;
      backups.push({ sourceKey, backupKey });
      await bucket.put(backupKey, object.body, {
        httpMetadata: object.httpMetadata,
        customMetadata: object.customMetadata,
      });
    }
    return backups;
  } catch (error) {
    await deleteR2ObjectsWithRetry(
      bucket,
      backups.map(({ backupKey }) => backupKey),
    ).catch(() => undefined);
    throw error;
  }
}

export async function discardLocationMediaBackups(
  bucket: R2Bucket,
  backups: LocationMediaBackup[],
) {
  await deleteR2ObjectsWithRetry(
    bucket,
    backups.map(({ backupKey }) => backupKey),
  );
}

/** Restore selected originals from their R2 backups, then remove all backups. */
export async function restoreLocationMediaBackups(
  bucket: R2Bucket,
  backups: LocationMediaBackup[],
  retainedSourceKeys = new Set(backups.map(({ sourceKey }) => sourceKey)),
) {
  for (const backup of backups) {
    if (!retainedSourceKeys.has(backup.sourceKey)) continue;
    let restored = false;
    let lastError: unknown;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const object = await bucket.get(backup.backupKey);
        if (!object) throw new Error("Location media backup is missing");
        await bucket.put(backup.sourceKey, object.body, {
          httpMetadata: object.httpMetadata,
          customMetadata: object.customMetadata,
        });
        restored = true;
        break;
      } catch (error) {
        lastError = error;
        if (attempt < 2) {
          await new Promise((resolve) => {
            setTimeout(resolve, 25 * (2 ** attempt));
          });
        }
      }
    }
    if (!restored) throw lastError;
  }
  await discardLocationMediaBackups(bucket, backups);
}
