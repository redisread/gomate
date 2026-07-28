# gomate 简化分析：仅保留 locations，去掉路线与 POIs
> **状态：已上线（2026-07-26 d0862af）**

> 需求：@Victor DM（2026-07-18，task #18）
> 分析者：@Steven
> 结论：**可行，且推荐。产品实际上已经是 locations 中心——路线和 POIs 是「幽灵概念」，有数据模型和完整 CRUD API，但没有独立页面、没有导航入口、路线甚至没有创建 UI。简化 = 删除幽灵层，把有价值的路线元数据扁平化为 location 字段。**

---

## 一、现状事实（代码勘察结论）

### 1.1 用户视角：routes/POIs 已经几乎不存在

| 维度             | 现状                                                                                                   |
| ---------------- | ------------------------------------------------------------------------------------------------------ |
| 独立页面         | ❌ 无 `pages/routes/`、无 `pages/pois/`                                                                |
| 导航入口         | ❌ 主导航只有 Home / Locations / Teams / Discover                                                      |
| 路线创建/编辑 UI | ❌ **完全没有**——routes 有完整 CRUD API（379 行），但前端没有任何地方调用创建/编辑，只有 seed 脚本在用 |
| POI 曝光         | 仅 2 个组件：详情页 PoiSection + 编辑表单里的 POI 链接弹窗                                             |
| 路线曝光         | 仅作为 location 卡片/详情页的元数据（难度/时长/距离/爬升）+ 组队页路线选择器                           |

**用户心智模型今天就已经是「地点 + 组队 + 故事」**。路线和 POI 对用户来说是「不知道从哪里来的字段」，不是可理解的产品概念。

### 1.2 数据模型：locations 是枢纽，routes/POIs 是卫星

```
locations（枢纽，独立存在）
 ├── routes（必须挂在 location 下，cascade）—— 难度/时长/距离/爬升/攻略 JSON
 ├── teams（必须有 location；routeId 可选，set null）
 ├── stories（locationId 可选）
 ├── activity_posts（locationId 可选）
 └── tags / favorites / share_events（多态关联）

pois（独立表）── 通过 entity_to_pois 多态挂到 route/location/city
```

- locations 完全不依赖 routes/POIs 存在，删除卫星不伤枢纽
- teams 的**难度筛选**和**时长推荐**目前 join routes 表——这是路线数据唯一的硬功能依赖
- 内容量：seed 数据 11 locations / 4 routes / 3 POIs；POI 连本地同步脚本都没有（最不维护的数据集）

### 1.3 唯一真实价值：路线元数据

路线对用户唯一可见的价值是 location 卡片上的决策信息：**难度、时长、距离、爬升**。这是户外产品的高价值字段，不该丢——但它不需要「路线」这个概念来承载。

注意：seed 数据里**梧桐山有 2 条路线（轻松线/挑战线）**，多路线是真实存在的内容模式，扁平化需要决策（见 §4）。

---

## 二、可行性分析

### 2.1 技术可行性：高

删除面（全部为删除/精简，无新增复杂度）：

| 层       | 改动                                                                                                                                                       |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API      | 删 `hiking-routes.ts`（379 行）、`pois.ts`（244 行）；`locations/queries.ts` 去掉 routes 嵌入和 `/:id/pois`；`teams/queries.ts` 难度筛选改指 location 字段 |
| 前端     | 删 RouteInfoCard、PoiSection、PoiEditModal、组队页路线选择器；location 卡片元数据改读 location 自身字段（约 6-8 个文件）                                   |
| DB       | locations 表加 4-5 个字段（difficulty/duration/distance/elevation），从 routes 回填；teams.routeId 移除；drop routes/pois/entity_to_pois 三表              |
| i18n     | 清理 pois.json（39 keys/语言 ×3）+ 散落 route keys                                                                                                         |
| 不受影响 | stories、favorites、share、cities、amap、auth、消息、管理后台主体                                                                                          |

**没有循环依赖、没有需要保留的双写、没有外部消费者**（routes API 只有 seed 脚本调用）。这是一次纯减法重构。

### 2.2 用户理解体验：改善，不是受损

