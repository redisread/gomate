## Context

GoMate 前端使用 Astro SSR + React Islands 架构。主题系统采用 nanostores 管理，通过 `persistentAtom` 将主题选择持久化到 localStorage，同时通过 cookie 与 SSR 层同步。

当前问题：React 组件水合时，`themeStore` 的默认值为硬编码的 `"system"`，而 `initThemeFromCookie()` 在 `useEffect` 中异步执行。这导致水合期间 `effectiveThemeStore` 基于错误的默认值计算，HomeClient 组件首次渲染使用亮色主题样式，随后才被纠正为暗色，产生明显的白色闪烁。

现有防护层：
1. **SSR 层**：Layout.astro 读取 cookie 并设置 `<html class="dark">`
2. **Anti-Flash 脚本**：Layout.astro 中 inline script 在 `<head>` 中同步设置 `.dark` class
3. **客户端 Store**：`effectiveThemeStore.subscribe` 管理 `.dark` class

缺失：React 组件首次渲染时的 isDark 值不正确。

## Goals / Non-Goals

**Goals:**
- 消除 React 水合阶段的主题状态竞态
- 确保 `themeStore` 初始化时即使用 cookie 中的正确值
- 最小代码改动，不引入新依赖

**Non-Goals:**
- 不修改 CSS 层面的闪烁问题（html 元素无 background-color 问题由其他方案处理）
- 不改变主题系统的整体架构（nanostores + cookie + localStorage）
- 不修改 SSR 层的主题逻辑

## Decisions

### Decision: 模块加载时同步读取 cookie 作为默认值

**方案**：在 `theme.ts` 模块顶层执行时，立即从 `document.cookie` 读取主题值作为 `themeStore` 的默认值。

```typescript
const getInitialTheme = (): Theme => {
  if (typeof document === "undefined") return "system";
  const match = document.cookie.match(/theme=(light|dark|system)/);
  return match ? (match[1] as Theme) : "system";
};

export const themeStore = persistentAtom<Theme>("theme", getInitialTheme(), storageConfig);
```

**为什么选这个方案**：
- **时机最早**：模块加载时即执行，早于任何 React 组件渲染
- **无需修改 Astro 页面**：不需要在每个页面手动传递 isDark prop
- **SSR 安全**：通过 `typeof document` 检查兼容 SSR 构建
- **单一数据源**：cookie 是权威来源，localStorage 只是持久化存储

**替代方案 A — 在 persistentAtom 的 storageConfig.decode 中处理**：
- 不可行：decode 只在读取 localStorage 时调用，localStorage 不存在时不会执行

**替代方案 B — SSR 传递 isDark prop 给 HomeClient**：
- 需要修改所有使用主题的组件，改动面大
- 无法覆盖 theme-toggle 等其他组件的初始化问题

### Decision: 移除 theme-toggle 中的 initThemeFromCookie() 调用

既然模块加载时已完成 cookie 同步，`initThemeFromCookie()` 变为冗余调用，应移除以避免重复设置。

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| SSR 构建时 `getInitialTheme()` 返回 `"system"`，与 SSR 设置的 class 不一致 | SSR 已通过 Layout.astro 设置正确的 `<html class>`，客户端 `"system"` 默认值会被 inline script 立即纠正 |
| cookie 值与 localStorage 值不一致 | `initThemeFromCookie()` 移除后，localStorage 优先级高于 cookie（persistentAtom 机制），首次加载以 localStorage 为准 |
| 用户清除 cookie 但保留 localStorage | localStorage 仍保留正确值，不受影响 |
