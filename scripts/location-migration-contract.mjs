#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

export const EXPECTED_LEGACY_LOCATION_COUNT = 36;
export const EXPECTED_LEGACY_LOCATION_SHA256 =
  "7685b4d2424271c2d5fc7bd871c8e25e20dbecd9a336477a4b16552b45662677";

const EXISTING_REGION_IDS = [
  "region-cn",
  "region-cn-guangdong",
  "region-cn-shenzhen",
];
const MIGRATION_TIMESTAMP = Date.parse("2026-08-17T05:30:00Z");
const ACTIVITY_TYPES = new Set(["hiking", "explore", "leisure", "travel"]);
const DIFFICULTIES = new Set(["easy", "moderate", "hard", "expert"]);

const PROVINCES = [
  [
    "region-cn-guangxi",
    "region-cn",
    "广西壮族自治区",
    "Guangxi",
    "guangxi",
    "450000",
    30,
  ],
  ["region-cn-hunan", "region-cn", "湖南省", "Hunan", "hunan", "430000", 40],
  [
    "region-cn-jiangxi",
    "region-cn",
    "江西省",
    "Jiangxi",
    "jiangxi",
    "360000",
    50,
  ],
  [
    "region-cn-sichuan",
    "region-cn",
    "四川省",
    "Sichuan",
    "sichuan",
    "510000",
    60,
  ],
  ["region-cn-yunnan", "region-cn", "云南省", "Yunnan", "yunnan", "530000", 70],
].map(([id, parentId, name, nameEn, slug, code, sortOrder]) => ({
  id,
  country_code: "CN",
  parent_id: parentId,
  name,
  name_en: nameEn,
  slug,
  code,
  level: "province",
  timezone: null,
  center_latitude: null,
  center_longitude: null,
  service_enabled: 0,
  is_hot: 0,
  sort_order: sortOrder,
  created_at: MIGRATION_TIMESTAMP,
  updated_at: MIGRATION_TIMESTAMP,
}));

const CITY_BY_CODE = new Map(
  [
    [
      "440300",
      "region-cn-shenzhen",
      "region-cn-guangdong",
      "深圳市",
      "Shenzhen",
      "shenzhen",
      "Asia/Shanghai",
      22.5431,
      114.0579,
      10,
      true,
    ],
    [
      "441300",
      "region-cn-huizhou",
      "region-cn-guangdong",
      "惠州市",
      "Huizhou",
      "huizhou",
      "Asia/Shanghai",
      23.1115,
      114.4168,
      20,
    ],
    [
      "450200",
      "region-cn-liuzhou",
      "region-cn-guangxi",
      "柳州市",
      "Liuzhou",
      "liuzhou",
      "Asia/Shanghai",
      24.3265,
      109.4285,
      30,
    ],
    [
      "430100",
      "region-cn-changsha",
      "region-cn-hunan",
      "长沙市",
      "Changsha",
      "changsha",
      "Asia/Shanghai",
      28.2282,
      112.9388,
      40,
    ],
    [
      "360300",
      "region-cn-pingxiang",
      "region-cn-jiangxi",
      "萍乡市",
      "Pingxiang",
      "pingxiang",
      "Asia/Shanghai",
      27.6229,
      113.8547,
      50,
    ],
    [
      "510100",
      "region-cn-chengdu",
      "region-cn-sichuan",
      "成都市",
      "Chengdu",
      "chengdu",
      "Asia/Shanghai",
      30.5728,
      104.0668,
      60,
    ],
    [
      "530100",
      "region-cn-kunming",
      "region-cn-yunnan",
      "昆明市",
      "Kunming",
      "kunming",
      "Asia/Shanghai",
      25.0389,
      102.7183,
      70,
    ],
    [
      "530700",
      "region-cn-lijiang",
      "region-cn-yunnan",
      "丽江市",
      "Lijiang",
      "lijiang",
      "Asia/Shanghai",
      26.8721,
      100.2299,
      80,
    ],
    [
      "532800",
      "region-cn-xishuangbanna",
      "region-cn-yunnan",
      "西双版纳傣族自治州",
      "Xishuangbanna",
      "xishuangbanna",
      "Asia/Shanghai",
      22.0017,
      100.797,
      90,
    ],
    [
      "532900",
      "region-cn-dali",
      "region-cn-yunnan",
      "大理白族自治州",
      "Dali",
      "dali",
      "Asia/Shanghai",
      25.6065,
      100.2676,
      100,
    ],
    [
      "810000",
      "region-cn-hong-kong",
      "region-cn",
      "香港特别行政区",
      "Hong Kong",
      "hong-kong",
      "Asia/Hong_Kong",
      22.3193,
      114.1694,
      110,
    ],
    [
      "820000",
      "region-cn-macau",
      "region-cn",
      "澳门特别行政区",
      "Macau",
      "macau",
      "Asia/Macau",
      22.1987,
      113.5439,
      120,
    ],
  ].map(
    ([
      code,
      id,
      parentId,
      name,
      nameEn,
      slug,
      timezone,
      latitude,
      longitude,
      sortOrder,
      existing = false,
    ]) => [
      code,
      {
        id,
        country_code: "CN",
        parent_id: parentId,
        name,
        name_en: nameEn,
        slug,
        code,
        level: "city",
        timezone,
        center_latitude: latitude,
        center_longitude: longitude,
        service_enabled: 1,
        is_hot: existing ? 1 : 0,
        sort_order: sortOrder,
        created_at: MIGRATION_TIMESTAMP,
        updated_at: MIGRATION_TIMESTAMP,
        existing,
      },
    ],
  ),
);

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function parseJson(value, fallback, label) {
  if (value == null || value === "") return fallback;
  try {
    return typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    throw new Error(`${label} must be valid JSON`);
  }
}

