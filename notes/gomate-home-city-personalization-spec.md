# gomate 首页个性化（city 维度）spec v1.1

> 立项：2026-07-26 Victor DM（msg=fa6418e1）「本周去这三个 和 探索地点 都一起改造，你先设计产品方案」+ 前置 DM（msg=cace1ea2）反馈「gomate 用户设置了地点，但是在首页展示的不是该地点的推荐」
> 作者：@Steven｜CR：@Martin（msg=c034dc4b PASS v1.1 口径）｜实现：@Jeff / @Bob
> 触发：P0-C spec v1.1 §386 行写明「city 过滤属 P1 待细化」，本次正式立 P1
> 事实基线（一手核实 origin/main）：`api/src/services/recommendations.ts:225-291` fetchSignals SQL 无 city 过滤；`api/src/routes/locations/queries.ts:65/81` 支持 `?cityId=`；前端 `frontend/src/hooks/use-locations.ts:33` 未传 cityId；`use-local-circle.ts:30-32` 已正确传 cityId（本地圈子模板已就绪，本 spec 复用同模式）；seed 数据：深圳 city_sz 3 个地点 + 广州 city_gz 1 个地点（**真实用户 city 字段全 NULL，本 spec 解决「写入链路已上线但首页无响应」的预见性问题，不是修当前 bug**）
>
> **v1.1 变更（2026-07-26 Martin CR + Victor 拍板）**：
> ① Q2 异地文案定「热门」（隐藏深圳措辞，避免吐槽；Victor msg=abd23a91）
> ② Q3 城市 chip 不可点击（与 #185 引导卡 CTA 一致；Victor msg=abd23a91）
> ③ Q1 阈值改动态：候选 ≥ 阈值即纯 city 池，< 阈值即混搭兜底（Martin 拍 A 路径）
> ④ cache key 加 city 维度，与 SQL filter 同 commit 内原子完成（Martin 防跨城 cache 污染）
> ⑤ i18n 命名空间与占位规范见 §4.4

---

## 0. 一句话

**让首页的两块内容真正用上用户的城市**：本周三个选择按 city 软过滤候选池 + 探索地点按 city 优先 + 异地用户的「你城市的地点」明示。本质是把 #181 city 写入链路的价值兑现到首页内容。

## 1. 现状问题（Victor 反馈）

1. **本周三个选择**（`/api/recommendations/home`）：候选池 SQL 全表，过滤规则只用 city 算季节 + cache key——非深圳/异地用户设了 city 后，三卡仍是深圳地点（因为 locations 表 95%+ 是深圳）
2. **探索地点**（`/api/locations?page=1&pageSize=6`）：前端 hook 不传 cityId，等价全表取最近 6 条，与用户 city 无关
3. 本地圈子（`/local-circle/home`）已正确传 cityId，**作为本 spec 复用模式**

## 2. 设计原则

- **复用 > 重建**：use-local-circle 的 cityId 模式已上线，本 spec 不发明新约定
- **软过滤 > 硬过滤**：异地用户零候选时**回退热门**，绝不显示空白（graceful degradation）
- **明示 > 隐式**：用户异地/候选少时显式提示「展示深圳热门」，避免「我设的城市没生效」的隐性事故
- **不破坏已有验收**：本周三个选择的 cache 复用（spec §5.2 v1.1）继续生效，只是 cache key 增加 city 维度

## 3. 产品行为矩阵

| 用户态 | city 状态 | 本周三个选择 | 探索地点 |
|---|---|---|---|
| 匿名 | 无 city | 全表（现状，季节算 fallback 深圳） | 全表热门 6 条（现状） |
| 登录已设 city | city = 深圳 | city 过滤（≈全表，因为表里几乎都是深圳） | cityId=深圳过滤 6 条 |
| 登录已设 city | city = 杭州 | 杭州优先；不足 3 张时混搭深圳热门兜底 | cityId=杭州过滤 6 条；不足时回退深圳热门 |
| 登录已设 city | city = 不存在地点的城市（如拉萨） | 全表热门（spec 软过滤） | 同上，明示「拉萨暂无 → 深圳热门」 |
| 登录未设 city | city = null | 全表（fallback 深圳季节） | 全表热门 6 条 |

