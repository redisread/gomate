# Spec: team-activity-integration

## Objective

让队伍从全局活动目录选择一个必填活动类型。地点推荐仅影响排序和提示，不限制队伍选择；停用类型不可用于新队伍，但历史队伍继续显示。

## Tech Stack

现有 Astro/React 队伍页面、Hono/Drizzle API、D1、Zod、Vitest 与 Playwright。

## Commands

- 聚焦测试：`pnpm test:server -- src/server/routes/teams`
- UI 测试：`pnpm test -- src/components/features/create-team-client.tsx src/components/features/teams`
- 完整门禁：`pnpm test:ci && pnpm test:e2e:ci`

## Project Structure

- `src/contracts/`：动态活动类型 ID 与 DTO。
- `src/server/routes/teams/`：创建/更新最终写入校验与动态筛选。
- `src/components/features/create-team-client.tsx`：推荐优先的全局选择器。
- `src/components/features/teams/`：动态筛选和历史名称展示。

## Code Style

```ts
const ordered = [
  ...activeTypes.filter((type) => recommendedIds.has(type.id)),
  ...activeTypes.filter((type) => !recommendedIds.has(type.id)),
];
```

## Testing Strategy

服务端测试覆盖必填、未知/停用类型拒绝、非地点推荐类型允许、竞争停用保护与历史查询；UI 测试覆盖推荐优先排序和动态类型。

## Boundaries

- Always：新队伍活动类型必填且最终 INSERT/UPDATE 时复核仍启用；地点推荐只排序；历史数据可读。
- Ask first：改变队伍生命周期或推荐算法。
- Never：把活动类型重新限制为地点推荐集合；删除历史活动引用。

## Success Criteria

- 创建/编辑队伍可选择全部启用活动类型，推荐类型优先展示。
- 非推荐但启用的类型可成功创建队伍。
- 未知或停用类型不能用于新写入；已有队伍不受影响。
- 队伍列表筛选来自动态目录，不再硬编码四项。

## Open Questions

无。
