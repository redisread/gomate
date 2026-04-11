## Why

当前暗黑模式实现存在以下问题：

1. **SSR 失效**：`ThemeProvider client:only="react"` 包裹整个应用，导致服务端渲染优势丧失
2. **Hydration 不匹配**：内联脚本设置 `html.dark`，但 React 客户端激活后可能覆盖，导致闪烁或切换失效
3. **性能问题**：整个应用外壳都是客户端渲染，首屏性能差
4. **维护复杂**：`next-themes` 来自 Next.js 生态，与 Astro 的 Islands 架构理念不符

这些问题导致主题切换不稳定（如无法切回浅色模式），影响用户体验。

## What Changes

- **引入 nanostores**：使用轻量级状态管理库替代 React Context
- **服务端主题同步**：通过 Cookie 实现服务端和客户端主题状态同步
- **重构 ThemeProvider**：移除全局包裹，改为局部状态管理
- **优化 Layout.astro**：服务端读取 Cookie 设置 `html class`，无需客户端修正
- **更新 ThemeToggle**：使用 nanostores 管理主题状态
- **移除冗余依赖**：删除 `next-themes`，添加 `nanostores` 系列依赖

## Capabilities

### New Capabilities
- `theme-store`：nanostores 主题状态管理，支持 Light/Dark/System 三种模式
- `astro-ssr-theme`：服务端主题同步，HTML 直接输出正确的 `class`
- `theme-persistence`：Cookie + localStorage 双保险持久化

### Removed Capabilities
- `next-themes`：移除对 Next.js 生态的依赖

## Impact

**受影响范围**：
- `frontend/package.json` - 依赖变更
- `frontend/src/stores/theme.ts` - 新建主题 store
- `frontend/src/components/theme-provider.tsx` - 重构或移除
- `frontend/src/components/theme-toggle.tsx` - 使用 nanostores
- `frontend/src/layouts/Layout.astro` - 服务端读取 Cookie
- `frontend/src/components/layout/navbar.tsx` - 移除 ThemeProvider 依赖

**无破坏性变更**：主题切换功能保持兼容，用户偏好自动迁移。

**性能提升**：
- 首屏渲染时间减少（服务端直接返回正确主题）
- 减少客户端 JavaScript 体积（移除 `next-themes`）
-  hydration 匹配度提升
