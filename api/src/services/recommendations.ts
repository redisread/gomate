/**
 * P0-C T1 (task #172) — 首页「本周三个选择」推荐算法
 *
 * spec: notes/gomate-p0c-homepage-recommend-spec.md v1.1
 * §5.2 缓存策略：seed 不写 cookie，服务端按 IP/UA hash + 5min bucket cache 候选池
 * §6.2 算法骨架：三类候选（稳的 / 值得的 / 本周新的），冲突时保留「值得的」，其他顺延
 * §6.4 性能：4-source 信号单 SQL UNION，索引命中，KV cache TTL=300s
 *
 * Martin CR 已收纳（PR #393 v1.1）：
 *  1. seed 只从池中选 3，不进 cache key（隐私）
 *  2. cache key = SHA256(salt || ip || ua || city || bucket)
 *  3. bucket = floor(now / 5min)
 *  4. cache salt 从 env.RECOMMEND_CACHE_SALT 取，fallback 常量兜底
 *  5. Web Crypto crypto.subtle.digest（Cloudflare Workers 原生）
 *  6. mulberry32 seeded PRNG（isolate-stable）
 *  7. Reason key union type（T3 i18n 消费）
 */

import { sql } from "drizzle-orm";
import type { Db } from "../db";
import { getCurrentSeason, type Season, getCurrentCity, normalizeSeasonLabel } from "@gomate/lib";

// ==================== 常量 ====================

/** 每类池深度（Top 4 × 3 类 = 12，>=10 spec + 冲突缓冲） */
const POOL_PER_KIND = 4;

/** KV cache TTL（秒）— 与 spec §5.2 5min bucket 对齐 */
const CACHE_TTL_SECONDS = 300;

/** 5min bucket 毫秒 */
const BUCKET_MS = 5 * 60 * 1000;

/** cache salt fallback（本地开发无 env 时用；生产必须设 RECOMMEND_CACHE_SALT） */
const FALLBACK_SALT = "gomate-recommend-v1";

/** KV key 前缀 */
const CACHE_KEY_PREFIX = "reco:home:pool";

/** 「稳的」难度白名单（B 规则：轻松 / 适中） */
const DIFFICULTY_EASY = new Set(["easy", "moderate"]);

// ==================== Types ====================

export type RecommendationKind = "steady" | "worthy" | "fresh";

/** Reason key union — T3 前端 i18n 严格约束 */
export type ReasonKey =
  | "steady.season_close"        // A（当季）+ 距离近
  | "steady.season_teams"        // A + D（≥2 队招募）
  | "steady.easy_close"          // B + 距离近
  | "steady.close_social"        // D + E（有队伍）
  | "steady.fallback"            // 均未命中
  | "worthy.favorites"           // F（收藏 ≥5）
  | "worthy.stories"             // G（stories ≥3）
  | "worthy.favorites_stories"   // F + G 双高
  | "worthy.fallback"
  | "fresh.new_location"         // I（7d 内新建）
  | "fresh.trending_signups"     // J（7d 加入 ≥5）
  | "fresh.new_teams"            // K（新队伍开放招募）
  | "fresh.fallback";

/** reason 模板参数（T3 i18n 插值需要，避免前端硬编码） */
export interface ReasonParams {
  /** 数量占位（队伍数 / 收藏数 / 故事数 / 加入人数） */
  n?: number;
  /** 距离占位（km） */
  km?: number;
  /** 天数占位（新建 N 天） */
  days?: number;
}

export interface RecommendationReason {
  key: ReasonKey;
  params: ReasonParams;
}

/**
 * P0-C T2 契约扩展（Martin CR 2026-07-20 dm:@Martin msg 66cf9186）：
 *
 * 前端渲染卡片需要一次性拿到 location 展示数据 + 二级数据，避免 N+1 waterfall。
 * 字段全部来自 fetchSignals 已计算的 SignalRow / Candidate.data，不新增 SQL 成本。
 * 类型 additive，旧 caller 不消费不影响。
 */
export interface RecommendationLocationSummary {
  name: string;
  coverImage: string | null;
  /** union 对齐前端 DIFFICULTY_CONFIG key；DB 存自由文本，此处仅归一小写后透传 */
  difficulty: string | null;
  durationMin: number | null;
  /** 已折算 km，避免前端做单位换算 */
  distanceKm: number | null;
  // 二级数据（卡片右下角小字）
  favCount: number;
  storyCount: number;
  ageDays: number;
  futureTeams: number;
}

