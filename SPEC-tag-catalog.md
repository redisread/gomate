# Spec: tag-catalog

## Objective

把现有标签新增 API 扩展为完整后台目录：管理员可列表、新增、重命名、查看地点/队伍/故事引用计数，并在明确确认后解除全部关联并删除。

## Tech Stack

沿用 Astro、React、Hono、Drizzle、D1、Zod、Vitest 与 Playwright，不增加依赖。

## Commands

- 聚焦测试：`pnpm test:server -- src/server/routes/tags.test.ts`
- 静态检查：`pnpm lint && pnpm type-check`
- 完整门禁：`pnpm test:ci && pnpm test:e2e:ci`

## Project Structure

- `src/server/routes/tags.ts`：公开目录、管理员统计与写操作。
- `src/pages/admin/tags.astro`、`src/components/admin/`：标签管理页面。
- `docs/backend-api.md`、`docs/frontend-pages.md`：长期合同。

## Code Style

```ts
if (referenceCount > 0 && !input.confirmDetach) {
  return c.json(APIErrors.conflict("Tag still has references"), 409);
}
```

## Testing Strategy

服务端测试覆盖权限、游标/上限、重名冲突、重命名、引用计数及确认删除；组件测试覆盖确认交互与错误状态。

## Boundaries

- Always：写操作仅管理员；删除引用标签必须显式确认；批量解除关系与删除原子执行。
- Ask first：改变标签作用域或引入标签类别。
- Never：静默删除关联；泄露用户私有数据；保存操作历史。

## Success Criteria

- 管理页展示标签及三类引用计数。
- 管理员可新增和重命名标签，slug 冲突返回稳定 409。
- 有引用的删除先提示影响数量，确认后原子解除并删除。

## Open Questions

无。
