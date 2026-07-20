/**
 * P0-C T2 (task #173) — 前端 Recommendation 类型
 *
 * 与 api/src/services/recommendations.ts 契约对齐。
 * 保持独立复制而非 shared package：packages/lib/types 里放业务纯函数，
 * API 响应 DTO 单向流入前端，避免 shared type circular import。
 */

export type RecommendationKind = "steady" | "worthy" | "fresh";

/** api reason.key union（12 + 3 fallback）；前端 i18n key 走 `steady_season_close` 等 flat 形式
 *
 * TODO(P1): 与 api/src/services/recommendations.ts 的 ReasonKey 手动同步。
 *   若将来建立 `packages/api-contract` shared 包，将本 union + ReasonParams + RecommendationLocationSummary
 *   一并迁移过去，避免漂移风险（api 加第 13 个 reason.key 时前端 union 落后一版）。
 *   当前保持独立复制 —— shared type 迁移是大动作，本次 T2 不做。
 */
export type ReasonKey =
  | "steady.season_close"
  | "steady.season_teams"
  | "steady.easy_close"
  | "steady.close_social"
  | "steady.fallback"
  | "worthy.favorites"
  | "worthy.stories"
  | "worthy.favorites_stories"
  | "worthy.fallback"
  | "fresh.new_location"
  | "fresh.trending_signups"
  | "fresh.new_teams"
  | "fresh.fallback";

export interface ReasonParams {
  n?: number;
  km?: number;
  days?: number;
}

export interface RecommendationReason {
  key: ReasonKey;
  params: ReasonParams;
}

/** 卡片渲染所需字段 — API 一次性带回（Martin CR 契约 B，msg 66cf9186） */
export interface RecommendationLocationSummary {
  name: string;
  coverImage: string | null;
  difficulty: string | null;
  durationMin: number | null;
  distanceKm: number | null;
  favCount: number;
  storyCount: number;
  ageDays: number;
  futureTeams: number;
}

export interface Recommendation {
  kind: RecommendationKind;
  locationId: string;
  reason: RecommendationReason;
  location: RecommendationLocationSummary;
}

export interface RecommendationsResponse {
  recommendations: Recommendation[];
  candidatePoolSize: number;
  nextSeed: string;
}
