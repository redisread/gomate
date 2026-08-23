# 地点装备决策退役规范

> 状态：应用层实施中；数据库删列待 PR 1 上线验证后执行
>
> 日期：2026-08-24
>
> 决策人：Victor

## 目标

彻底移除地点模块的 `gearEssential` / `gearOptional` 能力，包括管理端录入、展示代码、Location API 契约和最终的 D1 字段与历史数据。

## 边界

- 保留地点停车、交通、季节信息及原有行为。
- 保留队伍行动本和用户资料中的装备能力。
- 保留 `extra.hiking.equipmentNeeded` 徒步攻略内容。
- 不提供替代页、跳转或装备字段兼容层。
- 历史 migration 与历史 spec 保留，不能改写。

## 两阶段发布

### PR 1：应用层退役

- 从 Drizzle 应用 schema、Location API、公开 `/v1`、OpenAPI 删除两个字段。
- 从前端类型、表单状态、草稿、保存校验和展示组件删除两个字段。
- 管理端原“决策信息”组件收缩为独立停车信息组件。
- 生产 D1 暂时保留物理列，确保旧 Worker 仍可回滚。

### PR 2：物理删列

- PR 1 上线并完成生产回归后，新建 migration 删除 `locations.gear_essential` 与 `locations.gear_optional`。
- 合并前先通过 migration ledger 在 staging 执行并验证。
- prod 变更必须提前声明并取得 Victor 或 Martin 明确批准。
- 删除后历史字段数据不可恢复；旧 Worker 版本不可直接回滚。

## 验收标准

- 地点编辑页无需装备信息即可保存，页面不再出现必带/选带装备。
- 内部 Location API、公开 `/v1` 和 OpenAPI 均不再包含两个字段。
- 地点展示代码即使收到旧字段也不渲染装备决策。
- 停车、交通、季节、队伍行动本装备、用户资料装备和徒步攻略装备不受影响。
- PR 2 完成后，`PRAGMA table_info(locations)` 不再包含两个物理列。

## 回滚

- PR 1 可直接回滚，数据库列仍存在。
- PR 2 后只允许前向修复；紧急情况下可通过新 migration 加回空列，但历史装备数据不恢复。
