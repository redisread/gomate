# gomate P0-C：首页「本周三个选择」推荐位设计规范 v1.1
> **状态：已上线（2026-07-25 7a5b1c9）**

> 需求：@Victor 2026-07-20 DM（继续推进 P0 全套）
> 依据：`notes/gomate-ux-experience-analysis.md` §三-P0-3
> 设计者：@Steven
> 范围：首页 `/`（改造）—— 在 Hero 与 Locations 之间插入「本周三个选择」推荐位
> 交付给：Martin 拆任务

> **v1.1 变更**（2026-07-20 Martin CR PR #393）：
>
> - §5.2 seed 不放前端 cookie（隐私）→ 服务端按 IP/UA hash + time bucket 长期 cache（5 分钟内所有 seed 共享候选池）
> - §6.4 性能预算 50ms 偏紧 → 4 source 信号改单 SQL UNION + GROUP BY，加 EXPLAIN PLAN benchmark
> - §11 验收第 4 条：「连续 5 次点击 2 次不同」 → 改为「连续 10 次点击 5 次不同」（保证 seed 池足够）
> - T1 实施增加：一次返回 10 个候选（前端 seed 选 3），减少 cache miss 重算流量

---

## 0. 目标

**把首页从「信息池」改为「今天该去哪」。**

用户打开首页 5 秒内能回答：「今天先去看这三个中的一个」。

不是给 30 个选项让用户挑，而是**先给 3 个建议，用户可以驳回再换**。**产品承担判断责任**。

---

## 1. 顾客损失 → 设计对应

| 顾客损失（用户勉强接受的现实）   | 设计对应                           | §    |
| -------------------------------- | ---------------------------------- | ---- |
| 「打开首页看到一堆地点，自己挑」 | 首页顶部加**「本周三个选择」**     | §3   |
| 「产品不告诉推荐」               | 每张卡有一句话推荐理由             | §4   |
| 「推荐不好怎么办」               | 「换一批」按钮                     | §5   |
| 「推荐都是热门老地方」           | 三类覆盖：稳的 / 值得的 / 本周新的 | §3.2 |

---

## 2. 不做什么（明确边界）

- ❌ **不做 ML 个性化推荐**——MVP 用规则驱动，新用户冷启动友好
- ❌ **不做「猜你喜欢」无限滚动**——克制在 3 个，避免选择疲劳
- ❌ **不做「你最近浏览过」模块**——隐私风险 + 当前浏览数据未追踪
- ❌ **不重写 HomeHero**——只在 Hero 下、Locations 上插入新区块
- ❌ **不做跨设备同步推荐历史**——MVP 阶段 refresh 一次就重算
- ❌ **不做「天气推荐」**（与 P0-B 一致，天气先不加）

---

## 3. 整体结构

### 3.1 位置

在 `home-main.tsx` 中插入新区块，位置在 `<HomeHero>` 之后、`<HomeLocationsSection>` 之前。

```
[HomeHero]
[HomeRecommendationsSection] ← 新增
[HomeLocationsSection]
[HomeHowItWorksSection]
...
```

### 3.2 三个选择的类型

**稳的** — 低风险、难度适中、有现成队伍、容易上手
**值得的** — 评分高、去过的人少、性价比高
**本周新的** — 最近 7 天新建的地点 或 新热门队伍

### 3.3 视觉结构

```
┌─ 本周三个选择 ─────────────────────────────┐
│                                            │
│  本周去这三个                                │
│  不是你挑，是产品先给建议。                     │
│                                            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│  │  稳的     │ │  值得的   │ │  本周新的  │    │
│  │  [图标]   │ │  [图标]   │ │  [图标]   │    │
│  │  地点名   │ │  地点名   │ │  地点名   │    │
│  │  一句话   │ │  一句话   │ │  一句话   │    │
│  │  理由    │ │  理由    │ │  理由    │    │
│  │  难度·时长 │ │  评分·人数 │ │  新建 N 天 │    │
│  └──────────┘ └──────────┘ └──────────┘    │
│                                            │
│              [ 换一批 → ]                    │
│                                            │
└────────────────────────────────────────────┘
```

### 3.4 卡片样式

- 三张卡水平排列（移动端竖排堆叠）
- 每张卡：`bg-card` + `rounded-xl` + `border` + `p-6`
- 「稳的」用 emerald 主色边框标识，「值得的」用 amber，「本周新的」用 sky
- 点击跳转到 `/locations/[id]` 详情页

