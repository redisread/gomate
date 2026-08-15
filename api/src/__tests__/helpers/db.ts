import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "../../db/schema";

/**
 * 创建内存 SQLite 测试数据库
 * 包含所有表结构，不依赖外部服务
 */
export function createTestDb() {
  const sqlite = new Database(":memory:");

  // 创建所有表
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      nickname TEXT,
      email TEXT NOT NULL UNIQUE,
      email_verified INTEGER NOT NULL DEFAULT 0,
      image TEXT,
      bio TEXT,
      gender TEXT,
      birthday INTEGER,
      level TEXT NOT NULL DEFAULT 'beginner',
      completed_hikes INTEGER DEFAULT 0,
      wechat TEXT,
      role TEXT NOT NULL DEFAULT 'user',
      status TEXT NOT NULL DEFAULT 'active',
      extra TEXT,
      city TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      deleted_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT NOT NULL UNIQUE,
      expires_at INTEGER NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      account_id TEXT NOT NULL,
      provider_id TEXT NOT NULL,
      access_token TEXT,
      refresh_token TEXT,
      access_token_expires_at INTEGER,
      refresh_token_expires_at INTEGER,
      scope TEXT,
      id_token TEXT,
      password TEXT,
      expires_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      UNIQUE(provider_id, account_id)
    );

    CREATE TABLE IF NOT EXISTS verifications (
      id TEXT PRIMARY KEY,
      identifier TEXT NOT NULL UNIQUE,
      value TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cities (
      id TEXT PRIMARY KEY,
      adcode TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      pinyin TEXT,
      province TEXT,
      level TEXT,
      is_hot INTEGER NOT NULL DEFAULT 0,
      parent_id TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS locations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      subtitle TEXT,
      description TEXT NOT NULL,
      address TEXT,
      type TEXT,
      city_id TEXT NOT NULL REFERENCES cities(id) ON DELETE RESTRICT,
      city_name TEXT,
      difficulty TEXT,
      duration_min INTEGER,
      duration_max INTEGER,
      distance REAL,
      elevation INTEGER,
      best_season TEXT NOT NULL,
      cover_image TEXT NOT NULL,
      images TEXT NOT NULL,
      coordinates TEXT NOT NULL,
      parking_available INTEGER,
      parking_info TEXT,
      gear_essential TEXT,
      gear_optional TEXT,
      extra TEXT,
      actor_api_key_id TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS entity_to_tags (
      id TEXT PRIMARY KEY,
      entity_id TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      created_at INTEGER NOT NULL,
      UNIQUE(entity_id, entity_type, tag_id)
    );

    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      location_id TEXT NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
      leader_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      title TEXT NOT NULL,
      description TEXT,
      start_time INTEGER NOT NULL,
      end_time INTEGER NOT NULL,
      duration_min INTEGER NOT NULL DEFAULT 240,
      max_members INTEGER NOT NULL DEFAULT 10,
      requirements TEXT,
      icon TEXT NOT NULL DEFAULT '⛰️',
      status TEXT NOT NULL DEFAULT 'recruiting',
      -- task #163：Team「行动本」checklist（TEXT JSON，nullable）
      checklist TEXT,
      actor_api_key_id TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS team_members (
      id TEXT PRIMARY KEY,
      team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'pending',
      joined_at INTEGER,
      status_updated_at INTEGER,
      extra TEXT,
      actor_api_key_id TEXT,
      created_at INTEGER NOT NULL,
      UNIQUE(team_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS password_resets (
      id TEXT PRIMARY KEY,
      token TEXT NOT NULL UNIQUE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      email TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      used_at INTEGER,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_favorites (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      UNIQUE(user_id, entity_type, entity_id)
    );

    CREATE TABLE IF NOT EXISTS stories (
      id TEXT PRIMARY KEY,
      author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      content TEXT NOT NULL,
      cover_image TEXT,
      location_id TEXT REFERENCES locations(id) ON DELETE SET NULL,
      status TEXT NOT NULL DEFAULT 'published',
      view_count INTEGER NOT NULL DEFAULT 0,
      like_count INTEGER NOT NULL DEFAULT 0,
      actor_api_key_id TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_story_likes (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      story_id TEXT NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      PRIMARY KEY (user_id, story_id)
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id),
      leader_id TEXT NOT NULL REFERENCES users(id),
      initiator_id TEXT NOT NULL REFERENCES users(id),
      last_message_content TEXT,
      last_message_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      sender_id TEXT NOT NULL REFERENCES users(id),
      content TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      read_at INTEGER,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS activity_posts (
      id TEXT PRIMARY KEY,
      team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      location_id TEXT REFERENCES locations(id) ON DELETE SET NULL,
      author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      images TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'visible',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TRIGGER IF NOT EXISTS user_story_likes_count_after_insert
    AFTER INSERT ON user_story_likes
    BEGIN
      UPDATE stories
      SET like_count = COALESCE(like_count, 0) + 1,
          updated_at = (unixepoch() * 1000)
      WHERE id = NEW.story_id;
    END;

    CREATE TRIGGER IF NOT EXISTS user_story_likes_count_after_delete
    AFTER DELETE ON user_story_likes
    BEGIN
      UPDATE stories
      SET like_count = MAX(0, COALESCE(like_count, 0) - 1),
          updated_at = (unixepoch() * 1000)
      WHERE id = OLD.story_id;
    END;

    CREATE TRIGGER IF NOT EXISTS locations_city_name_after_insert
    AFTER INSERT ON locations
    BEGIN
      UPDATE locations
      SET city_name = (SELECT name FROM cities WHERE id = NEW.city_id)
      WHERE id = NEW.id;
    END;

    CREATE TRIGGER IF NOT EXISTS locations_city_name_after_city_update
    AFTER UPDATE OF city_id, city_name ON locations
    WHEN NEW.city_name IS NOT (SELECT name FROM cities WHERE id = NEW.city_id)
    BEGIN
      UPDATE locations
      SET city_name = (SELECT name FROM cities WHERE id = NEW.city_id)
      WHERE id = NEW.id;
    END;

    CREATE TRIGGER IF NOT EXISTS locations_city_name_after_city_rename
    AFTER UPDATE OF name ON cities
    BEGIN
      UPDATE locations SET city_name = NEW.name WHERE city_id = NEW.id;
    END;

    CREATE TRIGGER IF NOT EXISTS users_city_validate_insert
    BEFORE INSERT ON users
    WHEN NEW.city IS NOT NULL AND NOT EXISTS (SELECT 1 FROM cities WHERE id = NEW.city)
    BEGIN
      SELECT RAISE(ABORT, 'users.city must reference cities.id');
    END;

    CREATE TRIGGER IF NOT EXISTS users_city_validate_update
    BEFORE UPDATE OF city ON users
    WHEN NEW.city IS NOT NULL AND NOT EXISTS (SELECT 1 FROM cities WHERE id = NEW.city)
    BEGIN
      SELECT RAISE(ABORT, 'users.city must reference cities.id');
    END;

    CREATE TRIGGER IF NOT EXISTS messages_summary_after_insert
    AFTER INSERT ON messages
    BEGIN
      UPDATE conversations
      SET last_message_content = SUBSTR(NEW.content, 1, 100),
          last_message_at = NEW.created_at,
          updated_at = NEW.created_at
      WHERE id = NEW.conversation_id;
    END;

    CREATE TRIGGER IF NOT EXISTS team_members_validate_insert
    BEFORE INSERT ON team_members
    WHEN NEW.status NOT IN ('pending', 'approved', 'rejected', 'leave_pending', 'cancelled')
      OR (
        NEW.status = 'approved'
        AND (SELECT COUNT(*) FROM team_members
             WHERE team_id = NEW.team_id AND status IN ('approved', 'leave_pending'))
            >= (SELECT max_members FROM teams WHERE id = NEW.team_id)
      )
    BEGIN
      SELECT RAISE(ABORT, 'invalid membership status or team capacity exceeded');
    END;

    CREATE TRIGGER IF NOT EXISTS team_members_validate_update
    BEFORE UPDATE OF status, team_id ON team_members
    WHEN NEW.status NOT IN ('pending', 'approved', 'rejected', 'leave_pending', 'cancelled')
      OR NEW.team_id <> OLD.team_id
      OR (
        NEW.status = 'approved'
        AND OLD.status NOT IN ('approved', 'leave_pending')
        AND (SELECT COUNT(*) FROM team_members
             WHERE team_id = NEW.team_id AND status IN ('approved', 'leave_pending'))
            >= (SELECT max_members FROM teams WHERE id = NEW.team_id)
      )
    BEGIN
      SELECT RAISE(ABORT, 'invalid membership status or team capacity exceeded');
    END;

    CREATE TRIGGER IF NOT EXISTS teams_capacity_validate_update
    BEFORE UPDATE OF max_members ON teams
    WHEN NEW.max_members < (
      SELECT COUNT(*) FROM team_members
      WHERE team_id = NEW.id AND status IN ('approved', 'leave_pending')
    )
    BEGIN
      SELECT RAISE(ABORT, 'team max_members cannot be below current members');
    END;

    CREATE TRIGGER IF NOT EXISTS team_members_status_after_insert
    AFTER INSERT ON team_members
    BEGIN
      UPDATE teams
      SET status = CASE
            WHEN status IN ('recruiting', 'full') AND (
              SELECT COUNT(*) FROM team_members
              WHERE team_id = NEW.team_id AND status IN ('approved', 'leave_pending')
            ) >= max_members THEN 'full'
            WHEN status IN ('recruiting', 'full') THEN 'recruiting'
            ELSE status
          END,
          updated_at = (unixepoch() * 1000)
      WHERE id = NEW.team_id;
    END;

    CREATE TRIGGER IF NOT EXISTS team_members_status_after_update
    AFTER UPDATE OF status ON team_members
    BEGIN
      UPDATE teams
      SET status = CASE
            WHEN status IN ('recruiting', 'full') AND (
              SELECT COUNT(*) FROM team_members
              WHERE team_id = NEW.team_id AND status IN ('approved', 'leave_pending')
            ) >= max_members THEN 'full'
            WHEN status IN ('recruiting', 'full') THEN 'recruiting'
            ELSE status
          END,
          updated_at = (unixepoch() * 1000)
      WHERE id = NEW.team_id;
    END;

    CREATE TRIGGER IF NOT EXISTS team_members_status_after_delete
    AFTER DELETE ON team_members
    BEGIN
      UPDATE teams
      SET status = CASE
            WHEN status IN ('recruiting', 'full') AND (
              SELECT COUNT(*) FROM team_members
              WHERE team_id = OLD.team_id AND status IN ('approved', 'leave_pending')
            ) >= max_members THEN 'full'
            WHEN status IN ('recruiting', 'full') THEN 'recruiting'
            ELSE status
          END,
          updated_at = (unixepoch() * 1000)
      WHERE id = OLD.team_id;
    END;
  `);

  const db = drizzle(sqlite, { schema });

  // D1 batch shim：路由在 prod 用 db.batch（D1 唯一原子写入原语，BEGIN 在 D1 被拒）。
  // better-sqlite3 驱动没有 batch API，这里用事务包一层保持语义一致，
  // 否则测试环境会因 db.batch is not a function 误炸。
  (db as unknown as Record<string, unknown>).batch = async (
    items: Array<{ run: () => unknown }>,
  ) => db.transaction(() => items.map((item) => item.run()));

  return { db, sqlite };
}

export type TestDb = ReturnType<typeof createTestDb>["db"];
