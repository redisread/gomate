import type { Env } from "./auth";
import { logger } from "./logger";
import { mediaReferenceSql } from "./media-reference-sql";

type MediaEnv = Pick<Env, "DB" | "R2" | "WRITE_MODE">;
const GRACE_MS = 86_400_000;
const LEASE_MS = 5 * 60_000;
const MAX_ATTEMPTS = 8;
const BATCH_SIZE = 32;
const KEY = /^(?:avatars|locations|temp\/avatars|temp\/locations)\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+\.(?:jpg|jpeg|png|gif|webp)$/u;

const UNREFERENCED = `
  NOT EXISTS (SELECT 1 FROM users WHERE ${mediaReferenceSql("users.image")})
  AND NOT EXISTS (SELECT 1 FROM locations WHERE ${mediaReferenceSql("locations.cover_image_url")})
  AND NOT EXISTS (SELECT 1 FROM locations, json_each(locations.images) AS image
    WHERE ${mediaReferenceSql("image.value")})
`;

function validateObject(key: string, url: string) {
  if (!KEY.test(key) || !url.endsWith(`/${key}`)) {
    throw new Error("Invalid managed media identity");
  }
  const parsed = new URL(url);
  if (parsed.search || parsed.hash || parsed.username || parsed.password) {
    throw new Error("Invalid managed media URL");
  }
}

/** Persist the immutable object identity BEFORE starting an external put. */
export async function beginMediaWrite(env: MediaEnv, key: string, url: string, now = Date.now()) {
  if (env.WRITE_MODE !== "open") throw new Error("Media writes are protected");
  validateObject(key, url);
  await env.DB.prepare(`INSERT INTO media_objects
    (key,url,state,attempts,next_attempt_at,created_at) VALUES (?,?,'writing',0,?,?)`)
    .bind(key, url, now + GRACE_MS, now).run();
}

/** Only a resolved put may become eligible for eventual garbage collection. */
export async function completeMediaWrite(env: MediaEnv, key: string, now = Date.now()) {
  if (env.WRITE_MODE !== "open") throw new Error("Media writes are protected");
  const result = await env.DB.prepare(`UPDATE media_objects SET state='ready',next_attempt_at=?
    WHERE key=? AND state='writing'`).bind(now + GRACE_MS, key).run();
  if (result.meta.changes !== 1) throw new Error("Media write requires reconciliation");
}

/** Register only a known existing object about to leave an authoritative reference. */
export async function registerExistingMedia(env: MediaEnv, key: string, url: string, now = Date.now()) {
  if (env.WRITE_MODE !== "open") throw new Error("Media writes are protected");
  validateObject(key, url);
  await env.DB.prepare(`INSERT INTO media_objects
    (key,url,state,attempts,next_attempt_at,created_at) VALUES (?,?,'ready',0,?,?)
    ON CONFLICT(key) DO NOTHING`).bind(key, url, now + GRACE_MS, now).run();
}

/**
 * Database tombstone triggers fence every subsequent reference write. A crash
 * after the claim can therefore repeat R2 deletion without a reattachment race.
 * Unknown puts are retained, not inferred to have stopped from a wall clock.
 */
export async function recoverMediaObjects(env: MediaEnv, now = Date.now(), keys?: readonly string[]) {
  if (env.WRITE_MODE !== "open" || !env.R2) return;
  const selectedKeys = keys ? [...new Set(keys)].slice(0, BATCH_SIZE) : null;
  if (selectedKeys?.length === 0) return;
  const filter = selectedKeys ? `AND key IN (${selectedKeys.map(() => "?").join(",")})` : "AND next_attempt_at <= ?";
  const selection = env.DB.prepare(`SELECT key,state FROM media_objects
    WHERE state IN ('writing','ready','deleting') ${filter}
    ORDER BY next_attempt_at,key LIMIT ?`);
  const rows = await selection.bind(...(selectedKeys ?? [now]), BATCH_SIZE).all<{key:string;state:string}>();
  for (const row of rows.results) {
    if (row.state === "writing") {
      // Even an explicit cleanup call cannot establish whether a failed put
      // reached R2. Keep the identity for human reconciliation after the grace.
      const blocked = await env.DB.prepare(`UPDATE media_objects SET state='blocked'
        WHERE key=? AND state='writing' AND next_attempt_at<=?`).bind(row.key, now).run();
      if (blocked.meta.changes) logger.warn("media_recovery_blocked", { count: blocked.meta.changes });
      continue;
    }
    const claimed = await env.DB.prepare(`UPDATE media_objects
      SET state='deleting',attempts=attempts+1,next_attempt_at=?
      WHERE key=? AND attempts<? AND ${UNREFERENCED}
        AND (state='ready' OR (state='deleting' AND next_attempt_at<=?))
      RETURNING attempts`)
      .bind(now + LEASE_MS, row.key, MAX_ATTEMPTS, now).first<{attempts:number}>();
    if (!claimed) {
      await env.DB.prepare(`UPDATE media_objects SET next_attempt_at=?
        WHERE key=? AND state='ready'`).bind(now + GRACE_MS, row.key).run();
      await env.DB.prepare(`UPDATE media_objects SET state='blocked'
        WHERE key=? AND state='deleting' AND attempts>=? AND next_attempt_at<=?`)
        .bind(row.key, MAX_ATTEMPTS, now).run();
      continue;
    }
    try {
      await env.R2.delete(row.key);
      await env.DB.prepare(`UPDATE media_objects SET state='done'
        WHERE key=? AND state='deleting' AND attempts=?`).bind(row.key, claimed.attempts).run();
    } catch {
      await env.DB.prepare(`UPDATE media_objects SET state=?,next_attempt_at=?
        WHERE key=? AND state='deleting' AND attempts=?`)
        .bind(claimed.attempts >= MAX_ATTEMPTS ? "blocked" : "deleting",
          now + Math.min(GRACE_MS, LEASE_MS * 2 ** claimed.attempts), row.key, claimed.attempts).run();
      logger.error("media_recovery_failed", { attempt: claimed.attempts });
    }
  }
}