**「不足」阈值（v1.1 动态规则）**：
- **本周三个选择**：city 过滤后 `pool.length ≥ 3` → 纯 city 池；< 3 → 启动混搭（city 池 + 深圳热门池合并去重，按 score 排序取 top 3）；= 0 → 全用深圳热门（等同现状）
- **探索地点**：city 过滤后 `results.length ≥ 6` → 纯 city；< 6 → 补深圳热门至 6 条；= 0 → 全用深圳热门
- **阈值意义**：触发即「graceful degradation」——避免异地用户首页空白
- **cache 分桶**：每城 2 桶（pure / mixed），cache key 加 `:pure` / `:mixed` 后缀（§4.1 详）

## 4. 实现方案

### 4.1 后端

#### `/api/recommendations/home` 软过滤（api/src/services/recommendations.ts）

- `fetchSignals` 增加可选 `cityFilter?: string | null` 参数
- SQL 末尾加 `WHERE l.cityId = ${cityFilter}`（参数化防注入）
- 算法入口 `recommendHome`：根据 `getCurrentCity` 结果决定：
  - city = fallback（深圳）+ sessionCity = null → 不传 cityFilter（全表，现状）
  - city = sessionCity 真实值 → 传 cityFilter
- 候选不足时（filter 后 < 3 张）→ 二次 SQL `fetchSignals` 不带 filter，全表兜底，两池合并后跑 `computePool`
- `cache key` 增加 city 维度：异地用户和深圳用户**不共享候选池**，避免 cache 跨城污染
- 响应增加 `_meta.cityMatch: 'exact' | 'mixed' | 'fallback'` 让前端可显示「混搭热门」标识（可选 N1）

#### `/api/locations?cityId=xxx` 增强（api/src/routes/locations/queries.ts）

- cityId 过滤逻辑已存在（line 81），**不重写**
- 增加：cityId 过滤后结果 < pageSize → 自动二次查询不带 cityId 的热门 pageSize-N 条合并
- 响应增加 `_meta.cityMatch` 同上

### 4.2 前端

#### 本周三个选择（`home-recommendations-section.tsx`）

- 不动 UI 结构（保留首页极简 v1.1 验收）
- 不动请求结构（fetch `/api/recommendations/home` 不带参数，city 由 session 提供）
- 备选 N1：响应 `_meta.cityMatch: 'mixed' | 'fallback'` 时，卡片下方小灰字「混搭深圳热门」一行（可选，A/B 时定）

#### 探索地点（`home-locations-section.tsx` + `use-home-data.ts`）

- `useHomeData` 接收 `userCity?: string | null`（useSession 提供）
- `useLocations(page, pageSize, initialData, cityId?)` 增加 cityId 可选参数
- 城市未设 → 不传 cityId（现状）；设了 → 传 cityId
- 标题右侧加城市 chip：「📍 深圳」（仅登录 + 已设时显示，匿名/未设不显示，与 #185 引导卡口径一致）
- 备选 N2：城市 chip 可点击跳「设置城市」页（与 #185 引导卡 CTA 复用）

### 4.3 数据 fact-check

- [x] ~~Jeff 跑 `SELECT cityId, COUNT(*) FROM locations GROUP BY cityId`~~ —— **取消**（事实层：seed 数据已覆盖阈值推导；动态规则下不需要硬绑数字）
- [x] ~~Jeff 跑 `SELECT cityId, COUNT(*) FROM users WHERE city IS NOT NULL GROUP BY cityId`~~ —— **取消**（用户 city 全 NULL，spec 解决「写入链路已就绪但首页无响应」的预见性问题，不是修当前 bug）
- seed 数据已用：深圳 3 个地点（city_sz）+ 广州 1 个地点（city_gz）—— 广州用户必触发混搭阈值，证明动态规则必要

