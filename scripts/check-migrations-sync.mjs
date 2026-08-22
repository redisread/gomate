#!/usr/bin/env node

import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const migrationsDir = fileURLToPath(new URL("../migrations/", import.meta.url));
const entries = readdirSync(migrationsDir, { withFileTypes: true })
  .filter((entry) => entry.isFile() && /^\d{4}_.+\.sql$/u.test(entry.name))
  .map((entry) => entry.name)
  .sort();

if (entries.length === 0 || entries[0] !== "0000_init.sql") {
  throw new Error("migrations must contain an immutable 0000_init.sql baseline");
}

for (const [index, name] of entries.entries()) {
  const expectedPrefix = String(index).padStart(4, "0");
  if (!name.startsWith(`${expectedPrefix}_`)) {
    throw new Error(`migration ${name} must use sequence ${expectedPrefix}`);
  }
  const sql = readFileSync(join(migrationsDir, name), "utf8").trim();
  if (!sql) throw new Error(`migration ${name} is empty`);
}

const metaDir = join(migrationsDir, "meta");
const journal = JSON.parse(readFileSync(join(metaDir, "_journal.json"), "utf8"));
if (journal.dialect !== "sqlite") throw new Error("migration journal must use sqlite");
if ((journal.entries ?? []).length !== entries.length) {
  throw new Error("migration journal and SQL file counts differ");
}

for (const [index, name] of entries.entries()) {
  const journalEntry = journal.entries[index];
  const tag = name.replace(/\.sql$/u, "");
  if (journalEntry?.idx !== index || journalEntry?.tag !== tag) {
    throw new Error(`migration journal entry ${index} does not match ${name}`);
  }
  const snapshot = join(metaDir, `${String(index).padStart(4, "0")}_snapshot.json`);
  readFileSync(snapshot, "utf8");
}

console.log(`✓ migrations: ${entries.length} ordered SQLite migration(s)`);
