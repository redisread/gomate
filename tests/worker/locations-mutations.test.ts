import { env } from "cloudflare:workers";
import { reset } from "cloudflare:test";
import { afterEach, describe, expect, it } from "vitest";

import { buildLocationUpdateSql } from "../../src/server/routes/locations/update-sql";

afterEach(() => reset());

async function createCatalogTables() {
  await env.DB.batch([
    env.DB.prepare(`CREATE TABLE region (
      id TEXT PRIMARY KEY,
      level TEXT NOT NULL,
      service_enabled INTEGER NOT NULL
    )`),
    env.DB.prepare(`CREATE TABLE locations (
      id TEXT PRIMARY KEY,
      region_id TEXT NOT NULL,
      name TEXT NOT NULL,
      supported_activity_types TEXT NOT NULL,
      status TEXT NOT NULL,
      latitude REAL,
      longitude REAL,
      cover_image_url TEXT,
      images TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    )`),
    env.DB.prepare(`INSERT INTO region (id, level, service_enabled)
      VALUES ('region-1', 'city', 1)`),
  ]);
}

describe("location update conditional DML", () => {
  it("updates a draft whose existing cover and coordinates are null", async () => {
    await createCatalogTables();
    await env.DB.prepare(`
      INSERT INTO locations (
        id, region_id, name, supported_activity_types, status,
        latitude, longitude, cover_image_url, images, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      "location-1",
      "region-1",
      "Draft",
      "[]",
      "draft",
      null,
      null,
      null,
      "[]",
      1,
    ).run();

    const result = await env.DB.prepare(
      buildLocationUpdateSql(["updated_at = ?", "name = ?"], ""),
    ).bind(
      2,
      "Updated draft",
      "location-1",
      null,
      "[]",
      "region-1",
      "[]",
      "draft",
      null,
      null,
      "region-1",
    ).run();

    expect(result.meta.changes).toBe(1);
    await expect(
      env.DB.prepare("SELECT name FROM locations WHERE id = ?")
        .bind("location-1")
        .first(),
    ).resolves.toEqual({ name: "Updated draft" });
  });

  it("rejects a stale publish after a concurrent update clears coordinates", async () => {
    await createCatalogTables();
    await env.DB.prepare(`
      INSERT INTO locations (
        id, region_id, name, supported_activity_types, status,
        latitude, longitude, cover_image_url, images, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      "location-1",
      "region-1",
      "Published",
      "[]",
      "published",
      22.5,
      114.1,
      "https://media.example.com/cover.webp",
      "[]",
      1,
    ).run();
    await env.DB.prepare(
      "UPDATE locations SET status = 'draft', latitude = NULL, updated_at = 2 WHERE id = ?",
    ).bind("location-1").run();

    const result = await env.DB.prepare(
      buildLocationUpdateSql(["updated_at = ?", "status = ?"], ""),
    ).bind(
      3,
      "published",
      "location-1",
      "https://media.example.com/cover.webp",
      "[]",
      "region-1",
      "[]",
      "published",
      22.5,
      114.1,
      "region-1",
    ).run();

    expect(result.meta.changes).toBe(0);
    await expect(
      env.DB.prepare("SELECT status, latitude FROM locations WHERE id = ?")
        .bind("location-1")
        .first(),
    ).resolves.toEqual({ status: "draft", latitude: null });
  });
});
