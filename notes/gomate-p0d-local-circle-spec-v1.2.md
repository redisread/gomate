# gomate P0-D：首页「本地圈子」设计规范 v1.2
> **状态：已上线（2026-07-26 5efe2a5）**

> 需求：@Victor 2026-07-20 DM（继续推进 P0 全套） + Victor 反问「B 方案是否用户体验良好」后确认 B 修正版
> 依据：`notes/gomate-ux-experience-analysis.md` §三-P0-4
> 设计者：@Steven
> 范围：首页 `/`（改造）—— 在 P0-C 推荐位下、Locations 区块上插入「本地圈子」 + 队伍卡「邻居 X 人参加」
> 交付给：Martin 拆任务

> **v1.2 变更**（2026-07-21 Jeff T1 #175 摸底反馈 msg=df697452 + msg=f56f5749 + msg=6e953cca + Martin msg=7776fa59 拍板）：
>
> - §3.3 时间字段 `publishedAt` → `createdAt` (schema fact-check, gomate 里发布状态是独立 `status` 列而非时间列)
> - §3.3 SECONDARY 收藏源: 明确 favorites 泛型 `(entityType='location', entityId)` 定位
> - §3.3 stories 状态过滤: `status='published'` (draft/published/hidden 三态)
> - §3.3 activity_posts 状态过滤: `status='visible'` (visible/hidden/deleted 三态, 非 `published`)
> - §3.3 cancelled **窄义**: 仅 PRIMARY 层 `team_members` 排除 cancelled teams, 其他 3 源不 join teams (业务语义独立)
> - §3.3 score cap 3.0 语义澄清: **per-(user, location) 聚合后 cap**, 非单信号源 clamp; SQL 建议方案 (subquery raw → MIN → SUM)
> - §3.3 top 3 tie-breaker 4 档 (Steven msg=06447826 + Martin msg=6d046a06): `visit_score DESC → visitor_count DESC → MAX(signal_ts) DESC → location_id ASC`; `signal_ts` = 任一信号源时间字段 (PRIMARY=`teams.end_time`, 其他=`createdAt`), 每行 signal 自带列, 外层 MAX 聚合
> - §3.5 复合索引清单更新: 2 已存在 + 3 新增 (Martin msg=82a5ffff 拍板: `teams(status, end_time)` + `user_favorites(entity_type, entity_id, created_at)` + `activity_posts(location_id, created_at)` 服务现有 route; **撤销** `stories(location_id, status, created_at)` — 本 SQL 前缀不匹配, 未来 P1 地点故事列表上线再补 0017)
> - §3.5 ANALYZE 部署 SOP: 不入 migration, 运维 checklist 手动跑 (数据大增长后重跑)
> - §4.2 **邻居 tm.status='approved' only** (不含 pending/rejected/left/removed)
> - §4.2 **邻居 pool 与地点 pool 不同源**: 地点 pool 按 `locations.cityId` 过滤, 邻居 pool 按 `users.cityId` 过滤 (team.locationId 不限, 跨城行为允许)
> - §8.1 依赖表: users.city 状态 done, 时间列对齐 createdAt

> **v1.1 变更**（2026-07-20 Martin CR PR #393）：
>
> - §3.3 加单 user 对单 location score 上限 3.0（防刷分）
> - §3.5 加复合索引清单（team_members / stories / activity_posts / user_favorites）
> - §4.3 `user.showCity` P1 延后，本 spec 不实现
> - §5.1 tooltip + A/B 测试留口子（不强制 P0 内做）—— Victor 拍板 P0 不做 A/B
> - §11 #175 blocker 明确标注：依赖 #164 users.city 字段落地

---

## 0. 目标

**让新用户打开首页 5 秒内感觉到「有一群人在做这件事」。**

把首页从「陌生的地点列表」补成「**同城 200 人本周去了这里**」——这是「主题 = 本地圈子的周末行动本」最直观的第一视觉锚点。

---

## 1. 顾客损失 → 设计对应

| 顾客损失（用户勉强接受的现实）             | 设计对应                                      | §   |
| ------------------------------------------ | --------------------------------------------- | --- |
| 「注册后打开首页 → 都听过，然后呢？」      | 首页加**「本周本地圈子在去哪」**              | §3  |
| 「看不到同城用户在做什么」                 | 显示同城过去 7 天最多人去 3 个地点 + 头像堆叠 | §3  |
| 「队伍卡只有人数，不知道邻居有没有参加」   | 队伍卡加**「你的邻居 · X 人参加」**           | §4  |
| 「数据是假的，加了 checkins 表用户懒得打」 | B 修正方案：用现有 signal 推导                | §5  |

