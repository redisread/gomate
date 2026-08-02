/**
 * Unified poster pipeline.
 *
 * Replaces the four phase-scoped generators (generatePreviewImage /
 * generateLocationImage / generateTeamImage / generateStoryImage) with
 * one dispatcher keyed by `:kind`. The data-load and Satori-template logic
 * stays in the three real templates (location/team/story-poster.tsx);
 * the cache + WASM + font + image-base64 plumbing lives in `poster-cache.ts`.
 *
 * Skill: `zero-tech-debt` — Steps 2/3/4 collapse.
 */

import type { Env } from "../../lib/auth";
import { logger } from "../../lib/logger";
import { createDb } from "../../db";
import * as schema from "../../db/schema";
import { eq, and, sql } from "drizzle-orm";
import { safeJsonParse } from "../../lib/safe-json";
import {
  lookupPosterStrings,
  localizeDifficulty,
  type PosterLocale,
} from "./poster-i18n";
import {
  cachedPosterRender,
  generateQrDataUrl,
  loadImageAsBase64,
  loadPosterFonts,
  md5,
  renderSvgToPng,
} from "./poster-cache";
import { renderLocationPoster } from "../../templates/share-image/location-poster";
import { renderTeamPoster } from "../../templates/share-image/team-poster";
import { renderStoryPoster } from "../../templates/share-image/story-poster";

export type PosterKind = "location" | "team" | "story";

export interface RenderPosterOptions {
  locale?: PosterLocale;
  refresh?: boolean;
}

export interface RenderPosterResult {
  png: Uint8Array;
  cacheKey: string;
}

export class PosterNotFoundError extends Error {
  constructor(public readonly kind: PosterKind, public readonly id: string) {
    super(`${kind} not found: ${id}`);
  }
}

/** Make a content hash (first 12 hex chars of MD5 over JSON-canonical content). */
async function hashContent(data: unknown): Promise<string> {
  return (await md5(JSON.stringify(data))).slice(0, 12);
}

/** Build canonical cache key for a (kind, id) pair. */
function buildCacheKey(prefix: string, id: string, hash: string): string {
  return `${prefix}/${id}-${hash}.png`;
}

/**
 * Format a team start time the way the poster shows it.
 * Preserves the original pre-refactor output: `05月30日 周六`.
 * (locale-aware formatting is out of scope for this refactor)
 */
function formatTeamDate(timestamp: number | Date | string | null | undefined): string {
  if (timestamp == null) return "";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";
  const months = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];
  const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  return `${months[date.getMonth()]}${date.getDate()}日 ${weekdays[date.getDay()]}`;
}

// =============================================================
// location poster
// =============================================================

async function buildLocationPoster(
  env: Env,
  locationId: string,
  locale: PosterLocale,
  fonts: Awaited<ReturnType<typeof loadPosterFonts>>,
  refresh: boolean,
): Promise<RenderPosterResult> {
  const db = createDb(env.DB);
  let location = await db.query.locations.findFirst({
    where: eq(schema.locations.id, locationId),
  });
  if (!location) {
    location = await db.query.locations.findFirst({
      where: eq(schema.locations.slug, locationId),
    });
  }
  if (!location) throw new PosterNotFoundError("location", locationId);

  const tagRelations = await db
    .select({ tagName: schema.tags.name })
    .from(schema.entityToTags)
    .innerJoin(schema.tags, eq(schema.tags.id, schema.entityToTags.tagId))
    .where(
      and(
        eq(schema.entityToTags.entityId, location.id),
        eq(schema.entityToTags.entityType, "location"),
      ),
    );
  const tags = tagRelations.map((r) => r.tagName);

  // content hash — pre-image load. If 8s budget for cover fails, contentHash still matches.
  const bestSeason = safeJsonParse<string[]>(location.bestSeason, []);
  const coverPath = location.coverImage ?? safeJsonParse<string[]>(location.images, [])[0] ?? null;
  const hashSeed = {
    title: location.name,
    subtitle: location.subtitle,
    description: location.description,
    address: location.address,
    coverImage: coverPath,
    cityName: location.cityName,
    bestSeason,
    tags,
    type: location.type,
  };
  const hash = await hashContent(hashSeed);
  const cacheKey = buildCacheKey("share/location", location.id, hash);

  const { png } = await cachedPosterRender({
    env,
    cacheKey,
    refresh,
    render: async () => {
      let coverImageBase64: string | null = null;
            if (location.coverImage) {
        try {
          coverImageBase64 = await loadImageAsBase64(location.coverImage, env, 8000);
          if (!coverImageBase64) logger.warn("[ShareImage] Cover returned null:", location.coverImage);
        } catch (e) {
          logger.error("[ShareImage] Failed to load cover image:", e);
        }
      }
      if (!coverImageBase64 && location.images) {
        const images = safeJsonParse<string[]>(location.images, []);
        if (images.length > 0) {
          try {
            coverImageBase64 = await loadImageAsBase64(images[0], env, 8000);
            } catch (e) {
            logger.error("[ShareImage] Failed to load fallback image:", e);
          }
        }
      }

      const slugOrId = location.slug || location.id;
      const qrCodeDataUrl = await generateQrDataUrl(`https://gomate.live/locations/${slugOrId}`);

      const hasMetrics = location.difficulty != null
        || location.durationMin != null
        || location.durationMax != null
        || location.distance != null
        || location.elevation != null;
      const routeMetrics = hasMetrics
        ? {
            difficulty: localizeDifficulty(locale, location.difficulty),
            durationMin: location.durationMin,
            durationMax: location.durationMax,
            distance: location.distance,
            elevation: location.elevation,
          }
        : null;

      const i18n = lookupPosterStrings(locale);
      const svg = await renderLocationPoster({
        title: location.name,
        subtitle: location.subtitle,
        description: location.description,
        address: location.address,
        coverImage: coverImageBase64,
        tags,
        cityName: location.cityName ?? null,
        bestSeason,
        type: location.type ?? null,
        routeMetrics,
        qrCodeDataUrl,
        locale,
        fonts,
        i18n: {
          scanToView: i18n.scanToView,
          siteSlogan: i18n.siteSlogan,
          bestSeasonLabel: i18n.bestSeasonLabel,
          distanceLabel: i18n.distanceLabel,
          durationLabel: i18n.durationLabel,
          elevationLabel: i18n.elevationLabel,
          difficultyLabel: i18n.difficultyLabel,
          brandName: i18n.brandName,
        },
      });
      return renderSvgToPng(svg);
    },
  });

  return { png, cacheKey };
}