export interface Recommendation {
  kind: RecommendationKind;
  locationId: string;
  reason: RecommendationReason;
  /** P0-C T2：一次性带回卡片渲染所需字段，前端零 waterfall */
  location: RecommendationLocationSummary;
  /** debug 用：命中的规则位（不返回前端消费，仅测试断言） */
  score: number;
}

export interface RecommendationsResult {
  recommendations: Recommendation[]; // 长度 = 命中类数（0-3），顺序 [steady, worthy, fresh]
  candidatePoolSize: number;         // 池总深度（<=12）
  nextSeed: string;                  // 下次「换一批」用（不放 cookie，前端仅内存）
  cache: {
    hit: boolean;
    bucket: number;
    key: string;
  };
  _meta: {
    cityMatch: 'exact' | 'mixed' | 'fallback';
  };
}

export interface RecommendInput {
  db: Db;
  kv?: KVNamespace;
  request: Request;
  sessionCity?: string | null;
  /** P1 city 个性化 #195 T1：SQL 过滤用的原始 city ID（如 city_sz），非归一化名 */
  cityIdFilter?: string | null;
  seed?: string | null;
  now?: number; // 测试注入
  salt?: string; // env.RECOMMEND_CACHE_SALT
}

// ==================== Crypto / PRNG utils ====================

/** SHA-256 hex（Web Crypto，Cloudflare Workers 原生） */
async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const arr = Array.from(new Uint8Array(digest));
  return arr.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * mulberry32 PRNG（isolate-stable，seed 相同 → 序列相同）
 * ref: https://gist.github.com/tommyettinger/46a3b48865d7e94d81b3fa2af7db2f8f
 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** seed 字符串 → uint32（前 8 char 转 int，非 hex 时 hash 转 uint32） */
