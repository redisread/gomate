import { env } from "cloudflare:workers";
import { apiApp, type ApiBindings } from "@gomate/api/app";

function assertResourcePath(path: string) {
  if (!path.startsWith("/") || path === "/api" || path.startsWith("/api/")) {
    throw new Error(`Server API path must be resource-relative: ${path}`);
  }
}

/** Dispatch an SSR request directly into Hono without a Worker self-fetch. */
export async function serverApiFetch(
  request: Request,
  locals: App.Locals,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  assertResourcePath(path);
  const headers = new Headers(request.headers);
  if (init?.headers) {
    new Headers(init.headers).forEach((value, key) => headers.set(key, value));
  }
  headers.delete("content-length");

  const apiRequest = new Request(new URL(path, request.url), {
    ...init,
    headers,
    method: init?.method ?? "GET",
  });
  return await apiApp.fetch(
    apiRequest,
    env as ApiBindings,
    locals.cfContext,
  );
}

export async function serverApiGet<T>(
  request: Request,
  locals: App.Locals,
  path: string,
): Promise<T | null> {
  try {
    const response = await serverApiFetch(request, locals, path);
    if (!response.ok) return null;
    return await response.json<T>();
  } catch {
    return null;
  }
}
