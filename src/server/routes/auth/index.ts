import { createApiApp } from "../../lib/openapi";
import type { Env } from "../../lib/auth";
import { APIErrors } from "../../lib/api-errors";
import { isGoogleAuthAvailable } from "../../lib/google-auth";
import type { AuthContext } from "./request";
import { handleEmailSignUp, handleEmailSignIn } from "./credentials";
import {
  handleForgotPassword,
  handleVerificationEmail,
  handleEmailConfirmation,
  handlePasswordReset,
} from "./recovery";
import { handleSignOut, handleGetSession } from "./session";
import { handleGoogleSignIn, handleGoogleCallback } from "./google";
import { registerAuthContracts, authProvidersContract } from "./contracts";
export { normalizeBetterAuthUrl } from "./request";

const auth = createApiApp<{ Bindings: Env }>();

auth.post("/forgot-password", handleForgotPassword);

// Keep direct routing and normalized fallback on the same explicit allowlist.
// forgot-password/providers retain router matching only, without this normalized fallback.
const controlledEndpoints = [
  ["POST", "/sign-up/email", handleEmailSignUp],
  ["POST", "/sign-in/email", handleEmailSignIn],
  ["POST", "/send-verification-email", handleVerificationEmail],
  ["POST", "/confirm-email", handleEmailConfirmation],
  ["POST", "/reset-password", handlePasswordReset],
  ["POST", "/sign-out", handleSignOut],
  ["GET", "/get-session", handleGetSession],
  ["POST", "/get-session", handleGetSession],
  ["POST", "/sign-in/social", handleGoogleSignIn],
  ["GET", "/callback/google", handleGoogleCallback],
] as const;
for (const [method, path, handler] of controlledEndpoints) {
  auth.on(method, path, handler);
}

/**
 * Profile changes use PATCH /api/users/me and avatar changes use
 * /api/upload/avatar so their validation, ownership, and cleanup stay atomic.
 */
function unavailableAuthEndpoint(c: AuthContext) {
  return c.json(APIErrors.notFound("Authentication endpoint not found"), 404);
}

function normalizedAuthPath(url: string): string {
  const pathname = new URL(url).pathname;
  let decoded = pathname;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    // Leave malformed escapes untouched; Better Auth cannot match them either.
  }
  return decoded.replace(/\/{2,}/gu, "/").replace(/\/+$/u, "");
}

auth.openapi(authProvidersContract, (c) =>
  c.json({ google: isGoogleAuthAvailable(c.req.raw, c.env) }, 200, {
    "Cache-Control": "no-store",
  }),
);

auth.post("/update-user", unavailableAuthEndpoint);

auth.post("/request-password-reset", unavailableAuthEndpoint);

auth.on(["GET", "POST"], "/verify-email", unavailableAuthEndpoint);

/**
 * ALL /auth/*
 * Canonicalize guarded paths, then deny every Better Auth capability the
 * product does not explicitly expose.
 */
auth.all("/*", async (c) => {
  const path = normalizedAuthPath(c.req.url);
  const endpoint = controlledEndpoints.find(
    ([method, routePath]) =>
      c.req.method === method && path === `/api/auth${routePath}`,
  );
  if (endpoint) return endpoint[2](c);
  return unavailableAuthEndpoint(c);
});

registerAuthContracts(auth);
export { auth as authRoute };
