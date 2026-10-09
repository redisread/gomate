import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../../../migrations/0009_remove_location_hiking_guides.sql", import.meta.url),
  "utf8",
);

describe("location guide migration", () => {
  it("removes guides while preserving seasons, facilities, and unrelated data", () => {
    const db = new DatabaseSync(":memory:");
    try {
      db.exec("CREATE TABLE locations (id TEXT PRIMARY KEY, extra TEXT NOT NULL)");
      const extra = {
        hiking: {
          difficulty: "hard", duration_min: 120, duration_max: 180,
          distance_km: 5, elevation_gain_m: 700, overview: "old guide",
          tips: ["tip"], warnings: ["warning"], gear_essential: ["shoes"],
          gear_optional: ["pole"], best_seasons: ["autumn"],
        },
        facilities: ["parking"], other: { preserved: true },
      };
      db.prepare("INSERT INTO locations VALUES (?, ?)").run("guide", JSON.stringify(extra));
      db.prepare("INSERT INTO locations VALUES (?, ?)").run("plain", JSON.stringify({ facilities: ["food"] }));
      db.exec(migration);
      db.exec(migration);
      const rows = db.prepare("SELECT extra FROM locations ORDER BY id").all();
      expect(JSON.parse(rows[0].extra as string)).toEqual({
        hiking: { best_seasons: ["autumn"] },
        facilities: ["parking"], other: { preserved: true },
      });
      expect(JSON.parse(rows[1].extra as string)).toEqual({ facilities: ["food"] });
    } finally {
      db.close();
    }
  });
});
