import { afterEach, describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  apiRoot,
  createV2Database,
  migrationChainSql,
  migrationsDir,
} from "./database-v2-test-helpers.mjs";
import { compareSchemaToBaseline } from "./database-schema-parity.mjs";

const TABLE_COLUMNS = {
  accounts: [
    "id",
    "user_id",
    "account_id",
    "provider_id",
    "access_token",
    "refresh_token",
    "access_token_expires_at",
    "refresh_token_expires_at",
    "scope",
    "id_token",
    "password",
    "expires_at",
    "created_at",
    "updated_at",
  ],
  conversations: [
    "id",
    "team_id",
    "member_user_id",
    "initiated_by_user_id",
    "last_message_preview",
    "last_message_at",
    "created_at",
    "updated_at",
  ],
  location_tags: ["location_id", "tag_id", "created_at"],
  locations: [
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
  ],
  messages: [
    "id",
    "conversation_id",
    "sender_id",
    "content",
    "read_at",
    "created_at",
  ],
  region: [
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
  ],
  sessions: [
    "id",
    "user_id",
    "token",
    "expires_at",
    "ip_address",
    "user_agent",
    "created_at",
    "updated_at",
  ],
  stories: [
    "id",
    "author_id",
    "team_id",
    "location_id",
    "title",
    "summary",
    "content",
    "images",
    "status",
    "view_count",
    "like_count",
    "created_at",
    "updated_at",
  ],
  story_likes: ["user_id", "story_id", "created_at"],
  story_tags: ["story_id", "tag_id", "created_at"],
  tags: ["id", "name", "slug", "created_at"],
  team_join_requests: [
    "id",
    "team_id",
    "user_id",
    "status",
    "message",
    "decided_by_user_id",
    "decided_at",
    "created_at",
    "updated_at",
  ],
  team_members: ["team_id", "user_id", "joined_at", "left_at"],
  team_tags: ["team_id", "tag_id", "created_at"],
  teams: [
    "id",
    "location_id",
    "leader_id",
    "activity_type",
    "title",
    "description",
    "start_at",
    "end_at",
    "max_participants",
    "requirements",
    "recruitment_status",
    "formed_at",
    "cancelled_at",
    "checklist",
    "created_at",
    "updated_at",
  ],
  user_location_favorites: ["user_id", "location_id", "created_at"],
  user_story_favorites: ["user_id", "story_id", "created_at"],
  users: [
    "id",
    "name",
    "nickname",
    "email",
    "email_verified",
    "image",
    "bio",
    "gender",
    "birthday",
    "role",
    "status",
    "extra",
    "created_at",
    "updated_at",
    "deleted_at",
  ],
  verifications: [
    "id",
    "identifier",
    "value",
    "expires_at",
    "created_at",
    "updated_at",
  ],
};

const NULLABLE_COLUMNS = {
  accounts: [
    "access_token",
    "refresh_token",
    "access_token_expires_at",
    "refresh_token_expires_at",
    "scope",
    "id_token",
    "password",
    "expires_at",
  ],
  conversations: ["last_message_preview", "last_message_at"],
  locations: ["subtitle", "address", "created_by_user_id"],
  messages: ["read_at"],
  region: [
    "parent_id",
    "name_en",
    "code",
    "timezone",
    "center_latitude",
    "center_longitude",
  ],
  sessions: ["ip_address", "user_agent"],
  stories: ["team_id", "location_id", "title", "summary"],
  team_join_requests: ["message", "decided_by_user_id", "decided_at"],
  team_members: ["left_at"],
  teams: ["description", "formed_at", "cancelled_at", "checklist"],
  users: ["nickname", "image", "bio", "gender", "birthday", "deleted_at"],
};

const INTEGER_COLUMNS = {
  accounts: [
    "access_token_expires_at",
    "refresh_token_expires_at",
    "expires_at",
    "created_at",
    "updated_at",
  ],
  conversations: ["last_message_at", "created_at", "updated_at"],
  location_tags: ["created_at"],
  locations: ["created_at", "updated_at"],
  messages: ["read_at", "created_at"],
  region: [
    "service_enabled",
    "is_hot",
    "sort_order",
    "created_at",
    "updated_at",
  ],
  sessions: ["expires_at", "created_at", "updated_at"],
  stories: ["view_count", "like_count", "created_at", "updated_at"],
  story_likes: ["created_at"],
  story_tags: ["created_at"],
  tags: ["created_at"],
  team_join_requests: ["decided_at", "created_at", "updated_at"],
  team_members: ["joined_at", "left_at"],
  team_tags: ["created_at"],
  teams: [
    "start_at",
    "end_at",
    "max_participants",
    "formed_at",
    "cancelled_at",
    "created_at",
    "updated_at",
  ],
  user_location_favorites: ["created_at"],
  user_story_favorites: ["created_at"],
  users: [
    "email_verified",
    "birthday",
    "created_at",
    "updated_at",
    "deleted_at",
  ],
  verifications: ["expires_at", "created_at", "updated_at"],
};

