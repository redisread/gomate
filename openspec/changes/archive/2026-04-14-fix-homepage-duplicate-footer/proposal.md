## Why

首页（`/`）底部出现重复的 Footer 组件，用户看到两个完全相同的页脚区块，影响页面美观和专业性。

根因：`Layout.astro` 默认渲染 Footer（`showFooter=true`），同时 `HomeClient` 组件内部也渲染了一个 `<Footer />`，导致同一个页脚被渲染两次。

## What Changes

- 从 `HomeClient` 组件中移除 `<Footer />` 的渲染
- Footer 统一由 `Layout.astro` 管理，首页不再自行渲染

## Capabilities

### New Capabilities

### Modified Capabilities

## Impact

- `frontend/src/components/features/home/home-main.tsx`：移除 `<Footer />` 导入和渲染
- 仅影响首页的 Footer 渲染行为，其他页面不受影响
