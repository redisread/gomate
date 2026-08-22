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
if (!Array.isArray(journal.entries) || journal.entries.length !== entries.length) {
  throw new Error("migration journal and SQL file counts differ");
}

function sortedUnique(values) {
  return [...new Set(values)].sort();
}

function assertSameNames(label, actual, expected, migrationName) {
  const actualNames = sortedUnique(actual);
  const expectedNames = sortedUnique(expected);
  if (JSON.stringify(actualNames) !== JSON.stringify(expectedNames)) {
    throw new Error(
      `${migrationName} ${label} differ between SQL and snapshot: ` +
        `sql=${actualNames.join(",")} snapshot=${expectedNames.join(",")}`,
    );
  }
}

function sqlObjectNames(sql, expression) {
  return [...sql.matchAll(expression)].map((match) => match[1]);
}

function snapshotIndexNames(snapshot) {
  return Object.values(snapshot.tables ?? {}).flatMap((table) =>
    Object.values(table.indexes ?? {}).map((index) => index.name),
  );
}

let previousSnapshotId = "00000000-0000-0000-0000-000000000000";
const snapshotIds = new Set();

for (const [index, name] of entries.entries()) {
  const journalEntry = journal.entries[index];
  const tag = name.replace(/\.sql$/u, "");
  if (journalEntry?.idx !== index || journalEntry?.tag !== tag) {
    throw new Error(`migration journal entry ${index} does not match ${name}`);
  }
  if (typeof journalEntry.version !== "string" || !Number.isInteger(journalEntry.when)) {
    throw new Error(`migration journal entry ${index} has invalid version/timestamp`);
  }
  if (typeof journalEntry.breakpoints !== "boolean") {
    throw new Error(`migration journal entry ${index} has invalid breakpoints flag`);
  }

  const snapshotPath = join(
    metaDir,
    `${String(index).padStart(4, "0")}_snapshot.json`,
  );
  let snapshot;
  try {
    snapshot = JSON.parse(readFileSync(snapshotPath, "utf8"));
  } catch (error) {
    throw new Error(`cannot parse snapshot for ${name}: ${String(error)}`);
  }
  if (snapshot.dialect !== "sqlite" || snapshot.version !== journalEntry.version) {
    throw new Error(`snapshot for ${name} does not match the journal dialect/version`);
  }
  if (typeof snapshot.id !== "string" || typeof snapshot.prevId !== "string") {
    throw new Error(`snapshot for ${name} is missing id/prevId`);
  }
  if (snapshot.prevId !== previousSnapshotId) {
    throw new Error(`snapshot for ${name} has a broken prevId chain`);
  }
  if (snapshotIds.has(snapshot.id)) {
    throw new Error(`snapshot id ${snapshot.id} is duplicated`);
  }
  snapshotIds.add(snapshot.id);
  previousSnapshotId = snapshot.id;

  if (!snapshot.tables || typeof snapshot.tables !== "object") {
    throw new Error(`snapshot for ${name} has no tables object`);
  }

  // The immutable baseline is the one place where the SQL file describes the
  // complete schema. Compare its table and index names directly; later
  // snapshots are incremental and are checked by the id chain above.
  if (index === 0) {
    const sql = readFileSync(join(migrationsDir, name), "utf8");
    assertSameNames(
      "table names",
      sqlObjectNames(
        sql,
        /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["`]?([\w-]+)["`]?/giu,
      ),
      Object.values(snapshot.tables).map((table) => table.name),
      name,
    );
    assertSameNames(
      "index names",
      sqlObjectNames(
        sql,
        /CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?["`]?([\w-]+)["`]?/giu,
      ),
      snapshotIndexNames(snapshot),
      name,
    );
  }
}

console.log(`✓ migrations: ${entries.length} ordered SQLite migration(s)`);