const REAL_COLUMNS = {
  locations: ["latitude", "longitude"],
  region: ["center_latitude", "center_longitude"],
};

const PRIMARY_KEYS = Object.fromEntries(
  Object.keys(TABLE_COLUMNS).map((table) => [table, ["id"]]),
);
Object.assign(PRIMARY_KEYS, {
  location_tags: ["location_id", "tag_id"],
  story_likes: ["user_id", "story_id"],
  story_tags: ["story_id", "tag_id"],
  team_members: ["team_id", "user_id"],
  team_tags: ["team_id", "tag_id"],
  user_location_favorites: ["user_id", "location_id"],
  user_story_favorites: ["user_id", "story_id"],
});

const NOW = "unixepoch()*1000";
const DEFAULTS = {
  accounts: { created_at: NOW, updated_at: NOW },
  conversations: { created_at: NOW, updated_at: NOW },
  location_tags: { created_at: NOW },
  locations: {
    supported_activity_types: "'[]'",
    status: "'published'",
    images: "'[]'",
    extra: "'{}'",
    created_at: NOW,
    updated_at: NOW,
  },
  messages: { created_at: NOW },
  region: {
    service_enabled: "0",
    is_hot: "0",
    sort_order: "0",
    created_at: NOW,
    updated_at: NOW,
  },
  sessions: { created_at: NOW, updated_at: NOW },
  stories: {
    images: "'[]'",
    status: "'published'",
    view_count: "0",
    like_count: "0",
    created_at: NOW,
    updated_at: NOW,
  },
  story_likes: { created_at: NOW },
  story_tags: { created_at: NOW },
  tags: { created_at: NOW },
  team_join_requests: { status: "'pending'", created_at: NOW, updated_at: NOW },
  team_members: { joined_at: NOW },
  team_tags: { created_at: NOW },
  teams: {
    max_participants: "9",
    requirements: "'[]'",
    recruitment_status: "'open'",
    created_at: NOW,
    updated_at: NOW,
  },
  user_location_favorites: { created_at: NOW },
  user_story_favorites: { created_at: NOW },
  users: {
    email_verified: "0",
    role: "'user'",
    status: "'active'",
    extra: "'{}'",
    created_at: NOW,
    updated_at: NOW,
  },
  verifications: { created_at: NOW, updated_at: NOW },
};

const FOREIGN_KEYS = {
  accounts: ["user_id->users.id:CASCADE"],
  conversations: [
    "initiated_by_user_id->users.id:RESTRICT",
    "member_user_id->users.id:CASCADE",
    "team_id->teams.id:CASCADE",
  ],
  location_tags: [
    "location_id->locations.id:CASCADE",
    "tag_id->tags.id:CASCADE",
  ],
  locations: [
    "created_by_user_id->users.id:SET NULL",
    "region_id->region.id:RESTRICT",
  ],
  messages: [
    "conversation_id->conversations.id:CASCADE",
    "sender_id->users.id:RESTRICT",
  ],
  region: ["parent_id->region.id:RESTRICT"],
  sessions: ["user_id->users.id:CASCADE"],
  stories: [
    "author_id->users.id:CASCADE",
    "location_id->locations.id:SET NULL",
    "team_id->teams.id:RESTRICT",
  ],
  story_likes: ["story_id->stories.id:CASCADE", "user_id->users.id:CASCADE"],
  story_tags: ["story_id->stories.id:CASCADE", "tag_id->tags.id:CASCADE"],
  team_join_requests: [
    "decided_by_user_id->users.id:SET NULL",
    "team_id->teams.id:CASCADE",
    "user_id->users.id:CASCADE",
  ],
  team_members: ["team_id->teams.id:CASCADE", "user_id->users.id:CASCADE"],
  team_tags: ["tag_id->tags.id:CASCADE", "team_id->teams.id:CASCADE"],
  teams: ["leader_id->users.id:RESTRICT", "location_id->locations.id:RESTRICT"],
  user_location_favorites: [
    "location_id->locations.id:CASCADE",
    "user_id->users.id:CASCADE",
  ],
  user_story_favorites: [
    "story_id->stories.id:CASCADE",
    "user_id->users.id:CASCADE",
  ],
};

