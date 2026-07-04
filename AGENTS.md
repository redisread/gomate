# GoMate 代理规则

## 规则维护

- 本文件是项目代理规则的唯一维护入口。
- `CLAUDE.md` 只引用本文件，不维护重复规则。
- 新增或修改项目级规则时，更新 `AGENTS.md`；长示例、产品说明、接口细节放到 `docs/` 或专门规则文件。

## 思维原则

- 所有决策从问题本质出发，不因惯例照搬。先问要解决什么问题，最直接路径是什么，如果从零设计会怎么做。
- 不要谄媚。不要夸用户的想法，不要用空泛开场。给真实判断，方案有问题直接指出，发现更直接的做法就说明。
- 工程判断服务结果。能小改解决的问题不要大改；确实需要重构时，先定义边界、风险、回滚和验收标准。
- 默认使用中文处理项目内协作、规则、评审和报告类任务；用户明确要求其他语言时按用户要求执行。

## 代理工作规则

- 会话开始时，默认加载 `using-agent-skills` 技能：`.codex/skills/using-agent-skills/SKILL.md`。
- 开始任务前先判断适用技能，并按对应技能流程执行；多个技能适用时，选择覆盖当前任务的最小集合。
- 遇到需求冲突、上下文冲突或高影响不确定性时，先说明冲突和取舍，不要静默猜测。
- 遇到与当前任务直接相关的明显问题（typo、过期 import、类型断言错误、已废弃 API），应当顺手修复；修复前先评估改动范围，超过 1 个文件或改动量明显超出任务时，拆成独立任务再修。
- 不要回滚自己未创建的无关 worktree 改动。
- 创建 PR 后，必须对 PR 进行代码评审和 CI 检查；如有失败或阻塞，先通知失败项，再修复、推送并重复检查，直到通过或明确存在外部阻塞。

## 项目概览

GoMate 是一个极简地点组队平台。用户可以发现地点、创建或加入队伍，并通过轻量社交证明和分享流程协调出行。

仓库是 pnpm monorepo：

```text
gomate/
├── api/          # Hono + Cloudflare Workers + D1 + Drizzle
├── frontend/     # Astro 6 SSR + React 18 islands + Tailwind CSS 4
├── packages/
│   ├── types/    # shared TypeScript types
│   └── config/   # shared tsconfig
└── docs/         # feature/API documentation
```

移动端代码在 `redisread/gomate-mobile`；不要把移动端实现加回这个仓库。

## 技术栈

- 包管理器：pnpm 9，以根目录 `packageManager` 和 `engines` 为准。
- 运行时：Node `>=22.12.0`，以根目录 `package.json` 为准。
- API：Hono、Cloudflare Workers、D1、Drizzle、Better Auth、R2、KV。
- 前端：Astro 6、`@astrojs/cloudflare` v13、React 18 islands、Tailwind CSS 4、Vitest。
- 共享包：`@gomate/types` 和 `packages/config` 下的共享 TypeScript 配置。

## 常用命令

```bash
pnpm install
pnpm dev
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

## 工作边界

- 不提交密钥、`.env` 文件、生产凭据或测试账号密码。
- 生产 D1、R2、KV、数据库修复或数据变更操作必须先获得明确人工授权。
- 数据库变更优先使用 migration 文件或文档化 SQL；没有授权不要执行临时生产 SQL。
- 工作区可能存在其他 agent 的无关改动，不要回滚自己未创建的改动。
- 保持变更范围和用户请求一致。除非任务要求，不要修复 README 或 docs 中的过期描述。

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
- 合并后验证本次变更触达的生产路径。构建成功不等于生产验证完成。

## 已知坑点

- 前端是 Astro 6，旧 Astro 4 迁移假设已经过期。
- `@astrojs/cloudflare` v13 可能引入隐式 binding；合并 adapter 相关变更前要检查生成的 Wrangler 输出。
- `session: false` 不是修复 Astro 6 session KV provisioning 的有效方案。
- 如果部署因 KV namespace 创建失败，先检查现有 Cloudflare KV namespaces，再改代码。
- 前端 lint/test 在 PR validation 中可能因为历史债务是非阻塞项；type-check、build、i18n validation 仍是阻塞项。

## 文档与图表

- 页面或 UI 行为变化时，更新 `docs/frontend-pages.md`。
- API 请求、响应、认证或数据库行为变化时，更新 `docs/backend-api.md`。
- 字体流水线变化时，更新 `docs/font-subsetting.md`。
- Mermaid 图表默认使用 Hand-Drawn 涂鸦风格，优先把这一行放在代码块第一行：

```mermaid
%%{init: {"look": "handDrawn", "theme": "neutral"}}%%
```
