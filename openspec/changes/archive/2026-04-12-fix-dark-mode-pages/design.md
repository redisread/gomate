## Context

GoMate 前端已通过 `darkMode: "class"` + CSS 变量 + nanostores 主题切换实现了深色模式的基础设施。Layout 级别的组件（navbar、footer 主体、theme-toggle）已在 `fix-dark-mode-issues` 变更中完成适配。

但所有功能页面组件（约 19 个文件、250-300 处硬编码）仍然使用 Tailwind 硬编码颜色类（`bg-white`、`bg-stone-50`、`text-stone-900` 等），这些在 `.dark` class 下不会自动反转。此外，内联渐变色（按钮、头部背景、装饰元素）在深色模式下过于鲜艳。

## Goals / Non-Goals

**Goals:**
- 所有功能页面在深色模式下文字可读、对比度充足
- 渐变背景在深色模式下自动切换为更柔和的色调
- 弹窗、下拉面板等浮层元素在深色模式下正确渲染
- 保持浅色模式下的视觉表现不变

**Non-Goals:**
- 不修改功能逻辑或 API
- 不引入新的依赖
- 不改变浅色模式下的任何视觉表现
- 不重新设计组件结构或布局

## Decisions

### 1. 颜色映射：硬编码 Tailwind 类 → 语义化变量

**决策**：将所有 `stone-` / `gray-` 硬编码颜色替换为 CSS 变量对应的 Tailwind 工具类

**映射表**：

| 硬编码 | 语义化 | 场景 |
|--------|--------|------|
| `bg-white` | `bg-card` | 卡片、弹窗、表单背景 |
| `bg-stone-50` | `bg-muted` 或 `bg-background` | 页面主背景 |
| `bg-stone-100` | `bg-muted/50` 或 `bg-accent` | 浅灰元素 |
| `bg-stone-200` | `bg-muted` 或 `bg-border` | 骨架屏、分隔线 |
| `text-stone-900` / `text-stone-800` | `text-foreground` | 标题、重要文字 |
| `text-stone-700` | `text-foreground` | 正文 |
| `text-stone-600` | `text-muted-foreground` | 次要文字 |
| `text-stone-500` | `text-muted-foreground` | 描述文字 |
| `text-stone-400` | `text-muted-foreground` | 提示、占位符 |
| `text-stone-300` | `text-muted-foreground/60` | 弱化提示 |
| `border-stone-100/200/300` | `border-border` | 所有边框 |

**理由**：语义化变量在 globals.css 的 `:root` 和 `.dark` 中已定义好对应色值，Tailwind 的 `dark:` 变体会自动切换。

### 2. 渐变策略：`dark:` 覆盖

**决策**：内联渐变无法使用 Tailwind 的 `dark:` 工具类，采用 CSS `dark:` 变体类覆盖

```tsx
// 方案：在 className 中使用 dark: 类覆盖背景
<div className="..." style={{
  background: isDark ? 'linear-gradient(...dark colors...)' : 'linear-gradient(...light colors...)'
}} />
```

**品牌金渐变适配**：
- 浅色：`#D97706 → #F59E0B`（保持原样）
- 深色：`#92400E → #B45309`（降饱和、减亮度）

**装饰径向渐变适配**：
- 浅色：`rgba(255,255,255,0.08)` 等
- 深色：调低透明度或改为 `rgba(0,0,0,0.1)` 等暗色调

### 3. 实施顺序：按页面优先级分批

```
批次 1（核心页面，用户最常用）
├── teams-client.tsx         — 队伍列表
├── team-detail-partiful.tsx  — 队伍详情
├── location-detail-main-content.tsx — 地点详情
└── home-client.tsx          — 首页

批次 2（功能页面）
├── my-teams-client.tsx      — 我的队伍
├── favorites-client.tsx     — 收藏
├── profile-client.tsx       — 个人资料
├── profile-shared.tsx       — 可复用个人资料组件
└── share-poster-modal.tsx   — 分享弹窗

批次 3（其他页面 + 组件）
├── terms-client.tsx         — 服务条款
├── create-team-client.tsx   — 创建队伍
├── contact-client.tsx       — 联系我们
├── footer.tsx               — 微信弹窗
├── season-picker.tsx        — 季节选择器
└── cover-image-upload.tsx   — 封面上传

批次 4（认证页面）
├── login-client.tsx
├── register-client.tsx
└── forgot-password-client.tsx
```

### 4. 骨架屏适配

**决策**：骨架屏使用 `animate-pulse` + `bg-muted` 替代 `bg-stone-200`，确保深色模式下可见。

### 5. 验证策略

每完成一个批次，在浏览器中切换深色/浅色模式，确认：
- 文字在深色背景下可读
- 浅色模式无变化
- 无明显的颜色断裂或不协调

## Risks / Trade-offs

| 风险 | 缓解措施 |
|------|----------|
| **语义化变量色值不够精细**：`bg-muted` 在某些场景下可能偏深或偏浅 | 先在 globals.css 中确认变量值，必要时微调 `--muted` 的值 |
| **批量替换引入视觉回归**：250+ 处替换中可能有遗漏或错误替换 | 逐批次验证，浅色+深色模式都要检查 |
| **渐变深色色调选择主观**：柔和到什么程度没有标准 | 参考行业惯例（降低饱和度 20-30%，降低亮度 10-20%），用户可在浏览器中调整 |
| **内联样式的 dark 检测**：React 组件需要知道当前主题状态 | 使用已存在的 theme store（`$theme` signal）或 `useTheme` hook |