---

## 2. 不做什么（明确边界）

- ❌ **不加 `checkins` / `visits` 表**（B 修正方案：用现有 signal 推导，已 Victor 确认）
- ❌ **不做「你认识的人也去过这里」**（熟人 signal 需通讯录授权，P2）
- ❌ **不显示具体用户头像**（除「最近 N 队」的聚合头像堆叠，私隐考虑）
- ❌ **不重写 Locations 区块**——只在 P0-C 推荐位下、Locations 区块上插入新区块
- ❌ **不做「本月本地排名」/「年度排名」**——只算过去 7 天，避免「圈子排行」压力
- ❌ **不做跨城市聚合**——只算当前用户城市的本地圈子

---

## 3. 「本周本地圈子在去哪」模块

### 3.1 位置

在 `home-main.tsx` 中插入新区块，位置在 `<HomeRecommendationsSection>`（P0-C）之后、`<HomeLocationsSection>` 之前。

```
[HomeHero]
[HomeRecommendationsSection] ← P0-C
[HomeLocalCircleSection] ← 新增（P0-D）
[HomeLocationsSection]
...
```

### 3.2 视觉结构

```
┌─ 本周本地圈子在去哪 ──────────────────────────┐
│                                                │
│  深圳 200 人本周去这里                           │
│  不是你挑，是本地圈子已经在做的事。                  │
│                                                │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ │
│  │  [地点封面图]  │ │  [地点封面图]  │ │  [地点封面图]  │ │
│  │             │ │             │ │             │ │
│  │  地点名      │ │  地点名      │ │  地点名      │ │
│  │  头像堆叠     │ │  头像堆叠     │ │  头像堆叠     │ │
│  │  32 人去过    │ │  18 人去过    │ │  9 人去过     │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ │
│                                                │
│  你的邻居参加了这些队伍：                          │
│  ┌─────┐ ┌─────┐ ┌─────┐                        │
│  │ 队伍A│ │ 队伍B│ │ 队伍C│                        │
│  │ 3 人 │ │ 2 人 │ │ 1 人 │                        │
│  │邻居  │ │邻居  │ │邻居  │                        │
│  └─────┘ └─────┘ └─────┘                        │
│                                                │
└────────────────────────────────────────────────┘
```

### 3.3 数据：过去 7 天「去过」判定

**B 修正方案信号权重表**：

| 来源                                    | 权重    | 条件                                                                                                                            |
| --------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **PRIMARY**：已结束队伍的 approved 成员 | **1.0** | `team_members.status='approved'` AND `teams.endTime < now()` AND `teams.endTime > now() - 7d` AND `teams.status != 'cancelled'` |
| **SECONDARY**：收藏                     | **0.1** | `user_favorites.entityType='location'` AND `user_favorites.entityId` 匹配 AND `user_favorites.createdAt > now() - 7d`           |
| **SUPPLEMENTARY**：故事                 | **1.5** | `stories.createdAt > now() - 7d` AND `stories.status='published'` AND `stories.locationId` 匹配                                 |
| **SUPPLEMENTARY**：活动动态             | **1.0** | `activity_posts.createdAt > now() - 7d` AND `activity_posts.status='visible'` AND `activity_posts.locationId` 匹配              |

> **v1.2 note (2026-07-21, Jeff T1 摸底后修正)**:
>
> - **时间字段**以 schema 现状 `createdAt` 为准 (spec 初稿的 `publishedAt` 是笔误; gomate schema 里发布状态是独立 `status` 列, 不是时间字段)
> - **Favorites 泛型定位**: `(entityType='location', entityId)`
> - **状态过滤按 schema 各自枚举**: stories `status='published'` (draft/published/hidden 三态), activity_posts `status='visible'` (visible/hidden/deleted 三态, deleted=软删/hidden=管理员隐藏皆不计入信号)
> - **cancelled 窄义**: 仅 PRIMARY 层 `team_members` 排除 `teams.status='cancelled'`, 其他 3 源不 join teams 反查 cancelled (stories/activity_posts 业务语义独立于 team 存在; activity_posts 虽有 teamId 但业务上 cancelled team 不会有活动后分享, 可加数据 assertion 验证「无 activity_posts 挂 cancelled team」)

