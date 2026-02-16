# GoMate 设计系统

> 「小而美」的地点组队平台设计规范
> 版本: V1.0 | 更新日期: 2026-02-16

---

## 1. 设计原则

### 核心理念
- **极简**: 减少视觉噪音，聚焦核心信息
- **信任**: 清晰的结构建立用户信任
- **行动**: 明确的行动引导，降低决策成本

### 设计关键词
`自然` `清晰` `可靠` `轻盈`

---

## 2. 色彩系统

基于 Tailwind CSS v4 的 `stone` 色系，营造自然、温暖的户外氛围。

### 2.1 CSS 变量定义

```css
/* globals.css */
@layer base {
  :root {
    /* 主色调 - Stone 自然色系 */
    --color-primary-50: #fafaf9;
    --color-primary-100: #f5f5f4;
    --color-primary-200: #e7e5e4;
    --color-primary-300: #d6d3d1;
    --color-primary-400: #a8a29e;
    --color-primary-500: #78716c;
    --color-primary-600: #57534e;
    --color-primary-700: #44403c;
    --color-primary-800: #292524;
    --color-primary-900: #1c1917;
    --color-primary-950: #0c0a09;

    /* 功能色 */
    --color-accent: #059669;          /* Emerald 600 - 行动按钮 */
    --color-accent-hover: #047857;    /* Emerald 700 */
    --color-accent-light: #d1fae5;    /* Emerald 100 */

    --color-warning: #f59e0b;         /* Amber 500 */
    --color-warning-light: #fef3c7;   /* Amber 100 */

    --color-danger: #ef4444;          /* Red 500 */
    --color-danger-light: #fee2e2;    /* Red 100 */

    /* 背景色 */
    --color-bg-primary: #ffffff;
    --color-bg-secondary: #fafaf9;    /* Stone 50 */
    --color-bg-tertiary: #f5f5f4;     /* Stone 100 */
    --color-bg-elevated: #ffffff;

    /* 文字色 */
    --color-text-primary: #1c1917;    /* Stone 900 */
    --color-text-secondary: #57534e;  /* Stone 600 */
    --color-text-tertiary: #78716c;   /* Stone 500 */
    --color-text-muted: #a8a29e;      /* Stone 400 */
    --color-text-inverse: #ffffff;

    /* 边框色 */
    --color-border-light: #f5f5f4;    /* Stone 100 */
    --color-border-default: #e7e5e4;  /* Stone 200 */
    --color-border-strong: #d6d3d1;   /* Stone 300 */

    /* 难度标识色 */
    --color-difficulty-easy: #22c55e;   /* Green 500 */
    --color-difficulty-medium: #f59e0b; /* Amber 500 */
    --color-difficulty-hard: #ef4444;   /* Red 500 */
  }
}
```

### 2.2 色彩使用规范

| 场景 | 变量 | 用途 |
|------|------|------|
| 主按钮背景 | `--color-accent` | 主要行动按钮 |
| 主按钮悬停 | `--color-accent-hover` | 按钮悬停状态 |
| 页面背景 | `--color-bg-secondary` | 页面底色 |
| 卡片背景 | `--color-bg-primary` | 卡片、浮层 |
| 主要文字 | `--color-text-primary` | 标题、正文 |
| 次要文字 | `--color-text-secondary` | 描述、辅助信息 |
| 弱化文字 | `--color-text-muted` | 时间、标签 |
| 分割线 | `--color-border-default` | 内容分隔 |

---

## 3. 排版系统

### 3.1 字体配置

```css
/* 使用系统字体栈，保证加载速度和原生感 */
--font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif;
--font-mono: "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace;
```

### 3.2 字体层级

| 层级 | 大小 | 行高 | 字重 | 用途 |
|------|------|------|------|------|
| H1 | 2rem (32px) | 1.2 | 700 | 页面大标题 |
| H2 | 1.5rem (24px) | 1.3 | 600 | 区块标题 |
| H3 | 1.25rem (20px) | 1.4 | 600 | 卡片标题 |
| H4 | 1.125rem (18px) | 1.4 | 600 | 小标题 |
| Body | 1rem (16px) | 1.6 | 400 | 正文 |
| Body Small | 0.875rem (14px) | 1.5 | 400 | 辅助文字 |
| Caption | 0.75rem (12px) | 1.4 | 400 | 标签、时间 |

