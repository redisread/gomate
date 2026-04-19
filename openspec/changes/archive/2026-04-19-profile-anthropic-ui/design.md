## Context

当前个人资料页使用较重的装饰风格：多层渐变 banner（#78350F → #8dd5c8）、三层 SVG 山脉剪影、点阵纹理、光晕装饰、大尺寸圆形头像（128px）+ 等级 emoji 角标。统计卡使用 rounded-2xl + 图标容器 + hover 上移阴影效果。整体视觉密度偏高。

Anthropic 的设计哲学是 "quiet confidence"：极简但温暖、精致的排版、克制的色彩、大面积留白、微妙的边框和圆角、轻量级的动效。关键特征：

- **色彩**：暖白底色（#FAF9F5）、深墨文字（#18181B）、点缀色为柔和的琥珀/橙色（#D97706 系），避免冷色调
- **排版**：偏大的字号、宽松的 letter-spacing、精致的字重对比
- **布局**：大量留白、非对称布局、元素之间有充足的呼吸空间
- **组件**：极细的边框（1px）、小圆角（6-8px 而非 16-24px）、无阴影或极淡阴影
- **动效**：页面加载时元素依次淡入（staggered fade-in），hover 时微妙的位置偏移

## Goals / Non-Goals

**Goals:**
- 个人资料页视觉呈现全面转向 Anthropic 风格的极简温暖设计
- 保留所有现有功能、数据字段、i18n 文案不变
- 建立可复用的 design token 系统，为后续页面重构做准备
- 移动端和桌面端响应式适配

**Non-Goals:**
- 不修改后端 API 或数据结构
- 不改变现有功能逻辑（登录态、队伍加载、编辑跳转等）
- 不修改 i18n 文案内容
- 不改动 navbar / footer 组件（保持现有风格一致过渡）
- 不做性能优化（本次仅关注视觉）

## Decisions

### 1. Design Token 策略

**决策**：在 `frontend/src/app.css` 中新增 Anthropic 风格的 CSS 自定义属性，复用现有的 Tailwind CSS 4 变量系统。

**理由**：项目已使用 Tailwind CSS 4，支持 CSS 变量直接映射到 utility classes。新增 token 而非覆盖现有 token，避免影响其他页面。

新增关键 token：
```css
--anthropic-bg: #FAF9F5          /* 暖白底色 */
--anthropic-text: #18181B        /* 深墨主文 */
--anthropic-text-secondary: #71717A  /* 灰色副文 */
--anthropic-border: #E4E0D8      /* 暖灰边框 */
--anthropic-accent: #D97706      /* 品牌琥珀色 */
--anthropic-accent-soft: #FEF3C7 /* 柔和琥珀底色 */
--anthropic-surface: #FFFFFF     /* 白色表面 */
--anthropic-radius-sm: 6px       /* 小组件圆角 */
--anthropic-radius-md: 8px       /* 中等圆角 */
--anthropic-radius-lg: 12px      /* 大区块圆角 */
```

### 2. 页面结构重组

**决策**：从"banner + 浮动头像"改为"侧边栏 + 主内容"的两栏布局（桌面端），移动端改为纵向堆叠。

**当前结构**：
```
[Banner 渐变 + SVG 山脉]
  [浮动头像] [用户名] [操作按钮]
  [徽章行] [简介] [装备] [经历]
[统计卡网格 3 列]
[队伍列表 - 大卡片]
```

**新结构（桌面端）**：
```
┌──────────────┬──────────────────────────┐
│  头像        │  用户名 / 等级徽章        │
│  大号无装饰  │  邮箱                     │
│              │  简介                     │
│  编辑/登出   │  装备 / 经历              │
│              │                          │
│  ──────────  │  ─────────────────────   │
│  统计 1      │  我发起的队伍              │
│  统计 2      │  [列表项 1]               │
│  统计 3      │  [列表项 2]               │
│              │  [列表项 3]               │
└──────────────┴──────────────────────────┘
```

**理由**：两栏布局更符合 Anthropic 的设计模式，信息密度更合理，视觉层次更清晰。

### 3. 装饰元素简化

| 当前 | 新设计 |
|------|--------|
| 渐变 banner 160px 高度 | 去除，改为纯白色背景 |
| 三层 SVG 山脉 | 去除 |
| 点阵纹理 | 去除 |
| 光晕装饰 | 去除 |
| 128px 圆形头像 + 等级 emoji | 80px 方形圆角头像 + 等级徽章移至信息区 |
| rounded-2xl（16px 圆角） | rounded-lg（12px）或 rounded-md（8px） |
| hover: shadow-lg | hover: border-color change only |
| 统计卡带图标容器 | 纯数字 + 标签，无图标背景 |

### 4. 排版规范

- **用户名**：`text-2xl font-semibold`（而非 `font-bold`），`tracking-tight`
- **二级标题**：`text-sm font-medium uppercase tracking-wider text-stone-500`（小写大写，增加字间距）
- **正文**：`text-sm leading-relaxed`
- **数字**：`text-3xl font-light`（细体大数字，Anthropic 标志风格）
- **列表项标题**：`text-sm font-medium`

### 5. 队伍列表重新设计

**决策**：从带封面图的大卡片（thumbnail + 信息 + Chevron）改为轻量列表视图。

每个列表项：
```
┌──────────────────────────────────────┐
│ 队伍名称                     [状态徽章] │
│ 地点 · 日期 · 人数                     │
└──────────────────────────────────────┘
```

- 去除封面图缩略图（保留在队伍详情页展示）
- 边框分割线替代卡片背景
- hover 时仅背景色微调（`hover:bg-stone-50`）
- 保留所有数据字段

### 6. 动效系统

**决策**：使用纯 CSS animation（`@keyframes`）而非 JS 驱动，通过 `animation-delay` 实现 staggered 效果。

```css
@keyframes fade-up {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}

.animate-fade-up {
  animation: fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
}
```

Staggered delays:
```css
.stagger-1 { animation-delay: 0ms; }
.stagger-2 { animation-delay: 60ms; }
.stagger-3 { animation-delay: 120ms; }
.stagger-4 { animation-delay: 180ms; }
.stagger-5 { animation-delay: 240ms; }
```

页面加载顺序：用户信息区 → 统计行 → 队伍列表

## Risks / Trade-offs

- **[风险]** 从装饰丰富到极简的转变可能让用户感觉"太素" → **缓解**：保留品牌琥珀色作为点缀色，保持温暖感
- **[风险]** 去除封面图后队伍列表辨识度降低 → **缓解**：队伍名称字体加粗 + 状态徽章彩色标记，保持可辨识
- **[Trade-off]** 两栏布局在小屏桌面端（~900px）可能过于拥挤 → **缓解**：在 `lg: breakpoint` 切换为单栏布局
- **[Trade-off]** CSS 变量新增可能与现有 dark mode 冲突 → **缓解**：为 dark mode 同步定义对应的 dark token
