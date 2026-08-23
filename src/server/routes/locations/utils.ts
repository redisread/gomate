import type {
  Location as LocationDto,
  LocationExtra as LocationExtraDto,
  Region as RegionDto,
  Tag as TagDto,
} from "@/contracts";
import { and, asc, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import type { Db } from "../../db";
import * as schema from "../../db/schema";

export const ACTIVITY_TYPES = [
  "hiking",
  "explore",
  "leisure",
  "travel",
] as const;

const activityTypeSchema = z.enum(ACTIVITY_TYPES);
const locationStatusSchema = z.enum(["draft", "published", "archived"]);

const httpsUrlSchema = z
  .string()
  .url("Image must be a valid URL")
  .max(2_048)
  .refine(
    (value) => {
      try {
        return new URL(value).protocol === "https:";
      } catch {
        return false;
      }
    },
    { message: "Image URL must use HTTPS" },
  );

const supportedActivityTypesSchema = z
  .array(activityTypeSchema)
  .max(ACTIVITY_TYPES.length)
  .refine((values) => new Set(values).size === values.length, {
    message: "Activity types must be unique",
  });

const extraStringSchema = z.string().trim().min(1).max(1_000);
const extraStringArraySchema = z.array(extraStringSchema).max(50);

const hikingExtraSchema = z
  .object({
    difficulty: z.enum(["easy", "moderate", "hard", "expert"]).optional(),
    durationMin: z.number().finite().nonnegative().optional(),
    durationMax: z.number().finite().nonnegative().optional(),
    distanceKm: z.number().finite().nonnegative().optional(),
    elevationGainM: z.number().finite().nonnegative().optional(),
    bestSeasons: extraStringArraySchema.optional(),
    gearEssential: extraStringArraySchema.optional(),
    gearOptional: extraStringArraySchema.optional(),
    overview: z.string().trim().max(10_000).nullable().optional(),
    tips: extraStringArraySchema.optional(),
    warnings: extraStringArraySchema.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.durationMin !== undefined &&
      value.durationMax !== undefined &&
      value.durationMax < value.durationMin
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["durationMax"],
        message: "durationMax must be greater than or equal to durationMin",
      });
    }
  });

export const locationExtraInputSchema = z
  .object({
    hiking: hikingExtraSchema.optional(),
    facilities: extraStringArraySchema.optional(),
  })
  .strict();

const locationFieldsSchema = z.object({
  regionId: z.string().trim().min(1).max(128),
  name: z.string().trim().min(1).max(200),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  supportedActivityTypes: supportedActivityTypesSchema,
  status: locationStatusSchema.default("published"),
  subtitle: z.string().trim().max(500).nullable().optional(),
  description: z.string().trim().min(1).max(10_000),
  address: z.string().trim().max(500).nullable().optional(),
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
  coverImageUrl: httpsUrlSchema,
  images: z.array(httpsUrlSchema).max(20).default([]),
  extra: locationExtraInputSchema.default({}),
}).strict();

export const createLocationInputSchema = locationFieldsSchema.superRefine(
  (value, context) => {
    if (
      value.status === "published" &&
      value.supportedActivityTypes.length === 0
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["supportedActivityTypes"],
        message: "Published locations require at least one activity type",
      });
    }
  },
);

export const updateLocationInputSchema = locationFieldsSchema
  .partial()
  .extend({ id: z.string().trim().min(1).max(128) });

export const replaceLocationTagsSchema = z.object({
  tagIds: z
    .array(z.string().trim().min(1).max(128))
    .max(20)
    .refine((values) => new Set(values).size === values.length, {
      message: "Tag IDs must be unique",
    }),
});

export async function findOpenCityRegion(db: Db, regionId: string) {
  const [target] = await db
    .select()
    .from(schema.region)
    .where(
      and(
        eq(schema.region.id, regionId),
        eq(schema.region.level, "city"),
        eq(schema.region.serviceEnabled, true),
      ),
    )
    .limit(1);
  return target ?? null;
}

type LocationExtraInput = z.infer<typeof locationExtraInputSchema>;

export function normalizeLocationExtraForStorage(
  extra: LocationExtraInput,
): schema.LocationExtra {
  const stored: schema.LocationExtra = {};
  if (extra.hiking !== undefined) {
    const hiking: NonNullable<schema.LocationExtra["hiking"]> = {};
    if (extra.hiking.difficulty !== undefined) {
      hiking.difficulty = extra.hiking.difficulty;
    }
    if (extra.hiking.durationMin !== undefined) {
      hiking.duration_min = extra.hiking.durationMin;
    }
    if (extra.hiking.durationMax !== undefined) {
      hiking.duration_max = extra.hiking.durationMax;
    }
    if (extra.hiking.distanceKm !== undefined) {
      hiking.distance_km = extra.hiking.distanceKm;
    }
    if (extra.hiking.elevationGainM !== undefined) {
      hiking.elevation_gain_m = extra.hiking.elevationGainM;
    }
    if (extra.hiking.bestSeasons !== undefined) {
      hiking.best_seasons = extra.hiking.bestSeasons;
    }
    if (extra.hiking.gearEssential !== undefined) {
      hiking.gear_essential = extra.hiking.gearEssential;
    }
    if (extra.hiking.gearOptional !== undefined) {
      hiking.gear_optional = extra.hiking.gearOptional;
    }
    if (extra.hiking.overview !== undefined) {
      hiking.overview = extra.hiking.overview;
    }
    if (extra.hiking.tips !== undefined) hiking.tips = extra.hiking.tips;
    if (extra.hiking.warnings !== undefined) {
      hiking.warnings = extra.hiking.warnings;
    }
    stored.hiking = hiking;
  }
  if (extra.facilities !== undefined) stored.facilities = extra.facilities;
  return stored;
}

