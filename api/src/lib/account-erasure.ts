export interface AccountErasureCommand {
  userId: string;
  currentEmail: string;
  now: number;
}

/**
 * Replace a user with a non-identifying tombstone while preserving historical
 * foreign keys. D1 batch provides the all-or-nothing credential revocation.
 */
export async function eraseAccount(
  database: D1Database,
  command: AccountErasureCommand,
): Promise<void> {
  const { userId, currentEmail, now } = command;
  const deletedEmail = `deleted-${userId}@deleted.invalid`;
  const statements = [
    database
      .prepare(
        `
      UPDATE users
      SET name = 'Deleted User',
          nickname = NULL,
          email = ?,
          email_verified = 0,
          image = NULL,
          bio = NULL,
          gender = NULL,
          birthday = NULL,
          status = 'deleted',
          extra = '{}',
          updated_at = ?,
          deleted_at = ?
      WHERE id = ?
    `,
      )
      .bind(deletedEmail, now, now, userId),
    database.prepare("DELETE FROM accounts WHERE user_id = ?").bind(userId),
    database.prepare("DELETE FROM sessions WHERE user_id = ?").bind(userId),
    database
      .prepare(
        `
      DELETE FROM verifications
      WHERE value = ?
         OR identifier = ?
         OR identifier = 'password-reset:' || ?
    `,
      )
      .bind(userId, currentEmail, userId),
  ];

  const results = await database.batch(statements);
  if (results[0]?.meta.changes !== 1) {
    throw new Error("Account erasure batch returned an invalid write shape");
  }
}
