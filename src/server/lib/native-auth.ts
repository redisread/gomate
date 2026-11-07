import type { WorkerEnv } from "../env";

const TTL_MS = 5 * 60 * 1000;

export async function pkceChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier),
  );
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
}

export async function createNativeRequest(
  env: WorkerEnv,
  challenge: string,
): Promise<string> {
  const id = crypto.randomUUID();
  const now = Date.now();
  await env.DB.batch([
    env.DB.prepare(
      "DELETE FROM verifications WHERE id IN (SELECT id FROM verifications WHERE identifier LIKE 'native:%' AND expires_at <= ? LIMIT 100)",
    ).bind(now),
    env.DB.prepare(
      "INSERT INTO verifications (id,identifier,value,expires_at,created_at,updated_at) VALUES (?,?,?,?,?,?)",
    ).bind(
      id,
      `native:${id}`,
      JSON.stringify({ challenge, userId: null }),
      now + TTL_MS,
      now,
      now,
    ),
  ]);
  return id;
}

export async function completeNativeRequest(
  env: WorkerEnv,
  id: string,
  userId: string,
): Promise<string | null> {
  const code = `${crypto.randomUUID()}${crypto.randomUUID()}`;
  const result = await env.DB.prepare(
    `UPDATE verifications SET value=json_set(value,'$.userId',?,'$.codeHash',?),updated_at=?
    WHERE identifier=? AND expires_at>? AND json_extract(value,'$.userId') IS NULL
      AND EXISTS (SELECT 1 FROM users WHERE id=? AND status='active' AND deleted_at IS NULL)`,
  )
    .bind(
      userId,
      await pkceChallenge(code),
      Date.now(),
      `native:${id}`,
      Date.now(),
      userId,
    )
    .run();
  return result.meta.changes === 1 ? code : null;
}

export async function consumeNativeRequest(
  env: WorkerEnv,
  id: string,
  verifier: string,
  code: string,
): Promise<string | null> {
  const challenge = await pkceChallenge(verifier);
  // Conditional DELETE RETURNING makes concurrent exchanges single-use in D1.
  const row = await env.DB.prepare(
    `DELETE FROM verifications WHERE identifier=? AND expires_at>?
    AND json_extract(value,'$.challenge')=? AND json_extract(value,'$.codeHash')=? AND json_extract(value,'$.userId') IS NOT NULL
    RETURNING value`,
  )
    .bind(`native:${id}`, Date.now(), challenge, await pkceChallenge(code))
    .first<{ value: string }>();
  return row ? (JSON.parse(row.value) as { userId: string }).userId : null;
}
