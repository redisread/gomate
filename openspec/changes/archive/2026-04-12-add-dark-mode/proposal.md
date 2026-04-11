## Why

现代用户期望应用支持暗黑模式以获得更好的夜间浏览体验，同时减少眼部疲劳。作为户外徒步组队平台，GoMate 用户经常在夜间规划行程，暗黑模式将显著提升用户体验。此外，暗黑模式已成为现代 Web 应用的标准功能，有助于提升产品专业形象。

## What Changes

- **新增暗黑模式切换按钮**：在导航栏添加主题切换开关，支持 Light/Dark/System 三种模式
- **实现主题状态管理**：使用 React Context + localStorage 持久化用户偏好设置
- **Tailwind CSS 暗黑模式配置**：启用 `darkMode: 'class'` 策略，确保所有组件支持暗黑样式
- **全局样式适配**：更新颜色变量、边框、阴影等设计令牌，确保暗黑模式下视觉层次清晰
- **组件级暗黑样式**：为所有 shadcn/ui 组件及自定义组件添加 `dark:` 变体样式
- **系统偏好检测**：首次访问时自动检测系统主题偏好并应用

## Capabilities

### New Capabilities
- `theme-provider`: 主题上下文管理，包括当前主题状态、切换逻辑、系统偏好监听
- `theme-toggle`: 导航栏主题切换 UI 组件，支持图标动画和快捷操作
- `theme-persistence`: 主题偏好本地存储与恢复机制
- `dark-mode-styles`: 全局及组件级暗黑样式定义与适配

### Modified Capabilities
- （无现有能力需要修改）

## Impact

**受影响范围**：
- `frontend/src/components/layout/navbar.tsx` - 添加主题切换按钮
- `frontend/src/components/ui/` - shadcn/ui 组件暗黑样式适配
- `frontend/src/styles/` - 全局 CSS 变量和 Tailwind 配置
- `frontend/src/lib/` - 新增主题管理工具函数
- `frontend/astro.config.mjs` - 可能需要调整以支持主题类名

**依赖关系**：
- Tailwind CSS v4（已支持 `dark:` 变体）
- React Context API
- localStorage API

**无破坏性变更**：此功能为纯新增，不影响现有功能。