function stringArray(value, label) {
  const parsed = parseJson(value, [], label);
  if (
    !Array.isArray(parsed) ||
    parsed.some((item) => typeof item !== "string")
  ) {
    throw new Error(`${label} must be a string array`);
  }
  return [...new Set(parsed.map((item) => item.trim()).filter(Boolean))];
}

function optionalNumber(value, label) {
  if (value == null) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${label} must be a non-negative number`);
  }
  return parsed;
}

function sqlValue(value) {
  if (value == null) return "NULL";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("SQL number must be finite");
    return String(value);
  }
  return `'${String(value).replaceAll("'", "''")}'`;
}

function insertSql(table, columns, rows) {
  const values = rows
    .map(
      (row) =>
        `  (${columns.map((column) => sqlValue(row[column])).join(", ")})`,
    )
    .join(",\n");
  return `INSERT INTO \`${table}\` (${columns.map((column) => `\`${column}\``).join(", ")}) VALUES\n${values};`;
}

function normalizeExtra(row) {
  const legacy = parseJson(row.extra, {}, `${row.id}.extra`);
  if (legacy == null || Array.isArray(legacy) || typeof legacy !== "object") {
    throw new Error(`${row.id}.extra must be an object`);
  }
  const result = {};
  const facilities = Array.isArray(legacy.facilities)
    ? [
        ...new Set(
          legacy.facilities
            .filter((item) => typeof item === "string")
            .map((item) => item.trim())
            .filter(Boolean),
        ),
      ]
    : [];
  if (row.type === "hiking") {
    const legacyHiking =
      legacy.hiking &&
      !Array.isArray(legacy.hiking) &&
      typeof legacy.hiking === "object"
        ? legacy.hiking
        : {};
    const hiking = {};
    if (row.difficulty != null) {
      if (!DIFFICULTIES.has(row.difficulty)) {
        throw new Error(`${row.id}.difficulty is invalid`);
      }
      hiking.difficulty = row.difficulty;
    }
    const numbers = [
      ["duration_min", row.duration_min],
      ["duration_max", row.duration_max],
      ["distance_km", row.distance],
      ["elevation_gain_m", row.elevation],
    ];
    for (const [key, value] of numbers) {
      const parsed = optionalNumber(value, `${row.id}.${key}`);
      if (parsed !== undefined) hiking[key] = parsed;
    }
    const bestSeasons = stringArray(row.best_season, `${row.id}.best_season`);
    const gearEssential = stringArray(
      row.gear_essential,
      `${row.id}.gear_essential`,
    );
    const gearOptional = stringArray(
      row.gear_optional,
      `${row.id}.gear_optional`,
    );
    const tips = Array.isArray(legacyHiking.tips)
      ? legacyHiking.tips
      : Array.isArray(legacy.tips)
        ? legacy.tips
        : [];
    const warnings = Array.isArray(legacyHiking.warnings)
      ? legacyHiking.warnings
      : Array.isArray(legacy.warnings)
        ? legacy.warnings
        : [];
    if (bestSeasons.length) hiking.best_seasons = bestSeasons;
    if (gearEssential.length) hiking.gear_essential = gearEssential;
    if (gearOptional.length) hiking.gear_optional = gearOptional;
    if (typeof legacyHiking.overview === "string") {
      hiking.overview = legacyHiking.overview;
    }
    const cleanTips = tips
      .filter((item) => typeof item === "string" && item.trim())
      .map((item) => item.trim());
    const cleanWarnings = warnings
      .filter((item) => typeof item === "string" && item.trim())
      .map((item) => item.trim());
    if (cleanTips.length) hiking.tips = [...new Set(cleanTips)];
    if (cleanWarnings.length) hiking.warnings = [...new Set(cleanWarnings)];
    result.hiking = hiking;
  }
  if (facilities.length) result.facilities = facilities;
  return result;
}

function transformLocation(row) {
  if (!ACTIVITY_TYPES.has(row.type)) {
    throw new Error(`${row.id}.type is invalid`);
  }
  const city = CITY_BY_CODE.get(String(row.city_adcode));
  if (!city) throw new Error(`${row.id}.city_adcode is not reviewed`);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(row.slug)) {
    throw new Error(`${row.id}.slug is invalid`);
  }
  const coordinates = parseJson(row.coordinates, null, `${row.id}.coordinates`);
  const latitude = Number(coordinates?.lat);
  const longitude = Number(coordinates?.lng);
  if (
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90 ||
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new Error(`${row.id}.coordinates are invalid`);
  }
  const images = stringArray(row.images, `${row.id}.images`);
  if (images.length > 20) throw new Error(`${row.id}.images exceeds V2 limit`);
  for (const value of [row.cover_image, ...images]) {
    if (new URL(value).protocol !== "https:") {
      throw new Error(`${row.id} contains a non-HTTPS image`);
    }
  }
  return {
    id: row.id,
    region_id: city.id,
    name: row.name,
    slug: row.slug,
    supported_activity_types: [row.type],
    status: "published",
    subtitle: row.subtitle ?? null,
    description: row.description,
    address: row.address ?? null,
    latitude,
    longitude,
    cover_image_url: row.cover_image,
    images,
    extra: normalizeExtra(row),
    created_by_user_id: null,
    created_at: Number(row.created_at),
    updated_at: Number(row.updated_at),
  };
}

export function buildLocationMigration(
  rows,
  {
    expectedCount = EXPECTED_LEGACY_LOCATION_COUNT,
    expectedSha256 = EXPECTED_LEGACY_LOCATION_SHA256,
  } = {},
) {
  if (!Array.isArray(rows) || rows.length !== expectedCount) {
    throw new Error(
      "Legacy Location snapshot count does not match the reviewed source",
    );
  }
  const sourceSha256 = sha256(JSON.stringify(rows));
  if (sourceSha256 !== expectedSha256) {
    throw new Error(
      "Legacy Location snapshot hash does not match the reviewed source",
    );
  }
  const locations = rows
    .map(transformLocation)
    .sort((left, right) => left.id.localeCompare(right.id));
  if (new Set(locations.map((row) => row.id)).size !== locations.length) {
    throw new Error("Legacy Location snapshot contains duplicate IDs");
  }
  const regionSlugs = new Set();
  const newRegions = [
    ...PROVINCES,
    ...[...CITY_BY_CODE.values()].filter((region) => !region.existing),
  ]
    .map(({ existing: _existing, ...region }) => region)
    .sort((left, right) => left.id.localeCompare(right.id));
  for (const region of newRegions) {
    if (regionSlugs.has(region.slug))
      throw new Error("Region slugs must be unique");
    regionSlugs.add(region.slug);
  }

  const regionColumns = [
    "id",
    "country_code",
    "parent_id",
    "name",
    "name_en",
    "slug",
    "code",
    "level",
    "timezone",
    "center_latitude",
    "center_longitude",
    "service_enabled",
    "is_hot",
    "sort_order",
    "created_at",
    "updated_at",
  ];
  const locationColumns = [
    "id",
    "region_id",
    "name",
    "slug",
    "supported_activity_types",
    "status",
    "subtitle",
    "description",
    "address",
    "latitude",
    "longitude",
    "cover_image_url",
    "images",
    "extra",
    "created_by_user_id",
    "created_at",
    "updated_at",
  ];
  const sqlLocations = locations.map((row) => ({
    ...row,
    supported_activity_types: JSON.stringify(row.supported_activity_types),
    images: JSON.stringify(row.images),
    extra: JSON.stringify(row.extra),
  }));
  const applySql = [
    `-- Legacy Location snapshot SHA-256: ${sourceSha256}`,
    "-- Generated only by scripts/location-migration-contract.mjs.",
    insertSql("region", regionColumns, newRegions),
    insertSql("locations", locationColumns, sqlLocations),
    "",
  ].join("\n\n");
  const locationIds = locations.map((row) => row.id);
  const cityRegionIds = newRegions
    .filter((region) => region.level === "city")
    .map((region) => region.id);
  const provinceRegionIds = newRegions
    .filter((region) => region.level === "province")
    .map((region) => region.id);
  const rollbackSql = [
    "-- Exact rollback for the reviewed one-time legacy Location import.",
    `DELETE FROM \`locations\` WHERE \`id\` IN (${locationIds.map(sqlValue).join(", ")});`,
    `DELETE FROM \`region\` WHERE \`id\` IN (${cityRegionIds.map(sqlValue).join(", ")});`,
    `DELETE FROM \`region\` WHERE \`id\` IN (${provinceRegionIds.map(sqlValue).join(", ")});`,
    "",
  ].join("\n");
  return {
    sourceSha256,
    locations,
    newRegions,
    applySql,
    rollbackSql,
    applySqlSha256: sha256(applySql),
    rollbackSqlSha256: sha256(rollbackSql),
  };
}