### 3.3 排版工具类

```css
/* 标题样式 */
.text-h1 { font-size: 2rem; line-height: 1.2; font-weight: 700; letter-spacing: -0.02em; }
.text-h2 { font-size: 1.5rem; line-height: 1.3; font-weight: 600; letter-spacing: -0.01em; }
.text-h3 { font-size: 1.25rem; line-height: 1.4; font-weight: 600; }
.text-h4 { font-size: 1.125rem; line-height: 1.4; font-weight: 600; }

/* 正文样式 */
.text-body { font-size: 1rem; line-height: 1.6; font-weight: 400; }
.text-body-sm { font-size: 0.875rem; line-height: 1.5; font-weight: 400; }
.text-caption { font-size: 0.75rem; line-height: 1.4; font-weight: 400; }

/* 特殊样式 */
.text-truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.text-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
```

---

## 4. 间距系统

### 4.1 基础间距单位

以 `4px` 为基础单位，建立 8 级间距体系：

| Token | 值 | 用途 |
|-------|-----|------|
| space-1 | 4px | 图标与文字间距 |
| space-2 | 8px | 紧凑元素间距 |
| space-3 | 12px | 表单元素间距 |
| space-4 | 16px | 标准间距 |
| space-5 | 20px | 卡片内边距 |
| space-6 | 24px | 区块间距 |
| space-8 | 32px | 大区块间距 |
| space-10 | 40px | 页面级间距 |
| space-12 | 48px | Hero 区域 |

### 4.2 页面布局规范

```css
/* 页面容器 */
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 16px;        /* 移动端 */
  padding: 0 24px;        /* 平板端 (>640px) */
  padding: 0 32px;        /* 桌面端 (>1024px) */
}

/* 页面内容区 */
.page-content {
  padding-top: 24px;
  padding-bottom: 48px;
}

/* 网格系统 - 地点卡片 */
.grid-spots {
  display: grid;
  gap: 20px;
  grid-template-columns: 1fr;                    /* 移动端 */
  grid-template-columns: repeat(2, 1fr);         /* 平板端 */
  grid-template-columns: repeat(3, 1fr);         /* 桌面端 */
  grid-template-columns: repeat(4, 1fr);         /* 大屏端 */
}

/* 网格系统 - 队伍卡片 */
.grid-teams {
  display: grid;
  gap: 16px;
  grid-template-columns: 1fr;
}
```

---

## 5. 组件规范

### 5.1 按钮 (Button)

#### 主按钮 (Primary)
```css
.btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 24px;
  font-size: 1rem;
  font-weight: 500;
  color: white;
  background-color: var(--color-accent);
  border-radius: 8px;
  transition: all 150ms ease;
}
.btn-primary:hover {
  background-color: var(--color-accent-hover);
  transform: translateY(-1px);
}
.btn-primary:active {
  transform: translateY(0);
}
.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}
```

#### 次按钮 (Secondary)
```css
.btn-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 24px;
  font-size: 1rem;
  font-weight: 500;
  color: var(--color-text-primary);
  background-color: var(--color-bg-primary);
  border: 1px solid var(--color-border-default);
  border-radius: 8px;
  transition: all 150ms ease;
}
.btn-secondary:hover {
  background-color: var(--color-bg-secondary);
  border-color: var(--color-border-strong);
}
```

#### 幽灵按钮 (Ghost)
```css
.btn-ghost {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 16px;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  background-color: transparent;
  border-radius: 6px;
  transition: all 150ms ease;
}
.btn-ghost:hover {
  background-color: var(--color-bg-secondary);
  color: var(--color-text-primary);
}
```

#### 按钮尺寸
| 尺寸 | 高度 | 水平内边距 | 字体大小 | 用途 |
|------|------|-----------|---------|------|
| sm | 32px | 12px | 14px | 小操作 |
| md | 40px | 20px | 14px | 标准按钮 |
| lg | 48px | 24px | 16px | 主要行动 |

