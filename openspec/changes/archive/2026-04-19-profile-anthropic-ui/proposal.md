## Why

当前个人资料页面（`/profile`）采用的是传统的卡片式布局，视觉风格偏保守，缺乏品牌辨识度。Anthropic 的 UI 以极简、精致的排版、微妙的动效和克制的色彩运用著称——这种"quiet confidence"的美学更符合 GoMate 想传达的户外品质感。重构个人资料页可以作为一个设计试点，验证新视觉语言后逐步推广到其他页面。

## What Changes

- 个人资料页（`/profile`）整体视觉风格重构，采用 Anthropic 风格的极简设计语言
- 去除当前繁复的装饰元素（多层渐变 banner、SVG 山脉、点阵纹理、光晕装饰）
- 重新设计头像展示区：从大型装饰性头像改为更克制的展示方式
- 统计卡片重新设计：从圆角大卡片改为更轻量的行内展示
- 队伍列表重新设计：从带封面图的大卡片改为更简洁的列表视图
- 保留所有现有功能和数据展示，仅改变视觉呈现
- 全局 CSS 增加 Anthropic 风格的 design token（色彩、字体、间距）

## Capabilities

### New Capabilities
- `profile-anthropic-ui`: 个人资料页的新视觉设计系统，包括排版、色彩、间距、组件样式
- `profile-motion-system`: 页面加载和交互的微动效系统

### Modified Capabilities
- *(none — 这是纯视觉重构，不改变功能需求)*

## Impact

- `frontend/src/components/features/profile-client.tsx` — 主要重构目标
- `frontend/src/pages/profile/index.astro` — 可能需要调整 layout 属性
- `frontend/src/styles/` 或 `frontend/src/app.css` — 新增/修改 design token
- 不影响后端 API、数据库或其他页面
- 不影响 i18n 文案结构
