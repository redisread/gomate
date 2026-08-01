# GoMate 代理规则

## 规则维护

- 本文件是项目代理规则的唯一维护入口。
- `CLAUDE.md` 只引用本文件，不维护重复规则。
- 新增或修改项目级规则时，更新 `AGENTS.md`；长示例、产品说明、接口细节放到 `docs/` 或专门规则文件。

## 项目概览

GoMate 是一个极简地点组队平台。用户可以发现地点、创建或加入队伍，并通过轻量社交证明和分享流程协调出行。

仓库是 pnpm monorepo：

```text
gomate/
├── api/          # Hono + Cloudflare Workers + D1 + Drizzle
├── frontend/     # Astro 6 SSR + React 18 islands + Tailwind CSS 4
├── packages/
│   ├── types/    # shared TypeScript types
│   ├── lib/      # 跨 api/frontend 复用的纯函数 helper
│   ├── config/   # shared tsconfig
│   └── mcp/      # GoMate MCP server（stub 阶段，见 packages/mcp/README.md）
├── e2e/          # Playwright 跨端测试（root playwright.config.ts）
├── scripts/      # 根级共享脚本（i18n 构建/校验、db reset、env check、seed）
├── docs/         # 现行文档（feature/API/deploy/policy）
└── notes/        # 设计 spec 与过程性决策记录（历史溯源，见「文档与图表」）
```

移动端代码在 `redisread/gomate-mobile`；不要把移动端实现加回这个仓库。

## 技术栈

- 包管理器：pnpm 9，以根目录 `packageManager` 和 `engines` 为准。
- 运行时：Node `>=22.12.0`，以根目录 `package.json` 为准。
- API：Hono、Cloudflare Workers、D1、Drizzle、Better Auth、R2、KV。
- 前端：Astro 6、`@astrojs/cloudflare` v13、React 18 islands、Tailwind CSS 4、Vitest。
- 共享包：`@gomate/types`（共享类型）、`@gomate/lib`（跨端纯函数 helper）、`packages/config`（共享 TypeScript 配置）、`packages/mcp`（MCP server，stub 阶段）。

## 常用命令

```bash
pnpm install
pnpm dev
pnpm dev:wt             # 多 worktree：自动分配空闲端口并启动 API + 前端
pnpm init:worktree      # 多 worktree：补齐 secrets / env / i18n / 共享 D1（幂等）
pnpm db:sync            # 从 prod API 同步地点数据到本地 D1
pnpm api:dev
pnpm web:dev
pnpm type-check
pnpm lint
pnpm i18n:build
pnpm i18n:validate
pnpm --filter @gomate/api test
pnpm --filter @gomate/frontend test
pnpm --filter @gomate/frontend build
```

启动开发服务前先检查端口：

```bash
lsof -ti:8799
lsof -ti:5432
```

本地地址：

- API：`http://localhost:8799`
- 前端：`http://localhost:5432`

### 本地全栈测试环境（数据对齐 prod，Wen 验收配方）

多 worktree 并行开发时的端口 / 数据方案见 `docs/local-dev-worktrees.md`，要点：

- **共享本地 D1**：默认 `~/.gomate/wrangler-state`，所有 worktree 共用一份，初始化一次即可（migrations + `pnpm db:sync` 从 prod 拉地点数据 + 注册 QA 用户）
- **动态端口**：`GOMATE_API_PORT` / `GOMATE_WEB_PORT`，`pnpm dev:wt` 自动分配空闲端口；CORS 对 localhost 任意端口放行
- **一键初始化**：`pnpm init:worktree` 补齐 `api/.dev.vars`（gitignored，找团队索取，勿入库）、`frontend/.env.local`、i18n 生成文件、共享 D1

手动配方（不自动初始化时）：

1. API 用 `wrangler dev` 起本地 D1（需要 `api/.dev.vars`，gitignored，找团队索取，勿入库）
2. 同步 prod 地点数据：`cd api && tsx db/sync-locations.ts`（从远程 API 拉 cities/locations/tags 写本地 D1）
3. 本地注册 QA 用户；需要微信号字段的用例用 `PATCH /api/users/update` 补 wechat
4. 前端默认跑 `5432`（动态端口下 CORS 已放行任意 localhost 端口）

## 架构入口

API：

