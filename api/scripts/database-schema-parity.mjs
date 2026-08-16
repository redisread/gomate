import Database from "better-sqlite3";
import { is, SQL } from "drizzle-orm";
import {
  getTableConfig,
  SQLiteDialect,
  SQLiteTable,
} from "drizzle-orm/sqlite-core";
import * as schema from "../src/db/schema.ts";

const dialect = new SQLiteDialect();

export const triggerContract = {
  messages_summary_after_insert: {
    on: "messages",
    timing: "after",
    event: "insert",
    raises: ["MESSAGE_SUMMARY_FAILED"],
    updates: "conversations",
    body: `BEGIN
      UPDATE conversations
      SET last_message_preview = substr(NEW.content, 1, 100),
          last_message_at = NEW.created_at,
          updated_at = NEW.created_at
      WHERE id = NEW.conversation_id;
      SELECT RAISE(ABORT, 'MESSAGE_SUMMARY_FAILED') WHERE changes() <> 1;
    END`,
  },
  story_likes_count_after_delete: {
    on: "story_likes",
    timing: "after",
    event: "delete",
    raises: [],
    updates: "stories",
    body: `BEGIN
      UPDATE stories SET like_count = max(0, like_count - 1) WHERE id = OLD.story_id;
    END`,
  },
  story_likes_count_after_insert: {
    on: "story_likes",
    timing: "after",
    event: "insert",
    raises: ["STORY_LIKE_COUNT_FAILED"],
    updates: "stories",
    body: `BEGIN
      UPDATE stories SET like_count = like_count + 1 WHERE id = NEW.story_id;
      SELECT RAISE(ABORT, 'STORY_LIKE_COUNT_FAILED') WHERE changes() <> 1;
    END`,
  },
  team_members_capacity_validate_insert: {
    on: "team_members",
    timing: "before",
    event: "insert",
    raises: ["TEAM_CAPACITY_EXCEEDED"],
    body: `WHEN NEW.left_at IS NULL
    BEGIN
      SELECT RAISE(ABORT, 'TEAM_CAPACITY_EXCEEDED')
      WHERE (
        SELECT COUNT(*) FROM team_members
        WHERE team_id = NEW.team_id AND left_at IS NULL
      ) >= (
        SELECT max_participants FROM teams WHERE id = NEW.team_id
      );
    END`,
  },
  team_members_capacity_validate_reactivate: {
    on: "team_members",
    timing: "before",
    event: "update",
    updateOf: "left_at",
    raises: ["TEAM_CAPACITY_EXCEEDED"],
    body: `WHEN OLD.left_at IS NOT NULL AND NEW.left_at IS NULL
    BEGIN
      SELECT RAISE(ABORT, 'TEAM_CAPACITY_EXCEEDED')
      WHERE (
        SELECT COUNT(*) FROM team_members
        WHERE team_id = NEW.team_id AND left_at IS NULL
      ) >= (
        SELECT max_participants FROM teams WHERE id = NEW.team_id
      );
    END`,
  },
  teams_capacity_validate_update: {
    on: "teams",
    timing: "before",
    event: "update",
    updateOf: "max_participants",
    raises: ["TEAM_CAPACITY_EXCEEDED"],
    body: `WHEN NEW.max_participants < (
      SELECT COUNT(*) FROM team_members
      WHERE team_id = NEW.id AND left_at IS NULL
    )
    BEGIN
      SELECT RAISE(ABORT, 'TEAM_CAPACITY_EXCEEDED');
    END`,
  },
  sessions_active_user_insert_guard: {
    on: "sessions",
    timing: "before",
    event: "insert",
    raises: ["SESSION_USER_INACTIVE"],
    body: `WHEN NOT EXISTS (
      SELECT 1 FROM users
      WHERE id = NEW.user_id
        AND status = 'active'
        AND deleted_at IS NULL
    )
    BEGIN
      SELECT RAISE(ABORT, 'SESSION_USER_INACTIVE');
    END`,
  },
  users_auth_revoke_after_inactive: {
    on: "users",
    timing: "after",
    event: "update",
    updateOf: "status,deleted_at",
    raises: [],
    deletes: "sessions",
    body: `WHEN NEW.status <> 'active' OR NEW.deleted_at IS NOT NULL
    BEGIN
      DELETE FROM sessions WHERE user_id = NEW.id;
      DELETE FROM verifications
      WHERE identifier = 'password-reset:' || NEW.id;
    END`,
  },
};