**最终 visit_score = sum(信号 × 权重)**，按 score 排序取 top 3。

> **v1.2 tie-breaker 4 档 (Steven msg=06447826 起手 + Martin msg=6d046a06 clarify)**: `visit_score` 相同时的 top 3 排序:
>
> 1. **一档**: `visitor_count DESC` (`COUNT(DISTINCT user_id)`, 不同真人数越多越活跃)
> 2. **二档**: `MAX(signal_ts) DESC` — 见下 signal_ts 定义
> 3. **三档**: `location_id ASC` (稳定字典序兜底, 保证 cache 30min 内同 key 结果确定性)
>
> **signal_ts 定义 (Martin msg=6d046a06 采纳 A 方案)**: 任一信号源的时间字段, 每行信号自带 `signal_ts` 列, 外层聚合 `MAX`:
>
> - PRIMARY: `teams.end_time`
> - SECONDARY: `user_favorites.created_at`
> - SUPPLEMENTARY story: `stories.created_at`
> - SUPPLEMENTARY activity_post: `activity_posts.created_at`
>
> **SQL 结构** (signals CTE 每行加 `signal_ts` 列, MAX 提到最外层 location_agg, 避开 capped CTE 聚合掉时间戳):
>
> ```sql
> -- signals CTE
> SELECT user_id, location_id, 1.0 AS weight, t.end_time AS signal_ts FROM team_members tm JOIN teams t ... -- PRIMARY
> UNION ALL
> SELECT user_id, entity_id AS location_id, 0.1, created_at AS signal_ts FROM user_favorites WHERE entity_type='location' ... -- SECONDARY
> UNION ALL
> SELECT author_id AS user_id, location_id, 1.5, created_at AS signal_ts FROM stories WHERE status='published' ... -- SUP story
> UNION ALL
> SELECT author_id AS user_id, location_id, 1.0, created_at AS signal_ts FROM activity_posts WHERE status='visible' ... -- SUP activity_post
>
> -- location_agg (跳过 capped CTE 或与 capped 并列; MAX 对 cap 无感, 语义等价)
> SELECT location_id,
>        SUM(contribution) AS visit_score,
>        COUNT(DISTINCT user_id) AS visitor_count,
>        MAX(signal_ts) AS latest_signal_ts
> FROM capped_or_signals
> GROUP BY location_id
> ORDER BY visit_score DESC, visitor_count DESC, latest_signal_ts DESC, location_id ASC
> LIMIT 3
> ```
>
> **实现细节 (Jeff 二选一, 语义等价)**:
>
> - 方案 A: 把 `signal_ts` 从 signals 直接聚合到最外层 (跳过 capped, capped 只算 score)
> - 方案 B: capped CTE 里 `MAX(signal_ts)` 一并保留 (per-user-location 的最新), 外层再 `MAX` 聚合
> - 拍板: A 更简洁 (cap 只是 score 的行为, 与时间戳解耦)
>
> **Cache key 一致性**: tie-breaker 4 档全定 → 同 `cityId` 30min TTL 内 top 3 顺序完全确定, cache miss 重算不飘.
>
> 不用 `location.createdAt`/`location.name` 作 tie-breaker (与信号活跃度无关).

**v1.1 防刷分**：单一用户对单个 location 的总 score 上限 **3.0**（防止单 user 发多篇故事 → 1 人贡献 5 × 1.5 = 7.5 score 顶替 7 个 approved 成员）

> **v1.2 note (2026-07-21)**: cap 语义是 **per-(user, location) 聚合后 cap**, 不是单信号源 clamp. 单 user 在同一 location 撞满 PRIMARY (1.0) + SECONDARY (0.1) + SUPPLEMENTARY 故事 (1.5) + SUPPLEMENTARY 动态 (1.0) = 3.6 → cap 到 3.0 计入该 location 的 visit_score. SQL 建议: subquery 算每 (user, location) raw score → `MIN(raw, 3.0)` → 外层 SUM 得 location visit_score.

**关键修正**（§三 提到）：

