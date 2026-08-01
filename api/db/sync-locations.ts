/**
 * 从远程 API 同步 locations 数据到本地数据库
 * 
 * 使用方法：在 api 目录下执行 node db/sync-locations.ts
 */

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "../src/db/schema";
import { eq } from "drizzle-orm";
import path from "path";
import fs from "fs";
import os from "node:os";

// 本地 D1 状态目录：多 worktree 共享同一份（GOMATE_LOCAL_STATE，默认 ~/.gomate/wrangler-state）
const DB_PATH = path.join(
  process.env.GOMATE_LOCAL_STATE ||
    path.join(os.homedir(), ".gomate", "wrangler-state"),
  "v3",
  "d1",
  "miniflare-D1DatabaseObject"
);

const REMOTE_API = "https://api.gomate.live";

function findDbFile(): string {
  if (!fs.existsSync(DB_PATH)) {
    throw new Error(`D1 database directory not found: ${DB_PATH}`);
  }
  const files = fs.readdirSync(DB_PATH);
  // Filter out empty placeholder files (*.sqlite) and find the actual database
  const dbFile = files.find(f => f.endsWith(".sqlite") && fs.statSync(path.join(DB_PATH, f)).size > 1000);
  if (!dbFile) {
    throw new Error("No SQLite database file found in D1 directory (or file is empty)");
  }
  console.log(`Found database file: ${dbFile}`);
  return path.join(DB_PATH, dbFile);
}

const genId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

interface RemoteCity {
  id: string;
  adcode: string;
  name: string;
  pinyin: string;
  province: string;
  level: "province" | "city" | "district";
  isHot: boolean;
  createdAt: string;
}

interface RemoteLocation {
  id: string;
  name: string;
  slug: string;
  type?: string | null;
  subtitle?: string | null;
  description: string;
  address?: string | null;
  cityId: string;
  cityName?: string | null;
  bestSeason?: string[];
  coverImage: string;
  images?: string[];
  coordinates?: { lat: number; lng: number };
  difficulty?: string | null;
  durationMin?: number | null;
  durationMax?: number | null;
  distance?: number | null;
  elevation?: number | null;
  extra?: unknown;
  createdAt: string;
  tags?: { id: string; name: string; type?: string }[];
}