function seedToUint32(seed: string): number {
  const trimmed = seed.trim();
  if (/^[0-9a-fA-F]{8,}$/.test(trimmed)) {
    return parseInt(trimmed.slice(0, 8), 16) >>> 0;
  }
  // fallback FNV-1a 32-bit
  let h = 0x811c9dc5;
  for (let i = 0; i < trimmed.length; i++) {
    h ^= trimmed.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** 生成新的 seed（返回给前端 nextSeed），基于 crypto.randomUUID */
function generateFreshSeed(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
}

/** seed 归一化：空/undefined → 生成新 seed；非空原样保留 */
function normalizeSeed(seed?: string | null): string {
  if (!seed || !seed.trim()) return generateFreshSeed();
  return seed.trim();
}

// ==================== SQL 信号查询 ====================

/**
 * 单 SQL UNION ALL 4 信号（spec §6.4）
 * 4 个 LEFT JOIN 子查询在同一 SELECT 中聚合：避免多次 D1 round-trip
 *
 *  1. teams_future_7d       : status=recruiting AND startTime ∈ [now, now+7d]
 *  2. favorites_count       : user_favorites WHERE entity_type='location' 全时聚合
 *  3. stories_count         : stories WHERE status='published' 全时聚合
 *  4. signups_last_7d       : team_members.status='accepted' AND createdAt >= now-7d
 *
 * 「本周新的」维度 K 直接看 teams.createdAt >= now-7d（不用单独子查询，已复用 1）
 *
 * 每个 location 输出 6 列：
 *   locId, difficulty, distance, bestSeason(json text),
 *   futureTeams, favCount, storyCount, signup7d, newTeams7d, locCreatedAt
 *
 * 依赖索引（已存在，见 db/schema.ts）：
 *   - teams_status_start_time_idx (status, start_time)
 *   - teams_status_created_at_idx (status, created_at)
 *   - team_members_team_status_idx (team_id, status)
 *   - stories_status_created_at_idx (status, created_at)
 *   - user_favorites_entity_idx (entity_type, entity_id)
 *   - locations_created_at_idx (created_at)
 */
interface SignalRow {
  id: string;
  name: string;
  cover_image: string; // NOT NULL in schema
  difficulty: string | null;
  duration_min: number | null;
  distance: number | null;
  best_season: string; // JSON text
  city_id: string;
  city_name: string | null;
  loc_created_at: number;
  future_teams: number;
  fav_count: number;
  story_count: number;
  signup_7d: number;
  new_teams_7d: number;
}

async function fetchSignals(db: Db, now: number, cityFilter?: string | null): Promise<SignalRow[]> {
  const nowMs = now;
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  const sevenDaysAhead = now + 7 * 24 * 60 * 60 * 1000;

  // Drizzle sql`` — 参数化 timestamps，防止 SQL 注入且让 SQLite planner 用 prepared cache
  const query = sql`
    SELECT
      l.id AS id,
      l.name AS name,
      l.cover_image AS cover_image,
      l.difficulty AS difficulty,
      l.duration_min AS duration_min,
      l.distance AS distance,
      l.best_season AS best_season,
      l.city_id AS city_id,
      l.city_name AS city_name,
      l.created_at AS loc_created_at,
      COALESCE(ft.cnt, 0) AS future_teams,
      COALESCE(fv.cnt, 0) AS fav_count,
      COALESCE(st.cnt, 0) AS story_count,
      COALESCE(sg.cnt, 0) AS signup_7d,
      COALESCE(nt.cnt, 0) AS new_teams_7d
    FROM locations l
    LEFT JOIN (
      SELECT location_id, COUNT(*) AS cnt
      FROM teams
      WHERE status = 'recruiting'
        AND start_time >= ${nowMs}
        AND start_time <= ${sevenDaysAhead}
      GROUP BY location_id
    ) ft ON ft.location_id = l.id
    LEFT JOIN (
      SELECT entity_id, COUNT(*) AS cnt
      FROM user_favorites
      WHERE entity_type = 'location'
      GROUP BY entity_id
    ) fv ON fv.entity_id = l.id
    LEFT JOIN (
      SELECT location_id, COUNT(*) AS cnt
      FROM stories
      WHERE status = 'published'
      GROUP BY location_id
    ) st ON st.location_id = l.id
    LEFT JOIN (
      SELECT t.location_id AS location_id, COUNT(*) AS cnt
      FROM team_members tm
      INNER JOIN teams t ON t.id = tm.team_id
      WHERE tm.status = 'accepted'
        AND tm.created_at >= ${sevenDaysAgo}
      GROUP BY t.location_id
    ) sg ON sg.location_id = l.id
    LEFT JOIN (
      SELECT location_id, COUNT(*) AS cnt
      FROM teams
      WHERE created_at >= ${sevenDaysAgo}
        AND status = 'recruiting'
      GROUP BY location_id
    ) nt ON nt.location_id = l.id
  `;

  // P1 city 个性化 #195 T1: 按 cityId 软过滤
  const fullQuery = cityFilter
    ? sql`${query} WHERE l.city_id = ${cityFilter}`
    : query;

  return await db.all<SignalRow>(fullQuery);
}

// ==================== 候选评分 ====================

interface Candidate {
  locationId: string;
  score: number;
  createdAt: number;
  // 命中的规则集，用于 reason 生成
  hits: {
    seasonMatch: boolean;
    easyDifficulty: boolean;
    closeDistance: boolean; // ≤50km（E 规则 §4.1 已合并入这个字段）
    manyTeams: boolean; // ≥2 未来 7d 队伍（D）
    hasTeams: boolean; // 至少 1 未来 7d 队伍
    manyFavorites: boolean; // ≥5（F）
    manyStories: boolean; // ≥3（G）
    isNew: boolean; // 7d 内新建（I）
    trendingSignups: boolean; // 7d 加入 ≥5（J）
    newTeams: boolean; // 7d 内新建的队伍 ≥1（K）
  };
  data: {
    // 展示字段（P0-C T2 契约扩展）
    name: string;
    coverImage: string;
    difficulty: string | null;
    durationMin: number | null;
    distanceKm: number | null;
    // 信号 / 二级数据
    futureTeams: number;
    favCount: number;
    storyCount: number;
    signup7d: number;
    newTeams7d: number;
    ageDays: number; // 从创建到 now 的天数
  };
}

/**
 * JSON best_season 是否包含目标季节。
 *
 * gomate prod 数据里 bestSeason 存中文 label（`["春季","秋季"]`），
 * 但推荐算法内部用 Season key（`"spring"` 等）。
 * 通过 `normalizeSeasonLabel` 双向归一化：每个元素 zh→en 后再与 season key 比对，
 * 从而同时兼容中文 label 数据和未来的英文 key 数据。
 *
 * Martin CR PR #395 blocker-1：修复 prod 数据 100% miss。
 *
 * spec v1.2 §4.1 A 补充：bestSeason 含 "全年" / "all" / "year-round" 视为**任意季节均命中**
 * （prod 有 6 个 loc 是全年可去，如阳台山/梅沙尖，之前统一被归一到 null 拿不到 seasonMatch 加分）。
 */
function seasonMatches(bestSeasonJson: string, season: Season): boolean {
  try {
    const arr = JSON.parse(bestSeasonJson);
    if (!Array.isArray(arr)) return false;
    return arr.some((label) => {
      if (typeof label !== "string") return false;
      // 全年 / all / year-round → 任意季节命中
      const trimmed = label.trim().toLowerCase();
      if (trimmed === "全年" || trimmed === "all" || trimmed === "year-round") {
        return true;
      }
      return normalizeSeasonLabel(label) === season;
    });
  } catch {
    return false;
  }
}

function buildCandidate(row: SignalRow, now: number, season: Season): Candidate {
  const ageMs = now - row.loc_created_at;
  const ageDays = Math.floor(ageMs / (24 * 60 * 60 * 1000));

  const seasonMatch = seasonMatches(row.best_season, season);
  const easyDifficulty =
    row.difficulty !== null && DIFFICULTY_EASY.has(row.difficulty.toLowerCase());
  const closeDistance = row.distance !== null && row.distance <= 50;
  const hasTeams = row.future_teams >= 1;
  const manyTeams = row.future_teams >= 2;
  // spec v1.2 §4.2/§4.3 数据饥荒版阈值降级（P0-C MVP）：
  //   manyFavorites 5→3、manyStories 3→1、isNew 7d→30d
  //   等 favorites/stories 有真实业务量后，Martin 通过 spec v1.3 回收到 spec §4.2 原阈值。
  const manyFavorites = row.fav_count >= 3;
  const manyStories = row.story_count >= 1;
  const isNew = ageDays >= 0 && ageDays <= 30;
  const trendingSignups = row.signup_7d >= 5;
  const newTeams = row.new_teams_7d >= 1;

  // score 只用作排序 tie-breaker，不进 API payload
  // 三类 kind 用同一份 hits，但各自过滤出「有资格」的候选（见 computePool）
  let score = 0;
  if (seasonMatch) score += 3;
  if (easyDifficulty) score += 2;
  if (closeDistance) score += 1;
  if (manyTeams) score += 3;
  else if (hasTeams) score += 1;
  if (manyFavorites) score += 2;
  if (manyStories) score += 2;
  if (isNew) score += 3;
  if (trendingSignups) score += 3;
  if (newTeams) score += 2;

  return {
    locationId: row.id,
    score,
    createdAt: row.loc_created_at,
    hits: {
      seasonMatch,
      easyDifficulty,
      closeDistance,
      manyTeams,
      hasTeams,
      manyFavorites,
      manyStories,
      isNew,
      trendingSignups,
      newTeams,
    },
    data: {
      name: row.name,
      coverImage: row.cover_image,
      difficulty: row.difficulty,
      durationMin: row.duration_min,
      distanceKm: row.distance,
      futureTeams: row.future_teams,
      favCount: row.fav_count,
      storyCount: row.story_count,
      signup7d: row.signup_7d,
      newTeams7d: row.new_teams_7d,
      ageDays,
    },
  };
}

// ==================== reason 生成 ====================

/**
 * spec §4.x reason 模板 — 严格按命中优先级选 key（越靠前越优先）
 * 三类共 12 个 key + 3 个 fallback（union type 强约束前端 i18n）
 */
function pickReason(kind: RecommendationKind, cand: Candidate): RecommendationReason {
  const h = cand.hits;
  const d = cand.data;
  const kmRounded = d.distanceKm !== null ? Math.round(d.distanceKm) : undefined;

  if (kind === "steady") {
    // 优先级：A+B > A+D > B+E > D+E > fallback（spec §4.1 表顺序）
    if (h.seasonMatch && h.closeDistance) {
      return { key: "steady.season_close", params: { km: kmRounded } };
    }
    if (h.seasonMatch && h.manyTeams) {
      return { key: "steady.season_teams", params: { n: d.futureTeams } };
    }
    if (h.easyDifficulty && h.closeDistance) {
      return { key: "steady.easy_close", params: { km: kmRounded } };
    }
    if (h.hasTeams && h.closeDistance) {
      return { key: "steady.close_social", params: { n: d.futureTeams } };
    }
    return { key: "steady.fallback", params: { km: kmRounded } };
  }

  if (kind === "worthy") {
    // 优先级：F+G > G > F > fallback
    if (h.manyFavorites && h.manyStories) {
      return {
        key: "worthy.favorites_stories",
        params: { n: d.favCount + d.storyCount },
      };
    }
    if (h.manyStories) return { key: "worthy.stories", params: { n: d.storyCount } };
    if (h.manyFavorites) return { key: "worthy.favorites", params: { n: d.favCount } };
    return { key: "worthy.fallback", params: {} };
  }

  // fresh — 优先级：J > K > I > fallback
  if (h.trendingSignups) return { key: "fresh.trending_signups", params: { n: d.signup7d } };
  if (h.newTeams) return { key: "fresh.new_teams", params: { n: d.newTeams7d } };
  if (h.isNew) return { key: "fresh.new_location", params: { days: d.ageDays } };
  return { key: "fresh.fallback", params: {} };
}

// ==================== 池化 + seed 选 3 ====================

interface Pool {
  steady: Candidate[];
  worthy: Candidate[];
  fresh: Candidate[];
}

/** 从全集候选按各类规则过滤 + Top N 排序（分数 desc → createdAt desc → id asc） */
function computePool(cands: Candidate[]): Pool {
  const bySteady = cands.filter((c) => {
    // 候选条件：任一 A/B/C/D/E（spec §4.1）
    const { seasonMatch, easyDifficulty, closeDistance, manyTeams, hasTeams } = c.hits;
    // C 规则「≤240min + ≤8km」目前无 durationMin/distance 双字段成对判定的价值，
    // 简化为 closeDistance；未来若加严可分离
    return seasonMatch || easyDifficulty || closeDistance || manyTeams || hasTeams;
  });
  const byWorthy = cands.filter((c) => c.hits.manyFavorites || c.hits.manyStories);
  const byFresh = cands.filter((c) => c.hits.isNew || c.hits.trendingSignups || c.hits.newTeams);

  const cmp = (a: Candidate, b: Candidate) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.createdAt !== a.createdAt) return b.createdAt - a.createdAt;
    return a.locationId.localeCompare(b.locationId);
  };

  return {
    steady: [...bySteady].sort(cmp).slice(0, POOL_PER_KIND),
    worthy: [...byWorthy].sort(cmp).slice(0, POOL_PER_KIND),
    fresh: [...byFresh].sort(cmp).slice(0, POOL_PER_KIND),
  };
}

