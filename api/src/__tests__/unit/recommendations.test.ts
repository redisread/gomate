/**
 * P0-C T1 (task #172) — 推荐算法纯函数单测
 *
 * 覆盖：
 *  - mulberry32 isolate-stable（同 seed 序列一致）
 *  - seedToUint32：hex / non-hex fallback
 *  - selectThree：冲突解决（worthy 优先，steady/fresh 顺延）
 *  - selectThree：payload 顺序 [steady, worthy, fresh]
 *  - selectThree：某 kind 池空时返回 <3 条
 *  - pickReason：steady 4 规则 + fallback
 *  - pickReason：worthy 3 规则 + fallback
 *  - pickReason：fresh 3 规则 + fallback
 *  - buildCandidate：hit 位设置 + season 匹配
 *  - computePool：Top N 排序 tie-break（score → createdAt → id）
 *  - seasonMatches：JSON best_season 解析
 *
 * 不覆盖 SQL 查询（那需 integration test；见 __tests__/integration/*)
 */
import { describe, it, expect } from "vitest";
import { __test, type ReasonKey } from "../../services/recommendations";

const { mulberry32, seedToUint32, selectThree, pickReason, buildCandidate, computePool, seasonMatches, POOL_PER_KIND } = __test;

// ==================== mulberry32 ====================

