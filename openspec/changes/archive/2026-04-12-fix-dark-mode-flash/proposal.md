## Why

用户在首页选择暗黑模式后刷新页面，会出现「黑白相间」的闪烁现象。根因是 `initThemeFromCookie()` 函数定义后从未被调用，导致 SSR 通过 cookie 设置的 `.dark` class 在客户端水合时无法与 `themeStore` 同步。当 localStorage 中缺少主题值或 cookie 与 localStorage 不同步时，`themeStore` 回退到 `"system"` 默认值，可能触发 `classList.remove("dark")` 移除已正确设置的暗黑 class。

## What Changes

- 在 `Layout.astro` 的 `<head>` 中注入阻塞式内联脚本，在首次绘制前同步读取 cookie 并设置 `.dark` class，彻底消除闪烁
- 在客户端水合阶段调用 `initThemeFromCookie()`，确保 cookie 值同步回 `themeStore`，解决持久化不一致问题
- 移除多余的 `initThemeFromCookie` 导出（改为内部调用，避免再次遗漏）

## Capabilities

### New Capabilities
- `theme-anti-flash`: 服务端渲染 + 客户端水合之间的主题 class 一致性保障机制

### Modified Capabilities
- (无，不涉及现有 spec 的需求变更)

## Impact

- `frontend/src/layouts/Layout.astro` — 新增 `<head>` 内联脚本
- `frontend/src/stores/theme.ts` — 新增水合期 cookie 初始化逻辑
- `frontend/src/components/theme-toggle.tsx` — 调用 cookie 初始化函数
