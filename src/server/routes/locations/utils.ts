import type {
  Location as LocationDto,
  LocationExtra as LocationExtraDto,
  Region as RegionDto,
  Tag as TagDto,
} from "@/contracts";
import { ACTIVITY_TYPES } from "@/contracts";
import { and, asc, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import type { Db } from "../../db";
import * as schema from "../../db/schema";

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
  .max(50)
  .refine((values) => new Set(values).size === values.length, {
    message: "Activity types must be unique",
  });

const extraStringSchema = z.string().trim().min(1).max(1_000);
const extraStringArraySchema = z.array(extraStringSchema).max(50);

const hikingExtraSchema = z.object({
  bestSeasons: extraStringArraySchema.optional(),
}).strict();

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
  supportedActivityTypes: supportedActivityTypesSchema.default([]),
  status: locationStatusSchema.default("draft"),
  subtitle: z.string().trim().max(500).nullable().optional(),
  description: z.string().trim().min(1).max(10_000),
  address: z.string().trim().max(500).nullable().optional(),
  latitude: z.number().finite().min(-90).max(90).nullable().default(null),
  longitude: z.number().finite().min(-180).max(180).nullable().default(null),
  coverImageUrl: httpsUrlSchema.nullable().default(null),
  images: z.array(httpsUrlSchema).max(20).default([]),
  extra: locationExtraInputSchema.default({}),
}).strict();

export function hasPartialLocationCoordinates(
  latitude: number | null,
  longitude: number | null,
): boolean {
  return (latitude === null) !== (longitude === null);
}

export const createLocationInputSchema = locationFieldsSchema.superRefine(
  (value, context) => {
    if (hasPartialLocationCoordinates(value.latitude, value.longitude)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: [value.latitude === null ? "latitude" : "longitude"],
        message: "Location latitude and longitude must be provided together",
      });
    }
    if (value.status === "published" && value.coverImageUrl === null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["coverImageUrl"],
        message: "Published locations require a cover image",
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
  if (extra.hiking?.bestSeasons !== undefined) {
    stored.hiking = { best_seasons: extra.hiking.bestSeasons };
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

export function mapLocationExtra(value: unknown): LocationExtraDto {
  const stored = parseObject(value);
  const hikingStored = parseObject(stored.hiking);
  const extra: LocationExtraDto = {};

  const bestSeasons = readStringArray(hikingStored.best_seasons);
  if (bestSeasons !== undefined) extra.hiking = { bestSeasons };

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