---

## 4. 每张卡的「一句话推荐理由」生成规则

### 4.1 稳的（推荐理由生成规则）

候选条件（任一满足即入选）：

- **A**：当前月份 ∈ locations.bestSeason（复用 P0-B 季节判定）
- **B**：难度 = 「轻松」或「适中」
- **C**：durationMin ≤ 240 且 distance ≤ 8 km
- **D**：未来 7 天有 ≥ 2 个 recruiting 队伍
- **E**：amap 距离深圳市中心 ≤ 50 km

**推荐理由文案模板**（按命中规则选最高权重）：

| 命中规则 | 文案（zh/en/ja）                                                                                                             |
| -------- | ---------------------------------------------------------------------------------------------------------------------------- |
| A + B    | "这周末天气正合适，离市区近" / "Great weather this weekend, close to city" / "今週末の天気にぴったり、市内から近い"          |
| A + D    | "正适合现在去，已有 N 个队伍在招人" / "Perfect season, N teams recruiting now" / "今がベストシーズン、N チームが募集中"      |
| B + E    | "难度低、市区 30 km 内，新手友好" / "Easy hike, 30 km from city, beginner-friendly" / "難易度低、市内 30 km、初心者に優しい" |
| D + E    | "近 + 有人一起，N 个队伍本周出发" / "Close + social, N teams this week" / "近くて仲間も見つかる、今週 N チーム出発"          |

**最低保底**：未命中任何规则 → 只显示「难度适中，距离 X km」（避免空白）

### 4.2 值得的（推荐理由生成规则）

候选条件（任一满足）：

- **F**：`favorites` 数 ≥ 5（gomate 当前 user_favorites 表可聚合）
- **G**：`stories` 数 ≥ 3（公开 stories）
- **H**：rating 高（如果 product 有评分字段——gomate 当前 locations 表无 rating，需 P1 评估是否加）

**推荐理由文案模板**：

| 命中规则 | 文案                                                                                                       |
| -------- | ---------------------------------------------------------------------------------------------------------- |
| F        | "被收藏最多，N 人想来这里" / "Most favorited, N people want to go" / "お気に入り最多、N 人が行きたい"      |
| G        | "N 个真实故事，最有内容的地方" / "N real stories, content-rich" / "N 件のリアルストーリー、コンテンツ豊富" |
| F + G    | "收藏多 + 故事多，N+N 双高" / "Favorited N times, N stories" / "お気に入り N、N ストーリー"                |

**注意**：gomate 当前 locations 表无 rating 字段——本 spec 不引入新字段。如果要 rating，需要单独 spec。

### 4.3 本周新的（推荐理由生成规则）

候选条件（任一满足）：

- **I**：`createdAt` 在过去 7 天内（新建地点）
- **J**：过去 7 天加入人数 ≥ 5（新热门）
- **K**：未来 7 天有新队伍已开放招募

**推荐理由文案模板**：

| 命中规则 | 文案                                                                               |
| -------- | ---------------------------------------------------------------------------------- |
| I        | "本周刚加入的新地点" / "Just added this week" / "今週追加された新しい場所"         |
| J        | "这周突然火了，N 人加入" / "Trending this week, N joined" / "今週話題、N 人が参加" |
| K        | "新队伍出发，N 队下周走" / "N new teams this week" / "今週 N チーム出発"           |

### 4.4 文案生成实现

- **不要写 if-else 文案引擎**——用查表法（reason 数组，按命中规则挑第一个匹配项）
- **每张卡最多 2 个推荐理由**（主 + 副），主理由命中权重高，副理由补充数据
- **未命中规则时回退到模板默认句**：「值得周末走一趟」

---

## 5. 「换一批」交互

### 5.1 行为

- 点击「换一批」按钮 → 调用 API 重新计算三张卡
- 用「session 内的随机种子」保证**同一会话内多次点击不重复**
- **不记录用户偏好**（避免隐私问题）
- 按钮位置：卡片下方居中

### 5.2 API 设计

**端点**：`GET /api/recommendations/home?seed=<random>&locale=<zh|en|ja>`

