## Context

当前主题切换架构：

```
Layout.astro
├── <script is:inline> 设置 html.dark
└── <ThemeProvider client:only="react">  ← 问题：包裹整个应用
    ├── Navbar
    ├── Page Content
    └── Footer
```

问题：
1. `client:only` 导致整个应用 CSR，失去 SSR
2. 内联脚本和 React 可能竞争修改 html class
3. 主题状态分散在 localStorage 和 React Context

## Goals / Non-Goals

**Goals:**
- 服务端直接渲染正确主题（无闪烁）
- 主题切换组件独立，不依赖全局 Provider
- 支持 Light/Dark/System 三种模式
- 主题偏好持久化（刷新保持）

**Non-Goals:**
- 不修改页面组件的主题样式（已使用 CSS 变量）
- 不添加动画过渡效果
- 不改变用户可见的切换界面

## Decisions

### 1. 状态管理：nanostores 替代 React Context
**选择**：使用 `nanostores` + `@nanostores/persistent`

**理由**：
- 框架无关，Astro 和 React 组件都能读取
- 比 React Context 更轻量（~300 bytes）
- 支持持久化，API 简洁

**替代方案**：继续用 React Context
- 拒绝原因：需要 Provider 包裹，与 Islands 架构冲突

### 2. 服务端同步：Cookie 方案
**选择**：通过 Cookie 传递主题偏好到服务端

**理由**：
- Astro 可以通过 `Astro.cookies` 读取
- 服务端可以直接设置 `html class`
- 无需客户端 JavaScript 修正

**替代方案**：HTTP Header
- 拒绝原因：Cookie 更自然，支持页面刷新后保持

### 3. 架构设计

```
优化后：
┌─────────────────────────────────────────────────────────┐
│ Layout.astro (服务端)                                    │
│ ├── 读取 Cookie → 设置 html class="dark"                │
│ ├── Navbar client:load                                   │
│ │   └── ThemeToggle (nanostores)                         │
│ ├── Page Content (纯 SSR)                                │
│ └── Footer client:load                                   │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│ 客户端 (主题切换时)                                       │
│ ├── ThemeToggle 调用 themeStore.set('dark')              │
│ ├── nanostores 更新状态                                  │
│ ├── 同步到 Cookie (document.cookie)                      │
│ └── 更新 html class (document.documentElement)           │
└─────────────────────────────────────────────────────────┘
```

### 4. 防闪烁策略
**服务端渲染时**：
- 读取 Cookie 确定主题
- HTML 直接输出 `<html class="dark">`
- 浏览器渲染时已是正确主题

**客户端切换时**：
- 更新 nanostores 状态
- 同步到 Cookie
- 立即更新 `document.documentElement.className`

**无需内联脚本！**

## Risks / Trade-offs

| 风险 | 缓解措施 |
|------|----------|
| **首次访问无 Cookie**：服务端不知道主题偏好 | 默认使用 System，客户端检测后更新 |
| **System 模式变化**：系统主题改变时页面未响应 | 添加 `matchMedia` 监听，变化时自动切换 |
| **Cookie 大小限制**：主题偏好占用 Cookie 空间 | 主题值很小（~10 bytes），可忽略 |

## Migration Plan

**阶段 1：准备**
1. 安装 nanostores 依赖
2. 创建 theme store

**阶段 2：重构**
1. 修改 Layout.astro 读取 Cookie
2. 移除 ThemeProvider 全局包裹
3. 更新 ThemeToggle 使用 nanostores

**阶段 3：清理**
1. 移除 next-themes 依赖
2. 删除旧的 theme-provider.tsx
3. 测试验证

**回滚策略**：
- 保留代码变更历史，可快速回滚
- 主题偏好存储在 localStorage，切换方案不丢失

## Open Questions

1. 是否需要支持 View Transitions API？（需要额外处理）
2. 是否需要在服务端缓存主题设置？（当前方案不需要）
