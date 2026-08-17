import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import {
  EXPECTED_LEGACY_LOCATION_COUNT,
  EXPECTED_LEGACY_LOCATION_SHA256,
  assertPostflight,
  assertPublicLocations,
  buildLocationMigration,
  rowsFromD1Payload,
  validateTargetPreflight,
} from "./location-migration-contract.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const fixtureRows = [
  {
    id: "location-shenzhen-test",
    name: "深圳测试地点",
    slug: "shenzhen-test",
    subtitle: "测试副标题",
    description: "深圳测试地点描述",
    address: "深圳市",
    city_id: "legacy-shenzhen",
    city_name: "深圳",
    best_season: '["spring","autumn"]',
    cover_image: "https://example.com/shenzhen-cover.jpg",
    images: '["https://example.com/shenzhen-cover.jpg"]',
    coordinates: '{"lat":22.54,"lng":114.05}',
    extra:
      '{"facilities":["停车场"],"tips":["早出发"],"warnings":["注意天气"],"hiking":{"overview":"测试路线","tips":["带水"],"warnings":["防滑"]}}',
    created_at: 1_700_000_000_000,
    updated_at: 1_700_000_000_001,
    type: "hiking",
    difficulty: "moderate",
    duration_min: 90,
    duration_max: 120,
    distance: 5.5,
    elevation: 300,
    parking_available: null,
    parking_info: null,
    gear_essential: '["登山鞋"]',
    gear_optional: '["登山杖"]',
    city_adcode: "440300",
    canonical_city_name: "深圳",
    city_province: "广东省",
  },
  {
    id: "location-huizhou-test",
    name: "惠州测试地点",
    slug: "huizhou-test",
    subtitle: null,
    description: "惠州测试地点描述",
    address: null,
    city_id: "legacy-huizhou",
    city_name: "惠州",
    best_season: '["全年"]',
    cover_image: "https://example.com/huizhou-cover.jpg",
    images: "[]",
    coordinates: '{"lat":23.08,"lng":114.4}',
    extra: '{"facilities":["卫生间"],"tips":["不进入V2非徒步extra"]}',
    created_at: 1_700_000_000_002,
    updated_at: 1_700_000_000_003,
    type: "leisure",
    difficulty: null,
    duration_min: null,
    duration_max: null,
    distance: null,
    elevation: null,
    parking_available: null,
    parking_info: null,
    gear_essential: null,
    gear_optional: null,
    city_adcode: "441300",
    canonical_city_name: "惠州",
    city_province: "广东省",
  },
];

function fixtureContract() {
  return {
    expectedCount: fixtureRows.length,
    expectedSha256: createHash("sha256")
      .update(JSON.stringify(fixtureRows))
      .digest("hex"),
  };
}

test("legacy Location snapshot contract is immutable", () => {
  assert.equal(EXPECTED_LEGACY_LOCATION_COUNT, 36);
  assert.equal(
    EXPECTED_LEGACY_LOCATION_SHA256,
    "7685b4d2424271c2d5fc7bd871c8e25e20dbecd9a336477a4b16552b45662677",
  );
  assert.throws(
    () =>
      buildLocationMigration(fixtureRows, {
        expectedCount: 36,
        expectedSha256: "0".repeat(64),
      }),
    /snapshot/u,
  );
});

test("accepts only one successful Wrangler or Cloudflare REST D1 query", () => {
  const execution = { success: true, results: fixtureRows };
  assert.deepEqual(rowsFromD1Payload([execution]), fixtureRows);
  assert.deepEqual(
    rowsFromD1Payload({ success: true, result: [execution] }),
    fixtureRows,
  );
  assert.throws(
    () => rowsFromD1Payload({ success: false, errors: [{ code: 9109 }] }),
    /one successful execution/u,
  );
  assert.throws(
    () => rowsFromD1Payload({ success: true, result: [execution, execution] }),
    /one successful execution/u,
  );
});

test("transforms V1 Location fields into the strict V2 contract", () => {
  const migration = buildLocationMigration(fixtureRows, fixtureContract());
  assert.equal(migration.locations.length, 2);
  assert.equal(migration.newRegions.length, 16);
  const hiking = migration.locations.find(
    (location) => location.id === "location-shenzhen-test",
  );
  const leisure = migration.locations.find(
    (location) => location.id === "location-huizhou-test",
  );
  assert.deepEqual(hiking.supported_activity_types, ["hiking"]);
  assert.deepEqual(hiking.extra, {
    hiking: {
      difficulty: "moderate",
      duration_min: 90,
      duration_max: 120,
      distance_km: 5.5,
      elevation_gain_m: 300,
      best_seasons: ["spring", "autumn"],
      gear_essential: ["登山鞋"],
      gear_optional: ["登山杖"],
      overview: "测试路线",
      tips: ["带水"],
      warnings: ["防滑"],
    },
    facilities: ["停车场"],
  });
  assert.deepEqual(leisure.extra, {
    facilities: ["卫生间"],
  });
  assert.equal(leisure.region_id, "region-cn-huizhou");
  assert.doesNotMatch(migration.applySql, /parking_|INSERT INTO `users`/iu);
  assert.doesNotMatch(migration.applySql, /wrangler|DELETE FROM `region`/iu);
});

