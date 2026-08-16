# GoMate 代理规则

项目级规则唯一维护入口，`CLAUDE.md` 仅引用；详细文档放 `docs/`，spec/决策记录放 `notes/`。

## 架构入口

- Worker：`frontend/src/worker.ts` 将 `/api/*` 交给 `api/src/app.ts`，其余请求交给 Astro 官方 Cloudflare handler
- API：`api/src/app.ts` → `routes/`、`db/schema.ts`、`lib/`
- 前端：`frontend/src/pages/`、`components/features/`（islands）、`layouts/Layout.astro`、`lib/{api,server-api}.ts`、`i18n/`

## 代理工作规则

- 每次会话开始加载 `using-agent-skills` 技能（`.codex/skills/using-agent-skills/SKILL.md`）
- 多 worktree 开发：`pnpm dev:wt` 自动分配统一 Worker 端口；首次新 worktree 跑 `pnpm init:worktree`（幂等补齐 `frontend/.dev.vars`、i18n 与共享 V2 D1）。细节见 [`docs/local-dev-worktrees.md`](docs/local-dev-worktrees.md)
- 不顺手回滚自己未创建的无关 worktree 改动；顺手修离当前改动点很近、风险可控的问题时，在 commit/PR 单独标注

## 项目自定义 agent

- `gomate-reviewer`：定义见 [`agents/gomate-reviewer.md`](agents/gomate-reviewer.md)。用户要求进行 GoMate 专项审查或合并前审查时加载；该 agent 只产出带证据的审查报告，不直接修改代码，也不调用其他 persona。
- 技能上游版本记录见 [`.codex/agent-skills-source.json`](.codex/agent-skills-source.json)；后续同步必须同时更新共享 `.codex/references/` 与该记录。

## 自主边界（红线）

完整清单见用户级 `AGENT.md`。本项目补充：CI/CD 配置可在功能分支/PR 修改（须说明影响范围、验证方式、回滚方式）；D1 迁移与 prod 变更遵守 [`docs/prod-change-policy.md`](docs/prod-change-policy.md)。

## 前端规则

- 用户可见文案走 i18n，不硬编码；i18n 改动后跑 `pnpm i18n:build && pnpm --filter @gomate/frontend i18n:validate`
- namespace 用法保持一致（如 `content.discover.*` 不缩成 `discover.*`）
- 变更最低检查：`pnpm i18n:build && pnpm --filter @gomate/frontend type-check && pnpm --filter @gomate/frontend build`

## API 规则

- 遵循 `api/src/` 下现有路由、lib、schema 组织方式；行为变化同步更新 [`docs/backend-api.md`](docs/backend-api.md)
- 变更最低检查：`pnpm --filter @gomate/api lint && pnpm --filter @gomate/api type-check && pnpm --filter @gomate/api build && pnpm --filter @gomate/api test`

## 部署

- 单 Worker：`frontend/wrangler.jsonc`，入口 `frontend/src/worker.ts`；生产域名目标为 `https://gomate.live`
- API 固定同源 `/api/*`，不再部署或调用 `api.gomate.live`
- D1 binding `DB`（`gomate-db-v2`）、R2 binding `R2`、KV binding `CACHE_KV`；未明确要求不重新引入 Cloudflare Images binding
- 生产变更仅走受保护的手动 preview 流程；本 PR 不创建资源、不迁移旧数据、不切生产 route
