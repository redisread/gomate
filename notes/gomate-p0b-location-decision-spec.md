# gomate P0-B：地点详情页决策信息设计规范 v1.1

> 需求：@Victor 2026-07-19/20（认同「体验的另一半」后，要求继续推进 P0 全套）
> 依据：`notes/gomate-ux-experience-analysis.md` §三-P0-2
> 设计者：@Steven
> 范围：地点详情页 `/locations/[id]`（改造）
> **v1.2 变更**（2026-07-28 task #203 amap 代码全删，终态口径 Martin msg=60210b6c）：
> - amap 相关条款全部废止：§3「怎么到」块的 amap 集成、§3.6 5xx 降级策略、实现段 amap 封装扩展
> - 「怎么到」区块终态 = 保留文字链形态（Transport 子区块保留静态深度链 CTA，不再 fetch amap）
> - 性质 = 代码层追认：prod 自 2026-07-20 无 key 起即此态，prod 视觉零变化
> - (a) 整块移除「怎么到」属独立产品决策，未提议未拍板，不在本变更内
> 交付给：Martin 拆任务

> **v1.1 变更**（2026-07-20 Martin CR PR #393 + Victor DM 拍板）：
>
> - §3.4 加 `parkingAvailable: boolean` 派生字段（与 parkingInfo 双轨，UI 区分「无停车信息」vs「无停车」）✅ **Victor 拍板接受**
> - §4.5 匿名访客 fallback 深圳 → 与 P0-D §6.4 共用 helper（`packages/lib/geo-fallback.ts`）
> - §3.6 amap 5xx 降级具体化：cache 24h ISR + 失败回退到「📍 在地图打开」单链接（坐标自 locations 表）+ 7 天 stale 标注
> - §6 schema 变更汇总变 4 字段（含 parkingAvailable）✅ **Victor 拍板接受**

> **范围说明**：Victor 2026-07-20 拍板「天气先不加」，故本 spec 不包含「本周天气条件」卡片。**三块**：①怎么到（amap 已接入，需显式化为决策信息块）②季节适宜度（schema 已有 bestSeason 字段，需可视化呈现）③分级装备清单（schema 已有 tips 字段，需拆出 essential/optional）

---

## 0. 目标

**让用户 3 秒内回答：「我周六早晨从福田出发能不能玩得舒服」。**

把「地点是什么」补成「我能不能去、怎么去、什么季节去合适、要带什么」。

---

## 1. 顾客损失 → 设计对应

| 顾客损失（用户勉强接受的现实） | 设计对应                                     | §   |
| ------------------------------ | -------------------------------------------- | --- |
| 「要查天气吗？」               | P1 推迟，本 spec 不含                        | —   |
| 「怎么坐车到？」               | 详情页加**「怎么到」决策信息块**             | §3  |
| 「现在这个季节合适吗？」       | 详情页加**「季节适宜度」标记**               | §4  |
| 「要带什么装备？」             | 详情页加**「分级装备清单」**                 | §5  |
| 「地铁出来要走多远？」         | 怎么到块内含**「最近地铁站 + 步行 N 分钟」** | §3  |
| 「停车方便吗？」               | 怎么到块内含**停车信息**                     | §3  |

---

## 2. 不做什么（明确边界）

- ❌ **不显示「本周天气」卡片**（Victor 拍板 2026-07-20 天气先不加）
- ❌ **不显示「实时温度」/「降水概率」**——避免引入天气 API 选型问题，留 P1
- ❌ **不显示「其他人也去过这里」**——P0-D 的事，本 spec 边界
- ❌ **不重做 LocationIntroCard 整体布局**——只在现有「徒步参数」区块下加新区块
- ❌ **不引入新的运动/活动场景**（攀岩/溯溪等）——只覆盖「徒步」一种

---

## 3. 「怎么到」决策信息块

### 3.1 位置

放在 LocationIntroCard **徒步参数区块下、装备清单上**，作为新的独立卡片区块。

### 3.2 数据来源

**全部复用现有数据**（无需新表、无需新字段）：