- ✅ 排除 cancelled 成员（用 `team_members.status='approved'` 限定）
- ✅ 强制 7 天窗口（所有 source 都有时间过滤）
- ✅ 信号分级（PRIMARY/SECONDARY/SUPPLEMENTARY 反映真实度差异）
- ✅ **v1.1 防刷分**：单 user 单 location score 上限 3.0

### 3.4 API 设计

**端点**：`GET /api/local-circle/home?cityId=<id>`

- **输入**：`cityId`（前端从 session 取当前用户城市，匿名用户 fallback 深圳默认）
- **输出**：
  ```ts
  type LocalCircle = {
    cityId: string;
    cityName: string;
    activePeopleCount: number; // 过去 7 天本城至少 1 次 signal 的 unique users
    topLocations: Array<{
      locationId: string;
      locationName: string;
      locationCoverImage: string;
      visitScore: number;
      uniqueVisitors: number; // 实际有 signal 的 unique 用户数
      avatarStack: string[]; // 最多 5 个用户头像 URL
    }>; // top 3
    neighborTeams: Array<{
      teamId: string;
      teamTitle: string;
      locationName: string;
      startTime: number;
      neighborCount: number;
      neighborAvatars: string[]; // 最多 3 个邻居头像
    }>; // top 3 邻居队伍
  };
  ```

### 3.5 性能

- 查询：**v1.1 单 SQL UNION + GROUP BY + JOIN cities + JOIN users 取 city**，预计 100ms 内
- **v1.2 复合索引清单** (2 已存在 + 3 新增, Martin msg=82a5ffff 拍板):
  - `team_members(team_id, status)` — **已存在** (`teamStatusIdx`)
  - `team_members(user_id)` — **已存在** (`userIdx`)
  - `teams(status, end_time)` — **新增** (用于「7 天内已结束 non-cancelled」PRIMARY 过滤 + 邻居 SQL)
  - `user_favorites(entity_type, entity_id, created_at)` — **新增** (泛型 favorites 前缀 entity_type 定位 location)
  - `activity_posts(location_id, created_at)` — **新增** (服务 P0-A 现有 `GET /locations/:id/activity-posts` route, 非本 SQL 命中; 本 SQL 里 `activity_posts` 走 status_idx)

> **v1.2 索引撤销 note (Jeff EXPLAIN msg=f207c63c + Martin msg=82a5ffff 拍板)**:
>
> - **撤销 `stories(location_id, status, created_at)` 3 列索引**: 本 SQL 里 stories 子查询 location_id 非 predicate (被 SELECT 出而非过滤), 走已存的 `stories_status_created_at_idx (status, created_at)` 已够. 现有 `api/src/routes/stories.ts` 的 `GROUP BY location_id` 查询前缀是 `IS NOT NULL` 而非 `=?`, 3 列索引边际收益不足以抵消 write 成本. **未来 P1 地点详情页故事列表上线时** (`WHERE location_id=? AND status='published' ORDER BY created_at DESC`) 补一条 0017 migration
> - **保留 `activity_posts(location_id, created_at)`**: 服务 P0-A 现有 `GET /locations/:id/activity-posts` (SQL `WHERE locationId=? AND status='visible' ORDER BY createdAt DESC LIMIT 6`), 非未来场景 — 当前生产就在用, 撤了是性能倒退
> - **ANALYZE 不入 0016 migration** (Martin Q1): migration 幂等 DDL / ANALYZE 是运行时统计采样, 冲突. 部署 SOP: `wrangler d1 migrations apply` → `wrangler d1 execute --command 'ANALYZE'`. 数据大增长后 (P0-D 上线 +1 周 / 每季度) 重跑, 落运维 checklist
> - **PRIMARY `SCAN tm` 部署后验证**: ANALYZE 跑完 EXPLAIN 复跑, 若仍 `SCAN tm` 才加 `INDEXED BY teams_status_end_time_idx` hint 兜底

- **v1.1 EXPLAIN PLAN**：T1 验收必须 `EXPLAIN QUERY PLAN` 走索引扫描
- 缓存：city-keyed，TTL 30 分钟（数据不需要实时）
- **v1.1 cache miss 时一次预算 30 分钟数据**（不是按请求实时算），减少冷启动延迟
- 头像堆叠：只在 response 中返回 ≤ 5 个 URL，前端不再请求

---

## 4. 队伍卡「你的邻居 · X 人参加」