/** 用 mulberry32 从 pool 里选一个 index（seed-deterministic） */
function pickFromKind(pool: Candidate[], rand: () => number): Candidate | null {
  if (pool.length === 0) return null;
  const idx = Math.floor(rand() * pool.length);
  return pool[Math.min(idx, pool.length - 1)] ?? null;
}

/**
 * 冲突解决（spec §6.3）：worthy 优先，其次 steady，最后 fresh
 * 三张卡必须不同 location；若某 kind 池内候选都冲突 → 该 kind 空
 *
 * spec v1.2 §6.4 跨 kind 兜底填充（Martin 2026-07-20 blocker 修复）：
 *   worthy/fresh 池天然为空时，从 steady 剩余次优（未被 steady slot 选走且未被本轮选走）补位；
 *   kind 标签保持（前端仍显示 worthy/fresh 徽章 + 边框色），reason 用 kind.fallback；
 *   chosenIds 依然生效，保证三张不同 loc。
 *
 * 保证任意时刻返 3 张（除非全 35 loc 都不通过 steady 5-way OR，几乎不可能）。
 */
function selectThree(pool: Pool, seed: string): Recommendation[] {
  const rand = mulberry32(seedToUint32(seed));

  // worthy 先选（spec 优先级）
  const chosenIds = new Set<string>();
  const results: (Recommendation | null)[] = [null, null, null]; // [steady, worthy, fresh]

  const buildRecord = (kind: RecommendationKind, picked: Candidate): Recommendation => {
    const d = picked.data;
    // km 保留 1 位小数（P0-C T2 契约：避免前端二次换算）
    const distanceKm = d.distanceKm === null ? null : Math.round(d.distanceKm * 10) / 10;
    // difficulty 归一小写（DB 存自由文本；前端 DIFFICULTY_CONFIG key 小写）
    const difficulty = d.difficulty === null ? null : d.difficulty.toLowerCase();
    return {
      kind,
      locationId: picked.locationId,
      reason: pickReason(kind, picked),
      location: {
        name: d.name,
        coverImage: d.coverImage || null,
        difficulty,
        durationMin: d.durationMin,
        distanceKm,
        favCount: d.favCount,
        storyCount: d.storyCount,
        ageDays: d.ageDays,
        futureTeams: d.futureTeams,
      },
      score: picked.score,
    };
  };

  const takeFromKind = (
    kind: RecommendationKind,
    kindPool: Candidate[],
    slot: number,
  ) => {
    if (kindPool.length === 0) return;
    // 从池中过滤未被占用的候选
    const remaining = kindPool.filter((c) => !chosenIds.has(c.locationId));
    if (remaining.length === 0) return; // 全冲突 → 该 kind 空
    const picked = pickFromKind(remaining, rand);
    if (!picked) return;
    chosenIds.add(picked.locationId);
    results[slot] = buildRecord(kind, picked);
  };

  // 顺序：worthy(idx=1) → steady(idx=0) → fresh(idx=2)
  takeFromKind("worthy", pool.worthy, 1);
  takeFromKind("steady", pool.steady, 0);
  takeFromKind("fresh", pool.fresh, 2);

  // spec v1.2 §6.4：worthy / fresh 空槽 → 从 steady 剩余次优补位
  // 保持 kind 标签，reason 走 fallback（前端 kind 徽章 + 边框 + fallback 文案）
  const fillEmptySlot = (kind: RecommendationKind, slot: number) => {
    if (results[slot] !== null) return;
    const remaining = pool.steady.filter((c) => !chosenIds.has(c.locationId));
    if (remaining.length === 0) return; // steady 也用完，只能返少于 3
    const picked = pickFromKind(remaining, rand);
    if (!picked) return;
    chosenIds.add(picked.locationId);
    // buildRecord 用传入的 kind → pickReason(kind, ...) 命中 kind.fallback（无 hits 加分）
    results[slot] = buildRecord(kind, picked);
  };
  fillEmptySlot("worthy", 1);
  fillEmptySlot("fresh", 2);

  // payload 顺序 [steady, worthy, fresh]（UI 期望）
  return results.filter((r): r is Recommendation => r !== null);
}

