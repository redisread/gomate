# Spec: location-workflow

## Objective

重新设计管理员地点流程，以约 15 秒完成灵感草稿为首要体验，同时提供地点列表、完整编辑、发布、归档和受限永久删除。地点草稿只要求名称、介绍和地区；标签、封面与推荐活动类型可选。

## Tech Stack

Astro SSR 管理页、React 交互、Hono API、Drizzle/D1、R2 现有媒体流程、Zod、Vitest 与 Playwright。

## Commands

- 聚焦测试：`pnpm test:server -- src/server/routes/locations`
- UI 测试：`pnpm test -- src/components/admin src/components/features/location-form`
- 完整门禁：`pnpm test:ci && pnpm test:e2e:ci`

## Project Structure

- `src/server/routes/locations/`：管理员列表、草稿、完整更新、归档/删除。
- `src/components/admin/admin-quick-action.tsx`：快速草稿面板。
- `src/pages/admin/locations/`：列表、新增和编辑。
- `src/components/features/location-form/`：全字段表单。

## Code Style

```ts
const quickDraftSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(10_000),
  regionId: z.string().trim().min(1).max(128),
}).strict();
```

## Testing Strategy

先覆盖草稿最小字段和管理员权限；再覆盖发布完整性、可选推荐活动/标签、列表筛选、归档默认行为、永久删除引用保护；E2E 在移动和桌面视口验证键盘、焦点和快速保存。

## Boundaries

- Always：新增/编辑/归档/永久删除仅管理员；草稿不伪造坐标或封面；发布要求名称、介绍、地区、准确坐标和封面；活动类型始终可选。
- Ask first：改变 R2 生命周期或生产写保护。
- Never：普通用户写地点；默认硬删除；永久删除有队伍/故事/收藏引用的地点；写入操作历史。

## Success Criteria

- 快速面板只填名称、介绍、地区即可服务端保存草稿，并立即给出继续编辑入口。
- 可选标签、封面和推荐活动类型可在快速面板或完整编辑中填写。
- 后台地点列表支持状态/搜索，所有记录可进入完整编辑。
- 默认删除动作归档；永久删除需二次确认且只有无引用记录才允许。
- 地点发布不要求活动类型，但要求准确坐标和封面。

## Open Questions

无。
