# gomate P0-D：首页「本地圈子」设计规范 v1.1

> 需求：@Victor 2026-07-20 DM（继续推进 P0 全套） + Victor 反问「B 方案是否用户体验良好」后确认 B 修正版
> 依据：`notes/gomate-ux-experience-analysis.md` §三-P0-4
> 设计者：@Steven
> 范围：首页 `/`（改造）—— 在 P0-C 推荐位下、Locations 区块上插入「本地圈子」 + 队伍卡「邻居 X 人参加」
> 交付给：Martin 拆任务

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
| **SECONDARY**：收藏                     | **0.1** | `user_favorites.createdAt > now() - 7d` AND location_id 匹配                                                                    |
| **SUPPLEMENTARY**：故事                 | **1.5** | `stories.publishedAt > now() - 7d` AND status='published' AND location_id 匹配                                                  |
| **SUPPLEMENTARY**：活动动态             | **1.0** | `activity_posts.publishedAt > now() - 7d` AND location_id 匹配                                                                  |

**最终 visit_score = sum(信号 × 权重)**，按 score 排序取 top 3。

**v1.1 防刷分**：单一用户对单个 location 的总 score 上限 **3.0**（防止单 user 发多篇故事 → 1 人贡献 5 × 1.5 = 7.5 score 顶替 7 个 approved 成员）

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
- **v1.1 复合索引清单**：
  - `team_members(team_id, status)`
  - `team_members(user_id)`
  - `stories(location_id, status, published_at)`
  - `activity_posts(location_id, published_at)`
  - `user_favorites(location_id, created_at)`
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

| 依赖项                                | 来源                              | 状态           |
| ------------------------------------- | --------------------------------- | -------------- |
| `users.city`                          | P0-A #164（已立项，待 Jeff 实施） | 🟡 in_progress |
| `team_members.status='approved'` 过滤 | 现有 schema                       | ✅             |
| `teams.endTime`                       | 现有 schema                       | ✅             |
| `user_favorites.createdAt`            | 现有 schema                       | ✅             |
| `stories.publishedAt`                 | 现有 schema                       | ✅             |
| `activity_posts.publishedAt`          | 现有 schema                       | ✅             |
| `cities` 表 + `locations.cityId`      | 现有 schema                       | ✅             |

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

_spec v1.1 完成（Martin CR PR #393 pass + Victor 拍板 P0 不做 A/B 测试），等 Victor 对 §5「在行动 vs 去过」措辞策略确认后提 Martin 拆任务。_
