import { and, eq, inArray, sql } from "drizzle-orm";
import { Hono } from "hono";

import { createDb } from "../../db";
import * as schema from "../../db/schema";
import {
  adminAccessErrorResponse,
  requireAdmin,
} from "../../lib/admin-access";
import { APIErrors } from "../../lib/api-errors";
import type { Env } from "../../lib/auth";
import { generateId } from "../../lib/id";
import { logger } from "../../lib/logger";
import {
  backupLocationMedia,
  discardLocationMediaBackups,
  discardPreparedLocationMedia,
  finalizeLocationMedia,
  LocationMediaError,
  ownedLocationMediaKeys,
  prepareLocationMedia,
  restoreLocationMediaBackups,
  type LocationMediaBackup,
  type PreparedLocationMedia,
} from "../../lib/location-media";
import {
  deleteR2ObjectsWithRetry,
  getR2PublicBaseUrl,
} from "../../lib/r2-media";
import { validateRequest } from "../../lib/validation";
import {
  createLocationInputSchema,
  findOpenCityRegion,
  loadLocationTags,
  locationImagesAreAllowed,
  normalizeLocationExtraForStorage,
  projectLocation,
  replaceLocationTagsSchema,
  safeErrorMetadata,
  updateLocationInputSchema,
} from "./utils";

const mutations = new Hono<{ Bindings: Env }>();

function d1Changes(result: D1Result<unknown> | undefined): number {
  return Number(result?.meta?.changes ?? 0);
}

function generatedSlug(id: string) {
  const suffix = id
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `location-${suffix || crypto.randomUUID()}`;
}

mutations.post("/", async (c) => {
  let preparedMedia: PreparedLocationMedia | null = null;
  let databaseCommitted = false;
  try {
    const admin = await requireAdmin(c);
    const parsed = await validateRequest(
      c,
      "json",
      createLocationInputSchema,
      "Invalid location input",
      "flatten",
      "Invalid JSON body",
    );
    if (parsed instanceof Response) return parsed;
    if (!locationImagesAreAllowed(parsed, c.env)) {
      return c.json(
        APIErrors.validationError("Location images use a disallowed host"),
        400,
      );
    }

    const db = createDb(c.env.DB);
    const targetRegion = await findOpenCityRegion(db, parsed.regionId);
    if (!targetRegion) {
      return c.json(
        APIErrors.badRequest("regionId must reference an enabled city Region"),
        400,
      );
    }

    const id = generateId();
    preparedMedia = await prepareLocationMedia(c.env, admin.id, id, {
      coverImageUrl: parsed.coverImageUrl,
      images: parsed.images,
    });
    const now = Date.now();
    const insertResult = await c.env.DB.prepare(
      `
        INSERT INTO locations (
          id, region_id, name, slug, supported_activity_types, status,
          subtitle, description, address, latitude, longitude,
          cover_image_url, images, extra, created_by_user_id,
          created_at, updated_at
        )
        SELECT
          ?, target_region.id, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        FROM region AS target_region
        WHERE target_region.id = ?
          AND target_region.level = 'city'
          AND target_region.service_enabled = 1
      `,
    )
      .bind(
        id,
        parsed.name,
        parsed.slug ?? generatedSlug(id),
        JSON.stringify(parsed.supportedActivityTypes),
        parsed.status,
        parsed.subtitle ?? null,
        parsed.description,
        parsed.address ?? null,
        parsed.latitude,
        parsed.longitude,
        preparedMedia.coverImageUrl,
        JSON.stringify(preparedMedia.images),
        JSON.stringify(normalizeLocationExtraForStorage(parsed.extra)),
        admin.id,
        now,
        now,
        parsed.regionId,
      )
      .run();
    if (d1Changes(insertResult) !== 1) {
      await discardPreparedLocationMedia(c.env, preparedMedia);
      preparedMedia = null;
      return c.json(
        APIErrors.conflict("Target Region changed concurrently"),
        409,
      );
    }
    databaseCommitted = true;

    const [location] = await db
      .select()
      .from(schema.locations)
      .where(eq(schema.locations.id, id))
      .limit(1);
    if (!location) throw new Error("Created location could not be read back");
    await finalizeLocationMedia(c.env, preparedMedia).catch(
      (cleanupError: unknown) =>
        logger.error(
          "location_create_media_cleanup_failed",
          safeErrorMetadata(cleanupError),
        ),
    );

    return c.json(
      {
        success: true as const,
        location: projectLocation(location, targetRegion, []),
      },
      201,
    );
  } catch (error) {
    if (preparedMedia && !databaseCommitted) {
      await discardPreparedLocationMedia(c.env, preparedMedia).catch(
        (cleanupError: unknown) =>
          logger.error(
            "location_create_media_compensation_failed",
            safeErrorMetadata(cleanupError),
          ),
      );
    }
    const denied = adminAccessErrorResponse(c, error);
    if (denied) return denied;
    if (error instanceof LocationMediaError) {
      return c.json(
        error.status === 403
          ? APIErrors.forbidden(error.message)
          : error.status === 400
            ? APIErrors.badRequest(error.message)
            : APIErrors.internalError(error.message),
        error.status,
      );
    }
    logger.error("location_create_failed", safeErrorMetadata(error));
    return c.json(APIErrors.internalError("Failed to create location"), 500);
  }
});