### 4.1 位置

现有 `<HomeTeamsSection>` 队伍卡 + `<team-card>` 组件内，已有数字徽章（如「3/10 人」）—— 在数字旁加邻居标识。

### 4.2 视觉

```
┌───────────────────────────────┐
│ 队伍标题                        │
│ 地点 · 时间                      │
│                               │
│ [头像堆叠] 3/10 人 · 深圳邻居 2 │ ← 修改这里
│                               │
│ [加入队伍]                      │
└───────────────────────────────┘
```

**邻居标识**：

- 「**深圳邻居 X 人**」副标签，紧跟人数后
- 「邻居」= 当前用户 cityId 与队伍成员中 ≥ 1 个成员的 `users.city`（P0-A #164 加的字段）匹配
- X = 实际邻居数（1-3 显示数字，≥4 显示「你的邻居 4+」）

> **v1.2 邻居 pool 语义澄清 (Martin msg=7776fa59 拍板)**:
>
> - **邻居 tm.status 过滤**: 仅计 `team_members.status='approved'`, **不含 pending/rejected/left/removed**. 语义: 邻居 = 已确认入队的团员, 意向未确认不给用户「邻居 X 人」的心理承诺 (避免 pending 变 rejected 后信任损失)
> - **邻居 pool 与地点 pool 不同源**:
>   - **地点 pool** (top 3 candidate locations): `locations.cityId = user.cityId` (本地圈范围)
>   - **邻居 pool** (推荐邻居队伍): `users.cityId = target user.cityId` matched via team_members, **team.locationId 不限** (跨城行为允许 — 邻居去外地也是邻居信号, 更有价值)
> - team 状态过滤: `teams.status IN ('recruiting', 'confirmed')` (未结束未取消), 具体枚举以 schema 现有为准 (recruiting/confirmed/ongoing/ended/cancelled)

### 4.3 边界

- 队伍成员无 `users.city`（未填）→ 不计入邻居，不显示「邻居」标识
- 当前用户未填 `users.city` → 整个队伍卡不显示「邻居」标识（无法判断）
- 隐私开关：`user.showCity`（P1，默认开，可关）— 关的用户不参与邻居匹配

### 4.4 数据获取

- 复用现有 `GET /teams?status=recruiting&pageSize=4` 端点
- 后端 join 一次 team_members + users 表取 city
- 返回字段加 `neighborCount` 和 `neighborAvatars[]`

---

## 5. 「去过」判定的真实度讨论（已 Victor 确认 B）

### 5.1 B 修正后的真实度评估

| 场景                           | 真实度   | 说明                             |
| ------------------------------ | -------- | -------------------------------- |
| 用户加入 approved + 队伍已结束 | **高**   | 大概率真去了（除非临时有事未到） |
| 用户发布故事                   | **极高** | 真实去过且有输出                 |
| 用户发布活动动态               | **高**   | 真实去过                         |
| 用户收藏                       | **低**   | 意愿 ≠ 行动                      |

**误判成本**：用户看到「32 人去过」实际「32 人报名了已结束队伍 + 5 人写了故事」——**用「去过」措辞比用「想去」更吸引人，但有 30% 误差**。

### 5.2 缓解措辞

为了减少误判感知，**不直接说「去过」**，改用以下措辞：

| 当前      | 改为                                             |
| --------- | ------------------------------------------------ |
| 32 人去过 | **32 人在行动** / "32 in action" / "32 人活動中" |
| 头像堆叠  | 加 tooltip：「过去 7 天参与过此地点行动」        |
| 副标题    | 「不是你去过，是本地圈子已经在做的事」           |

**核心文案原则**：用「在行动」替代「去过」，更准确反映「approved + 已结束」的真实度（批准 ≠ 真去，但基本接近）。

### 5.3 与 P0-A 「行动本」主题对齐

「在行动」一词直接呼应 P0-A Team 行动本的「行动」主题——**主题一致性是「本地圈子的周末行动本」整体精神的具体落地**。

---

## 6. 视觉细节

### 6.1 区块标题与副标题

- 标题：「本周本地圈子在去哪」 / "What Your City Did This Week" / "今週、あなたの街で"
- 副标题：「不是你挑，是本地圈子已经在做的事」 / "Not what you pick — what your city's already doing" / "あなたが選ぶのではなく、あなたの街で既に起こっていること"
- 标题前缀城市名（dynamic）：「深圳 200 人在行动」