### 5.2 卡片 (Card)

#### 地点卡片 (Spot Card)
```css
.spot-card {
  display: flex;
  flex-direction: column;
  background-color: var(--color-bg-primary);
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--color-border-light);
  transition: all 200ms ease;
  cursor: pointer;
}
.spot-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}
.spot-card__image {
  aspect-ratio: 16 / 10;
  object-fit: cover;
  width: 100%;
}
.spot-card__content {
  padding: 16px;
}
.spot-card__title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 8px;
}
.spot-card__meta {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}
```

#### 队伍卡片 (Team Card)
```css
.team-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
  background-color: var(--color-bg-primary);
  border-radius: 12px;
  border: 1px solid var(--color-border-default);
}
.team-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.team-card__title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-text-primary);
}
.team-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}
.team-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 16px;
  border-top: 1px solid var(--color-border-light);
}
```

#### 信息卡片 (Info Card)
```css
.info-card {
  padding: 20px;
  background-color: var(--color-bg-primary);
  border-radius: 12px;
  border: 1px solid var(--color-border-default);
}
.info-card__title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 12px;
}
.info-card__content {
  font-size: 1rem;
  color: var(--color-text-primary);
  line-height: 1.6;
}
```

### 5.3 表单元素 (Form)

#### 输入框 (Input)
```css
.input {
  width: 100%;
  height: 44px;
  padding: 0 16px;
  font-size: 1rem;
  color: var(--color-text-primary);
  background-color: var(--color-bg-primary);
  border: 1px solid var(--color-border-default);
  border-radius: 8px;
  transition: all 150ms ease;
}
.input::placeholder {
  color: var(--color-text-muted);
}
.input:hover {
  border-color: var(--color-border-strong);
}
.input:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-accent-light);
}
```

#### 搜索框 (Search)
```css
.search-input {
  position: relative;
  display: flex;
  align-items: center;
}
.search-input__icon {
  position: absolute;
  left: 16px;
  color: var(--color-text-muted);
}
.search-input__field {
  width: 100%;
  height: 48px;
  padding: 0 16px 0 48px;
  font-size: 1rem;
  background-color: var(--color-bg-primary);
  border: 1px solid var(--color-border-default);
  border-radius: 24px;
  transition: all 150ms ease;
}
.search-input__field:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-accent-light);
}
```

#### 选择器 (Select)
```css
.select {
  width: 100%;
  height: 44px;
  padding: 0 40px 0 16px;
  font-size: 1rem;
  color: var(--color-text-primary);
  background-color: var(--color-bg-primary);
  background-image: url("data:image/svg+xml,..."); /* chevron icon */
  background-repeat: no-repeat;
  background-position: right 12px center;
  border: 1px solid var(--color-border-default);
  border-radius: 8px;
  appearance: none;
  cursor: pointer;
}
```

### 5.4 标签/徽章 (Badge)

```css
.badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  font-size: 0.75rem;
  font-weight: 500;
  border-radius: 9999px;
}

/* 难度标签 */
.badge--difficulty-easy {
  background-color: #dcfce7;
  color: #166534;
}
.badge--difficulty-medium {
  background-color: #fef3c7;
  color: #92400e;
}
.badge--difficulty-hard {
  background-color: #fee2e2;
  color: #991b1b;
}

/* 状态标签 */
.badge--status-recruiting {
  background-color: var(--color-accent-light);
  color: var(--color-accent);
}
.badge--status-full {
  background-color: var(--color-bg-tertiary);
  color: var(--color-text-tertiary);
}

/* 季节标签 */
.badge--season {
  background-color: var(--color-bg-tertiary);
  color: var(--color-text-secondary);
}
```

### 5.5 头像 (Avatar)

```css
.avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  overflow: hidden;
  background-color: var(--color-bg-tertiary);
}
.avatar--sm { width: 32px; height: 32px; }
.avatar--md { width: 40px; height: 40px; }
.avatar--lg { width: 56px; height: 56px; }
.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
```

### 5.6 分割线 (Divider)

