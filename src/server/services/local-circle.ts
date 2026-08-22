import { and, eq, sql } from "drizzle-orm";
import type { Db } from "../db";
import * as schema from "../db/schema";

const WINDOW_MS = 7 * 24 * 60 * 60 * 1_000;
const TOP_LOCATIONS = 3;
const TOP_NEIGHBOR_TEAMS = 3;
const NEIGHBOR_AVATAR_MAX = 3;

export type LocalCircleLanguage = "zh-CN" | "en" | "ja";

export interface TopLocation {
  locationId: string;
  locationName: string;
  coverImageUrl: string;
  visitScore: number;
  uniqueVisitors: number;
}

export interface NeighborTeam {
  teamId: string;
  title: string;
  activityType: schema.ActivityType;
  locationName: string;
  startAt: string;
  neighborCount: number;
  neighborAvatars: string[];
}

export interface PublicLocalCircle {
  regionId: string;
  regionName: string;
  activePeopleCount: number;
  topLocations: TopLocation[];
}

export interface LocalCircle extends PublicLocalCircle {
  neighborTeams: NeighborTeam[];
}

export interface LocalCircleParams {
  db: Db;
  regionId: string;
  language: LocalCircleLanguage;
  currentUserId?: string | null;
  now?: number;
}

export class LocalCircleRegionError extends Error {
  constructor() {
    super("Region is not an enabled city");
    this.name = "LocalCircleRegionError";
  }
}

export async function getLocalCircleHome(
  params: LocalCircleParams,
): Promise<LocalCircle> {
  const now = params.now ?? Date.now();
  const publicData = await computePublicLocalCircle({ ...params, now });

  const neighborTeams = params.currentUserId
    ? await computeNeighborTeams(
        params.db,
        params.regionId,
        params.currentUserId,
        now,
      )
    : [];
  return { ...publicData, neighborTeams };
}

async function computePublicLocalCircle(
  params: LocalCircleParams & { now: number },
): Promise<PublicLocalCircle> {
  const { db, regionId, language, now } = params;
  const [targetRegion] = await db
    .select({
      id: schema.region.id,
      name: schema.region.name,
      nameEn: schema.region.nameEn,
    })
    .from(schema.region)
    .where(
      and(
        eq(schema.region.id, regionId),
        eq(schema.region.level, "city"),
        eq(schema.region.serviceEnabled, true),
      ),
    )
    .limit(1);
  if (!targetRegion) throw new LocalCircleRegionError();

  const windowStart = now - WINDOW_MS;
  const rows = await db.all<{
    location_id: string;
    location_name: string;
    cover_image_url: string;
    visit_score: number;
    visitor_count: number;
    latest_signal_ts: number;
    active_count: number;
  }>(sql`
    WITH signals AS (
      SELECT
        tm.user_id AS user_id,
        t.location_id AS location_id,
        1.0 AS weight,
        t.end_at AS signal_ts
      FROM team_members tm
      JOIN teams t ON t.id = tm.team_id
      JOIN locations loc ON loc.id = t.location_id
      WHERE tm.left_at IS NULL
        AND t.cancelled_at IS NULL
        AND t.formed_at IS NOT NULL
        AND t.end_at > ${windowStart}
        AND t.end_at <= ${now}
        AND loc.region_id = ${regionId}
        AND loc.status = 'published'
      UNION ALL
      SELECT
        f.user_id AS user_id,
        f.location_id AS location_id,
        0.1 AS weight,
        f.created_at AS signal_ts
      FROM user_location_favorites f
      JOIN locations loc ON loc.id = f.location_id
      WHERE f.created_at > ${windowStart}
        AND loc.region_id = ${regionId}
        AND loc.status = 'published'
      UNION ALL
      SELECT
        s.author_id AS user_id,
        t.location_id AS location_id,
        1.5 AS weight,
        s.created_at AS signal_ts
      FROM stories s
      JOIN teams t ON t.id = s.team_id
      JOIN locations loc ON loc.id = t.location_id
      WHERE s.team_id IS NOT NULL
        AND s.status = 'published'
        AND s.created_at > ${windowStart}
        AND loc.region_id = ${regionId}
        AND loc.status = 'published'
    ),
    capped AS (
      SELECT
        user_id,
        location_id,
        MIN(SUM(weight), 3.0) AS contribution
      FROM signals
      GROUP BY user_id, location_id
    ),
    latest AS (
      SELECT location_id, MAX(signal_ts) AS latest_signal_ts
      FROM signals
      GROUP BY location_id
    ),
    ranked_locations AS (
      SELECT
        c.location_id AS location_id,
        loc.name AS location_name,
        loc.cover_image_url AS cover_image_url,
        SUM(c.contribution) AS visit_score,
        COUNT(DISTINCT c.user_id) AS visitor_count,
        latest.latest_signal_ts AS latest_signal_ts
      FROM capped c
      JOIN locations loc ON loc.id = c.location_id
      JOIN latest ON latest.location_id = c.location_id
      GROUP BY c.location_id
      ORDER BY
        visit_score DESC,
        visitor_count DESC,
        latest_signal_ts DESC,
        c.location_id ASC
      LIMIT ${TOP_LOCATIONS}
    )
    SELECT
      ranked_locations.location_id AS location_id,
      ranked_locations.location_name AS location_name,
      ranked_locations.cover_image_url AS cover_image_url,
      ranked_locations.visit_score AS visit_score,
      ranked_locations.visitor_count AS visitor_count,
      ranked_locations.latest_signal_ts AS latest_signal_ts,
      (SELECT COUNT(DISTINCT user_id) FROM capped) AS active_count
    FROM ranked_locations
    ORDER BY
      ranked_locations.visit_score DESC,
      ranked_locations.visitor_count DESC,
      ranked_locations.latest_signal_ts DESC,
      ranked_locations.location_id ASC
  `);

  const topById = new Map<string, TopLocation>();
  let activePeopleCount = 0;
  for (const row of rows) {
    activePeopleCount = Number(row.active_count);
    let location = topById.get(row.location_id);
    if (!location) {
      location = {
        locationId: row.location_id,
        locationName: row.location_name,
        coverImageUrl: row.cover_image_url,
        visitScore: Number(row.visit_score),
        uniqueVisitors: Number(row.visitor_count),
      };
      topById.set(row.location_id, location);
    }
  }

  return {
    regionId,
    regionName:
      language === "en" ? targetRegion.nameEn ?? targetRegion.name : targetRegion.name,
    activePeopleCount,
    topLocations: [...topById.values()],
  };
}