### 4.4 i18n（v1.1 新增）

挂 `home.recommendations.cityHint` / `home.locations.cityChip` 命名空间，复用 `home.localCircle.neighborCount` 的 `{city}` 占位惯例：

| key | zh-CN | en | ja |
|---|---|---|---|
| `home.recommendations.cityHint.mixed` | `混搭{city}热门` | `Mixed with {city} popular picks` | `{city}の人気とミックス` |
| `home.recommendations.cityHint.fallback` | `{city}暂无推荐，看看其他热门` | `No picks for {city} yet — see other popular` | `{city}のおすすめはまだありません — 他の人気をチェック` |
| `home.locations.cityChip` | `📍 {city}` | `📍 {city}` | `📍 {city}` |

三语各 3 条，共 9 条。`city` 占位由前端通过 `i18n.format()` 注入（与 #185 引导卡同款机制）。

## 5. 验收标准

1. 异地登录用户（如杭州）首页：本周三个选择 ≥ 1 张是杭州地点 + 探索地点前 6 条 ≥ 3 条是杭州地点（数据允许范围内）
2. 异地零候选用户（如拉萨）：首页显示深圳热门 + 明示「拉萨暂无推荐，深圳热门」一行小灰字
3. 匿名/未设 city 用户：行为与现状完全一致（无 regression）
4. 缓存：异地用户与深圳用户 cache key 不串扰
5. 本地圈子（已上线）行为不回归
6. i18n 三语通过；移动端横滑/紧凑卡行为不破

## 6. 任务拆分建议

| 任务 | 内容 | 工作量 |
|---|---|---|
| T1 | 后端 recommendations.ts 软过滤 + cache key city 维度（pure/mixed 分桶）+ _meta.cityMatch ——**单 commit 内原子完成**（Martin 防跨城 cache 污染） | M |
| T2 | 后端 locations/queries.ts city 不足回退 + _meta.cityMatch | S |
| T3 | 前端 useHomeData + useLocations cityId 参数 + 标题城市 chip（不可点击）+ 异地明示（§4.4 文案） | S-M |
| T4 | i18n keys（§4.4 三语 9 条） | S |

T4 与 T1+T2 可并行（不同模块 / 不同文件），T3 等 T1/T2 后端 ready 才能闭环（消费 _meta.cityMatch）。

## 7. Out of scope

- 不动首页极简视觉（v1.1 已收官）
- 不动 P0-A / P0-B / P0-D 任何 spec
- 不动 use-local-circle 的 cityId 模式（已正确）
- 不做按用户徒步历史的个性化（#182 P2）

## 8. 风险与回滚

- **风险 1**：软过滤触发频率远超预期 → cache miss 飙升 → Jeff 监控 cache hit rate，回滚阈值降级到硬过滤（B 路径）
- **风险 2**：异地明示文案引发「为啥默认深圳」的吐槽 → 文案改为「按热门排序」（隐藏默认城市）
- **回滚**：所有改动走独立 PR（推荐 home + locations + 前端），不与本周极简 PR 链合并；revert 单 PR 即可全回退

---

_v1.0 2026-07-26 @Steven。事实基线一手 grep：`fetchSignals` SQL 全表（recommendations.ts:225-291）/ `?cityId=` 后端已支持（locations/queries.ts:65/81）/ 前端未传（use-locations.ts:33）/ 本地圈子已传（use-local-circle.ts:30-32 复用模式）/ 用户 city 写入链路已就绪（#181）。_

_v1.1 2026-07-26 @Steven。Martin CR msg=c034dc4b PASS 阈值动态 + cache key 随 T1 + i18n 命名空间；Victor DM msg=abd23a91 拍 Q2「热门」+ Q3 chip 不可点击；fact-check 双取消（seed 已证伪硬绑数 + city 全 NULL 是预见性问题）。4 任务 T1/T2/T4 并行 + T3 串行依赖。_