```css
.divider {
  height: 1px;
  background-color: var(--color-border-default);
  border: none;
}
.divider--spaced {
  margin: 24px 0;
}
```

---

## 6. 动画规范

### 6.1 过渡时间

| 名称 | 时长 | 用途 |
|------|------|------|
| instant | 0ms | 无动画 |
| fast | 150ms | 按钮悬停、颜色变化 |
| normal | 200ms | 卡片悬停、展开收起 |
| slow | 300ms | 页面过渡、模态框 |

### 6.2 缓动函数

```css
--ease-default: cubic-bezier(0.4, 0, 0.2, 1);
--ease-in: cubic-bezier(0.4, 0, 1, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
```

### 6.3 微交互动画

#### 按钮点击
```css
@keyframes button-press {
  0% { transform: scale(1); }
  50% { transform: scale(0.96); }
  100% { transform: scale(1); }
}
.btn:active {
  animation: button-press 150ms ease;
}
```

#### 卡片悬停
```css
.card {
  transition: transform 200ms var(--ease-default),
              box-shadow 200ms var(--ease-default);
}
.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}
```

#### 页面加载
```css
@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.animate-fade-in-up {
  animation: fade-in-up 300ms var(--ease-out) forwards;
}

/*  stagger 动画 */
.stagger-1 { animation-delay: 50ms; }
.stagger-2 { animation-delay: 100ms; }
.stagger-3 { animation-delay: 150ms; }
.stagger-4 { animation-delay: 200ms; }
```

#### 骨架屏
```css
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
.skeleton {
  background: linear-gradient(
    90deg,
    var(--color-bg-tertiary) 25%,
    var(--color-bg-secondary) 50%,
    var(--color-bg-tertiary) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
}
```

---

## 7. 页面设计规范

### 7.1 首页 (Home Page)

#### 页面结构
```
┌─────────────────────────────────────────┐
│  Header (Logo + 导航)                    │
├─────────────────────────────────────────┤
│                                         │
│  Hero Section                           │
│  - 主标题: "发现深圳徒步好去处"            │
│  - 副标题: "找到志同道合的徒步伙伴"        │
│  - 搜索框                               │
│                                         │
├─────────────────────────────────────────┤
│  Filter Bar                             │
│  [难度 ▼] [区域 ▼] [季节 ▼]             │
├─────────────────────────────────────────┤
│                                         │
│  Spot Grid (地点卡片网格)                │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│  │ 图片    │ │ 图片    │ │ 图片    │   │
│  │ 名称    │ │ 名称    │ │ 名称    │   │
│  │ 难度标签│ │ 难度标签│ │ 难度标签│   │
│  └─────────┘ └─────────┘ └─────────┘   │
│                                         │
│  ...                                    │
│                                         │
├─────────────────────────────────────────┤
│  Footer (简洁版权信息)                   │
└─────────────────────────────────────────┘
```

#### 组件拆分

**HeroSection**
- 背景: 渐变或纯色 (`--color-bg-secondary`)
- 内边距: 48px 垂直
- 标题: `text-h1`, 居中
- 副标题: `text-body`, `--color-text-secondary`, 居中
- 搜索框: 居中, 最大宽度 480px

**FilterBar**
- 布局: flex, gap: 12px
- 位置: sticky top (可选)
- 背景: `--color-bg-primary`
- 边框底部: 1px solid `--color-border-light`
- 内边距: 16px 0

**SpotCard**
- 图片: aspect-ratio 16:10, 圆角 12px (仅顶部)
- 内容区: 16px 内边距
- 标题: `text-h4`, 单行截断
- 元信息: 难度徽章 + 最佳季节

### 7.2 地点页 (Spot Detail Page)

