## Why

当前暗黑模式的架构层（CSS 变量 + nanostores + SSR）设计合理，但组件层存在大量硬编码 stone/gray 色值（`dark:bg-stone-800`、`dark:text-stone-400` 等），直接绕过了语义化变量体系。这导致：
- 暗模式风格调整需要逐文件修改，维护成本高
- 内联样式完全不响应暗模式切换
- 部分 UI 元素（滚动条、表单控件）缺少 `color-scheme` 支持，视觉不一致

## What Changes

- 将组件中硬编码的 `dark:stone-*` 类替换为 Tailwind 语义类（`bg-background`、`text-muted-foreground` 等）
- 修复 `home-client.tsx` 中内联 `boxShadow` 等不响应暗模式的样式
- 替换 `home-client.tsx` 中自制的 `useIsDark` hook 为统一的 `effectiveThemeStore`
- 添加 `color-scheme` CSS 属性支持浏览器原生控件暗模式
- 清理 `theme.ts` 中重复的 DOM class 更新逻辑

## Capabilities

### New Capabilities
- `dark-mode-consistency`: 组件层统一使用语义化颜色变量，消除硬编码色值
- `color-scheme-support`: 添加 CSS `color-scheme` 属性，启用浏览器原生控件暗模式适配

### Modified Capabilities
<!-- 无现有 spec 需要修改 -->

## Impact

- **`frontend/src/styles/globals.css`**: 添加 `color-scheme` 属性，补充缺失的语义变量
- **`frontend/src/stores/theme.ts`**: 简化 DOM class 更新逻辑，消除重复订阅
- **`frontend/src/components/features/home-client.tsx`**: 替换 useIsDark hook，修复内联样式
- **`frontend/src/components/features/feedback-client.tsx`**: 20+ 处硬编码替换
- **`frontend/src/components/features/help-client.tsx`**: 8 处硬编码替换
- **`frontend/src/components/features/team-detail-partiful.tsx`**: 15+ 处硬编码替换
- **`frontend/src/components/ui/cover-image-upload.tsx`**: 15+ 处硬编码替换
- **`frontend/src/components/ui/season-picker.tsx`**: 6 处硬编码替换
- **`frontend/src/components/shared/profile-shared.tsx`**: 5 处硬编码替换
- **`frontend/src/components/layout/footer.tsx`**: 4 处硬编码替换
- **`frontend/src/components/features/login-client.tsx`**: 2 处硬编码替换