1. **概念数从 3 减到 1**：用户只需理解「地点」。今天路线/POI 是幻影字段——用户看到「难度：中等」却找不到任何地方管理或浏览「路线」，认知上是悬空
2. **信息不减**：难度/时长/距离/爬升保留为地点属性，决策信息零损失
3. **内容门槛降低**：运营/管理员只需维护 locations 一个实体。今天 POI 数据基本荒废（3 条、无同步），路线无创建 UI——半死不活的功能比没有更伤体验
4. **导航、首页、sitemap 零改动**：它们本来就不含 routes/POIs

### 2.3 风险与代价

| 风险                              | 评估                                   | 缓解                                             |
| --------------------------------- | -------------------------------------- | ------------------------------------------------ |
| 多路线地点（梧桐山轻松线/挑战线） | 真实内容模式，扁平化后只能保留一套数据 | 见 §4 决策点 2                                   |
| teams.routeId 已有数据            | 需迁移                                 | 迁移脚本 + D1 batch 事务（#148 教训）            |
| 未来想做多路线                    | 删表后重建成本高                       | 如果 12 个月内有多路线规划，重新考虑；否则 YAGNI |
| DB schema 变更                    | 红线操作                               | 需 Victor 确认 + 迁移前备份 + staging 先验       |

---

## 三、推荐方案：「地点即一切」

**保留**：locations 作为唯一地理实体，吸收路线的核心元数据为扁平字段：

```
locations += difficulty（难度）、durationMin/Max（时长）、distance（距离）、elevation（爬升）
```

**删除**：routes 表、pois 表、entity_to_pois 表、相关 API/组件/i18n。

**产品叙事变化**：

- 之前：地点 →（可能有多条）路线 →（沿途）POI，三层概念
- 之后：地点就是路线。一个地点 = 一个目的地 + 它的徒步参数
- 详情页 RouteInfoCard 变成「徒步参数」区块（字段不变、数据源变），用户无感

**实施顺序建议**（如 Victor 批准，走 Martin 拆分）：

1. locations 加字段 + 从 routes 回填（保留 routes 表，双读验证）
2. 前端/teams 切换到 location 字段
3. 删 POI 相关（独立、无依赖，可先删）
4. 冻结 routes 写入，删表 + 清理 API/i18n
5. 全程 staging 先验 + 线上回归

---

## 四、决策记录（Victor 2026-07-18 已决）

1. **路线元数据保留方式**：✅ **A. 扁平化为 location 字段**（难度/时长/距离/爬升保留）
2. **多路线**：✅ **彻底不要多路线概念**。一个 location = 一套徒步参数；回填时取主路线，差异写进地点描述。今后某地点确有两种体验，拆成两个 location 即可（数据层逃生门，无需 schema）
3. **POI**：✅ **彻底删除**，不留纯文本字段（POI 内容仅 3 条且荒废，「途经点」信息由地点描述承载；留字段 = 留一个没人维护的半成品）
4. **DB schema 变更 + 数据迁移**：✅ **已批准**

**方案定稿（最终范围）**：

- locations 增加 `difficulty`、`durationMin`、`durationMax`、`distance`、`elevation` 五个字段，从主路线回填
- 删除 routes、pois、entity_to_pois 三表；teams.routeId 移除
- API 删 `hiking-routes.ts`、`pois.ts`；locations 去 routes 嵌入和 `/:id/pois`；teams 难度筛选/时长推荐改指 location 字段
- 前端删 RouteInfoCard（改「徒步参数」区块读 location 字段）、PoiSection、PoiEditModal、组队页路线选择器
- i18n 清理 pois.json（39 keys ×3 语言）+ 散落 route keys
- 迁移用 D1 batch 事务，staging 先验，迁移前备份

---

## 五、一句话总结

**gomate 今天的真实产品就是 locations，路线和 POIs 是没来得及删的脚手架。简化不是「砍功能」，是「承认现实」——把路线的四个有用字段搬进化地点，其余删掉，用户理解成本下降、运营维护成本减半、代码净减约 1000+ 行。**

---

_分析完成。等 Victor 对 §4 四个决策点的指示。_