// ==================== 缓存 key + 序列化 ====================

/** 池的 KV 序列化格式（仅 locationId 数组 + 元数据；hits/data 从 DB 重算成本可控） */
interface CachedPool {
  version: 1;
  bucket: number;
  season: Season;
  steady: string[]; // locationId array
  worthy: string[];
  fresh: string[];
}

/** cache key = `reco:home:pool:<sha256(salt+ip+ua+city+bucket)[:32]>` */
async function buildCacheKey(opts: {
  salt: string;
  ip: string;
  ua: string;
  city: string;
  bucket: number;
}): Promise<string> {
  const raw = [opts.salt, opts.ip, opts.ua, opts.city, String(opts.bucket)].join("|");
  const hex = await sha256Hex(raw);
  return `${CACHE_KEY_PREFIX}:${hex.slice(0, 32)}`;
}

function poolToCached(pool: Pool, bucket: number, season: Season): CachedPool {
  return {
    version: 1,
    bucket,
    season,
    steady: pool.steady.map((c) => c.locationId),
    worthy: pool.worthy.map((c) => c.locationId),
    fresh: pool.fresh.map((c) => c.locationId),
  };
}

function cachedToLocationIds(cached: CachedPool): string[] {
  // 用 Set 去重，然后返回全部涉及的 id
  return Array.from(new Set([...cached.steady, ...cached.worthy, ...cached.fresh]));
}