- **输入**：`seed`（可选，前端随机生成）、`locale`
- **输出**：`{ recommendations: Recommendation[3], candidatePoolSize: 10, nextSeed: string }`
- **v1.1 缓存策略**：
  - **seed 不放前端 cookie**（隐私，不持久化用户偏好）
  - **服务端按 IP/UA hash + 5min time bucket 长期 cache**候选池（10 条候选）
  - **同一用户 5 分钟内所有 seed 共享一个候选池**，seed 只用于从池中随机选 3
  - 减少 cache miss 重算流量
- **实现**：`api/src/services/recommendations.ts` 用 `cf-connecting-ip` + `user-agent` hash + `Math.floor(Date.now() / 300000)` 作 cache key

### 5.3 「换一批」边界

- 同一用户多次刷新页面 → 服务端重新计算（cache 过期或新 seed）
- 同一 seed 在 5 分钟内多次点击 → 返回相同结果（保证一致性）

---

## 6. 算法实现

### 6.1 输入数据

- locations 表全集（gomate 当前 35 条 prod 数据）
- teams 表（status=recruiting + startTime 在未来 14 天内）
- user_favorites 聚合
- stories 聚合（status=published）
- amap 距离（如有坐标）

### 6.2 算法骨架

```
function recommend(seed):
  candidates = locations.all

  steady = candidates.filter(matches_steady_rules).sort(by_season_match + by_proximity).limit(1)
  worthy = candidates.filter(matches_worthy_rules).sort(by_engagement_score).limit(1)
  fresh  = candidates.filter(matches_fresh_rules).sort(by_recency + by_signups).limit(1)

  if collision(steady, worthy, fresh):
    collision_resolve(steady, worthy, fresh)

  return [steady[0], worthy[0], fresh[0]]
```

### 6.3 冲突解决（collision_resolve）

如果三张卡选了同一个 location（命中多个规则）：

- 优先保留「值得的」位置
- 「稳的」/「本周新的」顺延选下一个候选
- 三张卡必须不同（不允许重复推荐同一地点）

### 6.4 性能

- 候选全集 35 条 + 多个 N+1 join → 整体 SQL 在 50ms 内（v1.1 偏紧需 benchmark）
- **v1.1 单 SQL UNION + GROUP BY**：4 个 source 信号用 UNION ALL 合并，按 location_id GROUP BY + SUM(score)，避免循环 N+1
- **v1.1 EXPLAIN PLAN**：T1 验收必须 `EXPLAIN QUERY PLAN` 通过，确认使用索引而非全表扫描
- **v1.1 cache miss 一次算 10 候选**：避免每次 seed miss 都重算全集
- 缓存策略：服务端按 IP/UA hash + time bucket 长期 cache（5 分钟内所有 seed 共享候选池）
- 不需要预计算（数据量小）

---

## 7. 视觉细节

### 7.1 图标

- 「稳的」：`Shield` (lucide)
- 「值得的」：`Sparkles`
- 「本周新的」：`Sparkle` 或 `Zap`

### 7.2 文案

- 区块标题：「本周去这三个」 / "This Week's Three Picks" / "今週の 3 選"
- 副标题：「不是你挑，是产品先给建议」 / "Picked for you, refresh to swap" / "おすすめ、入れ替え自由"
- 按钮：「换一批」 / "Show New Three" / "別の 3 つ"
- 卡上标签：稳的 / 值得的 / 本周新的（颜色按 §3.4 对应）

### 7.3 移动端

- 三张卡竖排堆叠
- 「换一批」按钮 sticky 在底部（移动端用户更容易点）

### 7.4 空态

如果某类规则无任何候选：

- 「稳的」无 → 显示「这周没特别稳的，先看看值得的」
- 「值得的」无 → 显示「这周没特别值得的，先看看稳的」
- 整块三类全空 → 整个区块不渲染（与 P0-A 空态一致）

---

## 8. i18n

新增 `home.recommendations.*` keys（zh/en/ja）：

```
home.recommendations.title = "本周去这三个" / "This Week's Three Picks" / "今週の 3 選"
home.recommendations.subtitle = "不是你挑，是产品先给建议" / "Picked for you, swap anytime" / "おすすめ、入れ替え自由"
home.recommendations.cta.refresh = "换一批" / "Show New Three" / "別の 3 つ"
home.recommendations.kind.steady = "稳的" / "Steady Pick" / "安定"
home.recommendations.kind.worthy = "值得的" / "Worthy Pick" / "価値あり"
home.recommendations.kind.fresh = "本周新的" / "Fresh Pick" / "新着"
home.recommendations.reason.* = （4.x 模板文案，全部 i18n）
home.recommendations.empty.steady = "这周没特别稳的" / "No steady pick this week" / "今週は安定なし"
home.recommendations.empty.worthy = "这周没特别值得的" / "No worthy pick this week" / "今週は特選なし"
home.recommendations.empty.fresh = "这周没新的" / "Nothing new this week" / "今週は新着なし"
```

