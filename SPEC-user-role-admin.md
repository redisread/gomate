# Spec: user-role-admin

## Objective

提供已有用户的后台查询和管理员角色设置。角色变更只允许管理员执行，且不能修改自己、不能撤销系统最后一名管理员。

## Tech Stack

沿用 Astro、React、Hono、Drizzle、D1、Zod、Vitest 与 Playwright。

## Commands

- 聚焦测试：`pnpm test:server -- src/server/routes/admin-users.test.ts`
- 静态检查：`pnpm lint && pnpm type-check`
- 完整门禁：`pnpm test:ci && pnpm test:e2e:ci`

## Project Structure

- `src/server/routes/admin-users.ts`：管理员用户列表与角色变更。
- `src/pages/admin/users.astro`、`src/components/admin/`：用户管理页面。
- `src/contracts/`：最小化的后台用户 DTO。

## Code Style

```ts
if (target.id === admin.id) {
  return c.json(APIErrors.conflict("Administrators cannot change their own role"), 409);
}
```

## Testing Strategy

服务端测试覆盖未授权、列表字段最小化、设置管理员、禁止自改、最后管理员保护和竞争条件；组件测试覆盖搜索、状态与确认。

## Boundaries

- Always：最终条件写语句复核权限与最后管理员不变量；列表分页有界；不返回认证账户或 token 字段。
- Ask first：增加新角色、修改登录/会话行为。
- Never：修改自己角色；撤销最后管理员；记录操作历史。

## Success Criteria

- 管理员可按名称或邮箱搜索用户并查看角色/状态。
- 可把普通用户设置为管理员，也可在安全条件下撤销管理员。
- 自改和最后管理员撤销均稳定返回 409，竞争写也不能突破保护。

## Open Questions

无。