// =============================================================
// team poster
// =============================================================

async function buildTeamPoster(
  env: Env,
  teamId: string,
  locale: PosterLocale,
  fonts: Awaited<ReturnType<typeof loadPosterFonts>>,
  refresh: boolean,
): Promise<RenderPosterResult> {
  const db = createDb(env.DB);
  const team = await db.query.teams.findFirst({
    where: eq(schema.teams.id, teamId),
    with: { location: true, leader: true },
  });
  if (!team) throw new PosterNotFoundError("team", teamId);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.teamMembers)
    .where(
      and(
        eq(schema.teamMembers.teamId, teamId),
        eq(schema.teamMembers.status, "approved"),
      ),
    );
  const currentMembers = (count ?? 0) + 1;
  const maxMembers = team.maxMembers;
  const spotsToForm = Math.max(0, maxMembers - currentMembers);

  const hash = await hashContent({
    title: team.title,
    startTime: team.startTime,
    locationName: team.location?.name,
    currentMembers,
    maxMembers,
    status: team.status,
    updatedAt: team.updatedAt,
  });
  const cacheKey = buildCacheKey("share/team", team.id, hash);

  const { png } = await cachedPosterRender({
    env,
    cacheKey,
    refresh,
    render: async () => {
      const [coverImageBase64, leaderAvatarBase64, qrCodeDataUrl] = await Promise.all([
        team.location?.coverImage
          ? loadImageAsBase64(team.location.coverImage, env, 3000)
          : Promise.resolve(null),
        team.leader?.image
          ? loadImageAsBase64(team.leader.image, env, 3000)
          : Promise.resolve(null),
        generateQrDataUrl(`https://gomate.live/teams/${team.id}`),
      ]);
      const date = formatTeamDate(team.startTime);
      const i18n = lookupPosterStrings(locale);
      const svg = await renderTeamPoster({
        title: team.title,
        date,
        locationName: team.location?.name ?? null,
        coverImage: coverImageBase64,
        currentMembers,
        maxMembers,
        leaderName: team.leader?.name ?? null,
        leaderAvatar: leaderAvatarBase64,
        spotsToForm,
        qrCodeDataUrl,
        fonts,
        i18n,
      });
      return renderSvgToPng(svg);
    },
  });

  return { png, cacheKey };
}

// =============================================================
// story poster
// =============================================================

async function buildStoryPoster(
  env: Env,
  storyId: string,
  fonts: Awaited<ReturnType<typeof loadPosterFonts>>,
  refresh: boolean,
): Promise<RenderPosterResult> {
  const db = createDb(env.DB);
  const story = await db.query.stories.findFirst({
    where: eq(schema.stories.id, storyId),
    with: { author: true, location: true },
  });
  if (!story || story.status !== "published") {
    throw new PosterNotFoundError("story", storyId);
  }

  const hash = await hashContent({
    title: story.title,
    summary: story.summary,
    coverImage: story.coverImage,
    authorId: story.authorId,
    locationId: story.locationId,
    createdAt: story.createdAt,
  });
  const cacheKey = buildCacheKey("share/story", story.id, hash);

  const { png } = await cachedPosterRender({
    env,
    cacheKey,
    refresh,
    render: async () => {
      const [coverImageBase64, authorAvatarBase64, qrCodeDataUrl] = await Promise.all([
        story.coverImage ? loadImageAsBase64(story.coverImage, env, 3000) : Promise.resolve(null),
        story.author?.image ? loadImageAsBase64(story.author.image, env, 3000) : Promise.resolve(null),
        generateQrDataUrl(`https://gomate.live/discover/${story.id}`),
      ]);
      const svg = await renderStoryPoster({
        title: story.title,
        summary: story.summary,
        coverImage: coverImageBase64 ?? undefined,
        authorName: (story.author?.name || story.author?.nickname) ?? undefined,
        authorAvatar: authorAvatarBase64 ?? undefined,
        locationName: story.location?.name ?? undefined,
        qrCodeDataUrl,
        fonts,
      });
      return renderSvgToPng(svg);
    },
  });

  return { png, cacheKey };
}

// =============================================================
// public dispatch
// =============================================================

/**
 * Single entry the route layer uses. Caller provides `kind` (location |
 * team | story) and the id — the rest is computed inside.
 */
export async function renderPoster(
  env: Env,
  kind: PosterKind,
  id: string,
  opts: RenderPosterOptions = {},
): Promise<RenderPosterResult> {
  const refresh = opts.refresh === true;
  const locale = opts.locale ?? "zh-CN";
  const fonts = await loadPosterFonts(env);

  if (kind === "location") {
    return buildLocationPoster(env, id, locale, fonts, refresh);
  }
  if (kind === "team") {
    return buildTeamPoster(env, id, locale, fonts, refresh);
  }
  return buildStoryPoster(env, id, fonts, refresh);
}
