/**
 * Unified SVG poster pipeline.
 *
 * Data loading and Satori templates stay specific to each poster kind;
 * shared cache, font, QR, and image-loading support lives in `poster-cache.ts`.
 */

import type { Env } from "../../lib/auth";
import { logger } from "../../lib/logger";
import { createDb } from "../../db";
import * as schema from "../../db/schema";
import { eq, and, sql } from "drizzle-orm";
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
  sha256,
} from "./poster-cache";
import { renderLocationPoster } from "../../templates/share-image/location-poster";
import { renderTeamPoster } from "../../templates/share-image/team-poster";
import { renderStoryPoster } from "../../templates/share-image/story-poster";

export type PosterKind = "location" | "team" | "story";

/**
 * Bump this whenever a poster template's dimensions or visual structure
 * changes. The value is part of the content hash so old cached SVGs cannot be
 * returned after a template deployment.
 */
export const POSTER_TEMPLATE_VERSION = "v2";

export interface RenderPosterOptions {
  locale?: PosterLocale;
}

export interface RenderPosterResult {
  svg: string;
  cacheKey: string;
}

export class PosterNotFoundError extends Error {
  constructor(public readonly kind: PosterKind, public readonly id: string) {
    super(`${kind} not found: ${id}`);
  }
}

/** Make a content hash (first 12 hex chars of SHA-256 over JSON content). */
async function hashContent(data: unknown): Promise<string> {
  return (await sha256(JSON.stringify(data))).slice(0, 12);
}

/** Build canonical cache key for a (kind, id) pair. */
function buildCacheKey(prefix: string, id: string, hash: string): string {
  return `poster:v3:${prefix}:${id}:${hash}`;
}

/**
 * Format a team start time for the poster locale while keeping the compact
 * two-part layout used by the original template.
 */
function formatTeamDate(
  timestamp: number | Date | string | null | undefined,
  locale: PosterLocale,
): string {
  if (timestamp == null) return "";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    weekday: "short",
  }).format(date);
}

// =============================================================
// location poster
// =============================================================

async function buildLocationPoster(
  env: Env,
  locationId: string,
  locale: PosterLocale,
  fonts: Awaited<ReturnType<typeof loadPosterFonts>>,
): Promise<RenderPosterResult> {
  const db = createDb(env.DB);
  const location = await db.query.locations.findFirst({
    where: eq(schema.locations.id, locationId),
    with: { region: true },
  });
  if (
    !location ||
    location.status !== "published" ||
    location.region?.level !== "city" ||
    !location.region.serviceEnabled
  ) throw new PosterNotFoundError("location", locationId);

  const tagRelations = await db
    .select({ tagName: schema.tags.name })
    .from(schema.locationTags)
    .innerJoin(schema.tags, eq(schema.tags.id, schema.locationTags.tagId))
    .where(eq(schema.locationTags.locationId, location.id));
  const tags = tagRelations.map((r) => r.tagName);

  // content hash — pre-image load. If 8s budget for cover fails, contentHash still matches.
  const hiking = location.extra.hiking;
  const bestSeason = hiking?.best_seasons ?? [];
  const coverPath = location.coverImageUrl ?? location.images[0] ?? null;
  const hashSeed = {
    templateVersion: POSTER_TEMPLATE_VERSION,
    title: location.name,
    locale,
    subtitle: location.subtitle,
    description: location.description,
    address: location.address,
    coverImageUrl: coverPath,
    regionName: location.region?.name,
    bestSeason,
    tags,
    activityTypes: location.supportedActivityTypes,
  };
  const hash = await hashContent(hashSeed);
  const cacheKey = buildCacheKey("share/location", location.id, hash);

  const { svg } = await cachedPosterRender({
    env,
    cacheKey,
    render: async () => {
      let coverImageBase64: string | null = null;
      if (location.coverImageUrl) {
        try {
          coverImageBase64 = await loadImageAsBase64(location.coverImageUrl, env, 8000);
          if (!coverImageBase64) logger.warn("share_image_cover_missing", location.coverImageUrl);
        } catch (e) {
          logger.error("share_image_cover_load_failed", e);
        }
      }
      if (!coverImageBase64 && location.images.length > 0) {
          try {
            coverImageBase64 = await loadImageAsBase64(location.images[0], env, 8000);
          } catch (e) {
            logger.error("share_image_fallback_load_failed", e);
          }
      }

      const qrCodeDataUrl = await generateQrDataUrl(`https://gomate.live/locations/${location.id}`);

      const hasMetrics = hiking?.difficulty != null
        || hiking?.duration_min != null
        || hiking?.duration_max != null
        || hiking?.distance_km != null
        || hiking?.elevation_gain_m != null;
      const routeMetrics = hasMetrics
        ? {
            difficulty: localizeDifficulty(locale, hiking?.difficulty),
            durationMin: hiking?.duration_min,
            durationMax: hiking?.duration_max,
            distance: hiking?.distance_km,
            elevation: hiking?.elevation_gain_m,
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
        regionName: location.region?.name ?? null,
        bestSeason,
        type: location.supportedActivityTypes[0] ?? null,
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
      return svg;
    },
  });

  return { svg, cacheKey };
}

// =============================================================
// team poster
// =============================================================

async function buildTeamPoster(
  env: Env,
  teamId: string,
  locale: PosterLocale,
  fonts: Awaited<ReturnType<typeof loadPosterFonts>>,
): Promise<RenderPosterResult> {
  const db = createDb(env.DB);
  const team = await db.query.teams.findFirst({
    where: eq(schema.teams.id, teamId),
    with: { location: true },
  });
  if (!team) throw new PosterNotFoundError("team", teamId);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.teamMembers)
    .where(
      and(
        eq(schema.teamMembers.teamId, teamId),
        sql`${schema.teamMembers.leftAt} is null`,
      ),
    );
  const activeParticipantCount = count ?? 0;
  const maxParticipants = team.maxParticipants;
  const spotsToForm = Math.max(0, maxParticipants - activeParticipantCount);

  const hash = await hashContent({
    templateVersion: POSTER_TEMPLATE_VERSION,
    title: team.title,
    startAt: team.startAt,
    locationName: team.location?.name,
    activeParticipantCount,
    maxParticipants,
    recruitmentStatus: team.recruitmentStatus,
    locale,
    updatedAt: team.updatedAt,
  });
  const cacheKey = buildCacheKey("share/team", team.id, hash);

  const { svg } = await cachedPosterRender({
    env,
    cacheKey,
    render: async () => {
      const [coverImageBase64, qrCodeDataUrl] = await Promise.all([
        team.location?.coverImageUrl
          ? loadImageAsBase64(team.location.coverImageUrl, env, 3000)
          : Promise.resolve(null),
        generateQrDataUrl(`https://gomate.live/teams/${team.id}`),
      ]);
      const date = formatTeamDate(team.startAt, locale);
      const i18n = lookupPosterStrings(locale);
      const svg = await renderTeamPoster({
        title: team.title,
        date,
        locationName: team.location?.name ?? null,
        coverImage: coverImageBase64,
        activeParticipantCount,
        maxParticipants,
        leaderName: null,
        leaderAvatar: null,
        spotsToForm,
        qrCodeDataUrl,
        fonts,
        i18n,
      });
      return svg;
    },
  });

  return { svg, cacheKey };
}

