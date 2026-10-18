import { createAuth } from "../../lib/auth";
import { enforceActiveSession } from "../../lib/session-policy";
import {
  type AuthContext,
  getExecutionContext,
  noStoreResponse,
  noStoreJsonResponse,
} from "./request";

export function handleSignOut(c: AuthContext) {
  return createAuth(c.env, getExecutionContext(c))
    .handler(c.req.raw)
    .then(noStoreResponse);
}

export async function handleGetSession(c: AuthContext) {
  const authInstance = createAuth(c.env, getExecutionContext(c));
  const response = await authInstance.api.getSession({
    headers: c.req.raw.headers,
    query: { disableCookieCache: true },
    asResponse: true,
  });
  if (!response.ok) return noStoreResponse(response);
  const session = (await response
    .clone()
    .json()
    .catch(() => null)) as {
    session?: Record<string, unknown>;
    user?: { id?: string };
  } | null;
  if (!session?.user?.id) return noStoreResponse(response);
  if (await enforceActiveSession(c.env, { user: { id: session.user.id } })) {
    const sessionRecord = session.session;
    if (!sessionRecord) return noStoreJsonResponse(response, session);
    const {
      token: _browserExposedToken,
      ipAddress: _browserExposedIp,
      userAgent: _browserExposedUserAgent,
      ...safeSession
    } = sessionRecord;
    return noStoreJsonResponse(response, {
      ...session,
      session: safeSession,
    });
  }
  return c.json(null, 200, {
    "Cache-Control": "no-store",
    Pragma: "no-cache",
  });
}