describe("recommendations: mulberry32", () => {
  it("同 seed 生成完全一致的序列", () => {
    const r1 = mulberry32(42);
    const r2 = mulberry32(42);
    for (let i = 0; i < 10; i++) {
      expect(r1()).toBeCloseTo(r2(), 10);
    }
  });

  it("不同 seed 生成不同序列", () => {
    const r1 = mulberry32(42);
    const r2 = mulberry32(43);
    // 至少前 3 位不同（PRNG 保证）
    const a = [r1(), r1(), r1()];
    const b = [r2(), r2(), r2()];
    expect(a).not.toEqual(b);
  });

  it("返回值 ∈ [0, 1)", () => {
    const rand = mulberry32(0xabcdef);
    for (let i = 0; i < 100; i++) {
      const v = rand();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

// ==================== seedToUint32 ====================

describe("recommendations: seedToUint32", () => {
  it("hex seed 取前 8 char 转 uint32", () => {
    const seed = "deadbeef1234567890";
    expect(seedToUint32(seed)).toBe(0xdeadbeef);
  });

  it("非 hex seed 走 FNV-1a fallback（同串同结果）", () => {
    const a = seedToUint32("hello-world");
    const b = seedToUint32("hello-world");
    expect(a).toBe(b);
    // FNV-1a 不同串必不同（避免碰撞平凡样本）
    expect(seedToUint32("hello-world")).not.toBe(seedToUint32("hello-world!"));
  });

  it("空白 trim", () => {
    expect(seedToUint32("  deadbeef  ")).toBe(0xdeadbeef);
  });
});

// ==================== seasonMatches ====================

describe("recommendations: seasonMatches", () => {
  it("bestSeason 包含目标 season → true", () => {
    expect(seasonMatches('["spring","summer"]', "spring")).toBe(true);
    expect(seasonMatches('["spring","summer"]', "summer")).toBe(true);
  });

  it("不包含 → false", () => {
    expect(seasonMatches('["spring"]', "winter")).toBe(false);
  });

  it("非法 JSON → false（不抛）", () => {
    expect(seasonMatches("not-json", "spring")).toBe(false);
    expect(seasonMatches("", "spring")).toBe(false);
  });

  it("非数组 → false", () => {
    expect(seasonMatches('"spring"', "spring")).toBe(false);
  });
});

// ==================== buildCandidate / computePool ====================

interface RowInput {
  id: string;
  bestSeason?: string;
  difficulty?: string | null;
  distance?: number | null;
  futureTeams?: number;
  favCount?: number;
  storyCount?: number;
  signup7d?: number;
  newTeams7d?: number;
  ageDays?: number;
  createdAt?: number;
}

function makeRow(now: number, o: RowInput) {
  const createdAt =
    o.createdAt ?? (o.ageDays !== undefined ? now - o.ageDays * 24 * 60 * 60 * 1000 : now);
  return {
    id: o.id,
    name: o.id,
    difficulty: o.difficulty ?? null,
    distance: o.distance ?? null,
    best_season: o.bestSeason ?? "[]",
    city_id: "c1",
    city_name: null,
    loc_created_at: createdAt,
    future_teams: o.futureTeams ?? 0,
    fav_count: o.favCount ?? 0,
    story_count: o.storyCount ?? 0,
    signup_7d: o.signup7d ?? 0,
    new_teams_7d: o.newTeams7d ?? 0,
  };
}

describe("recommendations: buildCandidate hit 位", () => {
  const now = 1_700_000_000_000; // 固定 mock
  it("season 命中", () => {
    const c = buildCandidate(makeRow(now, { id: "l1", bestSeason: '["spring"]' }), now, "spring");
    expect(c.hits.seasonMatch).toBe(true);
  });

  it("difficulty=easy → easyDifficulty", () => {
    const c = buildCandidate(makeRow(now, { id: "l1", difficulty: "easy" }), now, "summer");
    expect(c.hits.easyDifficulty).toBe(true);
  });

  it("difficulty=hard → 非 easyDifficulty", () => {
    const c = buildCandidate(makeRow(now, { id: "l1", difficulty: "hard" }), now, "summer");
    expect(c.hits.easyDifficulty).toBe(false);
  });

  it("distance <=50 → closeDistance", () => {
    const c = buildCandidate(makeRow(now, { id: "l1", distance: 25 }), now, "summer");
    expect(c.hits.closeDistance).toBe(true);
  });

  it("distance >50 → 非 closeDistance", () => {
    const c = buildCandidate(makeRow(now, { id: "l1", distance: 55 }), now, "summer");
    expect(c.hits.closeDistance).toBe(false);
  });

  it("futureTeams >=2 → manyTeams + hasTeams", () => {
    const c = buildCandidate(makeRow(now, { id: "l1", futureTeams: 3 }), now, "summer");
    expect(c.hits.manyTeams).toBe(true);
    expect(c.hits.hasTeams).toBe(true);
  });

  it("futureTeams=1 → hasTeams only", () => {
    const c = buildCandidate(makeRow(now, { id: "l1", futureTeams: 1 }), now, "summer");
    expect(c.hits.manyTeams).toBe(false);
    expect(c.hits.hasTeams).toBe(true);
  });

  it("favCount >=5 → manyFavorites", () => {
    const c = buildCandidate(makeRow(now, { id: "l1", favCount: 8 }), now, "summer");
    expect(c.hits.manyFavorites).toBe(true);
  });

  it("storyCount >=3 → manyStories", () => {
    const c = buildCandidate(makeRow(now, { id: "l1", storyCount: 5 }), now, "summer");
    expect(c.hits.manyStories).toBe(true);
  });

  it("ageDays <=7 → isNew", () => {
    const c = buildCandidate(makeRow(now, { id: "l1", ageDays: 3 }), now, "summer");
    expect(c.hits.isNew).toBe(true);
  });

  it("ageDays >7 → 非 isNew", () => {
    const c = buildCandidate(makeRow(now, { id: "l1", ageDays: 15 }), now, "summer");
    expect(c.hits.isNew).toBe(false);
  });

  it("signup7d >=5 → trendingSignups", () => {
    const c = buildCandidate(makeRow(now, { id: "l1", signup7d: 7 }), now, "summer");
    expect(c.hits.trendingSignups).toBe(true);
  });

  it("newTeams7d >=1 → newTeams", () => {
    const c = buildCandidate(makeRow(now, { id: "l1", newTeams7d: 2 }), now, "summer");
    expect(c.hits.newTeams).toBe(true);
  });
});

// ==================== computePool ====================

describe("recommendations: computePool 排序 + Top N", () => {
  const now = 1_700_000_000_000;

  it("steady 池按 score desc → createdAt desc → id asc 排序", () => {
    const cands = [
      // 3 个 steady 候选（都有 closeDistance），score 不同
      buildCandidate(
        makeRow(now, { id: "b", distance: 30, futureTeams: 2 }), // manyTeams=+3
        now,
        "spring",
      ),
      buildCandidate(
        makeRow(now, { id: "a", distance: 30, difficulty: "easy" }), // easyDifficulty=+2
        now,
        "spring",
      ),
      buildCandidate(
        makeRow(now, { id: "c", distance: 30, futureTeams: 2, difficulty: "easy" }), // both = higher
        now,
        "spring",
      ),
    ];
    const pool = computePool(cands);
    expect(pool.steady.map((c) => c.locationId)).toEqual(["c", "b", "a"]);
  });

  it("每类池被截断到 POOL_PER_KIND", () => {
    const cands: ReturnType<typeof buildCandidate>[] = [];
    for (let i = 0; i < 10; i++) {
      cands.push(
        buildCandidate(
          makeRow(now, { id: `l${i}`, favCount: 10 + i }), // worthy 候选
          now,
          "summer",
        ),
      );
    }
    const pool = computePool(cands);
    expect(pool.worthy.length).toBe(POOL_PER_KIND);
  });

  it("同 score 时 createdAt 新的优先", () => {
    const cands = [
      buildCandidate(makeRow(now, { id: "old", createdAt: now - 100_000, distance: 10 }), now, "summer"),
      buildCandidate(makeRow(now, { id: "new", createdAt: now - 50_000, distance: 10 }), now, "summer"),
    ];
    const pool = computePool(cands);
    expect(pool.steady[0]?.locationId).toBe("new");
  });
});

// ==================== selectThree ====================

describe("recommendations: selectThree 冲突解决 + 排序", () => {
  const now = 1_700_000_000_000;

  function makePool(steady: string[], worthy: string[], fresh: string[]) {
    const mk = (id: string, kind: "steady" | "worthy" | "fresh") => {
      const row = makeRow(now, {
        id,
        // 给三类各一个特征保证 hit
        bestSeason: kind === "steady" ? '["spring"]' : "[]",
        distance: kind === "steady" ? 20 : null,
        favCount: kind === "worthy" ? 10 : 0,
        storyCount: kind === "worthy" ? 5 : 0,
        ageDays: kind === "fresh" ? 2 : 100,
      });
      return buildCandidate(row, now, "spring");
    };
    return {
      steady: steady.map((id) => mk(id, "steady")),
      worthy: worthy.map((id) => mk(id, "worthy")),
      fresh: fresh.map((id) => mk(id, "fresh")),
    };
  }

  it("三类池都有候选 → 返回 3 条，顺序 [steady, worthy, fresh]", () => {
    const pool = makePool(["s1", "s2"], ["w1"], ["f1"]);
    const res = selectThree(pool, "abcd0001");
    expect(res.length).toBe(3);
    expect(res.map((r) => r.kind)).toEqual(["steady", "worthy", "fresh"]);
  });

  it("同 seed 结果稳定", () => {
    const pool = makePool(["s1", "s2", "s3"], ["w1", "w2"], ["f1", "f2"]);
    const a = selectThree(pool, "seed-x");
    const b = selectThree(pool, "seed-x");
    expect(a.map((r) => r.locationId)).toEqual(b.map((r) => r.locationId));
  });

  it("冲突：pool 全为同一 location id → worthy 保留，其他 kind 顺延或空", () => {
    // 三类都只有同一 id "same"
    const pool = makePool(["same"], ["same"], ["same"]);
    const res = selectThree(pool, "seed-x");
    // worthy 保留（优先）；其他两 kind 都被过滤成空
    const ids = res.map((r) => r.locationId);
    expect(ids.filter((i) => i === "same").length).toBe(1);
    // 只有 worthy
    expect(res.filter((r) => r.kind === "worthy").length).toBe(1);
    expect(res.filter((r) => r.kind !== "worthy").length).toBe(0);
  });

  it("worthy 池空 → 只返回 steady + fresh", () => {
    const pool = makePool(["s1"], [], ["f1"]);
    const res = selectThree(pool, "seed-x");
    expect(res.length).toBe(2);
    expect(res.map((r) => r.kind).sort()).toEqual(["fresh", "steady"]);
  });

  it("三类池都空 → 空数组", () => {
    const pool = makePool([], [], []);
    const res = selectThree(pool, "seed-x");
    expect(res).toEqual([]);
  });

  it("同池 3+ 条，不同 seed 选出不同 candidate", () => {
    // spec §11 验收 4：10 次点击至少 5 次不同
    const pool = makePool(["s1", "s2", "s3", "s4"], ["w1", "w2", "w3", "w4"], ["f1", "f2", "f3", "f4"]);
    const results = new Set<string>();
    for (let i = 0; i < 30; i++) {
      // seed 前 8 char 会被截为 uint32，所以第 i 位必须在前 8 char 内
      const seed = i.toString(16).padStart(8, "0") + "beef";
      const res = selectThree(pool, seed);
      results.add(res.map((r) => r.locationId).join(","));
    }
    // 30 次至少 5 种组合（spec §11 验收 4 v1.1）
    expect(results.size).toBeGreaterThanOrEqual(5);
  });
});

// ==================== pickReason ====================

describe("recommendations: pickReason steady", () => {
  const now = 1_700_000_000_000;
  const mk = (opts: RowInput) => buildCandidate(makeRow(now, opts), now, "spring");

  it("A + closeDistance → steady.season_close", () => {
    const c = mk({ id: "l1", bestSeason: '["spring"]', distance: 20 });
    expect(pickReason("steady", c).key).toBe<ReasonKey>("steady.season_close");
    expect(pickReason("steady", c).params.km).toBe(20);
  });

  it("A + manyTeams（无 closeDistance）→ steady.season_teams", () => {
    const c = mk({ id: "l1", bestSeason: '["spring"]', futureTeams: 3 });
    expect(pickReason("steady", c).key).toBe<ReasonKey>("steady.season_teams");
    expect(pickReason("steady", c).params.n).toBe(3);
  });

  it("B + closeDistance（无 season / manyTeams）→ steady.easy_close", () => {
    const c = mk({ id: "l1", difficulty: "easy", distance: 15 });
    expect(pickReason("steady", c).key).toBe<ReasonKey>("steady.easy_close");
  });

  it("hasTeams + closeDistance（无 season / easy）→ steady.close_social", () => {
    const c = mk({ id: "l1", distance: 30, futureTeams: 1 });
    // futureTeams=1 → hasTeams true but manyTeams false
    expect(pickReason("steady", c).key).toBe<ReasonKey>("steady.close_social");
  });

  it("均未命中 → steady.fallback", () => {
    const c = mk({ id: "l1" });
    expect(pickReason("steady", c).key).toBe<ReasonKey>("steady.fallback");
  });
});

describe("recommendations: pickReason worthy", () => {
  const now = 1_700_000_000_000;
  const mk = (opts: RowInput) => buildCandidate(makeRow(now, opts), now, "summer");

  it("F + G 双高 → worthy.favorites_stories", () => {
    const c = mk({ id: "l1", favCount: 10, storyCount: 5 });
    expect(pickReason("worthy", c).key).toBe<ReasonKey>("worthy.favorites_stories");
    expect(pickReason("worthy", c).params.n).toBe(15);
  });

  it("仅 G → worthy.stories", () => {
    const c = mk({ id: "l1", storyCount: 5 });
    expect(pickReason("worthy", c).key).toBe<ReasonKey>("worthy.stories");
    expect(pickReason("worthy", c).params.n).toBe(5);
  });

  it("仅 F → worthy.favorites", () => {
    const c = mk({ id: "l1", favCount: 8 });
    expect(pickReason("worthy", c).key).toBe<ReasonKey>("worthy.favorites");
    expect(pickReason("worthy", c).params.n).toBe(8);
  });

  it("均未命中 → worthy.fallback", () => {
    const c = mk({ id: "l1" });
    expect(pickReason("worthy", c).key).toBe<ReasonKey>("worthy.fallback");
  });
});

describe("recommendations: pickReason fresh", () => {
  const now = 1_700_000_000_000;
  const mk = (opts: RowInput) => buildCandidate(makeRow(now, opts), now, "summer");

  it("J 命中最优先 → fresh.trending_signups", () => {
    // 同时命中 J + I + K，应该选 J
    const c = mk({ id: "l1", signup7d: 10, ageDays: 3, newTeams7d: 2 });
    expect(pickReason("fresh", c).key).toBe<ReasonKey>("fresh.trending_signups");
    expect(pickReason("fresh", c).params.n).toBe(10);
  });

  it("K 命中（无 J）→ fresh.new_teams", () => {
    const c = mk({ id: "l1", newTeams7d: 2, ageDays: 3 });
    expect(pickReason("fresh", c).key).toBe<ReasonKey>("fresh.new_teams");
    expect(pickReason("fresh", c).params.n).toBe(2);
  });

  it("仅 I → fresh.new_location", () => {
    const c = mk({ id: "l1", ageDays: 3 });
    expect(pickReason("fresh", c).key).toBe<ReasonKey>("fresh.new_location");
    expect(pickReason("fresh", c).params.days).toBe(3);
  });

  it("均未命中 → fresh.fallback", () => {
    // ageDays=30 → 非 isNew；无 signup7d/newTeams7d
    const c = mk({ id: "l1", ageDays: 30 });
    expect(pickReason("fresh", c).key).toBe<ReasonKey>("fresh.fallback");
  });
});