- **坐标**：locations 表已有 lat/lng
- **最近地铁站**：amap API（gomate 现有 `address-row.tsx:31` 已调用 amap navigation，可直接复用 + 扩展）
- **停车**：locations 表需加字段 OR 用 description 文本中关键词（见 §3.4 决策点）
- **自驾时长**：高德 amap 路径规划 API（已有 key 复用）

### 3.3 信息结构

```
┌─ 怎么到 ────────────────────────────┐
│                                       │
│  🚇 最近地铁                          │
│    地铁 4 号线 福田口岸站               │
│    A 出口出站后步行 8 分钟               │
│                                       │
│  🚗 自驾 / 打车                       │
│    距深圳市中心约 35 km                 │
│    高峰时段约 50 分钟                   │
│    [📍 在地图打开]                      │
│                                       │
│  🅿️ 停车                              │
│    山下有停车场，5 元/小时，周末紧张     │
│    或：公共交通建议（无停车信息时）       │
│                                       │
└───────────────────────────────────────┘
```

### 3.4 关键决策点（需要 Victor 拍板）

**停车信息字段问题**：gomate 当前 locations 表**没有 `parkingInfo` 字段**。

两条路：

**A. 新加 `parkingInfo: text` + `parkingAvailable: boolean` 双轨**（推荐 v1.1）

- `parkingInfo`：自由文本（<100 字），运营手动填，例：「山下停车场 5 元/小时，周末紧张」
- `parkingAvailable`：boolean 派生字段，UI 区分三种状态：
  - `true`：有停车 → 显示 `parkingInfo` 详情
  - `false`：明确无停车 → 显示「建议公共交通」
  - `null`：信息缺失 → 显示「停车信息待补」
- 避免 UI 上「无停车信息」与「无停车」混淆
- **需要 Victor 同意 2 个 schema 字段**（CLAUDE.md 红线）

**B. 用 description 中关键词自动抽取**

- 写规则匹配「停车」「parking」关键词
- 缺点：location description 是用户自由文本，关键词命中率不稳定
- 风险：抽取不到时区块显示空白

**我推荐 A**——可治理的字段 + 真实数据 + 一致体验。但需要 Victor 点头。

### 3.5 交互细节

- **「📍 在地图打开」**：调 amap navigation API（已有 `uri.amap.com/navigation` 模板复用），在新标签打开
- **地铁站步行时间**：调 amap 步行路径规划 API，超 800 米时显示「建议骑车/打车接驳」
- **自驾时长**：调 amap 驾车路径规划 API，**默认算非高峰时段**（早 10 点出发），hover 显示「高峰时段约 X 分钟」
- **未填字段不渲染**：停车未填时只显示公共交通建议，不显示空白

### 3.6 amap 5xx 降级策略（v1.1 具体化）

Martin CR 确认三段式降级：

1. **关键路径缓存**：amap 路径规划结果（地铁站 + 自驾时长）走 SSR + ISR `revalidate: 86400`（24h）。Cloudflare edge 命中，零调用
2. **失败回退**：cache miss + amap 5xx → 整块「怎么到」降级为「📍 在地图打开」单链接（坐标来自 `locations.lat/lng`，无 amap 依赖）
3. **stale 标注**：cache 数据超过 7 天显示「信息更新于 X 天前」灰色小字

**实现位置**：`api/src/utils/amap.ts` 扩展 `safeAmapCall()` 包装器，统一处理 cache + 5xx + stale 标注写入 metadata。

**前端**：组件从 API 读 `meta.stale_days` 字段，超过 7 显示 stale 提示。

### 3.6 i18n

新增 `locations.transportation.*` keys：