---

## 9. schema 与 API 改动汇总

### 9.1 无 schema 变更

P0-C **不需要任何新字段**——全部基于现有数据：

- locations / teams / team_members / user_favorites / stories 已有
- amap 距离可从已有坐标算

### 9.2 新 API 端点

`GET /api/recommendations/home?seed=<random>&locale=<zh|en|ja>` — 见 §5.2

实现位置：`api/src/routes/recommendations/home.ts`

---

## 10. 交付给 Martin 的任务拆分建议

按依赖 + 可并行性，建议拆 3 个子任务：

### T1：API + 推荐算法（后端基础）

- **改动**：
  - `api/src/routes/recommendations/home.ts`：新端点
  - `api/src/services/recommendations.ts`：候选筛选 + 评分 + 冲突解决
  - 缓存层：seed-keyed，TTL 5 分钟（Cloudflare KV 或内存）
  - 推荐理由文案模板（中英日查表）
- **验收**：
  - 三类规则命中正确（season/engagement/recency）
  - 冲突解决生效（三张卡不同）
  - 5 分钟内同 seed 返回一致
  - 文案 i18n 完整

### T2：首页推荐位渲染（前端主要工作量）

- **依赖**：T1
- **改动**：
  - `frontend/src/components/features/home/`：新增 `home-recommendations-section.tsx`
  - 三个子组件：`steady-card.tsx` / `worthy-card.tsx` / `fresh-card.tsx`
  - 「换一批」按钮 + seed 生成
  - 接入 `home-main.tsx`（Hero 后、Locations 前）
- **验收**：
  - 三张卡水平排列（移动端竖排）
  - 「换一批」点击调 API + 更新 UI
  - 整块空态处理（三类全空不渲染）

### T3：i18n keys + 文案校准

- **依赖**：T1
- **改动**：
  - `frontend/src/i18n/locales-data.ts`：新增 §8 所有 keys
  - 校准三语言自然度（避免机翻感）
  - 跑 `scripts/validate-i18n-keys.mjs` 验证
- **验收**：CI 拦截缺失，三语言不溢出

**推荐执行顺序**：

- Phase 1：T1（API 后端基础）
- Phase 2（并行）：T2 + T3

---

## 11. 验收标准

Wen 测试用例覆盖：

1. 首页首次加载显示三张推荐卡（steady / worthy / fresh）
2. 三张卡指向不同 location（无重复）
3. 「换一批」点击后三张卡全部变化
4. **v1.1**：连续点击「换一批」10 次，至少有 5 次结果不同（保证 seed 池足够）
5. 三语言渲染（zh/en/ja），无溢出
6. 移动端竖排 + 「换一批」sticky 底部
7. 三类规则全无候选时整块不渲染
8. **v1.1 性能**：API 响应 ≤ 100ms（包含 KV cache hit），单 SQL UNION EXPLAIN PLAN 通过索引使用
9. **v1.1 隐私**：seed 不写入 cookie / localStorage

---

## 12. 与 P0-A / P0-B / P0-D 的关系

| P0                  | 关系                                                                   |
| ------------------- | ---------------------------------------------------------------------- |
| P0-A Team 行动本    | 无直接依赖                                                             |
| P0-B 详情页决策信息 | P0-B 的「季节适宜度」生成规则可被 P0-C「稳的」规则复用（输入信号共享） |
| P0-D 本地圈子       | 无直接依赖（两个独立推荐位）                                           |

**无 schema 冲突**，可与其他 P0 并行。

---

## 13. 一句话总结

**P0-C 用规则驱动的「本周三个选择」（稳的 / 值得的 / 本周新的）把首页从「信息池」改为「今天该去哪」——三张卡 + 一句话推荐理由 + 「换一批」交互，对应每个顾客损失点直接消除。零 schema 变更，纯规则驱动，3-4 周可上线。**

---

_spec v1.1 完成（Martin CR PR #393 pass + Victor 拍板 fallback 不细化），等 Victor 对 §4 推荐理由规则覆盖度 + §5 「换一批」交互的边界决策确认后提 Martin 拆任务。_
