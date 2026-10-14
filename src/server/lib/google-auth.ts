import type { WorkerEnv } from "../env";
import { isPreviewRequest } from "./preview-policy";

/** OAuth can provision users, so it is never allowed on shared-data Preview. */
export function isGoogleAuthAvailable(
  request: Request,
  env: WorkerEnv,
): boolean {
  return (
    env.WRITE_MODE === "open" &&
    Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) &&
    !isPreviewRequest(request, env) &&
    new URL(request.url).origin === new URL(env.APP_URL).origin
  );
}