mutations.put("/", async (c) => {
  let preparedMedia: PreparedLocationMedia | null = null;
  let databaseCommitted = false;
  try {
    const admin = await requireAdmin(c);
    const parsed = await validateRequest(
      c,
      "json",
      updateLocationInputSchema,
      "Invalid location input",
      "flatten",
      "Invalid JSON body",
    );
    if (parsed instanceof Response) return parsed;

    const { id, ...changes } = parsed;
    const db = createDb(c.env.DB);
    const [existing] = await db
      .select()
      .from(schema.locations)
      .where(eq(schema.locations.id, id))
      .limit(1);
    if (!existing) return c.json(APIErrors.notFound("Location not found"), 404);

    const nextActivities =
      changes.supportedActivityTypes ?? existing.supportedActivityTypes;
    const nextStatus = changes.status ?? existing.status;
    const nextRegionId = changes.regionId ?? existing.regionId;
    if (nextStatus === "published" && nextActivities.length === 0) {
      return c.json(
        APIErrors.validationError(
          "Published locations require at least one activity type",
        ),
        400,
      );
    }

    const nextImages = {
      coverImageUrl: changes.coverImageUrl ?? existing.coverImageUrl,
      images: changes.images ?? existing.images,
    };
    if (!locationImagesAreAllowed(nextImages, c.env)) {
      return c.json(
        APIErrors.validationError("Location images use a disallowed host"),
        400,
      );
    }

    const targetRegion = await findOpenCityRegion(db, nextRegionId);
    if (!targetRegion) {
      return c.json(
        APIErrors.badRequest("regionId must reference an enabled city Region"),
        400,
      );
    }

    preparedMedia = await prepareLocationMedia(
      c.env,
      admin.id,
      id,
      nextImages,
    );

    const removedActivities = existing.supportedActivityTypes.filter(
      (activity) => !nextActivities.includes(activity),
    );
    const assignments = ["updated_at = ?"];
    const values: unknown[] = [Date.now()];
    const addAssignment = (column: string, value: unknown) => {
      assignments.push(`${column} = ?`);
      values.push(value);
    };
    if (changes.regionId !== undefined) {
      addAssignment("region_id", changes.regionId);
    }
    if (changes.name !== undefined) addAssignment("name", changes.name);
    if (changes.slug !== undefined) addAssignment("slug", changes.slug);
    if (changes.supportedActivityTypes !== undefined) {
      addAssignment(
        "supported_activity_types",
        JSON.stringify(changes.supportedActivityTypes),
      );
    }
    if (changes.status !== undefined) addAssignment("status", changes.status);
    if (changes.subtitle !== undefined) {
      addAssignment("subtitle", changes.subtitle);
    }
    if (changes.description !== undefined) {
      addAssignment("description", changes.description);
    }
    if (changes.address !== undefined)
      addAssignment("address", changes.address);
    if (changes.latitude !== undefined) {
      addAssignment("latitude", changes.latitude);
    }
    if (changes.longitude !== undefined) {
      addAssignment("longitude", changes.longitude);
    }
    if (changes.coverImageUrl !== undefined) {
      addAssignment("cover_image_url", preparedMedia.coverImageUrl);
    }
    if (changes.images !== undefined) {
      addAssignment("images", JSON.stringify(preparedMedia.images));
    }
    if (changes.extra !== undefined) {
      addAssignment(
        "extra",
        JSON.stringify(normalizeLocationExtraForStorage(changes.extra)),
      );
    }

    values.push(
      id,
      existing.coverImageUrl,
      JSON.stringify(existing.images),
      existing.regionId,
      nextRegionId,
    );
    let activityGuard = "";
    if (removedActivities.length > 0) {
      activityGuard = `
        AND NOT EXISTS (
          SELECT 1
          FROM teams AS blocking_team
          WHERE blocking_team.location_id = locations.id
            AND blocking_team.cancelled_at IS NULL
            AND blocking_team.end_at > ?
            AND blocking_team.activity_type IN (
              ${removedActivities.map(() => "?").join(", ")}
            )
        )
      `;
      values.push(Date.now(), ...removedActivities);
    }

    const updateResult = await c.env.DB.prepare(
      `
        UPDATE locations
        SET ${assignments.join(", ")}
        WHERE id = ?
          AND cover_image_url = ?
          AND images = ?
          AND region_id = ?
          AND EXISTS (
            SELECT 1
            FROM region AS target_region
            WHERE target_region.id = ?
              AND target_region.level = 'city'
              AND target_region.service_enabled = 1
          )
          ${activityGuard}
      `,
    )
      .bind(...values)
      .run();
    if (d1Changes(updateResult) !== 1) {
      await discardPreparedLocationMedia(c.env, preparedMedia);
      preparedMedia = null;
      return c.json(
        APIErrors.conflict("Location or target Region changed concurrently"),
        409,
      );
    }
    databaseCommitted = true;

    const [updated] = await db
      .select()
      .from(schema.locations)
      .where(eq(schema.locations.id, id))
      .limit(1);
    if (!updated) throw new Error("Updated location could not be read back");

    const retainedKeys = new Set(
      ownedLocationMediaKeys(c.env, id, {
        coverImageUrl: preparedMedia.coverImageUrl,
        images: preparedMedia.images,
      }),
    );
    const staleKeys = ownedLocationMediaKeys(c.env, id, {
      coverImageUrl: existing.coverImageUrl,
      images: existing.images,
    }).filter((key) => !retainedKeys.has(key));
    await finalizeLocationMedia(c.env, preparedMedia, staleKeys).catch(
      (cleanupError: unknown) =>
        logger.error(
          "location_update_media_cleanup_failed",
          safeErrorMetadata(cleanupError),
        ),
    );

    const tags = await loadLocationTags(db, [id]);
    return c.json({
      success: true as const,
      location: projectLocation(updated, targetRegion, tags.get(id) ?? []),
    });
  } catch (error) {
    if (preparedMedia && !databaseCommitted) {
      await discardPreparedLocationMedia(c.env, preparedMedia).catch(
        (cleanupError: unknown) =>
          logger.error(
            "location_update_media_compensation_failed",
            safeErrorMetadata(cleanupError),
          ),
      );
    }
    const denied = adminAccessErrorResponse(c, error);
    if (denied) return denied;
    if (error instanceof LocationMediaError) {
      return c.json(
        error.status === 403
          ? APIErrors.forbidden(error.message)
          : error.status === 400
            ? APIErrors.badRequest(error.message)
            : APIErrors.internalError(error.message),
        error.status,
      );
    }
    logger.error("location_update_failed", safeErrorMetadata(error));
    return c.json(APIErrors.internalError("Failed to update location"), 500);
  }
});