function normalizeSql(value) {
  if (value === null || value === undefined) return null;
  let normalized = String(value)
    .toLowerCase()
    .replaceAll(/[`"]([a-z_][a-z0-9_]*)[`"]/gu, "$1")
    .replaceAll(/\b[a-z_][a-z0-9_]*\./gu, "")
    .replaceAll(/\s+/gu, "")
    .replaceAll("false", "0")
    .replaceAll("true", "1");
  while (
    normalized.startsWith("(") &&
    normalized.endsWith(")") &&
    enclosesWholeExpression(normalized)
  ) {
    normalized = normalized.slice(1, -1);
  }
  return normalized;
}

function normalizeTriggerBody(value) {
  return String(value)
    .toLowerCase()
    .replaceAll(/[`"]([a-z_][a-z0-9_]*)[`"]/gu, "$1")
    .replaceAll(/\s+/gu, "")
    .replace(/;$/u, "");
}

function enclosesWholeExpression(value) {
  let depth = 0;
  let quote = null;
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (quote) {
      if (character === quote && value[index - 1] !== "\\") quote = null;
      continue;
    }
    if (character === "'" || character === '"') {
      quote = character;
      continue;
    }
    if (character === "(") depth += 1;
    if (character === ")") depth -= 1;
    if (depth === 0 && index < value.length - 1) return false;
  }
  return depth === 0;
}

function sqlText(value) {
  return value instanceof SQL ? dialect.sqlToQuery(value).sql : value;
}

function defaultText(column) {
  if (column.default instanceof SQL) {
    return dialect.sqlToQuery(column.default).sql;
  }
  const value = column.default;
  if (value === undefined) return null;
  if (typeof value === "string") return `'${value.replaceAll("'", "''")}'`;
  if (typeof value === "boolean") return value ? "1" : "0";
  return String(value);
}

function extractChecks(createSql) {
  const checks = new Map();
  const pattern = /(?:CONSTRAINT\s+[`"]([^`"]+)[`"]\s+)?CHECK\s*\(/giu;
  let anonymousIndex = 0;
  for (const match of createSql.matchAll(pattern)) {
    const start = match.index + match[0].length;
    let depth = 1;
    let quote = null;
    let end = start;
    for (; end < createSql.length && depth > 0; end += 1) {
      const character = createSql[end];
      if (quote) {
        if (character === quote && createSql[end - 1] !== "\\") quote = null;
        continue;
      }
      if (character === "'") quote = character;
      else if (character === "(") depth += 1;
      else if (character === ")") depth -= 1;
    }
    const name = match[1] ?? `#anonymous-${(anonymousIndex += 1)}`;
    checks.set(name, normalizeSql(createSql.slice(start, end - 1)));
  }
  return checks;
}

function mapsEqual(actual, expected) {
  return (
    JSON.stringify([...actual].sort()) === JSON.stringify([...expected].sort())
  );
}

function pushMismatch(errors, label, actual, expected) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    errors.push(
      `${label}: schema=${JSON.stringify(expected)} baseline=${JSON.stringify(actual)}`,
    );
  }
}

function schemaTables() {
  return Object.values(schema)
    .filter((value) => is(value, SQLiteTable))
    .map((table) => ({ table, config: getTableConfig(table) }))
    .sort((left, right) => left.config.name.localeCompare(right.config.name));
}

function compareTable(db, table, config, errors) {
  const tableName = config.name;
  const actualColumns = db.prepare(`PRAGMA table_info('${tableName}')`).all();
  const expectedPrimaryKey = new Map();
  for (const column of config.columns) {
    if (column.primary) expectedPrimaryKey.set(column.name, 1);
  }
  for (const primaryKey of config.primaryKeys) {
    primaryKey.columns.forEach((column, index) => {
      expectedPrimaryKey.set(column.name, index + 1);
    });
  }
  const expectedColumns = config.columns.map((column) => ({
    name: column.name,
    type: column.getSQLType().toUpperCase(),
    notnull: column.notNull ? 1 : 0,
    default: normalizeSql(defaultText(column)),
    pk: expectedPrimaryKey.get(column.name) ?? 0,
  }));
  const comparableColumns = actualColumns.map((column) => ({
    name: column.name,
    type: String(column.type).toUpperCase(),
    notnull: column.notnull,
    default: normalizeSql(column.dflt_value),
    pk: column.pk,
  }));
  pushMismatch(
    errors,
    `${tableName} columns`,
    comparableColumns,
    expectedColumns,
  );

  const expectedFks = config.foreignKeys
    .map((foreignKey) => {
      const reference = foreignKey.reference();
      return {
        from: reference.columns.map((column) => column.name),
        table: getTableConfig(reference.foreignTable).name,
        to: reference.foreignColumns.map((column) => column.name),
        onUpdate: (foreignKey.onUpdate ?? "no action").toUpperCase(),
        onDelete: (foreignKey.onDelete ?? "no action").toUpperCase(),
      };
    })
    .sort((left, right) => left.from.join().localeCompare(right.from.join()));
  const groupedFks = new Map();
  for (const row of db
    .prepare(`PRAGMA foreign_key_list('${tableName}')`)
    .all()) {
    const group = groupedFks.get(row.id) ?? {
      from: [],
      table: row.table,
      to: [],
      onUpdate: String(row.on_update).toUpperCase(),
      onDelete: String(row.on_delete).toUpperCase(),
    };
    group.from[row.seq] = row.from;
    group.to[row.seq] = row.to;
    groupedFks.set(row.id, group);
  }
  const actualFks = [...groupedFks.values()].sort((left, right) =>
    left.from.join().localeCompare(right.from.join()),
  );
  pushMismatch(errors, `${tableName} foreign keys`, actualFks, expectedFks);

  const actualIndexes = new Map();
  for (const indexRow of db
    .prepare(`PRAGMA index_list('${tableName}')`)
    .all()) {
    if (indexRow.origin === "pk") continue;
    const indexSql = db
      .prepare(
        "SELECT sql FROM sqlite_master WHERE type = 'index' AND name = ?",
      )
      .pluck()
      .get(indexRow.name);
    const where = indexSql?.match(/\bWHERE\s+([\s\S]+)$/iu)?.[1] ?? null;
    const columns = db
      .prepare(`PRAGMA index_xinfo('${indexRow.name}')`)
      .all()
      .filter((row) => row.key === 1)
      .map((row) => ({ name: row.name, desc: row.desc }));
    actualIndexes.set(indexRow.name, {
      unique: Boolean(indexRow.unique),
      partial: Boolean(indexRow.partial),
      columns,
      where: normalizeSql(where),
    });
  }
  const expectedIndexes = new Map(
    config.indexes.map((index) => [
      index.config.name,
      {
        unique: Boolean(index.config.unique),
        partial: Boolean(index.config.where),
        columns: index.config.columns.map((column) => ({
          name: column.name,
          desc: column.asc === false ? 1 : 0,
        })),
        where: normalizeSql(sqlText(index.config.where)),
      },
    ]),
  );
  if (!mapsEqual(actualIndexes, expectedIndexes)) {
    errors.push(
      `${tableName} indexes: schema=${JSON.stringify([...expectedIndexes])} baseline=${JSON.stringify([...actualIndexes])}`,
    );
  }

  const createSql = db
    .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?")
    .pluck()
    .get(tableName);
  const actualChecks = extractChecks(createSql);
  const expectedChecks = new Map(
    config.checks.map((check) => [
      check.name,
      normalizeSql(sqlText(check.value)),
    ]),
  );
  if (!mapsEqual(actualChecks, expectedChecks)) {
    errors.push(
      `${tableName} checks: schema=${JSON.stringify([...expectedChecks])} baseline=${JSON.stringify([...actualChecks])}`,
    );
  }
}

function compareTriggers(db, errors) {
  const rows = db
    .prepare(
      "SELECT name, tbl_name AS tableName, sql FROM sqlite_master WHERE type = 'trigger' ORDER BY name",
    )
    .all();
  pushMismatch(
    errors,
    "trigger names",
    rows.map(({ name }) => name),
    Object.keys(triggerContract).sort(),
  );
  for (const row of rows) {
    const expected = triggerContract[row.name];
    if (!expected) continue;
    const header = row.sql.match(
      /CREATE\s+TRIGGER(?:\s+IF\s+NOT\s+EXISTS)?\s+[`"]?[^\s`"]+[`"]?\s+(BEFORE|AFTER)\s+(INSERT|DELETE|UPDATE)(?:\s+OF\s+(.+?))?\s+ON\s+[`"]?([^\s`"]+)[`"]?/iu,
    );
    const actual = {
      on: row.tableName,
      timing: header?.[1]?.toLowerCase(),
      event: header?.[2]?.toLowerCase(),
      ...(header?.[3]
        ? {
            updateOf: header[3].replaceAll(/[`"\s]+/gu, "").toLowerCase(),
          }
        : {}),
      raises: [
        ...row.sql.matchAll(/RAISE\s*\(\s*ABORT\s*,\s*'([^']+)'\s*\)/giu),
      ].map((match) => match[1]),
      ...(expected.updates
        ? { updates: row.sql.match(/\bUPDATE\s+[`"]?([^\s`"]+)/iu)?.[1] }
        : {}),
      ...(expected.deletes
        ? {
            deletes: row.sql.match(/\bDELETE\s+FROM\s+[`"]?([^\s`"]+)/iu)?.[1],
          }
        : {}),
      body: normalizeTriggerBody(
        row.sql.slice(row.sql.search(/\b(?:WHEN|BEGIN)\b/iu)),
      ),
    };
    pushMismatch(errors, `${row.name} trigger`, actual, {
      ...expected,
      body: normalizeTriggerBody(expected.body),
    });
  }
}

export function compareSchemaToBaseline(baselineSql) {
  const errors = [];
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  try {
    db.exec(baselineSql.replaceAll("--> statement-breakpoint", ""));
    const tables = schemaTables();
    const actualNames = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
      )
      .pluck()
      .all();
    pushMismatch(
      errors,
      "table names",
      actualNames,
      tables.map(({ config }) => config.name),
    );
    for (const { table, config } of tables)
      compareTable(db, table, config, errors);
    compareTriggers(db, errors);
  } catch (error) {
    errors.push(
      `baseline replay failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  } finally {
    db.close();
  }
  return errors;
}
