## Why

暗黑模式下刷新首页时，Hero 背景渐变和多个 section 区域会短暂闪烁成白色（~100-500ms）。根因是 React 组件水合时 `themeStore` 默认值为 `"system"`，而非从 cookie 读取的实际用户选择 `"dark"`，导致 `effectiveThemeStore` 在水合初期计算出错误的亮色主题，渲染出白色背景后再纠正为暗色。

## What Changes

- 修改 `theme.ts`：`themeStore` 初始化时同步从 `document.cookie` 读取默认值，替代硬编码的 `"system"`
- 移除 `theme-toggle.tsx` 中冗余的 `initThemeFromCookie()` 调用（已在模块加载时完成）
- 消除 React 水合阶段的主题状态竞态，确保组件首次渲染即使用正确的主题值

## Capabilities

### New Capabilities

- `theme-sync`: 主题 Store 与 Cookie 的同步初始化机制，确保客户端水合前主题状态正确

### Modified Capabilities

<!-- No existing specs modified -->

## Impact

- **Affected files**: `frontend/src/stores/theme.ts`, `frontend/src/components/theme-toggle.tsx`
- **User visible**: 暗黑模式刷新首页不再闪烁白色
- **Breaking changes**: None