mutations.delete("/:id", async (c) => {
  let mediaBackups: LocationMediaBackup[] = [];
  let originalsRemovalAttempted = false;
  let databaseDeleted = false;
  try {
    await requireAdmin(c);
    const db = createDb(c.env.DB);
    const locationId = c.req.param("id");
    const [existing] = await db
      .select()
      .from(schema.locations)
      .where(eq(schema.locations.id, locationId))
      .limit(1);
    if (!existing) {
      return c.json(APIErrors.notFound("Location not found"), 404);
    }
    if (!getR2PublicBaseUrl(c.env)) {
      return c.json(
        APIErrors.internalError(
          "Location media storage is not safely configured",
        ),
        500,
      );
    }

    const mediaKeys = ownedLocationMediaKeys(c.env, locationId, {
      coverImageUrl: existing.coverImageUrl,
      images: existing.images,
    });
    if (mediaKeys.length > 0) {
      if (!c.env.R2) {
        return c.json(
          APIErrors.internalError("Location media storage is not configured"),
          500,
        );
      }
      mediaBackups = await backupLocationMedia(c.env.R2, locationId, mediaKeys);
      originalsRemovalAttempted = true;
      await deleteR2ObjectsWithRetry(c.env.R2, mediaKeys);
    }

    const deleted = await db
      .delete(schema.locations)
      .where(
        and(
          eq(schema.locations.id, locationId),
          sql`${schema.locations.coverImageUrl} is ${existing.coverImageUrl}`,
          eq(schema.locations.images, existing.images),
        ),
      )
      .returning({ id: schema.locations.id });
    if (deleted.length === 0) {
      // A concurrent media update won the conditional DML. Restore only keys
      // that its current version still references; the rest are stale.
      const [current] = await db
        .select({
          coverImageUrl: schema.locations.coverImageUrl,
          images: schema.locations.images,
        })
        .from(schema.locations)
        .where(eq(schema.locations.id, locationId))
        .limit(1);
      if (c.env.R2) {
        const retainedKeys = new Set(
          current ? ownedLocationMediaKeys(c.env, locationId, current) : [],
        );
        await restoreLocationMediaBackups(c.env.R2, mediaBackups, retainedKeys);
      }
      originalsRemovalAttempted = false;
      return c.json(APIErrors.conflict("Location changed concurrently"), 409);
    }
    databaseDeleted = true;
    originalsRemovalAttempted = false;
    if (c.env.R2) {
      await discardLocationMediaBackups(c.env.R2, mediaBackups).catch(
        (cleanupError: unknown) =>
          logger.error(
            "location_delete_media_backup_cleanup_failed",
            safeErrorMetadata(cleanupError),
          ),
      );
    }
    return c.json({ success: true as const, id: deleted[0].id });
  } catch (error) {
    if (!databaseDeleted && originalsRemovalAttempted && c.env.R2) {
      await restoreLocationMediaBackups(c.env.R2, mediaBackups).catch(
        (restoreError: unknown) =>
          logger.error(
            "location_delete_media_rollback_failed",
            safeErrorMetadata(restoreError),
          ),
      );
    } else if (!databaseDeleted && mediaBackups.length > 0 && c.env.R2) {
      await discardLocationMediaBackups(c.env.R2, mediaBackups).catch(
        () => undefined,
      );
    }
    const denied = adminAccessErrorResponse(c, error);
    if (denied) return denied;
    logger.error("location_delete_failed", safeErrorMetadata(error));
    return c.json(APIErrors.internalError("Failed to delete location"), 500);
  }
});