async function fetchRemoteLocations(): Promise<RemoteLocation[]> {
  console.log("Fetching locations from remote API...");

  const response = await fetch(`${REMOTE_API}/locations?pageSize=200`);
  if (!response.ok) {
    throw new Error(`Failed to fetch locations: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as { success: boolean; locations?: RemoteLocation[] };
  if (!data.success || !data.locations) {
    throw new Error("Invalid response format from remote API");
  }

  console.log(`Fetched ${data.locations.length} locations`);
  return data.locations;
}

async function fetchRemoteCities(): Promise<RemoteCity[]> {
  console.log("Fetching cities from remote API...");

  const response = await fetch(`${REMOTE_API}/cities`);
  if (!response.ok) {
    throw new Error(`Failed to fetch cities: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as { success: boolean; cities?: RemoteCity[] };
  if (!data.success || !data.cities) {
    throw new Error("Invalid response format from remote API");
  }

  console.log(`Fetched ${data.cities.length} cities`);
  return data.cities;
}

async function main() {
  const dbPath = findDbFile();
  console.log(`Using database: ${dbPath}`);
  
  const sqlite = new Database(dbPath);
  const db = drizzle(sqlite, { schema });
  
  const now = new Date();
  
  try {
    // 1. Fetch remote data
    const remoteLocations = await fetchRemoteLocations();
    const remoteCities = await fetchRemoteCities();
    
    // 2. Sync cities first (locations depend on cities)
    console.log("\n=== Syncing Cities ===");
    
    // Get existing city IDs
    const existingCities = await db.select({ id: schema.cities.id }).from(schema.cities);
    const existingCityIds = existingCities.map(c => c.id);
    
    for (const city of remoteCities) {
      if (existingCityIds.includes(city.id)) {
        // Update existing city
        await db.update(schema.cities)
          .set({
            name: city.name,
            adcode: city.adcode,
            pinyin: city.pinyin,
            province: city.province,
            level: city.level,
            isHot: city.isHot,
            updatedAt: now,
          })
          .where(eq(schema.cities.id, city.id));
        console.log(`Updated city: ${city.name}`);
      } else {
        // Insert new city
        await db.insert(schema.cities).values({
          id: city.id,
          adcode: city.adcode,
          name: city.name,
          pinyin: city.pinyin,
          province: city.province,
          level: city.level,
          isHot: city.isHot,
          createdAt: new Date(city.createdAt),
          updatedAt: now,
        });
        console.log(`Inserted city: ${city.name}`);
      }
    }
    
    // 3. Sync locations
    console.log("\n=== Syncing Locations ===");
    
    // Get existing location IDs
    const existingLocations = await db.select({ id: schema.locations.id }).from(schema.locations);
    const existingLocationIds = existingLocations.map(l => l.id);
    
    for (const loc of remoteLocations) {
      const locationData = {
        id: loc.id,
        name: loc.name,
        slug: loc.slug,
        type: loc.type || null,
        subtitle: loc.subtitle || null,
        description: loc.description,
        address: loc.address || null,
        cityId: loc.cityId,
        cityName: loc.cityName || null,
        bestSeason: JSON.stringify(loc.bestSeason || []),
        coverImage: loc.coverImage,
        images: JSON.stringify(loc.images || []),
        coordinates: JSON.stringify(loc.coordinates || { lat: 0, lng: 0 }),
        // task #154：徒步五字段 + extra 平移同步（对齐 prod 0010/0011）
        difficulty: loc.difficulty || null,
        durationMin: loc.durationMin ?? null,
        durationMax: loc.durationMax ?? null,
        distance: loc.distance ?? null,
        elevation: loc.elevation ?? null,
        extra: loc.extra ? JSON.stringify(loc.extra) : null,
        updatedAt: now,
      };
      
      if (existingLocationIds.includes(loc.id)) {
        await db.update(schema.locations)
          .set(locationData)
          .where(eq(schema.locations.id, loc.id));
        console.log(`Updated location: ${loc.name}`);
      } else {
        await db.insert(schema.locations).values({
          ...locationData,
          createdAt: new Date(loc.createdAt),
        });
        console.log(`Inserted location: ${loc.name}`);
      }
      
      // Sync tags for this location
      if (loc.tags && loc.tags.length > 0) {
        // Remove existing tag associations
        await db.delete(schema.entityToTags)
          .where(eq(schema.entityToTags.entityId, loc.id));
        
        // Insert new tag associations
        for (const tag of loc.tags) {
          // Check if tag exists
          const existingTag = await db.select()
            .from(schema.tags)
            .where(eq(schema.tags.name, tag.name))
            .limit(1);
          
          let tagId: string;
          if (existingTag.length > 0) {
            tagId = existingTag[0].id;
          } else {
            // Create new tag
            tagId = genId("tag");
            await db.insert(schema.tags).values({
              id: tagId,
              name: tag.name,
              type: tag.type || "location",
              createdAt: now,
            });
          }
          
          // Create association
          await db.insert(schema.entityToTags).values({
            id: genId("et"),
            entityId: loc.id,
            entityType: "location",
            tagId: tagId,
            createdAt: now,
          });
        }
      }
    }
    
    console.log("\n=== Sync Complete ===");
    console.log(`Synced ${remoteCities.length} cities`);
    console.log(`Synced ${remoteLocations.length} locations`);
    
  } catch (error) {
    console.error("Sync failed:", error);
    throw error;
  }
  
  sqlite.close();
}

main().catch(console.error);