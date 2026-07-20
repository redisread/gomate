/**
 * P0-D T1 (task #175) — 本地圈子服务层
 *
 * spec: notes/gomate-p0d-local-circle-spec-v1.2.md §3.3-§3.5 / §4.2
 *
 * 单端点 `GET /api/local-circle/home?cityId=<id>` 一次拉齐 5 项：
 *   1. topLocations[3]     — 4-source signal → per-(user,location) cap 3.0 → SUM 后 top 3
 *   2. activePeopleCount  — 7d 内本城至少 1 次 signal 的 unique users
 *   3. avatarStack[≤5]   — 每个 top location 的贡献前 5 用户头像（已计入 cap 排序）
 *   4. neighborTeams[3] — 邻居队伍：status IN ('recruiting','confirmed') + tm.status='approved' + u.city 同城 + t.end_time 未过
 *   5. neighborAvatars[≤3] — 每个邻居队伍前 3 个成员头像
 *
 * 4-source 权重（Martin msg=8b50c654 / Steven spec v1.2 §3.3 拍板）：
 *   - PRIMARY: team_members.status='approved' + team.status!='cancelled' + team 7d 内已结束 = 1.0
 *   - SECONDARY: user_favorites entityType='location' 7d 内 = 0.1
 *   - SUPPLEMENTARY: stories status='published' 7d 内 location_id NOT NULL = 1.5
 *   - SUPPLEMENTARY: activity_posts status='visible' 7d 内 location_id NOT NULL = 1.0
 *   - per-(user, location) cap 3.0 防刷分（spec §5.1 / SQL `MIN(SUM(w), 3.0)`）
 *
 * KV cache：key = `local-circle:v1:<cityId>` TTL 30min（spec §3.5 v1.1）
 *
 * 假设：D1 3.44+，`MIN(SUM(x), 3.0)` scalar 版本可用（已本地 EXPLAIN 验证）。
 */

import { sql } from "drizzle-orm";
import type { Db } from "../db";
import * as schema from "../db/schema";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";

// ==================== 常量 ====================

/** 7 天窗口（毫秒） */
const WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/** KV cache TTL（秒），30min */
const CACHE_TTL_SECONDS = 30 * 60;

/** KV key 前缀，含 v1 版本号方便未来无痛升级 */
const CACHE_KEY_PREFIX = "local-circle:v1:";

/** top locations 上限 */
const TOP_LOCATIONS = 3;

/** neighbor teams 上限 */
const TOP_NEIGHBOR_TEAMS = 3;

/** 头像堆叠上限 */
const AVATAR_STACK_MAX = 5;

/** 邻居头像堆叠上限（比 top location 少 2 个，妥协移动端排版） */
const NEIGHBOR_AVATAR_MAX = 3;

// ==================== Types ====================

export interface TopLocation {
  locationId: string;
  locationName: string;
  locationCoverImage: string;
  visitScore: number;
  uniqueVisitors: number;
  avatarStack: string[];
}

export interface NeighborTeam {
  teamId: string;
  teamTitle: string;
  locationName: string;
  startTime: number;
  neighborCount: number;
  neighborAvatars: string[];
}

export interface LocalCircle {
  cityId: string;
  cityName: string;
  activePeopleCount: number;
  topLocations: TopLocation[];
  neighborTeams: NeighborTeam[];
}

export interface LocalCircleParams {
  db: Db;
  kv?: KVNamespace | null;
  cityId: string;
  /** current user id（登录态），用于邻居队伍 u.city 关联。匿名用户传 null；此时不返回邻居队伍。 */
  currentUserId?: string | null;
  /** 时间基准（默认 Date.now()，测试注入用） */
  now?: number;
}

// ==================== 主入口 ====================