```
transit.subway = "最近地铁" / "Nearest Subway" / "最寄り駅"
transit.subway_walk = "{station} · 步行 {n} 分钟" / "{station} · {n}-min walk" / "{station} · 徒歩 {n} 分"
transit.drive = "自驾 / 打车" / "Driving" / "車"
transit.drive_distance = "距{landmark}约 {km} km" / "{km} km from {landmark}" / "{landmark} から約 {km} km"
transit.drive_duration = "约 {n} 分钟" / "~{n} min" / "約 {n} 分"
transit.parking = "停车" / "Parking" / "駐車場"
transit.parking_tight = "周末紧张" / "Tight on weekends" / "週末は混み合う"
transit.no_parking = "建议公共交通" / "Public transit recommended" / "公共交通機関推奨"
transit.map_link = "在地图打开" / "Open in Maps" / "地図で開く"
transit.transfer_hint = "建议骑车/打车接驳" / "Bike/taxi transfer recommended" / "自転車/タクシーで乗り継ぎ推奨"
```

---

## 4. 「季节适宜度」标记

### 4.1 位置

放在「怎么到」块下、装备清单上。

### 4.2 数据来源

- **现有字段**：`locations.bestSeason`（comma-separated，例：「Spring,Autumn」）
- **当前 i18n**：`seasons.spring/summer/autumn/winter` 已有 en/zh/ja 翻译
- **en/ja 已有月份范围**：`seasons.spring.months = "Mar-May"`（参考现成）

### 4.3 视觉结构

```
┌─ 适宜季节 ────────────────────────────┐
│                                       │
│  ✓ 推荐春季（3-5 月）                    │
│  ✓ 推荐秋季（9-11 月）                  │
│  ⚠️ 夏季闷热注意防晒（6-8 月）          │
│  ❌ 冬季雨季路滑（12-2 月）              │
│                                       │
└───────────────────────────────────────┘
```

### 4.4 推荐 vs 警示 vs 不推荐的判定逻辑

gomate 当前只有 `bestSeason` 一个字段，**没有「avoidSeason」或「seasonalWarnings」字段**。

两条路：

**A. 只用 bestSeason**（推荐 MVP）

- 只显示「推荐春/夏/秋/冬」标记
- 警示/不推荐留 P1 加字段
- 与运营当前输入心智模型对齐（运营只需填「推荐季节」）

**B. 加 seasonalWarnings 字段**

- 运营额外填「夏季闷热」「冬季雨季」等警示
- 信息更丰富但运营心智成本上升
- **需要 Victor 同意 schema 变更**

**我推荐 A**——MVP 阶段只显示推荐季节。警示/不推荐是后续 P1 的事。

### 4.5 当前季节判定逻辑

- 根据用户当前日期 + 地理位置（默认深圳 adcode）判断当前是哪个季节
- 当前季节 = 推荐季节 → 整块用 `bg-emerald-50` 标记「**现在去正好**」
- 当前季节非推荐 → 显示「**当前非最佳季节，建议春季/秋季前往**」副标题
- 季节判断用本地时间，不调远程 API
- **匿名访客 fallback 深圳**：与 P0-D §6.4「匿名 fallback 深圳」共用 helper（v1.1）

**共享 helper 位置**：`packages/lib/geo-fallback.ts`，导出 `getCurrentCity(request): string`，P0-B 和 P0-D 都用同一份。

```ts
// packages/lib/geo-fallback.ts
export function getCurrentCity(request: Request): string {
  // 1. 优先取 session 中的 users.city
  // 2. 其次取 Cloudflare CF-IPCity header
  // 3. 最后 fallback "shenzhen"（gomate 主战场）
}
```

### 4.6 i18n

新增 `locations.season.*` keys：

```
season.title = "适宜季节" / "Best Season" / "ベストシーズン"
season.now_optimal = "现在去正好" / "Now is the best time" / "今がベストシーズン"
season.not_now = "当前非最佳季节" / "Not the best season now" / "今はベストシーズンではありません"
season.recommended = "推荐{season}" / "Recommended: {season}" / "{season} 推奨"
season.warning = "建议{season}前往" / "{season} recommended" / "{season} 推奨"
season.now = "现在" / "Now" / "現在"
season.months = "{start}-{end} 月" / "{start}-{end}" / "{start}月-{end}月"
```

**复用现有 `seasons.spring/summer/autumn/winter.label`**（已在 locales-data.ts），不重复定义。