function parseObject(value: unknown): Record<string, unknown> {
  if (typeof value === "string") {
    try {
      return parseObject(JSON.parse(value) as unknown);
    } catch {
      return {};
    }
  }
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function readStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : undefined;
}

function readFiniteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

export function mapLocationExtra(value: unknown): LocationExtraDto {
  const stored = parseObject(value);
  const hikingStored = parseObject(stored.hiking);
  const extra: LocationExtraDto = {};

  if (Object.keys(hikingStored).length > 0) {
    const difficulty = hikingStored.difficulty;
    const durationMin = readFiniteNumber(hikingStored.duration_min);
    const durationMax = readFiniteNumber(hikingStored.duration_max);
    const distanceKm = readFiniteNumber(hikingStored.distance_km);
    const elevationGainM = readFiniteNumber(hikingStored.elevation_gain_m);
    const bestSeasons = readStringArray(hikingStored.best_seasons);
    const gearEssential = readStringArray(hikingStored.gear_essential);
    const gearOptional = readStringArray(hikingStored.gear_optional);
    const tips = readStringArray(hikingStored.tips);
    const warnings = readStringArray(hikingStored.warnings);
    extra.hiking = {
      ...(typeof difficulty === "string" &&
      ["easy", "moderate", "hard", "expert"].includes(difficulty)
        ? {
            difficulty: difficulty as NonNullable<
              LocationExtraDto["hiking"]
            >["difficulty"],
          }
        : {}),
      ...(durationMin !== undefined ? { durationMin } : {}),
      ...(durationMax !== undefined ? { durationMax } : {}),
      ...(distanceKm !== undefined ? { distanceKm } : {}),
      ...(elevationGainM !== undefined ? { elevationGainM } : {}),
      ...(bestSeasons !== undefined ? { bestSeasons } : {}),
      ...(gearEssential !== undefined ? { gearEssential } : {}),
      ...(gearOptional !== undefined ? { gearOptional } : {}),
      ...(typeof hikingStored.overview === "string" ||
      hikingStored.overview === null
        ? { overview: hikingStored.overview }
        : {}),
      ...(tips !== undefined ? { tips } : {}),
      ...(warnings !== undefined ? { warnings } : {}),
    };
  }

  const facilities = readStringArray(stored.facilities);
  if (facilities !== undefined) extra.facilities = facilities;
  return extra;
}

export function projectRegion(region: schema.Region): RegionDto {
  return {
    id: region.id,
    countryCode: region.countryCode,
    parentId: region.parentId,
    name: region.name,
    nameEn: region.nameEn,
    slug: region.slug,
    code: region.code,
    level: region.level,
    timezone: region.timezone,
    centerLatitude: region.centerLatitude,
    centerLongitude: region.centerLongitude,
    serviceEnabled: region.serviceEnabled,
    isHot: region.isHot,
    sortOrder: region.sortOrder,
  };
}

export function projectLocation(
  location: schema.Location,
  region: schema.Region,
  tags: TagDto[],
): LocationDto {
  return {
    id: location.id,
    regionId: location.regionId,
    name: location.name,
    slug: location.slug,
    supportedActivityTypes: location.supportedActivityTypes,
    status: location.status,
    subtitle: location.subtitle,
    description: location.description,
    address: location.address,
    latitude: location.latitude,
    longitude: location.longitude,
    coverImageUrl: location.coverImageUrl,
    images: location.images,
    extra: mapLocationExtra(location.extra),
    createdAt: location.createdAt.toISOString(),
    updatedAt: location.updatedAt.toISOString(),
    region: projectRegion(region),
    tags,
  };
}

export async function loadLocationTags(db: Db, locationIds: string[]) {
  const byLocation = new Map<string, TagDto[]>();
  if (locationIds.length === 0) return byLocation;

  const rows = await db
    .select({
      locationId: schema.locationTags.locationId,
      id: schema.tags.id,
      name: schema.tags.name,
      slug: schema.tags.slug,
    })
    .from(schema.locationTags)
    .innerJoin(schema.tags, eq(schema.tags.id, schema.locationTags.tagId))
    .where(inArray(schema.locationTags.locationId, locationIds))
    .orderBy(asc(schema.tags.name), asc(schema.tags.id));

  for (const row of rows) {
    const tags = byLocation.get(row.locationId) ?? [];
    tags.push({ id: row.id, name: row.name, slug: row.slug });
    byLocation.set(row.locationId, tags);
  }
  return byLocation;
}

function wildcardHostMatch(hostname: string, suffix: string) {
  return hostname.endsWith(`.${suffix}`) && hostname.length > suffix.length + 1;
}

export function isAllowedLocationImageUrl(value: string, env: Env) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;

  const exactHosts = new Set([
    "gomate.cos.jiahongw.com",
    "cdn.discordapp.com",
  ]);
  try {
    exactHosts.add(new URL(env.R2_PUBLIC_URL).hostname);
  } catch {
    // A malformed optional binding never expands the allowlist.
  }

  const hostname = url.hostname.toLowerCase();
  return (
    exactHosts.has(hostname) ||
    wildcardHostMatch(hostname, "githubusercontent.com") ||
    wildcardHostMatch(hostname, "googleusercontent.com")
  );
}

export function locationImagesAreAllowed(
  input: { coverImageUrl: string | null; images: string[] },
  env: Env,
) {
  return [input.coverImageUrl, ...input.images]
    .filter((url): url is string => url !== null)
    .every((url) =>
    isAllowedLocationImageUrl(url, env),
  );
}

export function safeErrorMetadata(error: unknown) {
  return {
    errorType: error instanceof Error ? error.name : "UnknownError",
  };
}
