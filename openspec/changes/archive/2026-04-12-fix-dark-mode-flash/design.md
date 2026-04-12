## Context

GoMate 前端使用 Astro SSR + React Islands 架构。主题系统基于 nanostores（`persistentAtom` + `computed`）管理，通过 `effectiveThemeStore` 控制 `<html>` 的 `.dark` class。

当前流程：
1. **SSR 阶段**：`Layout.astro` 读取 `theme` cookie，设置 `<html class="dark">`
2. **客户端水合**：React 组件挂载后，`themeStore` 从 `localStorage`（`persistentAtom`）读取值
3. **问题**：`initThemeFromCookie()` 函数定义了但从未调用 → cookie 值不会同步回 `themeStore` → 如果 localStorage 缺失/过期/不同步，`themeStore` 回退到 `"system"` 默认值 → `.dark` class 被错误移除 → 页面出现黑白混错

约束：
- Astro SSR 模式下 `<head>` 中的 `<script>` 默认会被 hoist，需要使用 `is:inline` 属性才能保持内联同步执行
- nanostores `persistentAtom` 在模块加载时立即从 localStorage 读取初始值
- `ThemeToggle` 是唯一挂载 `initThemeSystemListener()` 的组件，但它是一个 "use client" island，水合时间晚于首次绘制

## Goals / Non-Goals

**Goals:**
- 消除刷新页面时的暗黑模式闪烁/黑白混错现象
- 确保 cookie（SSR 权威源）与 localStorage（客户端权威源）保持一致
- 在首次绘制前就确定正确的 `.dark` class 状态

**Non-Goals:**
- 不修改主题系统的整体架构（nanostores + persistentAtom 保持不变）
- 不引入新的主题切换 UI 或交互
- 不修改 Tailwind CSS 的 dark mode 配置

## Decisions

### Decision 1: 使用阻塞式内联脚本（方案 B）

在 `Layout.astro` 的 `<head>` 中注入 `<script is:inline>`，同步读取 cookie 并设置 `.dark` class。

**为什么不用只在 `useEffect` 中调用 `initThemeFromCookie()`（方案 A）：**
- `useEffect` 在绘制**之后**执行，无法阻止首次闪烁
- SSR 已经正确设置了 `.dark` class，但如果客户端 JS 在后续毫秒级时间内移除了它，视觉上仍然会闪

**替代方案考虑：**
- 方案 A（`useEffect` 中同步 cookie）：简单但有残余闪烁风险 → 作为补充措施保留
- 方案 B（阻塞脚本）：彻底解决，成本极低（~15 行 JS） → **选择此方案**

### Decision 2: 双保险策略

两处同时修复，确保任何加载顺序下主题都正确：

1. **SSR → Paint 阶段**：`<script is:inline>` 在 Layout.astro 中阻塞设置 class
2. **Hydration 阶段**：在 `ThemeToggle` 的 `useEffect` 中调用 `initThemeFromCookie()`，确保 cookie 值同步到 `themeStore`

这样即使脚本被某些极端情况跳过（如浏览器缓存了不带 class 的 HTML），水合阶段仍然会校正。

### Decision 3: 脚本内容同时处理 system 模式

内联脚本不只处理 `dark`/`light`，也处理 `system` 模式：当 cookie 值为 `system` 时，脚本用 `matchMedia("(prefers-color-scheme: dark)")` 判断系统偏好，确保首次绘制就使用正确的 class。

## Risks / Trade-offs

| 风险 | 缓解措施 |
|------|---------|
| 内联脚本增加 HTML 体积 ~200 bytes | 可忽略不计，远小于一个 React 组件 |
| 用户禁用了 JavaScript | SSR 阶段已经通过 cookie 设置了正确的 class，不受影响 |
| `ThemeToggle` 可能不是每个页面都挂载（例如某些特殊页面没有 navbar） | 内联脚本在 Layout 层面保证 class 正确，不依赖任何组件挂载 |
| cookie 过期或被清除 | 脚本有 fallback 逻辑，默认使用系统偏好 |
