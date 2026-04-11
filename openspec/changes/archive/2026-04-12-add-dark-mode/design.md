## Context

GoMate 使用 Astro + React + Tailwind CSS v4 构建前端。当前项目使用 shadcn/ui 组件库，所有组件采用浅色主题设计。为实现暗黑模式，需要：

1. **主题状态管理**：React Context 提供全局主题状态
2. **CSS 类名切换**：Tailwind 的 `darkMode: 'class'` 策略需要在 html 元素上切换 `dark` 类
3. **持久化存储**：localStorage 保存用户偏好
4. **组件适配**：所有 shadcn/ui 组件已内置 `dark:` 变体支持，只需确保正确配置

**技术约束**：
- Astro 使用 Islands 架构，主题 Provider 需包裹客户端交互组件
- 避免页面闪烁（Flash of Incorrect Theme）需要在 SSR 阶段处理

## Goals / Non-Goals

**Goals:**
- 用户可在 Light/Dark/System 三种模式间切换
- 主题偏好持久化，刷新后保持
- 首次访问自动应用系统偏好
- 所有页面和组件正确渲染暗黑样式
- 无页面加载时的主题闪烁

**Non-Goals:**
- 不修改后端 API 或数据库
- 不添加动画过渡效果（可后续迭代）
- 不支持按时间自动切换主题

## Decisions

### 1. 使用 `next-themes` 库而非自定义实现
**选择**：使用 `next-themes` 库（版本 0.4.x，支持 React 18）

**理由**：
- 成熟稳定，处理 SSR 闪烁问题完善
- 内置 localStorage 持久化和系统偏好监听
- 支持 `class` 属性策略，与 Tailwind 完美配合
- 零闪屏（FOIT）处理机制成熟

**替代方案**：自定义 Context + useEffect
- 拒绝原因：需要手动处理 SSR 闪烁、storage 事件同步等边缘情况

### 2. Tailwind CSS 配置策略
**选择**：使用 `darkMode: 'class'` 策略

**理由**：
- 允许在 html 元素上显式控制 `dark` 类
- 与 `next-themes` 配合最佳
- 支持嵌套暗黑区域（如预览组件）

**配置位置**：`frontend/tailwind.config.ts`（如不存在则在 CSS 中配置 v4 语法）

### 3. 主题切换组件位置
**选择**：导航栏右侧，用户头像左侧

**理由**：
- 符合主流设计模式（GitHub、Vercel 等）
- 所有页面均可访问
- 不干扰主要导航功能

### 4. 颜色方案设计
**策略**：
- 背景色：深色使用 `slate-950`，浅色保持 `white`
- 文字色：深色使用 `slate-50`，浅色保持 `slate-900`
- 边框色：深色使用 `slate-800`，浅色保持 `slate-200`
- 主色调保持品牌色，调整饱和度以适应不同背景

**不创建自定义 CSS 变量原因**：
- Tailwind 的 `dark:` 变体足够灵活
- shadcn/ui 组件已预设暗黑样式

## Risks / Trade-offs

| 风险 | 缓解措施 |
|------|----------|
| **SSR 闪烁**：服务端渲染时不知道用户主题偏好，可能先渲染浅色再切换到深色 | 使用 `next-themes` 的 `disableTransitionOnChange` 和 CSS 策略，配合 `<script>` 标签内联脚本在页面加载前设置主题 |
| **组件遗漏**：部分自定义组件可能遗漏 `dark:` 样式 | 开发时逐个页面检查，使用 Chrome DevTools 的 Emulate CSS media feature prefers-color-scheme |
| **localStorage 不可用**：隐私模式下可能被禁用 | `next-themes` 自动降级到系统偏好， gracefully handle |
| **第三方组件不兼容**：引入的新 shadcn 组件可能样式不完整 | 安装时选择包含暗黑样式的主题基础色 |

## Migration Plan

**部署步骤**：
1. 安装 `next-themes` 依赖
2. 配置 Tailwind CSS 暗黑模式
3. 创建 ThemeProvider 组件
4. 更新 Layout.astro 包裹 Provider
5. 添加 ThemeToggle 到导航栏
6. 逐个页面检查暗黑样式
7. 本地验证后合并部署

**回滚策略**：
- 纯前端功能，回滚只需还原代码重新部署
- 不涉及数据库迁移，无数据风险

## Open Questions

1. 是否需要为暗黑模式单独设计 Logo 或品牌色调整？
2. 图片资源（如地点封面）是否需要暗黑模式适配版本？
3. 地图组件（如后续集成）的暗黑主题如何统一？
