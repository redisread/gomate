## Why

深色模式的基础设施（Tailwind 配置、CSS 变量、主题切换）已完成，但所有功能页面组件仍然使用硬编码颜色（`bg-stone-50`、`bg-white`、`text-stone-900` 等），导致切换到深色模式后约 80% 的页面内容未正确反转颜色，文字在暗色背景上不可见或对比度严重不足。

## What Changes

- **功能页面颜色迁移**：将所有 14 个 feature 组件中的硬编码 Tailwind 颜色替换为语义化 CSS 变量（`bg-card`、`bg-muted`、`text-foreground`、`text-muted-foreground`、`border-border`）
- **渐变颜色适配**：为所有内联渐变（品牌金/琥珀、功能渐变、装饰径向渐变）添加深色模式变体，降低饱和度和亮度
- **Footer 微信弹窗适配**：弹窗背景、文字、边框全部使用语义化颜色
- **可复用组件适配**：`profile-shared.tsx`、`season-picker.tsx`、`cover-image-upload.tsx` 等共享组件适配
- **骨架屏动画适配**：确保骨架屏在深色模式下可见

## Capabilities

### New Capabilities
- `dark-mode-pages`：所有功能页面（队伍列表、队伍详情、我的队伍、地点详情、首页、收藏、服务条款、个人资料）的深色模式适配
- `dark-mode-modals`：弹窗和下拉面板（Footer 微信弹窗、分享弹窗）的深色模式适配
- `dark-mode-gradients`：所有渐变背景（品牌按钮、头部背景、装饰渐变）的深色模式变体

### Modified Capabilities
- （无现有需求变更，均为样式修复）

## Impact

**受影响的 19 个文件**：

| 分类 | 文件 | 修改量 |
|------|------|--------|
| 功能页面 | `teams-client.tsx` | 60+ 处 |
| 功能页面 | `team-detail-partiful.tsx` | 100+ 处 |
| 功能页面 | `my-teams-client.tsx` | 多处 |
| 功能页面 | `location-detail-main-content.tsx` | 多处 |
| 功能页面 | `home-client.tsx` | 多处 |
| 功能页面 | `favorites-client.tsx` | 10+ 处 |
| 功能页面 | `terms-client.tsx` | 全文 |
| 功能页面 | `share-poster-modal.tsx` | 10+ 处 |
| 功能页面 | `create-team-client.tsx` | 按钮渐变 |
| 功能页面 | `profile-client.tsx` | 多处 |
| 功能页面 | `contact-client.tsx` | 按钮渐变 |
| 功能页面 | `login-client.tsx` | 渐变 |
| 功能页面 | `register-client.tsx` | 渐变 |
| 功能页面 | `forgot-password-client.tsx` | 渐变 |
| 布局 | `footer.tsx` | 弹窗部分 |
| 共享 | `profile-shared.tsx` | 卡片样式 |
| UI 组件 | `season-picker.tsx` | gray 色 |
| UI 组件 | `cover-image-upload.tsx` | 补充 dark: |

**无破坏性变更**：纯样式修改，不影响功能逻辑、API 或数据模型。
