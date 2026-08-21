import { Hono } from "hono";
import { routePath } from "hono/route";
import {
  createRequestId,
  logger,
  runWithRequestLogContext,
} from "./lib/logger";
import { fetchWithTimeout } from "./lib/timeout";
import { APIErrors } from "./lib/api-errors";
import type { WorkerEnv } from "./env";
import { authRoute } from "./routes/auth";
import { teamsRoute } from "./routes/teams/index";
import { locationsRoute } from "./routes/locations";
import { usersRoute } from "./routes/users";
import { uploadRoute } from "./routes/upload";
import { regionsRoute } from "./routes/regions";
import { tagsRoute } from "./routes/tags";
import { contactRoute } from "./routes/contact";
import { feedbackRoute } from "./routes/feedback";
import { favoritesRoute } from "./routes/favorites";
import messagesRoute from "./routes/messages";
import storiesRoute from "./routes/stories";
import { shareImageRoute } from "./routes/share-image";
import { localCircleHomeRoute } from "./routes/local-circle/home";

export type WriteMode = "open" | "protected";

export type ApiBindings = WorkerEnv;

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const WRITE_PROTECTION_RETRY_SECONDS = 60;

export const apiApp = new Hono<{ Bindings: ApiBindings }>();

apiApp.use("*", async (c, next) => {
  const requestId = createRequestId(c.req.header("CF-Ray"));
  const startedAt = performance.now();

  await runWithRequestLogContext(requestId, async () => {
    c.header("X-Request-ID", requestId);
    await next();
    c.header("X-Request-ID", requestId);

    const metadata = {
      method: c.req.method.toUpperCase(),
      route: routePath(c, -1) || "/*",
      status: c.res.status,
      durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
    };
    if (c.res.status >= 500) {
      logger.error("api_request_completed", metadata);
    } else {
      logger.info("api_request_completed", metadata);
    }
  });
});

apiApp.use("*", async (c, next) => {
  const writeMode: string | undefined = c.env?.WRITE_MODE;
  if (
    writeMode === "protected" &&
    !SAFE_METHODS.has(c.req.method.toUpperCase())
  ) {
    c.header("Retry-After", String(WRITE_PROTECTION_RETRY_SECONDS));
    return c.json(APIErrors.writeProtected(), 503);
  }

  await next();
});

apiApp.use("*", async (c, next) => {
  if (SAFE_METHODS.has(c.req.method.toUpperCase()) || !c.req.header("cookie")) {
    await next();
    return;
  }

  let allowedOrigin: string;
  try {
    const configured = new URL(c.env.APP_URL);
    if (configured.href !== `${configured.origin}/`) throw new Error("APP_URL");
    allowedOrigin = configured.origin;
  } catch {
    return c.json(
      APIErrors.serviceUnavailable("Origin protection unavailable"),
      503,
    );
  }

  const origin = c.req.header("origin");
  const fetchSite = c.req.header("sec-fetch-site");
  if (
    origin !== allowedOrigin ||
    (fetchSite !== undefined && fetchSite !== "same-origin")
  ) {
    return c.json(
      APIErrors.forbidden("Cross-origin cookie write rejected"),
      403,
    );
  }

  await next();
});

apiApp.get("/health", (c) => {
  const versionId = c.env?.CF_VERSION_METADATA?.id;
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    ...(versionId ? { versionId } : {}),
  });
});

apiApp.route("/auth", authRoute);
apiApp.route("/teams", teamsRoute);
apiApp.route("/locations", locationsRoute);
apiApp.route("/users", usersRoute);
apiApp.route("/upload", uploadRoute);
apiApp.route("/regions", regionsRoute);
apiApp.route("/tags", tagsRoute);
apiApp.route("/contact", contactRoute);
apiApp.route("/feedback", feedbackRoute);
apiApp.route("/favorites", favoritesRoute);
apiApp.route("/messages", messagesRoute);
apiApp.route("/stories", storiesRoute);
apiApp.route("/share-image", shareImageRoute);
apiApp.route("/local-circle/home", localCircleHomeRoute);

apiApp.get("/r2/*", async (c) => {
  const hostname = new URL(c.req.url).hostname;
  if (!["localhost", "127.0.0.1", "[::1]"].includes(hostname)) {
    return c.json(APIErrors.notFound("Not found"), 404);
  }
  if (!c.env.R2) {
    return c.json(APIErrors.internalError("R2 not configured"), 500);
  }

  const key = c.req.path.replace(/^\/r2\//, "");
  if (!key) return c.json(APIErrors.badRequest("Key is required"), 400);

  const object = await c.env.R2.get(key);
  if (!object) return c.json(APIErrors.notFound("File not found"), 404);

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  return new Response(object.body, { headers });
});

const ALLOWED_IMAGE_PATTERNS = [
  "gomate.cos.jiahongw.com",
  "*.githubusercontent.com",
  "*.googleusercontent.com",
  "cdn.discordapp.com",
];
const ALLOWED_PROXY_IMAGE_TYPES = new Set([
  "image/avif",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function isDomainAllowed(hostname: string): boolean {
  return ALLOWED_IMAGE_PATTERNS.some((pattern) => {
    if (pattern.startsWith("*.")) {
      const suffix = pattern.slice(1);
      return hostname.length > suffix.length && hostname.endsWith(suffix);
    }
    return hostname === pattern;
  });
}

apiApp.get("/proxy-image", async (c) => {
  const url = c.req.query("url");
  if (!url) return c.json(APIErrors.badRequest("url is required"), 400);

  let urlObject: URL;
  try {
    urlObject = new URL(url);
  } catch {
    return c.json(APIErrors.badRequest("Invalid URL"), 400);
  }

  if (urlObject.protocol !== "https:" || !isDomainAllowed(urlObject.hostname)) {
    return c.json(APIErrors.forbidden("Domain not allowed"), 403);
  }

  try {
    const response = await fetchWithTimeout(
      urlObject.toString(),
      { redirect: "manual" },
      10_000,
    );
    if (!response.ok) {
      return c.json(APIErrors.badGateway("fetch failed"), 502);
    }

    const headers = new Headers();
    const contentType = response.headers
      .get("content-type")
      ?.split(";", 1)[0]
      ?.trim()
      .toLowerCase();
    if (!contentType || !ALLOWED_PROXY_IMAGE_TYPES.has(contentType)) {
      return c.json(
        APIErrors.badGateway("upstream is not a safe raster image"),
        502,
      );
    }
    headers.set("Content-Type", contentType);
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Cache-Control", "public, max-age=86400, s-maxage=86400");

    return new Response(response.body, { headers });
  } catch {
    return c.json(APIErrors.badGateway("proxy failed"), 502);
  }
});

apiApp.notFound((c) => c.json(APIErrors.notFound("Not found"), 404));

apiApp.onError((error, c) => {
  logger.error("api_unhandled_error", error);
  return c.json(APIErrors.internalError("Internal server error"), 500);
});

export type ApiApp = typeof apiApp;