// =============================================================
// story poster
// =============================================================

async function buildStoryPoster(
  env: Env,
  storyId: string,
  fonts: Awaited<ReturnType<typeof loadPosterFonts>>,
): Promise<RenderPosterResult> {
  const db = createDb(env.DB);
  const story = await db.query.stories.findFirst({
    where: eq(schema.stories.id, storyId),
    with: {
      location: { with: { region: true } },
    },
  });
  if (
    !story ||
    story.status !== "published" ||
    (story.locationId !== null && (
      story.location?.status !== "published" ||
      story.location.region?.level !== "city" ||
      !story.location.region.serviceEnabled
    ))
  ) {
    throw new PosterNotFoundError("story", storyId);
  }

  const hash = await hashContent({
    templateVersion: POSTER_TEMPLATE_VERSION,
    title: story.title,
    summary: story.summary,
    images: story.images,
    locationId: story.locationId,
    createdAt: story.createdAt,
  });
  const cacheKey = buildCacheKey("share/story", story.id, hash);

  const { svg } = await cachedPosterRender({
    env,
    cacheKey,
    render: async () => {
      const [coverImageBase64, qrCodeDataUrl] = await Promise.all([
        story.images[0] ? loadImageAsBase64(story.images[0], env, 3000) : Promise.resolve(null),
        generateQrDataUrl(`https://gomate.live/discover/${story.id}`),
      ]);
      const svg = await renderStoryPoster({
        title: story.title ?? "GoMate Story",
        summary: story.summary ?? story.content.slice(0, 160),
        coverImage: coverImageBase64 ?? undefined,
        authorName: undefined,
        authorAvatar: undefined,
        locationName: story.location?.name ?? undefined,
        qrCodeDataUrl,
        fonts,
      });
      return svg;
    },
  });

  return { svg, cacheKey };
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
  const locale = opts.locale ?? "zh-CN";
  const fonts = await loadPosterFonts(env);

  if (kind === "location") {
    return buildLocationPoster(env, id, locale, fonts);
  }
  if (kind === "team") {
    return buildTeamPoster(env, id, locale, fonts);
  }
  return buildStoryPoster(env, id, fonts);
}