const INDEXES = {
  accounts_provider_unique: "accounts|1|0|provider_id,account_id",
  accounts_user_idx: "accounts|0|0|user_id",
  conversations_member_inbox_idx:
    "conversations|0|0|member_user_id,last_message_at,id",
  conversations_team_inbox_idx: "conversations|0|0|team_id,last_message_at,id",
  conversations_team_member_unique: "conversations|1|0|team_id,member_user_id",
  location_tags_tag_idx: "location_tags|0|0|tag_id,location_id",
  locations_region_feed_idx: "locations|0|0|region_id,status,created_at,id",
  locations_region_slug_unique: "locations|1|0|region_id,slug",
  messages_conversation_cursor_idx:
    "messages|0|0|conversation_id,created_at,id",
  messages_sender_idx: "messages|0|0|sender_id,created_at,id",
  region_country_code_unique: "region|1|1|country_code,code",
  region_country_slug_unique: "region|1|0|country_code,slug",
  region_hierarchy_idx: "region|0|0|country_code,parent_id,level,sort_order",
  region_service_picker_idx:
    "region|0|0|country_code,service_enabled,is_hot,sort_order,id",
  sessions_expires_idx: "sessions|0|0|expires_at",
  sessions_token_unique: "sessions|1|0|token",
  sessions_user_idx: "sessions|0|0|user_id",
  stories_author_idx: "stories|0|0|author_id,created_at,id",
  stories_feed_idx: "stories|0|0|status,created_at,id",
  stories_location_feed_idx: "stories|0|0|location_id,status,created_at,id",
  stories_team_feed_idx: "stories|0|0|team_id,status,created_at,id",
  story_likes_story_idx: "story_likes|0|0|story_id,created_at,user_id",
  story_tags_tag_idx: "story_tags|0|0|tag_id,story_id",
  tags_slug_unique: "tags|1|0|slug",
  team_join_requests_one_pending_unique:
    "team_join_requests|1|1|team_id,user_id",
  team_join_requests_team_status_idx:
    "team_join_requests|0|0|team_id,status,created_at,id",
  team_join_requests_user_created_idx:
    "team_join_requests|0|0|user_id,created_at,id",
  team_members_active_idx: "team_members|0|0|team_id,left_at,joined_at,user_id",
  team_members_user_idx: "team_members|0|0|user_id,left_at,joined_at,team_id",
  team_tags_tag_idx: "team_tags|0|0|tag_id,team_id",
  teams_end_idx: "teams|0|0|cancelled_at,end_at,id",
  teams_leader_created_idx: "teams|0|0|leader_id,created_at,id",
  teams_location_activity_feed_idx:
    "teams|0|0|location_id,activity_type,recruitment_status,start_at,id",
  teams_location_start_idx: "teams|0|0|location_id,start_at,id",
  user_location_favorites_location_idx:
    "user_location_favorites|0|0|location_id,created_at,user_id",
  user_location_favorites_user_idx:
    "user_location_favorites|0|0|user_id,created_at,location_id",
  user_story_favorites_story_idx:
    "user_story_favorites|0|0|story_id,created_at,user_id",
  user_story_favorites_user_idx:
    "user_story_favorites|0|0|user_id,created_at,story_id",
  users_email_unique: "users|1|0|email",
  users_status_created_idx: "users|0|0|status,created_at,id",
  verifications_expires_idx: "verifications|0|0|expires_at",
  verifications_identifier_unique: "verifications|1|0|identifier",
};

const CHECKS = [
  "locations_extra_json_check",
  "locations_images_json_check",
  "locations_latitude_check",
  "locations_longitude_check",
  "locations_published_activity_check",
  "locations_status_check",
  "locations_supported_activity_types_json_check",
  "messages_content_check",
  "region_center_latitude_check",
  "region_center_longitude_check",
  "region_country_code_check",
  "region_is_hot_check",
  "region_level_check",
  "region_parent_not_self_check",
  "region_service_enabled_check",
  "region_service_shape_check",
  "stories_content_check",
  "stories_images_json_check",
  "stories_like_count_check",
  "stories_normal_title_check",
  "stories_status_check",
  "stories_view_count_check",
  "team_join_requests_decision_check",
  "team_join_requests_status_check",
  "teams_activity_type_check",
  "teams_capacity_check",
  "teams_checklist_json_check",
  "teams_recruitment_status_check",
  "teams_requirements_json_check",
  "teams_time_range_check",
  "users_email_verified_check",
  "users_extra_json_check",
  "users_gender_check",
  "users_role_check",
  "users_status_check",
].sort();

