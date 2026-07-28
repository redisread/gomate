# gomate D1 迁移与 prod 变更规约 v1.0

> 制定：@Martin（技术方案）+ @Karis（规约与 CI 门禁），Victor 授权，2026-07-28 生效。
> 背景：#202/#451 两次双账本漂移事故 + #208 prod 迁移在 CR 前手工执行（顺序反转）。

## 一、D1 迁移规约

### 1. DDL 只走 migration

prod/staging 的建表/改表/索引一律通过 migration 文件 + pipeline 应用（push:main 自动执行 `wrangler d1 migrations apply`）。

- **禁止** `wrangler d1 execute` 手工执行 DDL——这会绕过 `d1_migrations` 账本和 drizzle `_journal.json`，造成双账本漂移（#451 事故的根因）
- 手工 DML（数据修复、清测试数据）允许，但按下方「prod 变更声明制」先报备

### 2. 迁移必须幂等

所有新迁移默认使用幂等写法：

```sql
CREATE TABLE IF NOT EXISTS ...
CREATE INDEX IF NOT EXISTS ...
DROP TABLE IF EXISTS ...
INSERT OR IGNORE INTO ...
```

幂等迁移让流水线/手工重放永远安全，环境间账本漂移时可自愈。**自 0018 起强制执行**，历史迁移（0000–0017）不回填。

### 3. 双账本同步（CI 门禁）

`db/migrations/meta/_journal.json`（drizzle-kit 账本）与 `db/migrations/*.sql` 文件必须一一对应。

CI 门禁（pr-validation → api-checks → Migrations Sync Check）双向校验：

- journal 有 entry 但缺 .sql 文件 → 红
- .sql 有文件但 journal 缺 entry → 红
- journal idx 不连续或有重复 → 红

本地自检：

```bash
pnpm --filter @gomate/api check:migrations
```

### 4. 账本一致性告警（v1.1 待做）

定期或 deploy 前置比对 journal 条目数 vs 远端 D1 `d1_migrations` 表，不一致则告警。当前版本依赖规则 2（幂等自愈）+ 规则 5（回补）覆盖。

### 5. 手工操作回补（急救 SOP）

发现账本与实际漂移（表已存在但账本没有记录）时：

1. **不**反向 `d1 execute` 补 DDL
2. 补齐对应 migration 文件 + journal entry（幂等写法），让流水线重放时自动追平账本
3. 操作完成后在对应任务 thread 留「实际执行了什么」

首例执行：#451 的 0017（apikey 表）。

## 二、prod 变更声明制

任何对 prod 的变更——D1 迁移/数据操作、secret 配置、手工部署——必须遵守：

1. **先声明**：在对应任务 thread 写明「要做什么、影响面、回滚方式」
2. **等点头**：拿到 @Martin 或 Victor 的显式批准
3. **再执行**：顺序不许反转

staging 保持自由度，但破坏性操作（清数据/覆盖部署）同样需要 thread 报备留痕。

**违反处置**：按升级线处理；同一实现者第五次顺序反转，其合并授权收回 Victor 专属，prod 操作全停。

## 三、分支预部署 staging SOP

涉及 D1 schema 变更的 PR：

1. migration 文件随 PR 提交（幂等写法 + journal entry 齐全）
2. 合并到 main → pipeline 自动对 staging 和 prod 应用迁移（staging 先行验证）
3. 如需在合并前验证迁移效果，用 `wrangler d1 migrations apply gomate-db-staging --env staging --remote`（走账本，允许）并在 thread 报备
4. 验证通过后按正常 PR 流程合并

## 附：问题域三个实证（2026-07）

1. **双账本**：pipeline 用 wrangler `d1_migrations` 表，drizzle-kit 用 `_journal.json`，手工 `d1 execute` 两边都绕过
2. **非幂等迁移重放即炸**：`CREATE TABLE` 撞已存在的表 → SQL 报错 → 部署流水线红
3. **手工 prod 变更无追溯**：#208 prod apikey 表迁移在 CR 前执行（第四次顺序反转）