export async function getLocalCircleHome(params: LocalCircleParams): Promise<LocalCircle> {
  const { db, kv, cityId, currentUserId = null, now = Date.now() } = params;
  const windowStart = now - WINDOW_MS;

  // ---- cache read ----
  const cacheKey = `${CACHE_KEY_PREFIX}${cityId}`;
  if (kv) {
    try {
      const raw = await kv.get(cacheKey);
      if (raw) {
        const cached = JSON.parse(raw) as LocalCircle;
        // 邻居队伍是「按当前用户 city 关联」，city 相同的所有登录用户共享同一份邻居集合，
        // 匿名用户也只 hide neighborTeams（前端根据是否登录决定渲染）—— 因此邻居数据依然可以走 cache。
        return cached;
      }
    } catch (err) {
      logger.warn("[local-circle] KV cache read failed", err);
    }
  }

  // ---- city name lookup ----
  const cityRow = await db
    .select({ id: schema.cities.id, name: schema.cities.name })
    .from(schema.cities)
    .where(eq(schema.cities.id, cityId))
    .limit(1);

  if (cityRow.length === 0) {
    // city 不存在 → 空态返回，前端整块不渲染（spec §6.4）
    return emptyResult(cityId, "");
  }
  const cityName = cityRow[0].name;

  // ---- 主 SQL: signals → capped → location_agg → top 3 ----
  // 参数：?1=windowStart ?2=now ?3=cityId
  //
  // tie-breaker 4 档（spec v1.2 §3.3 amend / Martin msg=6d046a06 拍板方案 A）：
  //   1. visit_score DESC
  //   2. visitor_count DESC
  //   3. MAX(signal_ts) DESC — signal_ts = PRIMARY teams.end_time / 其他 createdAt
  //   4. location_id ASC — cache 一致性兜底
  // signal_ts 从 signals 直接聚合到 location_agg，跳过 capped（capped 只处理 score 上限，对 MAX 无影响）
  const mainRows = await db.all<{
    location_id: string;
    location_name: string;
    location_cover_image: string;
    visit_score: number;
    visitor_count: number;
    latest_signal_ts: number;
  }>(sql`
    WITH signals AS (
      SELECT tm.user_id AS user_id, t.location_id AS location_id, 1.0 AS weight, t.end_time AS signal_ts
      FROM team_members tm
      JOIN teams t ON t.id = tm.team_id
      WHERE tm.status = 'approved'
        AND t.status != 'cancelled'
        AND t.end_time > ${windowStart}
        AND t.end_time <= ${now}
      UNION ALL
      SELECT user_id, entity_id AS location_id, 0.1 AS weight, created_at AS signal_ts
      FROM user_favorites
      WHERE entity_type = 'location'
        AND created_at > ${windowStart}
      UNION ALL
      SELECT author_id AS user_id, location_id, 1.5 AS weight, created_at AS signal_ts
      FROM stories
      WHERE status = 'published'
        AND created_at > ${windowStart}
        AND location_id IS NOT NULL
      UNION ALL
      SELECT author_id AS user_id, location_id, 1.0 AS weight, created_at AS signal_ts
      FROM activity_posts
      WHERE status = 'visible'
        AND created_at > ${windowStart}
        AND location_id IS NOT NULL
    ),
    capped AS (
      SELECT user_id, location_id, MIN(SUM(weight), 3.0) AS contribution
      FROM signals
      GROUP BY user_id, location_id
    ),
    location_agg AS (
      SELECT c.location_id, c.contribution, c.user_id
      FROM capped c
      JOIN locations loc ON loc.id = c.location_id
      WHERE loc.city_id = ${cityId}
    ),
    location_ts AS (
      SELECT s.location_id, MAX(s.signal_ts) AS latest_signal_ts
      FROM signals s
      JOIN locations loc ON loc.id = s.location_id
      WHERE loc.city_id = ${cityId}
      GROUP BY s.location_id
    )
    SELECT
      la.location_id AS location_id,
      loc.name AS location_name,
      loc.cover_image AS location_cover_image,
      SUM(la.contribution) AS visit_score,
      COUNT(DISTINCT la.user_id) AS visitor_count,
      lts.latest_signal_ts AS latest_signal_ts
    FROM location_agg la
    JOIN locations loc ON loc.id = la.location_id
    JOIN location_ts lts ON lts.location_id = la.location_id
    GROUP BY la.location_id
    ORDER BY visit_score DESC, visitor_count DESC, latest_signal_ts DESC, la.location_id ASC
    LIMIT ${TOP_LOCATIONS}
  `);

  // ---- activePeopleCount：本城内 7d unique users（用 capped + city join，与 top 逻辑口径一致）----
  const activeRows = await db.all<{ active_count: number }>(sql`
    WITH signals AS (
      SELECT tm.user_id AS user_id, t.location_id AS location_id
      FROM team_members tm
      JOIN teams t ON t.id = tm.team_id
      WHERE tm.status = 'approved'
        AND t.status != 'cancelled'
        AND t.end_time > ${windowStart}
        AND t.end_time <= ${now}
      UNION
      SELECT user_id, entity_id AS location_id
      FROM user_favorites
      WHERE entity_type = 'location'
        AND created_at > ${windowStart}
      UNION
      SELECT author_id AS user_id, location_id
      FROM stories
      WHERE status = 'published'
        AND created_at > ${windowStart}
        AND location_id IS NOT NULL
      UNION
      SELECT author_id AS user_id, location_id
      FROM activity_posts
      WHERE status = 'visible'
        AND created_at > ${windowStart}
        AND location_id IS NOT NULL
    )
    SELECT COUNT(DISTINCT s.user_id) AS active_count
    FROM signals s
    JOIN locations loc ON loc.id = s.location_id
    WHERE loc.city_id = ${cityId}
  `);
  const activePeopleCount = Number(activeRows[0]?.active_count ?? 0);

  // ---- avatar stack（top 3 location 每个取贡献前 5 用户）----
  const topLocations: TopLocation[] = [];
  for (const row of mainRows) {
    const avatarRows = await db.all<{ image: string | null; contribution: number }>(sql`
      WITH signals AS (
        SELECT tm.user_id AS user_id, t.location_id AS location_id, 1.0 AS weight
        FROM team_members tm
        JOIN teams t ON t.id = tm.team_id
        WHERE tm.status = 'approved'
          AND t.status != 'cancelled'
          AND t.end_time > ${windowStart}
          AND t.end_time <= ${now}
        UNION ALL
        SELECT user_id, entity_id AS location_id, 0.1 AS weight
        FROM user_favorites
        WHERE entity_type = 'location'
          AND created_at > ${windowStart}
        UNION ALL
        SELECT author_id AS user_id, location_id, 1.5 AS weight
        FROM stories
        WHERE status = 'published'
          AND created_at > ${windowStart}
          AND location_id IS NOT NULL
        UNION ALL
        SELECT author_id AS user_id, location_id, 1.0 AS weight
        FROM activity_posts
        WHERE status = 'visible'
          AND created_at > ${windowStart}
          AND location_id IS NOT NULL
      )
      SELECT u.image AS image, MIN(SUM(s.weight), 3.0) AS contribution
      FROM signals s
      JOIN users u ON u.id = s.user_id
      WHERE s.location_id = ${row.location_id}
        AND u.image IS NOT NULL
      GROUP BY s.user_id
      ORDER BY contribution DESC, u.id ASC
      LIMIT ${AVATAR_STACK_MAX}
    `);
    const avatarStack = avatarRows.map((r) => r.image!).filter(Boolean);

    topLocations.push({
      locationId: row.location_id,
      locationName: row.location_name,
      locationCoverImage: row.location_cover_image,
      visitScore: Number(row.visit_score),
      uniqueVisitors: Number(row.visitor_count),
      avatarStack,
    });
  }

  // ---- 邻居队伍（登录用户才有）----
  const neighborTeams: NeighborTeam[] = [];
  if (currentUserId) {
    // 先拿当前用户 city（可能与请求 cityId 不同，比如深圳用户看北京圈子，此时邻居仍按用户自己的 city）
    const meRow = await db
      .select({ city: schema.users.city })
      .from(schema.users)
      .where(eq(schema.users.id, currentUserId))
      .limit(1);
    const userCity = meRow[0]?.city ?? null;

    if (userCity) {
      const teamRows = await db.all<{
        team_id: string;
        team_title: string;
        location_name: string;
        start_time: number;
        neighbor_count: number;
      }>(sql`
        SELECT
          t.id AS team_id,
          t.title AS team_title,
          loc.name AS location_name,
          t.start_time AS start_time,
          COUNT(DISTINCT tm.user_id) AS neighbor_count
        FROM teams t
        JOIN locations loc ON loc.id = t.location_id
        JOIN team_members tm ON tm.team_id = t.id
        JOIN users u ON u.id = tm.user_id
        WHERE t.status IN ('recruiting','confirmed')
          AND tm.status = 'approved'
          AND u.city = ${userCity}
          AND t.end_time > ${now}
          AND t.leader_id != ${currentUserId}
          AND NOT EXISTS (
            SELECT 1 FROM team_members mine
            WHERE mine.team_id = t.id AND mine.user_id = ${currentUserId}
          )
        GROUP BY t.id
        HAVING neighbor_count >= 1
        ORDER BY neighbor_count DESC, start_time ASC
        LIMIT ${TOP_NEIGHBOR_TEAMS}
      `);

      for (const t of teamRows) {
        const avatarRows = await db.all<{ image: string | null }>(sql`
          SELECT u.image AS image
          FROM team_members tm
          JOIN users u ON u.id = tm.user_id
          WHERE tm.team_id = ${t.team_id}
            AND tm.status = 'approved'
            AND u.city = ${userCity}
            AND u.image IS NOT NULL
          ORDER BY tm.joined_at ASC, u.id ASC
          LIMIT ${NEIGHBOR_AVATAR_MAX}
        `);

        neighborTeams.push({
          teamId: t.team_id,
          teamTitle: t.team_title,
          locationName: t.location_name,
          startTime: Number(t.start_time),
          neighborCount: Number(t.neighbor_count),
          neighborAvatars: avatarRows.map((r) => r.image!).filter(Boolean),
        });
      }
    }
  }

  const result: LocalCircle = {
    cityId,
    cityName,
    activePeopleCount,
    topLocations,
    neighborTeams,
  };

  // ---- cache write ----
  if (kv) {
    try {
      await kv.put(cacheKey, JSON.stringify(result), {
        expirationTtl: CACHE_TTL_SECONDS,
      });
    } catch (err) {
      logger.warn("[local-circle] KV cache write failed", err);
    }
  }

  return result;
}

function emptyResult(cityId: string, cityName: string): LocalCircle {
  return {
    cityId,
    cityName,
    activePeopleCount: 0,
    topLocations: [],
    neighborTeams: [],
  };
}

// ==================== Test hooks ====================

/** 仅测试用；生产不消费 */
export const __test = {
  WINDOW_MS,
  CACHE_TTL_SECONDS,
  CACHE_KEY_PREFIX,
};
