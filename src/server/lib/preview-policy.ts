const PREVIEW_AUTH_MUTATION_PATHS = new Set([
  "/auth/sign-in/email",
  "/auth/sign-out",
]);

export type PreviewPolicyEnv = {
  APP_URL: string;
  PREVIEW_HOST_SUFFIX?: string;
};

function configuredOrigin(appUrl: string): string | null {
  try {
    const url = new URL(appUrl);
    if (url.href !== `${url.origin}/`) return null;
    return url.origin;
  } catch {
    return null;
  }
}

function previewHostSuffix(env: PreviewPolicyEnv): string | null {
  const suffix = env.PREVIEW_HOST_SUFFIX?.trim().toLowerCase();
  if (!suffix || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.workers\.dev$/u.test(suffix)) {
    return null;
  }
  return suffix;
}

export function previewHostPattern(env: PreviewPolicyEnv): string | null {
  const suffix = previewHostSuffix(env);
  return suffix ? `*-gomate.${suffix}` : null;
}

export function isPreviewRequest(
  request: Request,
  env: PreviewPolicyEnv,
): boolean {
  const suffix = previewHostSuffix(env);
  if (!suffix) return false;

  const url = new URL(request.url);
  if (url.protocol !== "https:" || url.port) return false;
  const workerSuffix = `-gomate.${suffix}`;
  if (!url.hostname.endsWith(workerSuffix)) return false;

  const versionOrAlias = url.hostname.slice(0, -workerSuffix.length);
  return /^[a-z0-9][a-z0-9-]*$/u.test(versionOrAlias);
}

export function getRequestOrigin(
  request: Request,
  env: PreviewPolicyEnv,
): string | null {
  const origin = new URL(request.url).origin;
  if (origin === configuredOrigin(env.APP_URL)) return origin;
  return isPreviewRequest(request, env) ? origin : null;
}

export function isPreviewAuthMutation(
  request: Request,
  path: string,
  env: PreviewPolicyEnv,
): boolean {
  const normalizedPath = path.replace(/^\/api(?=\/|$)/u, "") || "/";
  return request.method.toUpperCase() === "POST" &&
    PREVIEW_AUTH_MUTATION_PATHS.has(normalizedPath) &&
    isPreviewRequest(request, env);
}

export function getAuthBaseUrl(env: PreviewPolicyEnv) {
  const pattern = previewHostPattern(env);
  if (!pattern) return env.APP_URL;
  return {
    allowedHosts: [pattern],
    fallback: env.APP_URL,
    protocol: "https" as const,
  };
}

export function getAuthTrustedOrigins(
  request: Request | undefined,
  env: PreviewPolicyEnv,
): (string | null)[] {
  return [
    configuredOrigin(env.APP_URL),
    request ? getRequestOrigin(request, env) : null,
  ];
}