/**
 * 读缓存时，用 cached id 重建 pool（重新查那些 id 的 signals）
 *
 * TODO(P1): 直接从 KV 反序列化完整 Candidate（含 hits/data）避免二次 SQL 查询；
 * spec §6.4 v2 优化。当前 MVP 阶段 35 条数据量小，二次查询开销可接受。
 * Ref: Martin CR PR #395 观察-1。
 */
async function rehydratePool(
  db: Db,
  cached: CachedPool,
  now: number,
  season: Season,
): Promise<Pool> {
  const ids = cachedToLocationIds(cached);
  if (ids.length === 0) return { steady: [], worthy: [], fresh: [] };

  // 复用 fetchSignals + WHERE l.id IN (...)
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  const sevenDaysAhead = now + 7 * 24 * 60 * 60 * 1000;

  const rows = await db.all<SignalRow>(sql`
    SELECT
      l.id AS id,
      l.name AS name,
      l.cover_image AS cover_image,
      l.difficulty AS difficulty,
      l.duration_min AS duration_min,
      l.distance AS distance,
      l.best_season AS best_season,
      l.city_id AS city_id,
      l.city_name AS city_name,
      l.created_at AS loc_created_at,
      COALESCE(ft.cnt, 0) AS future_teams,
      COALESCE(fv.cnt, 0) AS fav_count,
      COALESCE(st.cnt, 0) AS story_count,
      COALESCE(sg.cnt, 0) AS signup_7d,
      COALESCE(nt.cnt, 0) AS new_teams_7d
    FROM locations l
    LEFT JOIN (
      SELECT location_id, COUNT(*) AS cnt FROM teams
      WHERE status = 'recruiting' AND start_time >= ${now} AND start_time <= ${sevenDaysAhead}
      GROUP BY location_id
    ) ft ON ft.location_id = l.id
    LEFT JOIN (
      SELECT entity_id, COUNT(*) AS cnt FROM user_favorites
      WHERE entity_type = 'location' GROUP BY entity_id
    ) fv ON fv.entity_id = l.id
    LEFT JOIN (
      SELECT location_id, COUNT(*) AS cnt FROM stories
      WHERE status = 'published' GROUP BY location_id
    ) st ON st.location_id = l.id
    LEFT JOIN (
      SELECT t.location_id AS location_id, COUNT(*) AS cnt FROM team_members tm
      INNER JOIN teams t ON t.id = tm.team_id
      WHERE tm.status = 'accepted' AND tm.created_at >= ${sevenDaysAgo}
      GROUP BY t.location_id
    ) sg ON sg.location_id = l.id
    LEFT JOIN (
      SELECT location_id, COUNT(*) AS cnt FROM teams
      WHERE created_at >= ${sevenDaysAgo} AND status = 'recruiting' GROUP BY location_id
    ) nt ON nt.location_id = l.id
    WHERE l.id IN (${sql.join(ids, sql`, `)})
  `);

  const byId = new Map(rows.map((r) => [r.id, buildCandidate(r, now, season)]));
  const pickInOrder = (arr: string[]): Candidate[] =>
    arr.map((id) => byId.get(id)).filter((c): c is Candidate => Boolean(c));

  return {
    steady: pickInOrder(cached.steady),
    worthy: pickInOrder(cached.worthy),
    fresh: pickInOrder(cached.fresh),
  };
}