const TRIGGERS = [
  "messages_summary_after_insert",
  "sessions_active_user_insert_guard",
  "story_likes_count_after_delete",
  "story_likes_count_after_insert",
  "team_members_capacity_validate_insert",
  "team_members_capacity_validate_reactivate",
  "team_members_leader_validate_insert",
  "team_members_leader_validate_reactivate",
  "teams_capacity_validate_update",
  "teams_leader_validate_update",
  "users_auth_revoke_after_inactive",
  "users_deleted_state_validate_insert",
  "users_deleted_state_validate_update",
].sort();

function normalizeDefault(value) {
  if (value === null) return null;
  let normalized = String(value).replaceAll(/\s+/g, "");
  while (normalized.startsWith("(") && normalized.endsWith(")")) {
    normalized = normalized.slice(1, -1);
  }
  return normalized;
}

describe("database design v2 structural contract", () => {
  let db;

  afterEach(() => db?.close());

  it("uses an immutable baseline followed by the ordered optimization migrations", () => {
    expect(
      readdirSync(migrationsDir)
        .filter((name) => name.endsWith(".sql"))
        .sort(),
    ).toEqual([
      "0000_init.sql",
      "0001_account_membership_guards.sql",
      "0002_remove_team_member_role.sql",
    ]);
    const metaDir = join(migrationsDir, "meta");
    expect(
      readdirSync(metaDir)
        .filter((name) => name.endsWith("_snapshot.json"))
        .sort(),
    ).toEqual([
      "0000_snapshot.json",
      "0001_snapshot.json",
      "0002_snapshot.json",
    ]);

    const journal = JSON.parse(
      readFileSync(join(metaDir, "_journal.json"), "utf8"),
    );
    expect(journal.entries).toEqual([
      expect.objectContaining({ idx: 0, tag: "0000_init", breakpoints: true }),
      expect.objectContaining({
        idx: 1,
        tag: "0001_account_membership_guards",
        breakpoints: true,
      }),
      expect.objectContaining({
        idx: 2,
        tag: "0002_remove_team_member_role",
        breakpoints: true,
      }),
    ]);

    const snapshot = JSON.parse(
      readFileSync(join(metaDir, "0002_snapshot.json"), "utf8"),
    );
    expect(Object.keys(snapshot.tables).sort()).toEqual(
      Object.keys(TABLE_COLUMNS).sort(),
    );
    for (const [table, columns] of Object.entries(TABLE_COLUMNS)) {
      expect(Object.keys(snapshot.tables[table].columns)).toEqual(columns);
    }
  });

  it("replays the full chain and exposes exactly the 19-table, 13-trigger model", () => {
    db = createV2Database();
    const tables = db
      .prepare(
        `
      SELECT name FROM sqlite_master
      WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `,
      )
      .all()
      .map((row) => row.name);
    const triggers = db
      .prepare(
        `
      SELECT name FROM sqlite_master WHERE type = 'trigger' ORDER BY name
    `,
      )
      .all()
      .map((row) => row.name);

    expect(tables).toEqual(Object.keys(TABLE_COLUMNS).sort());
    expect(triggers).toEqual(TRIGGERS);
    expect(db.pragma("foreign_key_check")).toEqual([]);
  });

  it("matches every column name, type, nullability, default, and primary-key order", () => {
    db = createV2Database();

    for (const [table, expectedNames] of Object.entries(TABLE_COLUMNS)) {
      const columns = db.prepare(`PRAGMA table_info('${table}')`).all();
      expect(
        columns.map((column) => column.name),
        table,
      ).toEqual(expectedNames);

      const nullable = new Set(NULLABLE_COLUMNS[table] ?? []);
      const integers = new Set(INTEGER_COLUMNS[table] ?? []);
      const reals = new Set(REAL_COLUMNS[table] ?? []);
      const defaults = DEFAULTS[table] ?? {};
      for (const column of columns) {
        const expectedType = reals.has(column.name)
          ? "REAL"
          : integers.has(column.name)
            ? "INTEGER"
            : "TEXT";
        expect(column.type, `${table}.${column.name} type`).toBe(expectedType);
        expect(column.notnull, `${table}.${column.name} nullability`).toBe(
          nullable.has(column.name) ? 0 : 1,
        );
        expect(
          normalizeDefault(column.dflt_value),
          `${table}.${column.name} default`,
        ).toBe(defaults[column.name] ?? null);
      }

      const primaryKey = columns
        .filter((column) => column.pk > 0)
        .sort((a, b) => a.pk - b.pk)
        .map((column) => column.name);
      expect(primaryKey, `${table} primary key`).toEqual(PRIMARY_KEYS[table]);
    }
  });

  it("matches every foreign key and delete action", () => {
    db = createV2Database();
    for (const table of Object.keys(TABLE_COLUMNS)) {
      const actual = db
        .prepare(`PRAGMA foreign_key_list('${table}')`)
        .all()
        .map(
          (fk) =>
            `${fk.from}->${fk.table}.${fk.to}:${String(fk.on_delete).toUpperCase()}`,
        )
        .sort();
      expect(actual, `${table} foreign keys`).toEqual(
        (FOREIGN_KEYS[table] ?? []).sort(),
      );
    }
  });

  it("matches every named index including order, uniqueness, and partial predicates", () => {
    db = createV2Database();
    const actual = {};
    for (const table of Object.keys(TABLE_COLUMNS)) {
      for (const row of db.prepare(`PRAGMA index_list('${table}')`).all()) {
        if (row.origin === "pk") continue;
        const columns = db
          .prepare(`PRAGMA index_info('${row.name}')`)
          .all()
          .map((column) => column.name)
          .join(",");
        actual[row.name] = `${table}|${row.unique}|${row.partial}|${columns}`;
      }
    }
    expect(actual).toEqual(INDEXES);

    const partialSql = db
      .prepare(
        `
      SELECT name, sql FROM sqlite_master
      WHERE name IN ('region_country_code_unique', 'team_join_requests_one_pending_unique')
      ORDER BY name
    `,
      )
      .all();
    expect(partialSql[0].sql).toMatch(/WHERE `code` is not null$/iu);
    expect(partialSql[1].sql).toMatch(/WHERE `status` = 'pending'$/iu);
  });

  it("contains exactly the documented named CHECK constraints", () => {
    db = createV2Database();
    const checks = db
      .prepare(
        `
      SELECT sql FROM sqlite_master WHERE type = 'table' AND sql IS NOT NULL
    `,
      )
      .all()
      .flatMap((row) =>
        [...row.sql.matchAll(/CONSTRAINT [`"]([^`"]+)[`"] CHECK/giu)].map(
          (match) => match[1],
        ),
      )
      .sort();
    expect(checks).toEqual(CHECKS);
  });

  it("keeps schema.ts limited to the same 19 business tables", () => {
    const schema = readFileSync(
      join(apiRoot, "src", "db", "schema.ts"),
      "utf8",
    );
    const names = [...schema.matchAll(/sqliteTable\(\s*["'`]([^"'`]+)["'`]/gs)]
      .map((match) => match[1])
      .sort();
    expect(names).toEqual(Object.keys(TABLE_COLUMNS).sort());
    expect(schema).not.toMatch(
      /\b(?:apikey|cities|entity_to_tags|user_favorites|password_resets|activity_posts|image_caches|share_events)\b/u,
    );
  });

  it("matches Drizzle and baseline semantics, not only object names", () => {
    expect(compareSchemaToBaseline(migrationChainSql)).toEqual([]);

    const drifts = [
      migrationChainSql.replace(
        "`name` text NOT NULL",
        "`name` integer NOT NULL",
      ),
      migrationChainSql.replace(
        "`users_status_created_idx` ON `users` (`status`, `created_at`, `id`)",
        "`users_status_created_idx` ON `users` (`created_at`, `status`, `id`)",
      ),
      migrationChainSql.replace(
        "`users_role_check` CHECK (`role` in ('user', 'admin'))",
        "`users_role_check` CHECK (`role` = 'user')",
      ),
      migrationChainSql.replace(
        "REFERENCES `users` (`id`) ON UPDATE no action ON DELETE cascade",
        "REFERENCES `users` (`id`) ON UPDATE no action ON DELETE restrict",
      ),
      migrationChainSql.replaceAll(
        "BEFORE UPDATE OF `left_at` ON `team_members`",
        "BEFORE UPDATE OF `role` ON `team_members`",
      ),
      migrationChainSql.replace(
        "RAISE(ABORT, 'MESSAGE_SUMMARY_FAILED')",
        "RAISE(ABORT, 'RAW_SQL_FAILURE')",
      ),
    ];
    for (const drifted of drifts) {
      expect(drifted).not.toBe(migrationChainSql);
      expect(compareSchemaToBaseline(drifted)).not.toEqual([]);
    }
  });
});
