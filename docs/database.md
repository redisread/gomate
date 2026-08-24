# GoMate 数据库

本文记录当前 D1 模型的领域边界、关系和必须长期保持的约束。可执行事实的优先级为：

1. [`src/server/db/schema.ts`](../src/server/db/schema.ts)
2. [`migrations/`](../migrations/)
3. migration journal、snapshot 与数据库合同测试
4. 本文

不要把本文当作 DDL 来源，也不要在文档中复制完整字段清单。

## 基线与约定

- Cloudflare D1 / SQLite，binding 为 `DB`，数据库为 `gomate-db-v3`。
- 当前 migration 链为 `0000_init.sql` baseline、`0001_reference_data.sql` 稳定参考数据、
  `0002_account_issuer.sql` Better Auth 账户 issuer 升级、`0003_import_v2_catalog.sql`
  旧库公开目录导入、`0004_fix_wutongshan_cover_image.sql` 梧桐山封面 URL 修复，以及
  `0005_admin_location_drafts.sql` 地点草稿与活动类型代码枚举升级、
  `0006_remove_location_decision_info.sql` 地点装备 JSON 清理；journal 与 snapshot 必须逐条对应。
- 当前 schema 包含 19 张业务表和 13 个触发器；CI 会校验 schema、migration 链与 snapshot 一致。
- 时间在 D1 中存 Unix 毫秒，HTTP DTO 输出 ISO 8601。
- JSON 列使用 Drizzle `mode: "json"`，D1 通过 `json_valid` 与 `json_type` CHECK 约束形状；业务层只传对象或数组。
- 稳定 Region、Location、Tag 参考数据由 `0001_reference_data.sql` 管理；
  `0003_import_v2_catalog.sql` 在保留 v3 现有数据的前提下，从已退役的 v2 补入 16 个地区和
  36 个公开地点；`0004_fix_wutongshan_cover_image.sql` 只修复仍使用已退役静态路径的
  v3 梧桐山参考地点。旧库没有可迁移的用户、凭据、会话、团队或故事数据；测试用户和可变
  demo 数据只能由测试 fixture 创建。
- 所有 DDL 只通过 migration；已应用 migration 不可改写。

## 领域表

| 领域 | 表                                                 | 核心职责                                |
| ---- | -------------------------------------------------- | --------------------------------------- |
| 认证 | `users`, `sessions`, `accounts`, `verifications`   | 用户、凭据、会话与一次性 challenge      |
| 地理 | `region`, `locations`                              | Region 层级、地点内容与推荐活动类型     |
| 标签 | `tags`, `location_tags`, `team_tags`, `story_tags` | 共享标签词典与明确的资源关联            |
| 组队 | `teams`, `team_join_requests`, `team_members`      | Team 生命周期、申请和 active membership |
| 内容 | `stories`, `story_likes`                           | 普通 Story、队伍回顾与点赞计数          |
| 收藏 | `user_location_favorites`, `user_story_favorites`  | 资源专用收藏关系                        |
| 消息 | `conversations`, `messages`                        | Team leader 与单个 member 的双人会话    |

## 关系

```mermaid
erDiagram
    USERS ||--o{ SESSIONS : owns
    USERS ||--o{ ACCOUNTS : authenticates
    USERS ||--o{ LOCATIONS : creates
    USERS ||--o{ TEAMS : leads
    USERS ||--o{ TEAM_JOIN_REQUESTS : requests
    USERS ||--o{ TEAM_MEMBERS : joins
    USERS ||--o{ STORIES : authors
    USERS ||--o{ STORY_LIKES : likes
    USERS ||--o{ USER_LOCATION_FAVORITES : favorites
    USERS ||--o{ USER_STORY_FAVORITES : favorites
    USERS ||--o{ CONVERSATIONS : participates
    USERS ||--o{ MESSAGES : sends

    REGION ||--o{ REGION : contains
    REGION ||--o{ LOCATIONS : contains
    LOCATIONS ||--o{ TEAMS : hosts
    LOCATIONS ||--o{ STORIES : references
    TEAMS ||--o{ TEAM_JOIN_REQUESTS : receives
    TEAMS ||--o{ TEAM_MEMBERS : includes
    TEAMS ||--o{ STORIES : recaps
    TEAMS ||--o{ CONVERSATIONS : scopes
    CONVERSATIONS ||--o{ MESSAGES : contains

    LOCATIONS ||--o{ LOCATION_TAGS : tagged
    TEAMS ||--o{ TEAM_TAGS : tagged
    STORIES ||--o{ STORY_TAGS : tagged
    TAGS ||--o{ LOCATION_TAGS : classifies
    TAGS ||--o{ TEAM_TAGS : classifies
    TAGS ||--o{ STORY_TAGS : classifies
    STORIES ||--o{ STORY_LIKES : receives
```

Mermaid 只展示主要关系。可空 FK、删除动作、部分唯一索引和 CHECK 必须以 schema 与 migration 为准。

## 关键模型决策

### Region 与地点

- `region` 是自引用层级；只有字段完整的 city Region 可以启用服务。
- Location 必须属于 Region，slug 只在 Region 内唯一；公开路由使用全局 Location ID。
- Location 保存可选的多值 `supported_activity_types`，语义是地点推荐活动，不是 Team 的选择约束。
- 草稿 Location 只要求 Region、名称和介绍；坐标与封面可空。切换为 `published` 时 API 必须补齐
  坐标和封面，推荐活动类型仍可为空。