### 6.2 头像堆叠

- 最大 5 个用户头像
- 超过 5 个时显示「+N」徽章
- 头像尺寸：sm = 24px, md = 32px（响应式）
- 堆叠间隔：-8px（重叠 1/3）

### 6.3 移动端

- 3 张地点卡竖排堆叠
- 头像堆叠 sm 尺寸（24px）

### 6.4 空态

- **本城无任何 visit signal**：整个区块不渲染（避免显示空板块）
- **只有 SECONDARY 信号（收藏）**：仍渲染，权重低但有数据
- **城市识别失败**（匿名 + 无 geo）：默认深圳，若深圳也无数据则整块不渲染

---

## 7. i18n

新增 `home.localCircle.*` keys（zh/en/ja）：

```
home.localCircle.title = "本周本地圈子在去哪" / "What Your City Did This Week" / "今週、あなたの街で"
home.localCircle.subtitle = "不是你挑，是本地圈子已经在做的事" / "Not what you pick — what your city's already doing" / "..."
home.localCircle.inAction = "{n} 人在行动" / "{n} in action" / "{n} 人活動中"
home.localCircle.avatarStack.tooltip = "过去 7 天参与过此地点行动" / "Active here in the last 7 days" / "過去 7 日間に活動"
home.localCircle.neighborTeams.title = "你的邻居参加了这些队伍" / "Your neighbors are joining" / "ご近所さんも参加中"
home.localCircle.neighborCount = "深圳邻居 {n} 人" / "{n} from your city" / "{n} 人ご近所"
home.localCircle.neighborCount.many = "你的邻居 4+" / "4+ from your city" / "ご近所 4+"
home.localCircle.empty = "这周本城还没人行动" / "No local action this week" / "今週は街の活動なし"
home.teamCard.neighbor = "邻居 {n}" / "{n} neighbor" / "{n} ご近所"
home.teamCard.neighbor.many = "邻居 4+" / "4+ neighbors" / "ご近所 4+"
```

---

## 8. schema 与 API 改动汇总

### 8.1 schema 变更

**P0-D 不直接加新字段**，但**依赖 P0-A #164 加的 `users.city` 字段**：

| 依赖项                                      | 来源                                 | 状态 |
| ------------------------------------------- | ------------------------------------ | ---- |
| `users.city`                                | P0-A #164（已 done）                 | ✅   |
| `team_members.status='approved'` 过滤       | 现有 schema                          | ✅   |
| `teams.endTime` / `teams.status`            | 现有 schema                          | ✅   |
| `user_favorites` 泛型 (entityType/entityId) | 现有 schema                          | ✅   |
| `stories.createdAt` + `stories.status`      | 现有 schema (published/draft/hidden) | ✅   |
| `activity_posts.createdAt` + `.status`      | 现有 schema (visible/hidden/deleted) | ✅   |
| `cities` 表 + `locations.cityId`            | 现有 schema                          | ✅   |

### 8.2 新 API 端点

**`GET /api/local-circle/home?cityId=<id>`** — 见 §3.4

实现位置：`api/src/routes/local-circle/home.ts`

### 8.3 现有端点扩展

**`GET /teams?status=recruiting&pageSize=4`** — 增加返回字段：

- `neighborCount`：int
- `neighborAvatars`：string[]

后端 join：teams + team_members + users ON users.city = current_user_city

---

## 9. 交付给 Martin 的任务拆分建议

按依赖 + 可并行性，建议拆 3 个子任务：

### T1：API + 信号计算（后端基础）

- **依赖**：P0-A #164（`users.city` 字段落地）
- **改动**：
  - `api/src/routes/local-circle/home.ts`：新端点
  - `api/src/services/local-circle.ts`：4 source 信号查询 + 权重计算 + top 3 排序 + 头像聚合
  - `api/src/routes/teams/queries.ts`：扩展 recruiting teams 返回 `neighborCount` / `neighborAvatars`
  - 缓存层：city-keyed，TTL 30 分钟
- **验收**：
  - 4 信号正确计算（PRIMARY 1.0 / SECONDARY 0.1 / SUPPLEMENTARY 1.5+1.0）
  - 7 天窗口强制
  - cancelled 成员排除
  - 三类信号全无时整块数据返回 null
  - 性能：≤ 200ms（包含 KV cache miss）

