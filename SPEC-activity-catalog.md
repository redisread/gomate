# Spec: activity-catalog

## Objective

为管理员提供全局活动类型目录。活动类型可以新增、改名、排序和启停；停用不删除历史引用。地点可把多个活动类型作为可选推荐属性，队伍仍只保存一个必填活动类型。

## Tech Stack

Astro 7、React 18、Hono、Drizzle ORM、Cloudflare D1/SQLite、Zod、Vitest 与 Playwright。

## Commands

- 聚焦测试：`pnpm test:server -- src/server/routes/activity-types.test.ts`
- 类型与迁移：`pnpm type-check && pnpm db:check`
- 完整门禁：`pnpm test:ci && pnpm test:e2e:ci`

## Project Structure

- `src/contracts/`：公开活动类型 DTO。
- `src/server/db/schema.ts`、`migrations/`：目录表与队伍引用迁移。
- `src/server/routes/activity-types.ts`：公开启用目录与管理员写 API。
- `src/pages/admin/activity-types.astro`、`src/components/admin/`：管理页面。

## Code Style

```ts
const updateActivityTypeSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  isActive: z.boolean().optional(),
}).strict();
```

边界使用 Zod；数据库写入使用参数化 Drizzle/D1；管理员权限由共享 `requireAdmin` 在每个写入口校验。

## Testing Strategy

先写失败的服务端合同测试，覆盖未登录、普通用户、重复 slug、启停及历史引用；组件测试覆盖表单状态；E2E 覆盖管理员新增并停用活动类型。

## Boundaries

- Always：公开查询只返回启用类型；管理员查询返回引用计数；停用保留记录与历史队伍。
- Ask first：新增依赖、远程 D1 写、改变认证模型。
- Never：允许普通用户写目录；删除被历史数据引用的类型；把活动类型重新绑定为地点约束。

## Success Criteria

- 管理员可查看、新增、改名、排序和启停活动类型。
- 新增活动类型可被地点推荐与队伍创建使用。
- 停用后不再用于新队伍，但历史队伍仍可读取并显示名称。
- 现有四种活动类型无损迁移。

## Open Questions

无。目录名称作为用户生成内容按原文展示，不额外强制多语言字段。