- 地点图片与活动扩展保存在有形状约束的 JSON 中；hiking 扩展只保存路线事实、季节、概述、
  提示和警告，不保存地点层级的必带或选带装备。`0006` 只移除历史 JSON 中的
  `gear_essential` 与 `gear_optional` 路径，Team 行动本装备仍归 Team 所有。
- 创建者引用允许 `SET NULL`，业务内容仍保留。

### 活动类型与 Team

- 活动类型是 [`src/contracts/enums.ts`](../src/contracts/enums.ts) 中的小型代码枚举，名称由
  i18n 提供；新增类型需要同步代码、三种语言文案与测试，不建立运行时目录表。
- Team 的 `activity_type` 必填。API schema 与最终条件 DML 都必须复核值属于代码枚举；地点推荐
  只影响客户端排序，不限制可选集合。
- `teams.activity_type` 不设置数据库 CHECK 或目录外键，避免每次扩展枚举都必须重建 D1 表；写入
  完整性由共享契约、输入校验和最终条件写语句共同保证。

### Team 生命周期与成员

- Team 持久化招募状态、成团时间和取消时间；“未开始 / 进行中 / 已完成”等展示状态由时间与这些字段派生，不由定时任务回写。
- leader 不写入 `team_members`，`max_participants` 只限制 active member。
- join request 是申请历史，`team_members.left_at IS NULL` 才表示当前成员。
- 同一用户对同一 Team 最多存在一个 pending 申请；批准申请时必须在最终写入中复核 leader、申请状态和剩余名额。
- 行动本是 Team 上的有界 JSON；API 使用内容 CAS 处理覆盖、认领和取消认领冲突。

### Story、收藏与消息

- 普通 Story 与 Team 回顾使用同一张表；回顾可引用 Team，Location 可由 Team 推导。
- `like_count` 是由触发器维护的派生计数；收藏使用两个资源专用连接表，不使用多态外键。
- 每个会话由 `(team_id, member_user_id)` 唯一确定，访问者必须是该 member 或 Team 当前 leader。
- `messages.read_at` 同时表达已读状态和时间；消息与会话列表使用稳定复合 cursor。

### 认证与隐私

- session 真相只在 D1 `sessions`；KV 不是 session 或权限来源。
- `accounts` 使用 Better Auth 1.7 的 `(issuer, account_id)` 唯一身份；升级 migration 将
  既有 credential 账户回填为 `local:credential`，不得恢复旧 `(provider_id, account_id)` 唯一键。
- 用户变为非 active 或软删除时，同一数据库更新会撤销其 session 和未消费的密码重置 challenge。
- 新建 session、签发 challenge 和消费 challenge 都在最终写语句复核用户仍 active 且未删除。
- 用户可扩展资料保存在 `users.extra`；敏感字段的读取仍由 API 权限决定。
- 账户删除使用匿名墓碑保留历史外键，同时清除 PII、凭据、session、关联 challenge 和自有头像。

## 数据库护栏

当前 13 个触发器：

1. `sessions_active_user_insert_guard`：拒绝为非 active 或已删除用户创建 session。
2. `users_auth_revoke_after_inactive`：用户停用或软删除时撤销认证状态。
3. `users_deleted_state_validate_insert`、`users_deleted_state_validate_update`：强制
   `status = deleted` 与 `deleted_at` 同时成立。
4. `team_members_capacity_validate_insert`、`team_members_capacity_validate_reactivate`：
   新增或重新激活 active member 前验证容量。
5. `team_members_leader_validate_insert`、`team_members_leader_validate_reactivate`：禁止 leader
   成为 active member。
6. `teams_capacity_validate_update`：人数上限不得低于 active member 数量。
7. `teams_leader_validate_update`：禁止把 active member 直接设为 leader。
8. `story_likes_count_after_insert`、`story_likes_count_after_delete`：原子维护 Story 点赞计数。
9. `messages_summary_after_insert`：更新会话最后消息摘要与时间。

触发器只承担数据库最终护栏。跨语句原子写仍使用 D1 `batch()` 与条件 DML；禁止
`db.transaction()` 或裸 `BEGIN` / `COMMIT`。

## 删除与存储边界

- 凭据、session、成员/申请、标签连接、点赞和收藏按父记录级联。
- Region 与被 Team 引用的 Location 使用 RESTRICT，避免破坏业务历史。
- 管理员删除 Location 默认改为 `archived`；只有显式永久确认且不存在 Team、Story 或收藏引用时
  才物理删除。
- Story 的 Team 回顾引用使用 RESTRICT，Location 引用删除时置空；需要保留历史的
  creator/decision 引用使用 SET NULL。
- 账户删除保留匿名用户墓碑与历史 Team、Story、Conversation、Message 引用，不物理删除用户行。
- R2 保存媒体对象；D1 保存所有权和业务引用。媒体写入采用临时对象、最终对象、条件 DML 与补偿清理。
- 运行时不使用共享 KV 缓存；用户相关数据只从 D1/R2 按请求读取，避免 isolate 级跨请求泄漏。

## 迁移与验证

新增 migration 时必须同步更新 Drizzle schema、journal 和 snapshot，并运行：

```bash
pnpm db:check
pnpm test:server
```

生产 migration、恢复和 rollback 还必须遵守 [`prod-change-policy.md`](prod-change-policy.md)。