- 入口：`api/src/index.ts`
- 路由：`api/src/routes/`
- 数据库 schema：`api/src/db/schema.ts`
- 认证：`api/src/lib/auth.ts`
- 存储：`api/src/lib/storage.ts`
- 队伍状态逻辑：`api/src/lib/team-status.ts`

前端：

- Astro 页面：`frontend/src/pages/`
- React islands：`frontend/src/components/features/`
- 布局：`frontend/src/layouts/Layout.astro`
- API 客户端：`frontend/src/lib/api.ts`
- i18n 数据：`frontend/src/i18n/` 和生成后的 locale 数据
- Content collections：`frontend/src/content.config.ts`

## 思维原则

- 所有决策从问题本质出发，不因惯例照搬。先问要解决什么问题，最直接路径是什么，如果从零设计会怎么做。
- 不要谄媚。不要夸用户的想法，不要用空泛开场。给真实判断，方案有问题直接指出，发现更直接的做法就说明。
- 工程判断服务结果。能小改解决的问题不要大改；确实需要重构时，先定义边界、风险、回滚和验收标准。
- 默认使用中文处理项目内协作、规则、评审和报告类任务；用户明确要求其他语言时按用户要求执行。

## 代理工作规则

- **每次会话必须加载 `using-agent-skills` 技能**（`.codex/skills/using-agent-skills/SKILL.md`），按其中的技能发现与调用流程执行当前任务，不依赖任何项目级子 Agent。
- 开始任务前先判断适用技能，并按对应技能流程执行；多个技能适用时，选择覆盖当前任务的最小集合。
- 遇到需求冲突、上下文冲突或高影响不确定性时，先说明冲突和取舍，不要静默猜测。
- 遇到与当前任务直接相关的明显问题（typo、过期 import、类型断言错误、已废弃 API），应当顺手修复；修复前先评估改动范围，超过 1 个文件或改动量明显超出任务时，拆成独立任务再修。
- 不要回滚自己未创建的无关 worktree 改动。
- 创建 PR 后，必须执行 CR（代码评审）和流水线检查：
  - 使用 code reviewer agent 对 PR diff 进行五维度评审（correctness, readability, architecture, security, performance），并验证每个发现
  - 使用 `gh pr checks` 检查 CI 状态，确认所有阻塞项通过
  - 如有失败或阻塞，先通知失败项，再修复、推送并重复检查，直到通过或明确存在外部阻塞
  - 合并后进行生产路径回归验证（构建成功不等于生产验证完成）

## 工作边界

### 硬红线（除非获得明确授权，绝对不动）

- 不提交密钥、`.env` 文件、生产凭据。
- 不执行生产 D1 / R2 / KV 数据变更、数据库修复。
- 数据库变更使用 migration 文件或文档化 SQL；没有授权不执行临时生产 SQL。
- **D1 迁移与 prod 变更规约**：见 [docs/prod-change-policy.md](./docs/prod-change-policy.md)（DDL 只走 migration、迁移幂等、双账本同步 CI 门禁、prod 变更声明制），所有实现者必读。

### drizzle-kit generate 使用约束（task #159 决策）

- `stories` / `share_events` 两表存在已知的 PK NOT NULL introspection 噪音：SQLite 内省对 `id TEXT PRIMARY KEY`（未显式写 NOT NULL）报告 notnull=0，导致 generate 每次输出这两表的整表重建段（`__new_stories` / `__new_share_events`）。这是假漂移，不是真实 schema 差异，已决策不重建表。
- 因此 generate 的输出**必须人工剔除** stories / share*events 的 PRAGMA + `\_\_new*\*` 重建 + 索引重建段，只保留真实变更后再提交；提交前对 generate 结果逐行审。
- 参照样本：`db/migrations/0012_drop_pois.sql`（generate 原始输出含两表重建噪音，人工剔除后仅保留两个 DROP TABLE）。

### 遇到问题就顺手修

改代码时遇到**离当前改动点很近、风险明显可控**的问题，应当顺手修复，遵循：

- 顺手修的部分在本次 commit/PR 里单独标注（如 `also: fix outdated README Astro version`），方便 review 和回滚。
- 多 agent 协作的 worktree：只回滚本次会话自己改动的部分，不要因为"不是自己创建的"就对问题视而不见，也不要对自己未参与的上下文做大调整。

