import { createAuth, type Env } from "./auth";
import { enforceActiveSession } from "./session-policy";

/**
 * Better Auth sessions remain revocable through the authoritative user row.
 * Every application route must use this helper instead of trusting a stored
 * session after the user has been suspended, banned or soft-deleted.
 */
export async function getActiveSession(env: Env, headers: Headers) {
  const session = await createAuth(env).api.getSession({
    headers,
    query: { disableCookieCache: true },
  });
  if (!session) return null;
  return (await enforceActiveSession(env, session)) ? session : null;
}
