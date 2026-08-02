/**
 * Single poster endpoint: GET /share-image/:kind/:id
 *
 * Replaces the prior four-handler shape (preview, location, team, story)
 * collapsed under one dispatcher in `services/share-image/poster.ts`.
 * Query: ?locale=zh-CN|en | ?refresh=1
 *
 * Skill: `zero-tech-debt` — Step 3 "Reshape around the final product surface".
 */
import { Hono } from "hono";
import type { Env } from "../lib/auth";
import { APIErrors } from "../lib/api-errors";
import { logger } from "../lib/logger";
import {
  PosterNotFoundError,
  renderPoster,
  type PosterKind,
} from "../services/share-image/poster";
import { SUPPORTED_POSTER_LOCALES, resolvePosterLocale } from "../services/share-image/poster-i18n";

const POSTER_KINDS = new Set<PosterKind>(["location", "team", "story"]);

/**
 * Header builder shared by every poster response.
 *
 * Note: no Content-Disposition attachment — the old ?download=1 path was
 * dead code with zero callers, and unconditional attachment would turn
 * browser navigation to the poster URL from "show image" into "download".
 * If a download feature returns later, add the header conditionally.
 */
function pngResponse(
  png: Uint8Array,
  opts: { cacheKey: string },
): Response {
  const headers: Record<string, string> = {
    "Content-Type": "image/png",
    "Cache-Control": "public, max-age=86400",
    "X-Cache-Key": opts.cacheKey,
  };
  return new Response(png, { headers });
}

const shareImageRoute = new Hono<{ Bindings: Env }>();

shareImageRoute.get("/:kind/:id", async (c) => {
  const kindParam = c.req.param("kind");
  const id = c.req.param("id");
  if (!POSTER_KINDS.has(kindParam as PosterKind)) {
    return c.json(
      APIErrors.badRequest(
        `Unknown kind '${kindParam}'. Supported: ${[...POSTER_KINDS].join(", ")}`,
      ),
      400,
    );
  }
  const kind = kindParam as PosterKind;
  const refresh = c.req.query("refresh") === "1";
  // accept-language falls back to ?locale; ?locale must be supported.
  const locale = resolvePosterLocale(c.req.header("accept-language"), c.req.query("locale"));

  try {
    const result = await renderPoster(c.env, kind, id, { locale, refresh });
    return pngResponse(result.png, { cacheKey: result.cacheKey });
  } catch (error) {
    if (error instanceof PosterNotFoundError) {
      return c.json(APIErrors.notFound(error.message), 404);
    }
    logger.error(`[ShareImage] ${kind} render failed:`, error);
    const message = error instanceof Error ? error.message : String(error);
    return c.json(APIErrors.internalError(`Failed to generate ${kind} image`, message), 500);
  }
});

// Expose supported locale list as a separate endpoint for clients/UI introspection.
// Cheap; rebuild-safe; serves a single source of truth for what the server will accept.
shareImageRoute.get("/locales", (c) => c.json({ locales: SUPPORTED_POSTER_LOCALES }));

export { shareImageRoute };