#### 页面结构
```
┌─────────────────────────────────────────┐
│  Header (返回 + 地点名称)                │
├─────────────────────────────────────────┤
│                                         │
│  Cover Image (全宽, 高度 240-320px)      │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│  Spot Info Card                         │
│  ┌─────────────────────────────────┐    │
│  │ 地点名称                         │    │
│  │ [简单] 深圳 · 南山区              │    │
│  │                                 │    │
│  │ 难度: ★★☆☆☆  时长: 3-4小时       │    │
│  │ 距离: 8km      爬升: 350m        │    │
│  │ 最佳季节: 秋季 10-11月            │    │
│  └─────────────────────────────────┘    │
│                                         │
├─────────────────────────────────────────┤
│  攻略内容 (Tab 或折叠面板)               │
│  ┌─────────────────────────────────┐    │
│  │ 路线描述                         │    │
│  │ ...                             │    │
│  └─────────────────────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │ 注意事项                         │    │
│  │ ...                             │    │
│  └─────────────────────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │ 装备建议                         │    │
│  │ ...                             │    │
│  └─────────────────────────────────┘    │
│                                         │
├─────────────────────────────────────────┤
│  正在组队的队伍                         │
│  ┌─────────────────────────────────┐    │
│  │ [队伍卡片 1]                     │    │
│  └─────────────────────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │ [队伍卡片 2]                     │    │
│  └─────────────────────────────────┘    │
│                                         │
│  [+ 发起组队] 按钮                      │
│                                         │
└─────────────────────────────────────────┘
```

#### 组件拆分

**SpotHero**
- 封面图: 全宽, 高度响应式 (移动端 200px, 桌面 280px)
- 渐变遮罩: 底部黑色渐变, 保证文字可读性
- 地点名称: 白色, 覆盖在图片底部

**SpotInfoCard**
- 布局: 负 margin 向上偏移, 与图片重叠
- 背景: `--color-bg-primary`
- 圆角: 16px (顶部)
- 内边距: 24px
- 网格: 2x2 核心数据展示

**InfoSection (可折叠)**
- 标题: `text-h4` + 展开/收起图标
- 内容: `text-body`, 16px 顶部间距
- 边框: 底部 1px `--color-border-light`

**TeamList**
- 标题区: "正在组队" + 队伍数量
- 列表: 垂直排列, gap: 16px
- 空状态: 提示文字 + 发起按钮

### 7.3 队伍页 (Team Detail Page)

#### 页面结构
```
┌─────────────────────────────────────────┐
│  Header (返回 + 分享)                    │
├─────────────────────────────────────────┤
│                                         │
│  Team Header                            │
│  ┌─────────────────────────────────┐    │
│  │ [招募中]                         │    │
│  │ 塘朗山穿越线周末组队              │    │
│  │                                 │    │
│  │ 目的地: 塘朗山郊野公园            │    │
│  │ 时间: 2026年3月15日 周六 08:00    │    │
│  │ 集合: 桃源村地铁站D口             │    │
│  └─────────────────────────────────┘    │
│                                         │
├─────────────────────────────────────────┤
│  人数限制                               │
│  ┌─────────────────────────────────┐    │
│  │ 队伍规模  3/8人                  │    │
│  │ [====    ] 进度条                │    │
│  │ 还差 5 人成团                    │    │
│  └─────────────────────────────────┘    │
│                                         │
├─────────────────────────────────────────┤
│  队长信息                               │
│  ┌─────────────────────────────────┐    │
│  │ [头像]  山野行者                  │    │
│  │         已组织 12 次活动          │
│  └─────────────────────────────────┘    │
│                                         │
├─────────────────────────────────────────┤
│  参队要求                               │
│  ┌─────────────────────────────────┐    │
│  │ 要求说明...                      │    │
│  └─────────────────────────────────┘    │
│                                         │
├─────────────────────────────────────────┤
│  活动说明                               │
│  ┌─────────────────────────────────┐    │
│  │ 详细说明...                      │    │
│  └─────────────────────────────────┘    │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│  [      申请加入队伍      ]             │
│  (底部固定按钮)                          │
│                                         │
└─────────────────────────────────────────┘
```

#### 组件拆分

**TeamHeader**
- 状态徽章: 左上角
- 标题: `text-h2`
- 元信息列表: 图标 + 文字, 垂直排列, gap: 12px

**TeamCapacity**
- 进度条: 高度 8px, 圆角, `--color-accent` 填充
- 数字: 当前/最大
- 提示文字: 还差几人

