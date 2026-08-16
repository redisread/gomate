import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as schema from "../../db/schema";

const baselinePath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../db/migrations/0000_init.sql",
);
const baselineSql = readFileSync(baselinePath, "utf8").replaceAll(
  "--> statement-breakpoint",
  "",
);

/**
 * Creates the integration-test database from the production V2 baseline.
 * Tests must not maintain a third, hand-written schema copy.
 */
export function createTestDb() {
  const sqlite = new Database(":memory:");
  sqlite.pragma("foreign_keys = ON");
  sqlite.exec(baselineSql);

  const db = drizzle(sqlite, { schema });

  // better-sqlite3 has no D1 batch API. This test-only adapter preserves the
  // all-or-nothing behavior while application code remains restricted to batch().
  (db as unknown as Record<string, unknown>).batch = async (
    items: Array<{ run: () => unknown }>,
  ) => {
    sqlite.exec("BEGIN");
    try {
      const results = items.map((item) => item.run());
      sqlite.exec("COMMIT");
      return results;
    } catch (error) {
      sqlite.exec("ROLLBACK");
      throw error;
    }
  };

  return { db, sqlite };
}

export type TestDb = ReturnType<typeof createTestDb>["db"];
