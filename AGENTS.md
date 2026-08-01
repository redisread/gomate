# GoMate 代理规则

项目级规则唯一维护入口，`CLAUDE.md` 仅引用；详细文档放 `docs/`，spec/决策记录放 `notes/`。

## 架构入口

- API：`api/src/index.ts` → `routes/`、`db/schema.ts`、`lib/{auth,storage,team-status}.ts`
- 前端：`frontend/src/pages/`、`components/features/`（islands）、`layouts/Layout.astro`、`lib/api.ts`、`i18n/`

## 代理工作规则

- 每次会话开始加载 `using-agent-skills` 技能（`.codex/skills/using-agent-skills/SKILL.md`）
- 多 worktree 开发：`pnpm dev:wt` 自动分配端口；首次新 worktree 跑 `pnpm init:worktree`（幂等补齐 secrets/env/共享 D1）；本地数据对齐 prod 用 `pnpm db:sync`。细节见 [`docs/local-dev-worktrees.md`](docs/local-dev-worktrees.md)
- 不顺手回滚自己未创建的无关 worktree 改动；顺手修离当前改动点很近、风险可控的问题时，在 commit/PR 单独标注

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

- API：`gomate-api` → `https://api.gomate.live`；前端：`gomate-frontend` → `https://gomate.live`；R2：`https://gomate.cos.jiahongw.com`
- 前端 entrypoint：`frontend/wrangler.toml` 中 `main = "@astrojs/cloudflare/entrypoints/server"`
- 未明确要求不重新引入 Cloudflare Images binding