export function validateTargetPreflight({ locationCount, regionIds }) {
  if (Number(locationCount) !== 0) {
    throw new Error("Target V2 database must contain zero Locations");
  }
  if (
    !Array.isArray(regionIds) ||
    JSON.stringify([...regionIds].sort()) !==
      JSON.stringify([...EXISTING_REGION_IDS].sort())
  ) {
    throw new Error(
      "Target V2 Region set does not match the production bootstrap",
    );
  }
}

export function rowsFromD1Payload(payload) {
  const executions = Array.isArray(payload)
    ? payload
    : payload?.success === true && Array.isArray(payload.result)
      ? payload.result
      : [payload];
  if (executions.length !== 1 || executions[0]?.success !== true) {
    throw new Error("D1 evidence is missing one successful execution");
  }
  if (!Array.isArray(executions[0].results)) {
    throw new Error("D1 evidence does not contain result rows");
  }
  return executions[0].results;
}

function rowsFromD1(filePath) {
  return rowsFromD1Payload(JSON.parse(readFileSync(filePath, "utf8")));
}

function normalizeActualLocation(row) {
  return {
    ...row,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    supported_activity_types: parseJson(
      row.supported_activity_types,
      null,
      `${row.id}.supported_activity_types`,
    ),
    images: parseJson(row.images, null, `${row.id}.images`),
    extra: parseJson(row.extra, null, `${row.id}.extra`),
    created_at: Number(row.created_at),
    updated_at: Number(row.updated_at),
  };
}