mutations.put("/:id/tags", async (c) => {
  try {
    await requireAdmin(c);
    const parsed = await validateRequest(
      c,
      "json",
      replaceLocationTagsSchema,
      "Invalid tag input",
      "flatten",
      "Invalid JSON body",
    );
    if (parsed instanceof Response) return parsed;

    const locationId = c.req.param("id");
    const db = createDb(c.env.DB);
    const [location] = await db
      .select({ id: schema.locations.id })
      .from(schema.locations)
      .where(eq(schema.locations.id, locationId))
      .limit(1);
    if (!location) return c.json(APIErrors.notFound("Location not found"), 404);

    const selectedTags =
      parsed.tagIds.length > 0
        ? await db
            .select({
              id: schema.tags.id,
              name: schema.tags.name,
              slug: schema.tags.slug,
            })
            .from(schema.tags)
            .where(inArray(schema.tags.id, parsed.tagIds))
        : [];
    if (selectedTags.length !== parsed.tagIds.length) {
      return c.json(
        APIErrors.badRequest("Every tagId must reference an existing tag"),
        400,
      );
    }

    const deleteExisting = db
      .delete(schema.locationTags)
      .where(eq(schema.locationTags.locationId, locationId));
    if (selectedTags.length === 0) {
      await deleteExisting;
    } else {
      const insertNext = db
        .insert(schema.locationTags)
        .values(parsed.tagIds.map((tagId) => ({ locationId, tagId })));
      await db.batch([deleteExisting, insertNext]);
    }

    const byId = new Map(selectedTags.map((tag) => [tag.id, tag]));
    return c.json({
      success: true as const,
      tags: parsed.tagIds.map((tagId) => byId.get(tagId)!),
    });
  } catch (error) {
    const denied = adminAccessErrorResponse(c, error);
    if (denied) return denied;
    logger.error("location_tags_replace_failed", safeErrorMetadata(error));
    return c.json(
      APIErrors.internalError("Failed to replace location tags"),
      500,
    );
  }
});

export default mutations;
