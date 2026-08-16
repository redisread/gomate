import { nanoid } from "nanoid";

import { generateId } from "./id";
import { authPassword } from "./auth-password";

const TOKEN_VERSION = "v1";
const TOKEN_RANDOM_LENGTH = 32;
const TOKEN_DOMAIN = "gomate-password-reset-v1\0";
const TOKEN_PATTERN = /^v1\.([A-Za-z0-9_-]{8,64})\.([A-Za-z0-9_-]{32})$/u;
const CHALLENGE_TTL_MS = 60 * 60 * 1_000;

type ResetUser = {
  id: string;
  email: string;
  displayName: string;
};

export type IssuedPasswordReset = ResetUser & { token: string };

export class InvalidPasswordResetTokenError extends Error {
  constructor() {
    super("Invalid or expired password reset token");
    this.name = "InvalidPasswordResetTokenError";
  }
}

function challengeIdentifier(userId: string): string {
  return `password-reset:${userId}`;
}

async function tokenDigest(rawToken: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${TOKEN_DOMAIN}${rawToken}`),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
}

function parseToken(rawToken: string): { userId: string } | null {
  const match = TOKEN_PATTERN.exec(rawToken);
  return match ? { userId: match[1]! } : null;
}

async function findChallenge(
  database: D1Database,
  identifier: string,
  digest: string,
  now: number,
) {
  return database
    .prepare(
      `
        SELECT id
        FROM verifications
        WHERE identifier = ? AND value = ? AND expires_at > ?
        LIMIT 1
      `,
    )
    .bind(identifier, digest, now)
    .first<{ id: string }>();
}

/**
 * Creates one latest-by-commit reset challenge per active account. The raw
 * bearer token is returned only to the mail boundary; D1 stores its SHA-256
 * digest under a per-user unique identifier.
 */
export async function issuePasswordResetChallenge(
  database: D1Database,
  normalizedEmail: string,
  now = Date.now(),
): Promise<IssuedPasswordReset | null> {
  const user = await database
    .prepare(
      `
        SELECT
          id,
          email,
          COALESCE(NULLIF(nickname, ''), NULLIF(name, ''), email) AS displayName
        FROM users
        WHERE email = ?
          AND status = 'active'
          AND deleted_at IS NULL
        LIMIT 1
      `,
    )
    .bind(normalizedEmail)
    .first<ResetUser>();
  if (!user) return null;

  const token = `${TOKEN_VERSION}.${user.id}.${nanoid(TOKEN_RANDOM_LENGTH)}`;
  const digest = await tokenDigest(token);
  const identifier = challengeIdentifier(user.id);

  const write = await database
    .prepare(
      `
        INSERT INTO verifications (
          id, identifier, value, expires_at, created_at, updated_at
        )
        SELECT ?, ?, ?, ?, ?, ?
        FROM users
        WHERE id = ?
          AND status = 'active'
          AND deleted_at IS NULL
        ON CONFLICT(identifier) DO UPDATE SET
          id = excluded.id,
          value = excluded.value,
          expires_at = excluded.expires_at,
          created_at = excluded.created_at,
          updated_at = excluded.updated_at
        WHERE EXISTS (
          SELECT 1 FROM users
          WHERE id = ?
            AND status = 'active'
            AND deleted_at IS NULL
        )
      `,
    )
    .bind(
      generateId(),
      identifier,
      digest,
      now + CHALLENGE_TTL_MS,
      now,
      now,
      user.id,
      user.id,
    )
    .run();

  if (write.meta.changes !== 1) return null;

  return { ...user, token };
}

function requirePreviousStatementChangedExactlyOne(database: D1Database) {
  // This deliberately violates verifications.id NOT NULL only when the
  // immediately preceding conditional mutation changed anything other than
  // one row. D1 batch then rolls back the entire transaction.
  return database.prepare(
    `
      INSERT INTO verifications (
        id, identifier, value, expires_at, created_at, updated_at
      )
      SELECT NULL, 'password-reset-guard', 'password-reset-guard', 0, 0, 0
      WHERE changes() <> 1
    `,
  );
}

/**
 * Atomically claims the latest challenge, updates exactly one credential,
 * revokes every session, and consumes the challenge. Pre-reading is used only
 * to classify a public 400; every authorization decision is repeated inside
 * the conditional D1 batch.
 */
export async function resetPasswordWithChallenge(
  database: D1Database,
  rawToken: string,
  newPassword: string,
  now = Date.now(),
): Promise<void> {
  const parsed = parseToken(rawToken);
  if (!parsed) throw new InvalidPasswordResetTokenError();

  const identifier = challengeIdentifier(parsed.userId);
  const digest = await tokenDigest(rawToken);
  if (!await findChallenge(database, identifier, digest, now)) {
    throw new InvalidPasswordResetTokenError();
  }

  const passwordHash = await authPassword.hash(newPassword);
  const claim = `password-reset-claim:${nanoid(32)}`;
  const statements = [
    database
      .prepare(
        `
          UPDATE verifications
          SET value = ?, updated_at = ?
          WHERE identifier = ? AND value = ? AND expires_at > ?
            AND EXISTS (
              SELECT 1 FROM users
              WHERE id = ?
                AND status = 'active'
                AND deleted_at IS NULL
            )
        `,
      )
      .bind(claim, now, identifier, digest, now, parsed.userId),
    requirePreviousStatementChangedExactlyOne(database),
    database
      .prepare(
        `
          UPDATE accounts
          SET password = ?, updated_at = ?
          WHERE user_id = ?
            AND provider_id = 'credential'
            AND EXISTS (
              SELECT 1 FROM verifications
              WHERE identifier = ? AND value = ?
            )
            AND EXISTS (
              SELECT 1 FROM users
              WHERE id = ?
                AND status = 'active'
                AND deleted_at IS NULL
            )
        `,
      )
      .bind(
        passwordHash,
        now,
        parsed.userId,
        identifier,
        claim,
        parsed.userId,
      ),
    requirePreviousStatementChangedExactlyOne(database),
    database
      .prepare(
        `
          DELETE FROM sessions
          WHERE user_id = ?
            AND EXISTS (
              SELECT 1 FROM verifications
              WHERE identifier = ? AND value = ?
            )
        `,
      )
      .bind(parsed.userId, identifier, claim),
    database
      .prepare(
        "DELETE FROM verifications WHERE identifier = ? AND value = ?",
      )
      .bind(identifier, claim),
    requirePreviousStatementChangedExactlyOne(database),
  ];

  let results: D1Result<unknown>[];
  try {
    results = await database.batch(statements);
  } catch (error) {
    // A concurrent successful consumer makes this request invalid. If the
    // exact challenge still exists after rollback, the failure is operational
    // or structural and must remain a server error.
    if (!await findChallenge(database, identifier, digest, now).catch(() => null)) {
      throw new InvalidPasswordResetTokenError();
    }
    throw error;
  }

  if (
    results[0]?.meta.changes !== 1 ||
    results[2]?.meta.changes !== 1 ||
    results[5]?.meta.changes !== 1
  ) {
    throw new Error("Password reset batch returned an invalid write shape");
  }
}

export function passwordResetClientUrl(appUrl: string, token: string): string {
  const url = new URL("/reset-password", appUrl);
  url.search = "";
  url.hash = new URLSearchParams({ token }).toString();
  return url.toString();
}