function writePrivateJson(filePath, value) {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, {
    mode: 0o600,
  });
}

export function generateMigrationFiles(
  sourcePath,
  applyPath,
  rollbackPath,
  manifestPath,
) {
  const migration = buildLocationMigration(rowsFromD1(sourcePath));
  writeFileSync(applyPath, migration.applySql, { mode: 0o600 });
  writeFileSync(rollbackPath, migration.rollbackSql, { mode: 0o600 });
  writePrivateJson(manifestPath, {
    status: "reviewed",
    sourceDatabase: "legacy-location-snapshot",
    targetDatabase: "gomate-db-v2",
    sourceLocationCount: migration.locations.length,
    sourceSha256: migration.sourceSha256,
    applySqlSha256: migration.applySqlSha256,
    rollbackSqlSha256: migration.rollbackSqlSha256,
    locationIds: migration.locations.map((row) => row.id),
    newRegionIds: migration.newRegions.map((row) => row.id),
  });
}

export function validateTargetPreflightFile(filePath) {
  const rows = rowsFromD1(filePath);
  if (rows.length !== 1)
    throw new Error("Target preflight must return one row");
  validateTargetPreflight({
    locationCount: rows[0].location_count,
    regionIds: parseJson(rows[0].region_ids, null, "region_ids"),
  });
}

