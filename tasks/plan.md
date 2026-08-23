# Implementation Plan: 管理员内容管理与地点快速录入

## Overview

在已完成的管理员平台上，依次交付全局活动目录、标签和用户角色管理、地点快速草稿与完整生命周期，最后解除队伍活动类型对地点推荐的错误约束。

## Architecture Decisions

- 新增 `activity_types` 目录；活动 ID 稳定，改名和停用不改变历史引用。
- 保留地点现有多值 JSON 字段作为活动 ID 列表，迁移旧值并由 API 校验目录，避免在部署窗口破坏旧 Worker。
- 重建 `teams` 的固定四值 CHECK，保留列名并增加目录外键；旧 Worker 与新 schema 同时可用。
- 地点草稿允许坐标、封面为空；只有发布边界要求完整。
- 所有管理员写入口复用 `requireAdmin`，跨表不变量在最终条件 DML 中复核。

## Task List

### Phase 1: Catalog foundation

- [ ] 1. 活动目录 schema、迁移、合同与 API
- [ ] 2. 活动目录后台页面
- [ ] 3. 标签统计/重命名/确认删除 API 与页面
- [ ] 4. 用户列表/角色安全变更 API 与页面

### Checkpoint: Catalogs

- [ ] 目录和角色聚焦测试、迁移同步、类型检查通过

### Phase 2: Location workflow

- [ ] 5. 草稿可空字段与发布完整性 API
- [ ] 6. 快速草稿交互（基本字段与可选扩展）
- [ ] 7. 地点后台列表、完整编辑、归档与受限永久删除

### Checkpoint: Locations

- [ ] 管理员地点 E2E 在桌面/移动端通过

### Phase 3: Team integration

- [ ] 8. 队伍动态活动写入合同与查询
- [ ] 9. 创建队伍推荐优先但不限制
- [ ] 10. 动态筛选与历史活动名称显示

### Phase 4: Delivery

- [ ] 11. 更新现行文档、数据库计数和设计系统说明
- [ ] 12. 完整门禁、浏览器验证、代码评审与简化
- [ ] 13. 删除一次性规格/计划，更新并推送 PR #602，等待检查

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| 表重建影响旧 Worker | 高 | 保留列名/语义，迁移先兼容旧代码，并做迁移后 schema/数据测试 |
| 停用与队伍创建竞争 | 高 | 最终 INSERT/UPDATE 使用启用目录 EXISTS 条件 |
| 快速草稿误导为已发布 | 中 | 明确“草稿”状态和继续完善入口，不生成虚假坐标/封面 |
| 标签删除误解除大量关系 | 中 | 返回引用计数，必须显式确认，D1 batch 原子执行 |

## Open Questions

无；所有产品假设已由用户确认。