不顺手修的场景：

- 引入新依赖或新部署资源（需要独立评审）。
- 涉及非当前任务职责的产品逻辑调整。
- 破坏性变更（必须交由 owner 决定）。

## 前端规则

- 用户可见文案必须走现有 i18n 系统，不要硬编码。
- 修改 locale 或 i18n key 后运行：

```bash
pnpm i18n:build
pnpm --filter @gomate/frontend i18n:validate
```

- 保持 namespace 用法一致。如果组件使用 `content.discover.*`，不要缩短成 `discover.*`。
- 前端变更的最低检查通常是：

```bash
pnpm i18n:build
pnpm --filter @gomate/frontend type-check
pnpm --filter @gomate/frontend build
```

## API 规则

- 遵循 `api/src/` 下现有路由、lib、schema 组织方式。
- **D1 环境禁止 `db.transaction()`**：D1 拒绝 SQL `BEGIN`/`COMMIT`（code 7500），多步原子写入一律用 `db.batch([...])`（D1 唯一原子原语）。集成测试的 better-sqlite3 mock 不会暴露此问题，CR 时必须人工核对。（task #147 教训）
- **D1 wrangler 命令报 7403 unauthorized**：本地 `~/.config/cloudflare/env.sh` 里的 `CLOUDFLARE_API_TOKEN=cfat_*` 不覆盖 D1 权限（只有 R2/Workers 部分作用域）。修复：先 `unset CLOUDFLARE_API_TOKEN CLOUDFLARE_ACCOUNT_ID`，再跑 `wrangler d1 ...`——wrangler fallback 到本地 OAuth session（`wrangler whoami` 应显示 `- d1 (write)` scope）。（task #175 教训）
- API 请求、响应、认证或数据库行为变化时，同步更新 `docs/backend-api.md`。
- API 变更的最低检查通常是：

```bash
pnpm --filter @gomate/api lint
pnpm --filter @gomate/api type-check
pnpm --filter @gomate/api build
pnpm --filter @gomate/api test
```

## 部署与评审

- 生产 API Worker：`gomate-api`，地址 `https://api.gomate.live`。
- 生产前端 Worker：`gomate-frontend`，地址 `https://gomate.live`。
- R2 public URL：`https://gomate.cos.jiahongw.com`。
- 前端部署使用 `frontend/wrangler.toml` 和 `@astrojs/cloudflare` v13 entrypoint：

```toml
main = "@astrojs/cloudflare/entrypoints/server"
```

- 未明确要求时，不要重新引入 Cloudflare Images binding。
- 请求合并前，提供 PR 链接、变更范围、本地验证命令和结果、GitHub Checks 状态、部署影响、风险变更的回滚说明。
- 合并后执行生产路径回归验证（见「代理工作规则」）。

## 已知坑点

- 前端是 Astro 6，旧 Astro 4 迁移假设已经过期。
- `@astrojs/cloudflare` v13 可能引入隐式 binding；合并 adapter 相关变更前要检查生成的 Wrangler 输出。
- `session: false` 不是修复 Astro 6 session KV provisioning 的有效方案。
- 如果部署因 KV namespace 创建失败，先检查现有 Cloudflare KV namespaces，再改代码。
- 前端 lint/test 在 PR validation 中可能因为历史债务是非阻塞项；type-check、build、i18n validation 仍是阻塞项。

## 文档与图表

- `docs/` = 现行文档（API、页面、部署、策略），随代码变化持续更新。
- `notes/` = 设计 spec 与过程性决策记录，是历史溯源，不是现行文档。
- 已上线的 spec 保留在 `notes/` 顶层，**不要**因「已完成」移入 `notes/archive/`：大量代码注释引用 `notes/gomate-*.md` 路径（如 `api/src/routes/teams/checklist.ts`、`frontend/src/components/features/onboarding/*`）。`notes/archive/` 只放明确废弃或被取代的内容。
- 页面或 UI 行为变化时，更新 `docs/frontend-pages.md`。
- 字体流水线变化时，更新 `docs/font-subsetting.md`。
- Mermaid 图表默认使用 Hand-Drawn 涂鸦风格，优先把这一行放在代码块第一行：

```mermaid
%%{init: {"look": "handDrawn", "theme": "neutral"}}%%
```