### T2：首页本地圈子模块渲染

- **依赖**：T1
- **改动**：
  - `frontend/src/components/features/home/`：新增 `home-local-circle-section.tsx`
  - 三个子组件：`local-circle-card.tsx`（地点卡）/ `avatar-stack.tsx`（头像堆叠）/ `neighbor-team-row.tsx`（邻居队伍）
  - 接入 `home-main.tsx`（P0-C 之后、Locations 之前）
  - 标题前缀城市名（dynamic）
- **验收**：
  - 三张地点卡水平排列（移动端竖排）
  - 头像堆叠 ≤ 5 + 「+N」徽章
  - 空态整块不渲染
  - 城市标题前缀正确

### T3：队伍卡「邻居」标识 + i18n

- **依赖**：T1
- **改动**：
  - `frontend/src/components/features/home/home-team-card.tsx`：加邻居副标签
  - `frontend/src/i18n/locales-data.ts`：新增 §7 所有 keys
  - 跑 `scripts/validate-i18n-keys.mjs` 验证
- **验收**：CI 拦截缺失，三语言自然度通过

**推荐执行顺序**：

- Phase 1：T1（依赖 P0-A #164 完成）
- Phase 2（并行）：T2 + T3

---

## 10. 验收标准

Wen 测试用例覆盖：

1. 首页新用户（无 users.city）看到默认深圳数据
2. 老用户（有 users.city = 深圳）看到深圳本地圈子
3. approved 已结束队伍成员算入「在行动」人数
4. cancelled 成员不算入
5. 收藏数据加 0.1 权重，但显示数字不暴露具体来源
6. 故事 + 活动动态加权后总和正确
7. 「你的邻居 N 人」仅在当前用户填了 city 时显示
8. 队伍卡邻居数：4+ 显示「4+」不显示具体数字
9. 三语言渲染完整
10. 移动端响应式（堆叠 + sm 头像）
11. 数据全空时整块不渲染
12. 性能：API 响应 ≤ 200ms
13. **tie-breaker 边界 (v1.2 新增, Martin msg=6d046a06)**: 两 location 同 `visit_score=1.5`、同 `visitor_count=1` (各 1 个 favorite), location A 的 favorite `created_at` 更晚 → top-1 是 A。Jeff seed fixture 覆盖。

---

## 11. 与 P0-A / P0-B / P0-C 的关系

| P0                  | 关系                                                          |
| ------------------- | ------------------------------------------------------------- |
| P0-A Team 行动本    | **直接依赖**：P0-A #164 加 `users.city` 字段，P0-D 才能算邻居 |
| P0-B 详情页决策信息 | 无直接依赖                                                    |
| P0-C 首页推荐位     | 视觉布局：P0-C 推荐位上，P0-D 本地圈子下                      |

**关键路径**：P0-A #164 → P0-D T1（API） → P0-D T2/T3（前端） → 上线

P0-D T1 等 P0-A #164 done 才能启动——这是清晰的串行依赖。

**v1.1 Martin 任务编号预分配**：#175（API+信号计算，**blocker = #164**）→ #176（前端本地圈子）→ #177（队伍卡邻居+i18n）。Jeff 起手 #175 时必须等 #164 done。

---

## 12. 一句话总结

**P0-D 用「在行动」替代「去过」的措辞策略 + 4-source 信号加权（PRIMARY 1.0 + SECONDARY 0.1 + SUPPLEMENTARY 1.5/1.0）+ 严格 7 天窗口 + cancelled 排除，给新用户第一视觉「有一群人在做这件事」的本地圈子感。零新表（依赖 P0-A #164 的 users.city）。主题一致性：呼应「行动本」主题。**

---

_spec v1.2 完成（2026-07-21 Jeff T1 #175 摸底 6 点 + Martin msg=7776fa59 拍板 2 点邻居 pool 语义: createdAt 时间列 / favorites 泛型 / stories.status='published' / activity_posts.status='visible' / cancelled 窄义 / score cap per-(user, location) 聚合后 / 索引 4 新增 / 邻居 tm.status='approved' only / 邻居 pool 与地点 pool 不同源）, v1.1 CR 结论沿用, Jeff T1 SQL 草图按 v1.2 落码._