**CaptainCard**
- 布局: flex, 头像左, 信息右
- 头像: `avatar--lg`
- 名称: `text-h4`
- 经验: `text-body-sm`, `--color-text-secondary`

**RequirementCard**
- 标题: "参队要求"
- 内容: `text-body`
- 列表样式: 检查图标 + 文字

**BottomActionBar**
- 位置: fixed bottom
- 背景: `--color-bg-primary`
- 阴影: 顶部 subtle shadow
- 内边距: 16px 水平, 20px 垂直 (含 safe-area)
- 按钮: 全宽主按钮

---

## 8. 响应式断点

```css
/* Tailwind v4 默认断点 */
--breakpoint-sm: 640px;   /* 手机横屏 */
--breakpoint-md: 768px;   /* 平板竖屏 */
--breakpoint-lg: 1024px;  /* 平板横屏/小桌面 */
--breakpoint-xl: 1280px;  /* 标准桌面 */
--breakpoint-2xl: 1536px; /* 大屏桌面 */
```

### 响应式规则

| 元素 | 移动端 | 平板 | 桌面 |
|------|--------|------|------|
| 地点网格 | 1列 | 2列 | 3-4列 |
| 页面边距 | 16px | 24px | 32px |
| Hero 高度 | 200px | 240px | 280px |
| 卡片内边距 | 16px | 20px | 20px |
| 底部按钮 | 全宽固定 | 全宽固定 | 内容宽度 |

---

## 9. 图标规范

使用 `lucide-react` 图标库，保持风格统一。

### 常用图标映射

| 场景 | 图标名 | 尺寸 |
|------|--------|------|
| 搜索 | Search | 20px |
| 返回 | ChevronLeft | 24px |
| 分享 | Share2 | 20px |
| 位置 | MapPin | 16px |
| 时间 | Clock | 16px |
| 用户 | User | 16px |
| 团队 | Users | 16px |
| 难度 | Mountain | 16px |
| 季节 | Calendar | 16px |
| 距离 | Route | 16px |
| 箭头 | ChevronRight | 16px |
| 筛选 | SlidersHorizontal | 20px |
| 检查 | Check | 16px |
| 警告 | AlertCircle | 16px |

---

## 10. 图片规范

### 封面图
- 比例: 16:10 或 16:9
- 最小宽度: 800px
- 格式: WebP (优先), JPEG
- 质量: 80%

### 头像
- 尺寸: 200x200px
- 比例: 1:1
- 格式: WebP, JPEG

### 图片处理
```css
/* 图片容器 */
.image-container {
  position: relative;
  overflow: hidden;
  background-color: var(--color-bg-tertiary);
}
.image-container img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
```

---

## 11. 阴影规范

```css
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);
--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);

/* 卡片悬停 */
--shadow-card-hover: 0 8px 24px rgba(0, 0, 0, 0.08);

/* 底部固定栏 */
--shadow-top: 0 -4px 6px -1px rgba(0, 0, 0, 0.05);
```

---

## 12. Z-Index 层级

```css
--z-base: 0;
--z-dropdown: 100;
--z-sticky: 200;
--z-fixed: 300;
--z-modal-backdrop: 400;
--z-modal: 500;
--z-toast: 600;
```

---

## 附录: Tailwind v4 配置参考

```css
/* app/globals.css */
@import "tailwindcss";

@theme {
  /* 颜色 */
  --color-primary-50: #fafaf9;
  --color-primary-100: #f5f5f4;
  --color-primary-200: #e7e5e4;
  --color-primary-300: #d6d3d1;
  --color-primary-400: #a8a29e;
  --color-primary-500: #78716c;
  --color-primary-600: #57534e;
  --color-primary-700: #44403c;
  --color-primary-800: #292524;
  --color-primary-900: #1c1917;

  --color-accent: #059669;
  --color-accent-hover: #047857;
  --color-accent-light: #d1fae5;

  /* 字体 */
  --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif;

  /* 动画 */
  --animate-fade-in-up: fade-in-up 300ms ease-out forwards;
  --animate-shimmer: shimmer 1.5s infinite;
}

@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
```

---

*文档结束*