---

## 5. 分级装备清单

### 5.1 位置

放在季节适宜度块下、组队 tab 上。

### 5.2 数据来源

- **现有字段**：`locations.tips`（自由文本，例：「穿登山鞋、备 2L 水、防晒霜」）
- **没有专门的 `gear` 字段**

### 5.3 视觉结构

```
┌─ 装备清单 ────────────────────────────┐
│                                       │
│  ✓ 必带                                │
│    登山鞋 · 2L 水 · 防晒霜 · 帽子         │
│                                       │
│  ◯ 选带                                │
│    登山杖 · 护膝 · 头灯 · 备用电池        │
│                                       │
│  📝 注意事项                            │
│    山顶风大，建议带薄外套                  │
│    中途无补给站                        │
│                                       │
└───────────────────────────────────────┘
```

### 5.4 数据结构（关键决策）

**当前 tips 是自由文本**——运营写「登山鞋、2L 水、防晒霜」。要做分级装备，必须有结构化字段。

三条路：

**A. 加结构化字段**（推荐）

- 新字段：`gearEssential: text`（comma-separated，「登山鞋,2L 水,防晒霜,帽子」）
- 新字段：`gearOptional: text`（comma-separated，「登山杖,护膝,头灯,备用电池」）
- 保留 `tips` 字段做「注意事项」自由文本
- 运营心智成本低（3 个字段对齐三块视觉）
- **需要 Victor 同意 schema 变更**

**B. 自动从 tips 抽取关键词**

- 用关键词匹配（鞋/水/霜/帽）分类
- 缺点：tips 写「建议穿运动鞋、备两瓶水」，关键词命中但语义不严
- 风险：抽取不准确时用户对清单失去信任

**C. 不分级，只显示自由文本 tips**

- 视觉单薄，P0-B 价值打折
- 不推荐

**我推荐 A**——一次 schema 变更换 3 块结构化视觉，运营填表成本只增加 1 行。

### 5.5 i18n

新增 `locations.gear.*` keys：

```
gear.title = "装备清单" / "Gear List" / "装備リスト"
gear.essential = "必带" / "Essential" / "必携"
gear.optional = "选带" / "Optional" / "任意"
gear.notes = "注意事项" / "Notes" / "注意事項"
```

---

## 6. schema 变更请求汇总（需 Victor 一次性拍板）

如果 Victor 接受 §3.4-A / §5.4-A，P0-B 需要 **4 个新字段**（v1.1 含 parkingAvailable 派生字段）：

| 表          | 字段                | 类型              | 说明                                         |
| ----------- | ------------------- | ----------------- | -------------------------------------------- |
| `locations` | `parking_available` | boolean, nullable | 停车状态：true=有 / false=无 / null=信息缺失 |
| `locations` | `parking_info`      | text, nullable    | 停车信息，自由文本，<100 字                  |
| `locations` | `gear_essential`    | text, nullable    | 必带装备，comma-separated                    |
| `locations` | `gear_optional`     | text, nullable    | 选带装备，comma-separated                    |

**保留**：`tips` 字段做「注意事项」自由文本，不替换。

**风险评估**：

- 4 个字段全部 nullable（boolean nullable 三态），旧数据自动兼容
- Drizzle migration 新增字段无破坏性
- 可与 P0-A 的 `teams.checklist` / `users.city` migration 一起做（独立表）
- 不需要数据回填（旧 location 字段全 null，前端按未填处理）

**CLAUDE.md 红线触发**：这是 schema 变更，需要 Victor 明确同意。已在 §3.4 / §5.4 标记，需在本 spec 评审时一次拍板。

---

## 7. 性能与实现约束

- **「怎么到」块**的地铁站/驾车时长用 SSR 渲染 + ISR（revalidate 24h），不实时调用 amap
- **amap API 调用**走现有封装（gomate 有 shared utils），统一 5xx 错误处理
- **季节判断**纯前端逻辑（基于当前日期 + 地理位置），无远程调用
- **装备清单**纯静态渲染，无交互
- **数据未填时**整块不渲染（不占视觉空间）

