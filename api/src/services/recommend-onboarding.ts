/**
 * P1-1 T1 (task #187) — 首次引导流推荐端点 service
 *
 * spec: notes/gomate-p1-1-onboarding-spec.md v1.2 §5.1 / §9.3 / §11 T1
 *
 * 推荐规则（spec §5.1）：
 *   cityId = userCityId ?? 深圳（复用 local-circle DEFAULT_CITY_NAME 模式）
 *   candidates = teams
 *     .join(locations) .join(cities)
 *     .filter(recruiting / startTime ∈ (now, now+14d] / locations.cityId = cityId
 *             / type 可选过滤 / approvedCount < maxMembers)
 *     .sort(startTime asc, approvedCount desc)
 *   偏好死胡同：type 过滤后为空 → 自动去 type 重查一次，标 fallbackNoType: true
 *
 * hasAnyMembership：count(team_members where userId=me) > 0（spec §9.3 字面口径，不分状态）
 *
 * 不做 KV（spec §9.3：一次性场景，复用价值低）
 */

import { and, eq, gt, lte, sql, type SQL } from "drizzle-orm";
import * as schema from "../db/schema";
import type { createDb } from "../db";

type Db = ReturnType<typeof createDb>;

/** 默认城市名（userCityId 缺省时 fallback，与 local-circle home.ts 同款） */
const DEFAULT_CITY_NAME = "深圳";

/** 推荐窗口：未来 14 天（spec §5.1） */
const WINDOW_DAYS = 14;

/** 候选池上限（前端「换一个」纯客户端轮播，20 足够；防极端城市 payload 膨胀） */
const CANDIDATE_LIMIT = 20;

export interface RecommendOnboardingCandidate {
  id: string;
  title: string;
  icon: string | null;
  startTime: Date;
  maxMembers: number;
  approvedCount: number;
  locationName: string;
  cityName: string;
  locationType: string | null;
}

export interface RecommendOnboardingResult {
  hasAnyMembership: boolean;
  candidates: RecommendOnboardingCandidate[];
  fallbackNoType: boolean;
  /** 实际生效的 cityId（含深圳 fallback）；城市表连深圳都没有 → null + 空池 */
  cityId: string | null;
}

export async function getRecommendOnboarding(params: {
  db: Db;
  userId: string;
  userCityId: string | null;
  type?: string | null;
  now?: Date;
}): Promise<RecommendOnboardingResult> {
  const { db, userId, userCityId } = params;
  const type = params.type || null;
  const now = params.now ?? new Date();
  const windowEnd = new Date(now.getTime() + WINDOW_DAYS * 24 * 60 * 60 * 1000);

  // hasAnyMembership（spec §9.3：count(team_members where userId=me) > 0，不分状态）
  const [{ membershipCount }] = await db
    .select({ membershipCount: sql<number>`count(*)` })
    .from(schema.teamMembers)
    .where(eq(schema.teamMembers.userId, userId));

  // cityId 解析：用户 city 优先，缺省 fallback 深圳（spec §5.1 主路径）
  let cityId = userCityId;
  if (!cityId) {
    const shenzhen = await db
      .select({ id: schema.cities.id })
      .from(schema.cities)
      .where(eq(schema.cities.name, DEFAULT_CITY_NAME))
      .limit(1);
    cityId = shenzhen[0]?.id ?? null;
  }

  // 城市不可解析（连深圳都没有）→ 空池，与 local-circle 空态语义一致
  if (!cityId) {
    return { hasAnyMembership: membershipCount > 0, candidates: [], fallbackNoType: false, cityId: null };
  }

  const queryCandidates = async (withType: string | null) => {
    // approved 成员数标量子查询（select / where / orderBy 三处复用同一片段）
    const approvedCountSql = sql<number>`coalesce((
      select count(*) from ${schema.teamMembers}
      where ${schema.teamMembers.teamId} = ${schema.teams.id}
        and ${schema.teamMembers.status} = 'approved'
    ), 0)`;

    const filters: SQL[] = [
      eq(schema.teams.status, "recruiting"),
      gt(schema.teams.startTime, now),
      lte(schema.teams.startTime, windowEnd),
      eq(schema.locations.cityId, cityId!),
      // 有空位：approvedCount < maxMembers（无 approved 成员时子查询为 0）
      sql`${approvedCountSql} < ${schema.teams.maxMembers}`,
    ];
    if (withType) filters.push(eq(schema.locations.type, withType));

    const rows = await db
      .select({
        id: schema.teams.id,
        title: schema.teams.title,
        icon: schema.teams.icon,
        startTime: schema.teams.startTime,
        maxMembers: schema.teams.maxMembers,
        approvedCount: approvedCountSql,
        locationName: schema.locations.name,
        cityName: schema.cities.name,
        locationType: schema.locations.type,
      })
      .from(schema.teams)
      .innerJoin(schema.locations, eq(schema.teams.locationId, schema.locations.id))
      .innerJoin(schema.cities, eq(schema.locations.cityId, schema.cities.id))
      .where(and(...filters))
      // spec §5.1：最近出发优先，已有同伴次之
      // （orderBy 不复用 select alias——drizzle 对 sql<> 字段的别名 SQLite 解析不到，重复片段最稳）
      .orderBy(schema.teams.startTime, sql`${approvedCountSql} desc`)
      .limit(CANDIDATE_LIMIT);

    return rows;
  };

  let candidates = await queryCandidates(type);
  let fallbackNoType = false;

  // 偏好死胡同 fallback（spec §5.1）：type 过滤后为空 → 去过滤重查一次
  if (type && candidates.length === 0) {
    candidates = await queryCandidates(null);
    fallbackNoType = candidates.length > 0;
  }

  return { hasAnyMembership: membershipCount > 0, candidates, fallbackNoType, cityId };
}
