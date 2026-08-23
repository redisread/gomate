# Capability Map: 管理员内容管理与地点快速录入

状态：已批准（2026-08-23）

| Module id                   | Responsibility                                                                                    | Depends on                                          |
| --------------------------- | ------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `admin-platform`            | 统一管理员鉴权边界、独立后台布局与导航、响应式后台入口，以及全站“快速添加地点”承载入口            | —                                                   |
| `activity-catalog`          | 全局活动类型数据模型、管理 API、增改与启停、启用类型查询，以及历史引用保留合同                    | `admin-platform`                                    |
| `tag-catalog`               | 标签列表、新增、重命名、引用计数、确认解除关联与删除                                              | `admin-platform`                                    |
| `user-role-admin`           | 已有用户的后台查询与角色调整；禁止修改自己及撤销最后一名管理员                                    | `admin-platform`                                    |
| `location-workflow`         | 地点后台列表、15 秒快速草稿、完整编辑、发布校验、归档与受限永久删除，以及可选的标签和推荐活动类型 | `admin-platform`, `activity-catalog`, `tag-catalog` |
| `team-activity-integration` | 队伍必选全局启用活动类型；优先展示地点推荐类型但不施加限制；历史队伍保留停用类型                  | `activity-catalog`, `location-workflow`             |

构建顺序：

```text
admin-platform
      ↓
activity-catalog ─┐
tag-catalog ──────┼─→ location-workflow → team-activity-integration
user-role-admin ──┘
```

`activity-catalog`、`tag-catalog` 和 `user-role-admin` 在 `admin-platform`
完成后可以并行。`user-role-admin` 不构成地点流程的技术依赖，但属于同一首期后台范围。

## Module specs

- [`admin-platform`](SPEC-admin-platform.md)：Phase 4 实施中（Checkpoint A 已完成，Task 3 待实施）