// ==================== 入口 ====================

export async function recommendHome(input: RecommendInput): Promise<RecommendationsResult> {
  const now = input.now ?? Date.now();
  const bucket = Math.floor(now / BUCKET_MS);
  const salt = (input.salt && input.salt.trim()) || FALLBACK_SALT;
  const seed = normalizeSeed(input.seed);
  const nextSeed = generateFreshSeed();

  // 城市 + 季节（服务端计算，spec 决策：不接受前端传季节）
  const { city } = getCurrentCity(input.request, input.sessionCity);
  const season = getCurrentSeason(new Date(now), city);

  // IP + UA（cache key 成分，不存数据库）
  const ip = input.request.headers.get("cf-connecting-ip") || "unknown-ip";
  const ua = input.request.headers.get("user-agent") || "unknown-ua";

  let pool: Pool | null = null;
  let cacheHit = false;
  let cityMatch: 'exact' | 'mixed' | 'fallback' = 'fallback';
  let cacheCity = city; // cache key 中的 city 段（含纯/混后缀）

  // ==================== KV cache 读取（含 pure/mixed 分桶）====================
  if (input.kv) {
    if (input.cityIdFilter) {
      // P1 city 个性化 #195 T1：先试 pure 桶，再试 mixed 桶
      const pureKey = await buildCacheKey({ salt, ip, ua, city: `${city}:pure`, bucket });
      const mixedKey = await buildCacheKey({ salt, ip, ua, city: `${city}:mixed`, bucket });
      for (const [key, label] of [[pureKey, 'exact' as const], [mixedKey, 'mixed' as const]]) {
        try {
          const raw = await input.kv.get(key);
          if (raw) {
            const cached = JSON.parse(raw) as CachedPool;
            if (cached && cached.version === 1 && cached.bucket === bucket && cached.season === season) {
              pool = await rehydratePool(input.db, cached, now, season);
              cacheHit = true;
              cacheCity = label === 'exact' ? `${city}:pure` : `${city}:mixed`;
              cityMatch = label as typeof cityMatch;
              break;
            }
          }
        } catch {
          continue;
        }
      }
    } else {
      // 无 city 过滤 — 老路径（单桶）
      try {
        const cacheKey = await buildCacheKey({ salt, ip, ua, city, bucket });
        const raw = await input.kv.get(cacheKey);
        if (raw) {
          const cached = JSON.parse(raw) as CachedPool;
          if (cached && cached.version === 1 && cached.bucket === bucket && cached.season === season) {
            pool = await rehydratePool(input.db, cached, now, season);
            cacheHit = true;
          }
        }
      } catch {
        pool = null;
      }
    }
  }

  // ==================== 计算（cache miss 时）====================
  if (!pool) {
    if (input.cityIdFilter) {
      // 1. 按 city 过滤取候选
      const cityRows = await fetchSignals(input.db, now, input.cityIdFilter);
      const cityCands = cityRows.map((r) => buildCandidate(r, now, season));
      const cityPool = computePool(cityCands);
      const cityTotal = cityPool.steady.length + cityPool.worthy.length + cityPool.fresh.length;

      if (cityTotal >= 3) {
        // 纯 city 池，足够出 3 卡
        pool = cityPool;
        cityMatch = 'exact';
        cacheCity = `${city}:pure`;
      } else {
        // 候选不足 → 混搭深圳热门兜底（两池合并去重再跑 computePool）
        const allRows = await fetchSignals(input.db, now);
        const cityIdSet = new Set(cityRows.map((r) => r.id));
        const mergedRows = [...cityRows, ...allRows.filter((r) => !cityIdSet.has(r.id))];
        const mergedCands = mergedRows.map((r) => buildCandidate(r, now, season));
        pool = computePool(mergedCands);
        cityMatch = cityTotal > 0 ? 'mixed' : 'fallback';
        cacheCity = `${city}:mixed`;
      }
    } else {
      // 无 city 过滤 — 全表
      const rows = await fetchSignals(input.db, now);
      const cands = rows.map((r) => buildCandidate(r, now, season));
      pool = computePool(cands);
      cityMatch = 'fallback';
      cacheCity = city;
    }

    // 异步写 KV（不 await；即便失败也不影响响应）
    if (input.kv) {
      const cacheKey = await buildCacheKey({ salt, ip, ua, city: cacheCity, bucket });
      const cached = poolToCached(pool, bucket, season);
      void input.kv
        .put(cacheKey, JSON.stringify(cached), { expirationTtl: CACHE_TTL_SECONDS })
        .catch(() => { /* silent */ });
    }
  }

  const cacheKey = await buildCacheKey({ salt, ip, ua, city: cacheCity, bucket });
  const recommendations = selectThree(pool, seed);
  const poolSize = pool.steady.length + pool.worthy.length + pool.fresh.length;

  return {
    recommendations,
    candidatePoolSize: poolSize,
    nextSeed,
    cache: {
      hit: cacheHit,
      bucket,
      key: cacheKey,
    },
    _meta: { cityMatch },
  };
}

// ==================== 测试导出 ====================

/** 单测专用（vitest）— 不出现在正常 import 路径 */
export const __test = {
  mulberry32,
  seedToUint32,
  sha256Hex,
  selectThree,
  pickReason,
  buildCandidate,
  computePool,
  buildCacheKey,
  seasonMatches,
  POOL_PER_KIND,
  BUCKET_MS,
  CACHE_TTL_SECONDS,
  FALLBACK_SALT,
};