test("generated migration and rollback preserve the existing production hierarchy", () => {
  const migration = buildLocationMigration(fixtureRows, fixtureContract());
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  db.exec(
    readFileSync(path.join(root, "api/db/migrations/0000_init.sql"), "utf8"),
  );
  db.exec(
    readFileSync(path.join(root, "api/db/bootstrap/regions-v1.sql"), "utf8"),
  );
  db.exec(migration.applySql);

  assert.equal(
    db.prepare("SELECT count(*) AS count FROM region").get().count,
    19,
  );
  assert.equal(
    db.prepare("SELECT count(*) AS count FROM locations").get().count,
    2,
  );
  assert.deepEqual(
    db
      .prepare(
        "SELECT id, region_id, supported_activity_types, status FROM locations ORDER BY id",
      )
      .all(),
    [
      {
        id: "location-huizhou-test",
        region_id: "region-cn-huizhou",
        supported_activity_types: '["leisure"]',
        status: "published",
      },
      {
        id: "location-shenzhen-test",
        region_id: "region-cn-shenzhen",
        supported_activity_types: '["hiking"]',
        status: "published",
      },
    ],
  );

  db.exec(migration.rollbackSql);
  assert.equal(
    db.prepare("SELECT count(*) AS count FROM locations").get().count,
    0,
  );
  assert.deepEqual(db.prepare("SELECT id FROM region ORDER BY id").all(), [
    { id: "region-cn" },
    { id: "region-cn-guangdong" },
    { id: "region-cn-shenzhen" },
  ]);
  db.close();
});

test("postflight and public validators reject any projection drift", () => {
  const migration = buildLocationMigration(fixtureRows, fixtureContract());
  assert.doesNotThrow(() =>
    assertPostflight(migration, migration.locations, migration.newRegions),
  );
  assert.throws(
    () =>
      assertPostflight(
        migration,
        migration.locations.map((location) =>
          location.id === "location-shenzhen-test"
            ? { ...location, name: "tampered" }
            : location,
        ),
        migration.newRegions,
      ),
    /Locations do not match/u,
  );
  assert.doesNotThrow(() =>
    assertPublicLocations(migration, {
      success: true,
      locations: migration.locations.map(({ id }) => ({ id })),
      nextCursor: null,
    }),
  );
  assert.throws(
    () =>
      assertPublicLocations(migration, {
        success: true,
        locations: migration.locations.slice(1).map(({ id }) => ({ id })),
        nextCursor: null,
      }),
    /complete migrated set/u,
  );
});

test("production workflow is protected and limited to D1 Location migration", () => {
  const workflow = readFileSync(
    path.join(root, ".github/workflows/migrate-production-locations.yml"),
    "utf8",
  );
  assert.match(workflow, /MIGRATE_LEGACY_LOCATIONS/u);
  assert.match(
    workflow,
    /inputs\.confirm\s*==\s*'MIGRATE_LEGACY_LOCATIONS'.*github\.ref\s*==\s*'refs\/heads\/main'/u,
  );
  assert.match(workflow, /environment:\s*production/u);
  const jobHeader = workflow.slice(0, workflow.indexOf("    steps:"));
  assert.doesNotMatch(jobHeader, /\$\{\{\s*runner\.temp\s*\}\}/u);
  assert.match(
    workflow,
    /name: Initialize private migration evidence paths[\s\S]*umask 077[\s\S]*RUNNER_TEMP[\s\S]*GITHUB_ENV/u,
  );
  assert.match(workflow, /7d17d076-202f-48f8-b343-24209cdb0ba1/u);
  assert.match(
    workflow,
    /api\.cloudflare\.com\/client\/v4\/accounts\/\$CLOUDFLARE_ACCOUNT_ID\/d1\/database\/7d17d076-202f-48f8-b343-24209cdb0ba1\/query/u,
  );
  assert.doesNotMatch(
    workflow,
    /wrangler d1 execute 7d17d076-202f-48f8-b343-24209cdb0ba1/u,
  );
  assert.match(workflow, /--env production --remote --config wrangler\.jsonc/u);
  assert.match(workflow, /actions\/upload-artifact@v4/u);
  assert.match(
    workflow,
    /name: Upload migration and rollback evidence\s+if: always\(\)\s+uses: actions\/upload-artifact@v4/u,
  );
  assert.doesNotMatch(
    workflow,
    /wrangler\s+(?:deploy|secret|kv|r2)|migrations apply|seed\.sql|DELETE/iu,
  );
});

test("target preflight allows only the current three Regions and zero Locations", () => {
  assert.doesNotThrow(() =>
    validateTargetPreflight({
      locationCount: 0,
      regionIds: ["region-cn", "region-cn-guangdong", "region-cn-shenzhen"],
    }),
  );
  assert.throws(
    () =>
      validateTargetPreflight({
        locationCount: 1,
        regionIds: ["region-cn", "region-cn-guangdong", "region-cn-shenzhen"],
      }),
    /Locations/u,
  );
  assert.throws(
    () => validateTargetPreflight({ locationCount: 0, regionIds: [] }),
    /Region/u,
  );
});
