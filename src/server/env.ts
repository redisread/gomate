// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./worker-configuration.d.ts" />

/** Runtime bindings generated from the root wrangler.jsonc. */
export type WorkerEnv = Env & {
  APPLE_CLIENT_ID?: string;
  APPLE_TEAM_ID?: string;
  APPLE_KEY_ID?: string;
  APPLE_PRIVATE_KEY?: string;
  IOS_APP_ID?: string;
};