async function computeNeighborTeams(
  db: Db,
  regionId: string,
  currentUserId: string,
  now: number,
): Promise<NeighborTeam[]> {
  const [viewer] = await db
    .select({ extra: schema.users.extra })
    .from(schema.users)
    .where(eq(schema.users.id, currentUserId))
    .limit(1);
  const viewerRegionId =
    viewer && typeof viewer.extra.city === "string" ? viewer.extra.city : null;
  if (!viewerRegionId) return [];

  const teamRows = await db.all<{
    team_id: string;
    title: string;
    activity_type: schema.ActivityType;
    location_name: string;
    start_at: number;
    neighbor_count: number;
  }>(sql`
    SELECT
      t.id AS team_id,
      t.title AS title,
      t.activity_type AS activity_type,
      loc.name AS location_name,
      t.start_at AS start_at,
      COUNT(DISTINCT tm.user_id) AS neighbor_count
    FROM teams t
    JOIN locations loc ON loc.id = t.location_id
    JOIN team_members tm ON tm.team_id = t.id
    JOIN users u ON u.id = tm.user_id
    WHERE loc.region_id = ${regionId}
      AND loc.status = 'published'
      AND t.cancelled_at IS NULL
      AND t.end_at > ${now}
      AND tm.left_at IS NULL
      AND tm.user_id != ${currentUserId}
      AND json_extract(u.extra, '$.city') = ${viewerRegionId}
      AND t.leader_id != ${currentUserId}
      AND NOT EXISTS (
        SELECT 1
        FROM team_members mine
        WHERE mine.team_id = t.id
          AND mine.user_id = ${currentUserId}
          AND mine.left_at IS NULL
      )
    GROUP BY t.id
    HAVING COUNT(DISTINCT tm.user_id) > 0
    ORDER BY neighbor_count DESC, start_at ASC, t.id ASC
    LIMIT ${TOP_NEIGHBOR_TEAMS}
  `);

  const result: NeighborTeam[] = [];
  for (const team of teamRows) {
    const avatarRows = await db.all<{ image: string | null }>(sql`
      SELECT u.image AS image
      FROM team_members tm
      JOIN users u ON u.id = tm.user_id
      WHERE tm.team_id = ${team.team_id}
        AND tm.left_at IS NULL
        AND tm.user_id != ${currentUserId}
        AND json_extract(u.extra, '$.city') = ${viewerRegionId}
        AND u.image IS NOT NULL
      ORDER BY tm.joined_at ASC, u.id ASC
      LIMIT ${NEIGHBOR_AVATAR_MAX}
    `);

    result.push({
      teamId: team.team_id,
      title: team.title,
      activityType: team.activity_type,
      locationName: team.location_name,
      startAt: new Date(Number(team.start_at)).toISOString(),
      neighborCount: Number(team.neighbor_count),
      neighborAvatars: avatarRows
        .map((row) => row.image)
        .filter((image): image is string => Boolean(image)),
    });
  }
  return result;
}

export const __test = {
  WINDOW_MS,
};