export function validatePostflightFiles(
  sourcePath,
  locationsPath,
  regionsPath,
  evidencePath,
) {
  const migration = buildLocationMigration(rowsFromD1(sourcePath));
  const actualLocations = rowsFromD1(locationsPath).map(
    normalizeActualLocation,
  );
  const actualRegions = rowsFromD1(regionsPath).map((row) => ({
    ...row,
    center_latitude:
      row.center_latitude == null ? null : Number(row.center_latitude),
    center_longitude:
      row.center_longitude == null ? null : Number(row.center_longitude),
    service_enabled: Number(row.service_enabled),
    is_hot: Number(row.is_hot),
    sort_order: Number(row.sort_order),
    created_at: Number(row.created_at),
    updated_at: Number(row.updated_at),
  }));
  assertPostflight(migration, actualLocations, actualRegions);
  writePrivateJson(evidencePath, {
    status: "complete",
    sourceLocationCount: migration.locations.length,
    targetLocationCount: actualLocations.length,
    sourceSha256: migration.sourceSha256,
    applySqlSha256: migration.applySqlSha256,
    rollbackSqlSha256: migration.rollbackSqlSha256,
    locationIds: actualLocations.map((row) => row.id),
    newRegionIds: actualRegions.map((row) => row.id),
  });
}

export function assertPostflight(migration, actualLocations, actualRegions) {
  if (JSON.stringify(actualLocations) !== JSON.stringify(migration.locations)) {
    throw new Error("Target Locations do not match the reviewed V2 projection");
  }
  if (JSON.stringify(actualRegions) !== JSON.stringify(migration.newRegions)) {
    throw new Error("Target Regions do not match the reviewed V2 projection");
  }
}

export function validatePublicLocationsFile(sourcePath, publicPath) {
  const migration = buildLocationMigration(rowsFromD1(sourcePath));
  const payload = JSON.parse(readFileSync(publicPath, "utf8"));
  assertPublicLocations(migration, payload);
}

export function assertPublicLocations(migration, payload) {
  const actualIds = payload?.locations?.map((row) => row.id).sort();
  const expectedIds = migration.locations.map((row) => row.id).sort();
  if (
    payload?.success !== true ||
    JSON.stringify(actualIds) !== JSON.stringify(expectedIds) ||
    payload.nextCursor != null
  ) {
    throw new Error(
      "Public Location API does not expose the complete migrated set",
    );
  }
}

if (process.argv[1]?.endsWith("location-migration-contract.mjs")) {
  const [, , command, ...args] = process.argv;
  if (command === "source" && args.length === 4) {
    generateMigrationFiles(...args);
  } else if (command === "target-preflight" && args.length === 1) {
    validateTargetPreflightFile(args[0]);
  } else if (command === "postflight" && args.length === 4) {
    validatePostflightFiles(...args);
  } else if (command === "public" && args.length === 2) {
    validatePublicLocationsFile(...args);
  } else {
    console.error(
      "Usage: location-migration-contract.mjs source <source-json> <apply-sql> <rollback-sql> <manifest-json> | target-preflight <json> | postflight <source-json> <locations-json> <regions-json> <evidence-json> | public <source-json> <public-json>",
    );
    process.exit(1);
  }
}
