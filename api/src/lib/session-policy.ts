import { and, eq, isNull } from "drizzle-orm";

import { createDb } from "../db";
import { sessions, users } from "../db/schema";
import type { WorkerEnv } from "../env";

export async function isUserActive(env: WorkerEnv, userId: string) {
  const db = createDb(env.DB);
  const [activeUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(
      eq(users.id, userId),
      eq(users.status, "active"),
      isNull(users.deletedAt),
    ))
    .limit(1);

  return Boolean(activeUser);
}

/**
 * Reject inactive identities and make an observed stale credential
 * permanently unusable, including after a future account reactivation.
 */
export async function enforceActiveSession(
  env: WorkerEnv,
  session: { user: { id: string } },
) {
  if (await isUserActive(env, session.user.id)) return true;

  const db = createDb(env.DB);
  await db.delete(sessions).where(eq(sessions.userId, session.user.id));
  return false;
}
