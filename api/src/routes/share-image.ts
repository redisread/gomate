import { APIErrors } from "../lib/api-errors";
import { Hono } from "hono";
import type { Env } from "../lib/auth";
import { generatePreviewImage, generateLocationImage, generateTeamImage, generateStoryImage } from "../services/share-image/generate-share-image";
import { resolvePosterLocale } from "../services/share-image/poster-i18n";

const shareImageRoute = new Hono<{ Bindings: Env }>();

/**
 * Phase 1: 基础能力验证
 * GET /share-image/preview
 * 使用固定数据测试 Satori + resvg-wasm 图片生成
 */
shareImageRoute.get("/preview", async (c) => {
  try {
    const png = await generatePreviewImage(c.env);

    return new Response(png, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("[ShareImage] Preview generation failed:", error);
    return c.json(
      { error: "Failed to generate preview image", details: String(error) },
      500
    );
  }
});

/**
 * Phase 2: 地点分享图生成
 * GET /share-image/location/:locationId
 * Query: ?download=1 | ?refresh=1
 */
shareImageRoute.get("/location/:locationId", async (c) => {
  try {
    const locationId = c.req.param("locationId");
    const download = c.req.query("download") === "1";
    const refresh = c.req.query("refresh") === "1";

    if (!locationId) {
      return c.json(APIErrors.badRequest("Location ID is required"), 400);
    }

    if (refresh && c.env.R2) {
      try {
        const prefix = `share/location/${locationId}-`;
        const list = await c.env.R2.list({ prefix });
        for (const object of list.objects) {
          await c.env.R2.delete(object.key);
        }
      } catch (e) {
        console.error("[ShareImage] Cache clear failed:", e);
      }
    }

    const locale = resolvePosterLocale(c.req.header("accept-language"), c.req.query("locale"));
    const { png, cacheKey, coverLoaded } = await generateLocationImage(c.env, locationId, locale);

    const headers: Record<string, string> = {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400",
      "X-Cache-Key": cacheKey,
      "X-Cover-Loaded": String(coverLoaded),
    };

    if (download) {
      headers["Content-Disposition"] = `attachment; filename="location-${locationId}.png"`;
    }

    return new Response(png, { headers });
  } catch (error) {
    console.error("[ShareImage] Location image generation failed:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json(
      { error: "Failed to generate location image", details: errorMessage },
      500
    );
  }
});

/**
 * Phase 3: 队伍分享图生成
 * GET /share-image/team/:teamId
 * Query: ?download=1 | ?refresh=1
 */
shareImageRoute.get("/team/:teamId", async (c) => {
  try {
    const teamId = c.req.param("teamId");
    const download = c.req.query("download") === "1";
    const refresh = c.req.query("refresh") === "1";

    if (!teamId) {
      return c.json(APIErrors.badRequest("Team ID is required"), 400);
    }

    if (refresh && c.env.R2) {
      try {
        const prefix = `share/team/${teamId}-`;
        const list = await c.env.R2.list({ prefix });
        for (const object of list.objects) {
          await c.env.R2.delete(object.key);
        }
      } catch (e) {
        console.error("[ShareImage] Cache clear failed:", e);
      }
    }

    const { png, cacheKey } = await generateTeamImage(c.env, teamId);

    const headers: Record<string, string> = {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400",
      "X-Cache-Key": cacheKey,
    };

    if (download) {
      headers["Content-Disposition"] = `attachment; filename="team-${teamId}.png"`;
    }

    return new Response(png, { headers });
  } catch (error) {
    console.error("[ShareImage] Team image generation failed:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json(
      { error: "Failed to generate team image", details: errorMessage },
      500
    );
  }
});

/**
 * Phase 5: 故事分享图片
 * GET /share-image/story/:storyId
 */
shareImageRoute.get("/story/:storyId", async (c) => {
  try {
    const storyId = c.req.param("storyId");
    const download = c.req.query("download") === "1";
    const refresh = c.req.query("refresh") === "1";

    if (!storyId) {
      return c.json(APIErrors.badRequest("Story ID is required"), 400);
    }

    if (refresh && c.env.R2) {
      try {
        const prefix = `share/story/${storyId}-`;
        const list = await c.env.R2.list({ prefix });
        for (const object of list.objects) {
          await c.env.R2.delete(object.key);
        }
      } catch (e) {
        console.error("[ShareImage] Cache clear failed:", e);
      }
    }

    const result = await generateStoryImage(c.env, storyId);

    // 故事不存在或未发布 → 404
    if (!result) {
      return c.json(APIErrors.notFound("Story not found or not published"), 404);
    }

    const { png, cacheKey } = result;

    const headers: Record<string, string> = {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400",
      "X-Cache-Key": cacheKey,
    };

    if (download) {
      headers["Content-Disposition"] = `attachment; filename="story-${storyId}.png"`;
    }

    return new Response(png, { headers });
  } catch (error) {
    console.error("[ShareImage] Story image generation failed:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json(
      { error: "Failed to generate story image", details: errorMessage },
      500
    );
  }
});

export { shareImageRoute };
