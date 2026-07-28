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

### ⚠️ 头号条款：前端禁止在 redirected config 路径下用 `--env` 部署

`frontend/wrangler.toml` 的 `main` 指向 `@astrojs/cloudflare/entrypoints/server`，wrangler 部署时会 redirected 到构建产物 `dist/server/wrangler.json`——该产物**只有顶层配置，env 块不随生成**。此时 `wrangler deploy --env staging` 会**静默回退到顶层（prod）配置**，把代码部署到 prod worker `gomate-frontend`，全程无警告（2026-07-28 已实证一次，~2 分钟回滚）。prod 部署没出事纯属巧合：顶层 name 本来就是 prod。

**在验证出其他安全路径之前，手工 `wrangler deploy` 前端一律冻结；staging 部署只许走下述显式配置。**

### rollback 版本选择必须核实 lineage

`wrangler deployments list` 只给版本号和时间，不给内容。事故回滚时**必须核实目标版本的 lineage**（对应哪次 CI 部署/哪个 commit），不能凭列表位置猜——2026-07-28 实证：回滚目标 7fc8740f 看似「事故前版本」，实际是上一起误部署的事故版本，prod 因此一直在跑分支代码。核实方法：对照 CI deploy run 的时间与版本号，或让 CR owner 确认。

### 前端 staging 部署（Workers，实证安全路径）

```bash
pnpm --filter @gomate/frontend build
npx wrangler deploy --config frontend/wrangler.staging.toml
```

`frontend/wrangler.staging.toml` 是显式配置：字面 `name = "gomate-frontend-staging"`、staging KV id、`PUBLIC_API_URL=https://api-staging.gomate.live`、路由 `staging.gomate.live`（custom domain）。无 `--env`、无 redirect，不存在回退机制。

### API staging 部署（Workers）

`deploy-staging.yml`（push:main）自动执行；手工触发用 `pnpm --filter @gomate/api exec wrangler deploy --env staging`（API 的 wrangler.toml 无 adapter redirect，`--env` 安全）。

### Pages 项目

Pages 项目（非本仓库前端）走 Git integration preview 部署，wrangler CLI 不触达。

### D1 schema 变更的 PR

1. migration 文件随 PR 提交（幂等写法 + journal entry 齐全）
2. 合并到 main → pipeline 自动对 staging 和 prod 应用迁移（staging 先行验证）
3. 如需在合并前验证迁移效果，用 `wrangler d1 migrations apply gomate-db-staging --env staging --remote`（走账本，允许）并在 thread 报备
4. 验证通过后按正常 PR 流程合并

## 附：问题域三个实证（2026-07）

1. **双账本**：pipeline 用 wrangler `d1_migrations` 表，drizzle-kit 用 `_journal.json`，手工 `d1 execute` 两边都绕过
2. **非幂等迁移重放即炸**：`CREATE TABLE` 撞已存在的表 → SQL 报错 → 部署流水线红
3. **手工 prod 变更无追溯**：#208 prod apikey 表迁移在 CR 前执行（第四次顺序反转）
