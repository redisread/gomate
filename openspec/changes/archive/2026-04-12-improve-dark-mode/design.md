## Context

GoMate 前端暗黑模式采用了三层架构：
1. **CSS 变量层**（`globals.css`）：`:root` / `.dark` 中定义了完整的 shadcn/ui 语义变量
2. **状态管理层**（`stores/theme.ts`）：nanostores + persistentAtom，支持 light/dark/system 三档
3. **SSR 层**（`Layout.astro`）：通过 cookie 在服务端设置 class，防闪烁

但组件层大量使用 `dark:bg-stone-800`、`dark:text-stone-400` 等硬编码 Tailwind 类，直接绕过了语义变量体系。同时存在 `useIsDark` 自制 hook（DOM-based MutationObserver）、内联样式不响应暗模式、缺少 `color-scheme` 属性等问题。

**约束条件：**
- 使用 Tailwind CSS 4（CSS-first 配置）
- Astro SSR + React Islands（client:load）
- 现有 `globals.css` 中的语义变量已定义完善，无需大量新增
- 保持 `theme` cookie 的 SSR 兼容性

## Goals / Non-Goals

**Goals:**
- 所有组件组件统一使用 Tailwind 语义类，消除 `dark:stone-*` / `dark:gray-*` 硬编码
- 内联样式改为 CSS 变量或 Tailwind class，确保暗模式下正确渲染
- 单一状态源：用 `effectiveThemeStore` 替代 `useIsDark` hook
- 添加 `color-scheme` 启用浏览器原生控件暗模式
- 简化 `theme.ts` 中重复的 DOM 更新逻辑

**Non-Goals:**
- 不改变现有的 light/dark/system 三档逻辑
- 不修改色板颜色值（仅修复引用方式，不调整设计）
- 不涉及移动端 Flutter 的暗黑模式

## Decisions

### Decision 1: 语义变量映射策略

**选择：** 直接使用现有 shadcn/ui 语义变量（`bg-background`、`text-foreground`、`bg-card`、`text-muted-foreground` 等），仅在现有变量无法覆盖时补充新变量。

**理由：** globals.css 已定义了完整的 `--background` / `--foreground` / `--card` / `--muted` / `--accent` / `--destructive` 等变量，足够覆盖当前所有硬编码场景。

**映射规则：**
| 当前硬编码 | 替换为 |
|---|---|
| `bg-stone-50 dark:bg-stone-900` | `bg-background` |
| `text-stone-700 dark:text-stone-300` | `text-foreground` |
| `text-stone-400 dark:text-stone-500` | `text-muted-foreground` |
| `bg-white dark:bg-stone-800` | `bg-card` |
| `border-stone-200 dark:border-stone-700` | `border-border` |
| `text-stone-900 dark:text-stone-100` | `text-foreground` |
| `hover:bg-stone-50 dark:hover:bg-stone-800` | `hover:bg-accent` |

**对于细微灰度差异**（如 stone-300 vs stone-600 的区分），使用 `--muted` / `--muted-foreground` / `--secondary` / `--secondary-foreground` 组合覆盖，必要时在 `:root` / `.dark` 中补充 `--subtle` 变量。

### Decision 2: 内联样式处理

**选择：** 将内联 `boxShadow` 改为使用 CSS 变量 `var(--shadow-card)` / `var(--shadow-card-hover)`，这些已在 globals.css 中定义。

对于无法用 CSS 变量表达的动态样式（如 JS 计算的样式），通过 `effectiveThemeStore` 在 React 层条件式设置。

### Decision 3: useIsDark 替换

**选择：** 将 `home-client.tsx` 中的 `useIsDark`（MutationObserver-based）替换为 `useStore(effectiveThemeStore)`。

**理由：** nanostores 已提供了精确的派生状态，`useIsDark` 的存在原因是注释中提到的 "avoid Astro island module duplication issues"——这是 Astro 多 island 共享 nanostores 模块时的历史 workaround。当前项目中 `theme-toggle.tsx` 和其他组件已正常使用 `useStore(themeStore)`，证明该问题已不存在或可通过标准方式解决。

### Decision 4: theme.ts 去重

**选择：** 移除 `themeStore.subscribe` 中对 DOM class 的操作，仅保留 `effectiveThemeStore.subscribe` 负责更新 `document.documentElement.classList`。因为 effective theme 才是最终决定 UI 应该亮还是暗的值。

### Decision 5: color-scheme

**选择：** 在 `:root` 中添加 `color-scheme: light`，在 `.dark` 中添加 `color-scheme: dark`。这是最简单且影响最广泛的改动，让浏览器自动适配滚动条、表单控件等。

## Risks / Trade-offs

### [视觉回归风险] 语义变量颜色与原始 stone 色值有细微差异

→ **Mitigation:** 替换后需要在亮/暗两种模式下逐一检查各页面，确保视觉无退化。stone 色系和温暖灰度语义变量目标色值接近但不完全相同。

### [Astro Island 模块重复] 替换 useIsDark 可能重新触发 Astro 模块重复问题

→ **Mitigation:** 如果替换后出现 theme store 初始化异常，保留 `useIsDark` 作为 fallback，同时排查 Astro island 的模块共享配置。

### [CSS 变量在 Tailwind v4 中的解析] Tailwind v4 使用 `@theme inline` 方式，CSS 变量的引用方式与 v3 不同

→ **Mitigation:** 已在 globals.css 中确认 `@theme inline` 已正确定义语义变量，使用 `bg-[var(--background)]` 或直接使用 `bg-background` 均可。优先使用 Tailwind 工具类。

### [大量文件修改引入 bug] 涉及 10+ 个文件的修改

→ **Mitigation:** 按文件逐个修改并验证，优先处理影响面小的组件（如 `profile-shared.tsx`），再处理大型组件（如 `feedback-client.tsx`）。