---

## 8. 交付给 Martin 的任务拆分建议

按依赖 + 可并行性，建议拆 3 个子任务：

### T1：schema + API（后端基础）

- **改动**：
  - `api/src/db/schema.ts`：locations 表加 3 个字段（`parking_info` / `gear_essential` / `gear_optional`）
  - drizzle migration（仅新增 nullable 字段）
  - `api/src/routes/locations/queries.ts`：GET location 详情 include 新字段
  - `api/src/utils/amap.ts`：扩展封装驾车路径规划 + 步行路径规划接口
- **依赖**：amap API key 已在 .env，零外部依赖
- **验收**：3 字段 nullable 默认、旧数据兼容、amap 调用 5xx 错误降级

### T2：详情页三块视觉（前端主要工作量）

- **依赖**：T1
- **改动**：
  - `frontend/src/components/features/location-detail/`：新增 `transport-block.tsx`（怎么到）、`season-block.tsx`（季节适宜度）、`gear-block.tsx`（装备清单）
  - 三块插入到现有 `LocationIntroCard` / `RouteInfoCard` 之间
  - 「现在去正好」用 emerald-50 背景高亮
  - 装备 essential/optional 分级图标（✓ 和 ◯）
- **验收**：未填字段不渲染、当前季节判断准确、三语言 i18n keys 完整

### T3：i18n keys + 运营后台录入支持

- **依赖**：T1
- **改动**：
  - `frontend/src/i18n/locales-data.ts`：新增 §3.6 / §4.6 / §5.5 所有 keys（zh/en/ja）
  - `frontend/src/pages/admin/` 区域的管理表单（如有）：加 parking_info / gear_essential / gear_optional 输入框
  - 验证脚本 `scripts/validate-i18n-keys.mjs` 跑过
- **验收**：3 语言 key 数量一致、CI 拦截缺失

**推荐执行顺序**：

- Phase 1：T1（schema 变更需 Victor 一次性同意）
- Phase 2（并行）：T2 + T3

---

## 9. 验收标准

Wen 测试用例覆盖：

1. location 详情页未填新字段时，三块都不渲染（不显示空态卡片）
2. location 详情页填了新字段，三块按 §3.3 / §4.3 / §5.3 结构渲染
3. 当前日期在 recommended season → 显示「现在去正好」高亮
4. 当前日期不在 recommended season → 显示「当前非最佳季节」副标题
5. amap 5xx 错误降级（地铁站/驾车时长字段不渲染，其他字段保留）
6. 三语言 i18n 完整（zh/en/ja），无遗漏 key
7. 移动端三块折叠/展开交互（与现有 RouteInfoCard 行为一致）

---

## 10. 与 P0-A / P0-C / P0-D 的关系

| P0               | 关系                                                                                     |
| ---------------- | ---------------------------------------------------------------------------------------- |
| P0-A Team 行动本 | 无 schema 冲突；T1 都可与 #163/#164 migration 一起做                                     |
| P0-C 首页推荐    | 详情页新增的「季节适宜度」可作为 P0-C「稳的」推荐位的输入信号（推荐季节 × 当前季节匹配） |
| P0-D 本地圈子    | 无直接依赖                                                                               |

**合并建议**：如果 Victor 同意本 spec 3 字段 schema 变更，可与 P0-A #163/#164 / P0-C 推荐位规则 / P0-D 本地圈子 B 方案**一起评估**，作为单次「P0 全套 schema 变更」提交给 Victor 拍板，避免多次打扰。

---

## 11. 一句话总结

**P0-B 把地点详情页从「地点是什么」补成「我能不能去、怎么去、什么季节去合适、要带什么」——通过「怎么到」+「季节适宜度」+「分级装备清单」三块结构化信息，对应每个顾客损失点直接消除。需要 Victor 同意 3 个 nullable 字段的 schema 变更。**

---

_spec v1.1 完成（Martin CR PR #393 pass + Victor 拍板 4 字段 schema 全部通过），等提 Martin 拆任务。_
