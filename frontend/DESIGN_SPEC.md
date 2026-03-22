# GoMate Design Spec v1.0

> 本文件是 GoMate 前端 UI 设计规范的 Single Source of Truth，供所有开发者在重构或新增页面时参考。

---

## 品牌色系（基于 Tailwind 调色板）

| 角色 | 色板 | 说明 |
|------|------|------|
| 主色 | `emerald` | 品牌绿，用于主要行动项、激活态、链接 |
| 辅色 | `stone` | 暖灰，用于文字、边框、中性背景 |
| 强调色 | `amber` | 暖金，用于情感点缀（"适中"难度徽章等） |
| 危险色 | `red` | 危险操作、错误提示 |
| 页面背景 | `bg-stone-50` | 全页底色 |
| 卡片背景 | `bg-white` | 内容卡片 |

**常用色值速查：**

```
主色按钮背景   bg-emerald-600       hover: bg-emerald-700
主色文字       text-emerald-700     hover: text-emerald-600
主色光晕       shadow-emerald-100/40  shadow-emerald-500/25
主色微透明     bg-emerald-500/10    border: border-emerald-500/20
危险悬停       hover:text-red-600   hover:border-red-300
```

---

## 排版层级

| 层级 | 类名 | 使用场景 |
|------|------|----------|
| Hero 标题 | `text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight` | 页面 Hero 区主标题 |
| 页面标题 | `text-2xl sm:text-3xl font-bold text-stone-900` | 内容区一级标题 |
| 卡片标题 | `text-lg font-bold text-stone-900` 或 `text-lg font-semibold` | 卡片内主标题 |
| 正文 | `text-sm text-stone-500 leading-relaxed` | 描述、正文段落 |
| 辅助文字 | `text-xs text-stone-400` | 元信息、标注、占位 |
| 数字展示（统计） | `text-3xl font-bold` | 统计卡数值 |
| 强调数字/文字 | `font-semibold text-stone-700` | 行内强调 |

**Hero 区副标题：**`text-lg sm:text-xl text-stone-300 leading-relaxed`（深色背景版本）

---

## 间距节奏

### 页面容器

```
列表页：   max-w-7xl mx-auto px-4 sm:px-6 lg:px-8
详情/个人页：max-w-4xl mx-auto px-4 sm:px-6 lg:px-8
```

### 卡片内边距

```
标准卡片：  p-5 或 p-6
紧凑行项目：p-4
```

### 元素间距

```
紧凑（图标+文字、标签内部）：gap-1 / gap-1.5 / gap-2
标准（列表项之间、卡片间）：gap-4
宽松（section 内容块）：gap-6 / gap-7
```

### 网格间距

```
卡片网格（地点、队伍列表）：gap-7
统计卡片：                   gap-4
```

### Section 间距

```
内容区上下 padding：py-14 / py-20
Hero 上下：        pt-32 pb-20（含导航栏高度补偿 pt-32）
```

### 元素分隔

```
卡片内分隔线：border-t border-stone-50（极淡）或 border-stone-100
区域分隔线：  border-t border-stone-100
```

---

## 圆角规范

| 元素 | 圆角类名 |
|------|----------|
| 大型页面卡片 | `rounded-3xl` |
| 标准内容卡片 | `rounded-2xl` |
| 小卡片/行项目 | `rounded-xl` |
| 胶囊按钮 / 徽章 / 标签 / 分页 | `rounded-full` |
| 方形按钮（二级按钮） | `rounded-xl` |
| 头像 | `rounded-full` |
| 图标容器（小） | `rounded-xl` |
| 图标容器（大，CTA 区） | `rounded-2xl` |
| 搜索框 / 下拉菜单 | `rounded-2xl` |

---

## 阴影系统

| 等级 | 类名 | 使用场景 |
|------|------|----------|
| elevation-0 | `shadow-none` | 默认无阴影 |
| elevation-1 | `shadow-sm` | 卡片静态状态 |
| elevation-2 | `shadow-md shadow-emerald-200` | hover 态分页按钮等 |
| elevation-3 | `shadow-xl shadow-emerald-100/40` | 卡片 hover 态 |
| elevation-4 | `shadow-xl shadow-emerald-500/25` | 主色按钮激活态 |
| 自定义品牌光晕 | `shadow-[0_4px_18px_rgba(36,154,135,0.10)]` | 统计卡 hover 态 |
| 头像阴影 | `shadow-[0_4px_18px_rgba(30,24,18,0.15)]` | 头像悬浮感 |

---

## 微交互规范

### 卡片 hover

```css
hover:shadow-xl hover:shadow-emerald-100/40
hover:-translate-y-1.5
transition-all duration-500
```

### 统计卡 / 小型行项目 hover

```css
hover:-translate-y-0.5
hover:shadow-[0_4px_18px_rgba(36,154,135,0.10)]
hover:border-brand/25
transition-all duration-200
```

### 封面图 hover（内部图片缩放）

```css
group-hover:scale-[1.04]
transition-transform duration-700 ease-out
```

### 按钮通用

```css
transition-all duration-150    /* 主要按钮 */
transition-all duration-200    /* 次要按钮 / 标签 */
active:scale-95 或 active:scale-[0.97]
```

### 箭头图标位移

```css
group-hover:translate-x-1 transition-transform duration-200
```

### ChevronRight 位移

```css
group-hover:translate-x-0.5 transition-all duration-150
```

### ChevronDown 旋转（下拉）

```css
transition-transform duration-200   rotate-180（展开时）
```

### 无障碍必须项

所有动效必须加：

```css
motion-reduce:transition-none
/* 或 */
motion-reduce:animate-none
```

---

## 按钮系统

### 主要按钮（CTA）

```html
bg-emerald-600 hover:bg-emerald-700 text-white rounded-full
px-8 py-3.5 font-medium
transition-all duration-200
hover:shadow-lg hover:shadow-emerald-900/20
```

### 主要按钮（小型）

```html
bg-emerald-600 hover:bg-emerald-700 text-white rounded-full
px-5 py-2.5 text-sm font-medium transition-colors
```

### 品牌色按钮（设计系统 token）

```html
bg-brand text-brand-foreground rounded-xl
px-3.5 py-2 text-sm font-medium
hover:bg-brand/90 hover:-translate-y-px
transition-all duration-150
shadow-[0_2px_8px_rgba(36,154,135,0.25)]
```

### 次要按钮（描边）

```html
border border-stone-200 text-stone-600 rounded-xl
px-3.5 py-2 text-sm font-medium
hover:border-emerald-300 hover:text-emerald-700
transition-all duration-150
```

### 危险/退出按钮

```html
border border-border text-muted-foreground rounded-xl
hover:border-destructive/40 hover:text-destructive hover:bg-destructive/5
transition-all duration-150
```

### 深色背景的次要按钮（Hero 区标签/筛选）

```html
bg-white/8 text-stone-300 border border-white/15 rounded-full
hover:bg-white/15 hover:text-white hover:border-white/30
transition-all duration-200 active:scale-95

/* 激活态 */
bg-emerald-500 text-white border-emerald-500
shadow-lg shadow-emerald-500/25
```

---

## 卡片组件规范

### 标准地点/队伍卡片

```
背景：      bg-white
圆角：      rounded-3xl（大）/ rounded-2xl（标准）
边框：      border border-stone-100/80
静态阴影：  shadow-sm
hover 阴影：hover:shadow-xl hover:shadow-emerald-100/40
hover 位移：hover:-translate-y-1.5
过渡时长：  transition-all duration-500
```

**封面图规范：**

```
容器：relative h-52 overflow-hidden bg-gradient-to-br from-stone-100 to-stone-200
图片：w-full h-full object-cover
      group-hover:scale-[1.04] transition-transform duration-700 ease-out
遮罩：absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent
```

**徽章位置：**

- 左上角：难度徽章（`absolute top-4 left-4`）
- 右上角：季节/状态徽章（`absolute top-4 right-4`）

**徽章样式：**

```
px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-sm bg-white/90
```

**卡片 CTA 行：**

```
border-t border-stone-50 pt-4
text-sm font-semibold text-emerald-700
```

### 统计卡片

```
bg-card rounded-2xl border border-border p-5
hover:-translate-y-0.5
hover:shadow-[0_4px_18px_rgba(36,154,135,0.10)]
hover:border-brand/25
transition-all duration-200
```

**图标容器：**`w-11 h-11 rounded-xl`，强调态 `bg-brand-subtle`，普通态 `bg-muted`

**数值：** `text-3xl font-bold`，强调态 `text-brand`，普通态 `text-foreground`

### 个人资料卡（Banner 型）

```
bg-card rounded-2xl border border-border overflow-hidden

Banner：   h-36，品牌渐变 linear-gradient(135deg, #1a6459 → #249a87 → #3fb5a0 → #74d0bf)
           含 SVG 山脊装饰（opacity-0.12）

头像：     h-28 w-28 rounded-full ring-4 ring-card
           shadow-[0_4px_18px_rgba(30,24,18,0.15)]
           从 Banner 底部溢出：absolute -top-14 left-6
```

---

## 骨架屏规范

使用 Tailwind 内置 `animate-pulse`，颜色统一为 `bg-stone-100`，形状与真实内容对应。

```html
<!-- 图片占位 -->
<div class="h-52 bg-gradient-to-r from-stone-100 via-stone-50 to-stone-100 animate-[shimmer_1.5s_infinite]" />

<!-- 标题占位 -->
<div class="h-5 bg-stone-100 rounded-full w-3/4 animate-pulse" />

<!-- 正文占位 -->
<div class="h-4 bg-stone-100 rounded-full w-full animate-pulse" />

<!-- 标签占位 -->
<div class="h-6 w-16 bg-stone-100 rounded-full animate-pulse" />

<!-- 行内加载（数字/短文字）-->
<span class="inline-block w-24 h-4 bg-stone-200 rounded-full animate-pulse" />
```

---

## 徽章/标签规范

### 难度徽章（浅色背景）

| 难度 | 背景 | 文字 | 圆点 |
|------|------|------|------|
| easy（轻松） | `bg-emerald-50` | `text-emerald-700` | `bg-emerald-500` |
| moderate（适中） | `bg-amber-50` | `text-amber-700` | `bg-amber-500` |
| hard（挑战） | `bg-orange-50` | `text-orange-700` | `bg-orange-500` |
| expert（专家） | `bg-red-50` | `text-red-700` | `bg-red-500` |

### 通用信息标签（卡片内）

```
px-2.5 py-1 bg-stone-50 text-stone-500 rounded-full text-xs border border-stone-100
```

### 已选筛选条件（深色背景上）

```
城市：  px-3 py-1 bg-sky-500/20 text-sky-300 text-xs rounded-full border border-sky-500/30
标签：  px-3 py-1 bg-emerald-500/20 text-emerald-300 text-xs rounded-full border border-emerald-500/30
```

### 等级徽章（个人资料）

```
beginner:     bg-success-subtle text-success border border-success/20
intermediate: bg-brand-subtle text-brand border border-brand/20
advanced:     bg-[#f2effe] text-[#7c5ce8] border border-[#7c5ce8]/20
expert:       bg-warning-subtle text-warning border border-warning/20
```

---

## Hero 区设计规范

### 背景

```css
background: gradient-to-br from-stone-900 via-emerald-950 to-stone-900

/* 点阵纹理装饰 */
backgroundImage: radial-gradient(circle at 1px 1px, white 1px, transparent 0)
backgroundSize: 40px 40px
opacity: 0.03

/* 光晕装饰 */
w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl   /* 左上 */
w-64 h-64 bg-emerald-400/5 rounded-full blur-2xl    /* 右下 */
```

### 入口徽章

```
inline-flex items-center gap-2 px-4 py-2
rounded-full bg-emerald-500/10 border border-emerald-500/20
text-emerald-400 text-sm font-medium mb-6
```

### 搜索框（磨砂玻璃）

```
bg-white/10 backdrop-blur-md text-white placeholder-stone-400
border border-white/15 rounded-2xl
focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/20
transition-all duration-200
py-4 px-（依图标位置调整）
```

---

## 空状态规范

```html
<div class="flex flex-col items-center justify-center py-24 px-4">
  <!-- 图标容器 -->
  <div class="w-20 h-20 rounded-full bg-stone-50 flex items-center justify-center mb-6">
    <Icon class="h-10 w-10 text-stone-300" />
  </div>

  <!-- 标题 -->
  <h3 class="text-lg font-semibold text-stone-700 mb-2">...标题...</h3>

  <!-- 描述 -->
  <p class="text-stone-400 text-sm text-center max-w-xs leading-relaxed mb-6">
    ...描述...
  </p>

  <!-- CTA -->
  <button class="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-sm font-medium transition-colors">
    <Icon class="h-4 w-4" />
    行动文案
  </button>
</div>
```

**有品牌色背景的空状态（卡片内）：**

```
bg-card rounded-2xl border border-dashed border-border p-14 text-center

图标容器：w-16 h-16 bg-brand-subtle rounded-full
图标：    h-8 w-8 text-brand/60
```

---

## 页面分区结构模板

### 列表页

```
1. <Navbar />
2. Hero Section（深色背景，含搜索+筛选）：pt-32 pb-20
3. 内容网格 Section（卡片列表）：py-14 lg:py-20
4. CTA Section（品牌绿渐变收尾）：py-20
5. <Footer />
```

### 详情/个人页

```
1. <Navbar />
2. 内容区（max-w-4xl）：py-8 pt-24
   - 返回链接
   - 主信息卡
   - 统计/辅助信息
   - 列表/详情内容
3. <Footer />
```

---

## 情感设计目标

### 探索地点页

- **情感关键词**：探索感、自然、呼吸感、期待
- **设计目标**：让用户感受到「山野在等你」的浪漫
- **重点**：
  - Hero 区域的沉浸感（深色渐变 + 光晕 + 磨砂搜索框）
  - 卡片封面图的质感（scale 动画 + 渐变遮罩）
  - 筛选的流畅（标签即点即生效，300ms 防抖）

### 个人资料页

- **情感关键词**：被认可、成就感、归属感、温暖
- **设计目标**：让用户感受到「这里记录了你的足迹」
- **重点**：
  - Banner 的个性化（品牌渐变 + SVG 山脊装饰）
  - 统计数据的成就感（`text-3xl font-bold text-brand` + 点击可跳转）
  - 队伍列表的温度（封面图缩略图 + hover 品牌绿光晕）

---

## copy.ts 使用规范

所有用户可见中文字符串统一来自 `frontend/src/lib/copy.ts`，禁止在组件中硬编码中文。

```typescript
import { copy } from "@/lib/copy";

// 直接引用
<button>{copy.auth.loginBtn}</button>

// 动态插值（模板字符串）
<span>{`共 ${count} ${copy.teams.teamCountSuffix}`}</span>

// 动态插值（replace）
copy.teams.openTeamsSubtitle.replace("{count}", String(count))
```

枚举显示文案统一放在 `copy.enums` 下，与数据库枚举一一对应。

---

## 图标使用规范

统一使用 `lucide-react`，尺寸规范：

| 场景 | 尺寸类名 |
|------|----------|
| 行内文字图标（辅助信息） | `h-3 w-3` 或 `h-3.5 w-3.5` |
| 按钮图标 | `h-4 w-4` |
| 卡片图标容器内 | `h-5 w-5` 或 `h-6 w-6` |
| 空状态图标 | `h-8 w-8` 至 `h-10 w-10` |
| Hero 搜索图标 | `h-5 w-5` |

---

## 响应式断点策略

```
移动端优先（默认）
sm: 640px   次要调整（间距、排版）
md: 768px   网格从单列变双列
lg: 1024px  网格变三列，间距加大
```

**网格规范：**

```
地点/队伍卡片：grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7
统计卡片：     grid-cols-1 sm:grid-cols-3 gap-4
```

---

*最后更新：2026-03-21*

---

# Visual Designer 视觉规范补充（Task #2 输出）

> 本节由 Visual Designer 完成，解决两页色彩割裂问题，供 Frontend Artisan 直接参照实现。
> 版本：v1.0 | 日期：2026-03-21

---

## F. 统一 Class 使用规范表（地点详情页 & 队伍详情页）

### F.1 色彩 Token 验证结果

经检查 `frontend/src/styles/globals.css` 中 `@theme inline` 与 `:root` 变量定义：

| Token | CSS 变量 | 已定义 | 对应值 |
|-------|----------|--------|--------|
| `text-brand` | `--color-brand` → `--brand` | ✅ | `#249a87` |
| `bg-brand` | `--color-brand` → `--brand` | ✅ | `#249a87` |
| `bg-brand-subtle` | `--color-brand-subtle` | ✅ | `#74d0bf33`（20% 透明） |
| `text-warm` | `--color-warm` → `--warm` | ✅ | `#ff7a65` |
| `bg-warm` | `--color-warm` → `--warm` | ✅ | `#ff7a65` |
| `border-warm` | `--color-warm` → `--warm` | ✅ | `#ff7a65` |
| `bg-warm-subtle` | `--color-warm-subtle` | ✅ | `#ff7a6515`（8% 透明） |
| `text-muted-foreground` | `--color-muted-foreground` | ✅ | `#8f7f6e` |
| `bg-card` | `--color-card` | ✅ | `rgba(255,255,255,0.85)` |
| `shadow-warm-sm` | `boxShadow.warm-sm` in tailwind.config.ts | ✅ | 温暖色调小阴影 |
| `shadow-warm-md` | `boxShadow.warm-md` in tailwind.config.ts | ✅ | 温暖色调中阴影 |

**结论**：所有 `text-warm`、`bg-warm/6`（`bg-warm` + 透明度修饰符）、`border-warm/20` 等 utility 均已可用，无需补充。

---

### F.2 封面规范（两页统一）

| 属性 | 地点详情页 | 队伍详情页 |
|------|-----------|-----------|
| 高度 | `h-[360px] sm:h-[480px] lg:h-[560px]` | `h-[400px] sm:h-[520px]` |
| 图片透明度 | **移除** `opacity-80`，保持原色 | 同左，无需降透 |
| 底部渐变遮罩 | `bg-gradient-to-t from-black/65 via-black/15 to-transparent` | 同左 |
| 图片 hover 缩放 | `group-hover:scale-[1.04] transition-transform duration-700 ease-out` | 同左 |
| 图片容器 | `relative overflow-hidden` | 同左 |

**禁止**：两页均不得对封面图使用 `opacity-*`（降低图片透明度破坏山野质感）。

---

### F.3 卡片视觉规范（两页统一）

**标准内容卡片（页面主卡片）：**
```
bg-white rounded-2xl shadow-warm-sm border border-stone-100
```

**卡片 Hover 态：**
```
hover:shadow-warm-md hover:-translate-y-0.5 transition-all duration-300
```

**队伍卡片（地点详情页内嵌）：**
```
bg-white border border-stone-100 rounded-2xl
hover:shadow-warm-md hover:-translate-y-0.5 transition-all duration-300
```

**说明**：
- 地点详情页原 `bg-stone-50 border-stone-200` 队伍卡片 → 统一改为 `bg-white border-stone-100`
- 队伍详情页原 `style={{ boxShadow: "..." }}` 内联阴影 → 统一改为 `shadow-warm-sm`

---

### F.4 进度条规范

```html
<!-- 进度条容器 -->
<div class="h-2 rounded-full bg-stone-100 overflow-hidden">
  <!-- 进度条填充：正常态（未满员） -->
  <div
    class="h-full rounded-full bg-brand transition-all duration-300 ease-out"
    style={{ width: `${fillRatio}%` }}
  />
  <!-- 进度条填充：满员/警告态 -->
  <div
    class="h-full rounded-full bg-warm transition-all duration-300 ease-out"
    style={{ width: `${fillRatio}%` }}
  />
</div>
```

**规范**：
- 高度：`h-2`（8px）
- 圆角：`rounded-full`（两端圆）
- 底轨：`bg-stone-100`
- 正常态填充：`bg-brand`（`var(--brand)` = `#249a87`）
- 满员/警告态填充：`bg-warm`（`var(--warm)` = `#ff7a65`）
- **禁止**：硬编码 `#249a87` 或 `#ff7a65`，必须使用 `bg-brand` / `bg-warm`

---

### F.5 Badge（徽章）规范升级

**难度徽章（封面图上）：**

旧版（地点详情页）→ 新版（统一规范）：

| 难度 | 旧版 | 新版 |
|------|------|------|
| 容器 | `bg-emerald-100 text-emerald-700` | `bg-white/90 backdrop-blur-sm` |
| easy | `bg-emerald-100 text-emerald-700` | `bg-white/90 backdrop-blur-sm text-emerald-700` |
| moderate | `bg-amber-100 text-amber-700` | `bg-white/90 backdrop-blur-sm text-amber-700` |
| hard | `bg-orange-100 text-orange-700` | `bg-white/90 backdrop-blur-sm text-orange-700` |
| expert | `bg-red-100 text-red-700` | `bg-white/90 backdrop-blur-sm text-red-700` |

**完整 Badge class（含圆点）：**
```html
<!-- 封面图上的难度 Badge -->
<span class="
  absolute top-4 left-4
  inline-flex items-center gap-1.5
  px-3 py-1.5 rounded-full
  bg-white/90 backdrop-blur-sm
  text-xs font-semibold
  text-emerald-700   {/* 根据难度变化 */}
">
  <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
  轻松
</span>
```

**浅色背景区域的难度 Badge（卡片内）：**
```
easy:     bg-emerald-50 text-emerald-700
moderate: bg-amber-50 text-amber-700
hard:     bg-orange-50 text-orange-700
expert:   bg-red-50 text-red-700
```

---

### F.6 统一 Class 对照速查表

> 供 Frontend Artisan 直接参照，解决两页视觉割裂。

| 元素 | 地点详情页（旧） | 队伍详情页（旧） | 统一规范（新） |
|------|----------------|----------------|--------------|
| 页面背景 | `bg-stone-50` | `bg-background` | `bg-stone-50`（与 `bg-background` 等价，保持 `bg-stone-50` 更明确） |
| 主内容卡片 | `bg-white border-stone-200` | `bg-card border-border style=boxShadow` | `bg-white rounded-2xl shadow-warm-sm border border-stone-100` |
| 卡片 hover | 无 | `card-interactive`（自定义类） | `hover:shadow-warm-md hover:-translate-y-0.5 transition-all duration-300` |
| 主标题 | `text-stone-900` | `text-foreground` | `text-stone-900`（明确） |
| 次级文字 | `text-stone-500` | `text-muted-foreground` | `text-stone-500`（等价，保持一致） |
| 辅助文字 | `text-stone-400` | `text-muted-foreground` | `text-stone-400`（等价，保持一致） |
| 主 CTA 按钮 | `bg-stone-900 text-white` | `bg-brand text-brand-foreground` | `bg-emerald-600 hover:bg-emerald-700 text-white rounded-full` |
| 品牌色文字 | `text-emerald-700` | `text-brand` | `text-emerald-700`（直接 Tailwind class，避免 token 混用） |
| 进度条 | 无 | `style={{ backgroundColor: "#249a87" }}` | `bg-brand`（正常）/ `bg-warm`（满员） |
| 封面渐变 | `from-black/40 via-transparent` | `from-black/60 to-transparent` | `from-black/65 via-black/15 to-transparent` |
| 封面图片 | `opacity-80` | 无降透 | **移除 opacity，保持 100%** |
| 安全提示卡 | 无 | `style={{ background: "rgba(255,122,101,0.06)" }}` | `bg-warm/6 border border-warm/20` |
| 难度徽章（封面） | `bg-emerald-100` | `bg-white/90 backdrop-blur-sm` | `bg-white/90 backdrop-blur-sm` |
| 分割线 | `border-stone-200` | `border-border` | `border-stone-100`（更轻盈） |

---

### F.7 阴影系统使用指南

根据 `tailwind.config.ts` 已定义的 `boxShadow`：

| 场景 | Class | 说明 |
|------|-------|------|
| 卡片默认态 | `shadow-warm-sm` | 轻微温暖色调阴影 |
| 卡片 hover 态 | `shadow-warm-md` | 中等温暖色调上浮感 |
| 主 CTA 按钮 hover | `shadow-brand-glow` | 品牌绿光晕发光 |
| 页面主信息卡 | `shadow-warm` | 标准温暖阴影 |
| 模态框/抽屉 | `shadow-warm-xl` | 强烈深度感 |

**禁止**：两页均不得使用 Tailwind 默认冷灰阴影（`shadow-sm`、`shadow-md` 等），统一使用 `shadow-warm-*` 系列。

---

### F.8 品牌渐变规范

**主 CTA 按钮（两页统一）：**
```
bg-gradient-to-r from-emerald-600 to-emerald-500
hover:from-emerald-700 hover:to-emerald-600
text-white rounded-full
shadow-brand-glow hover:shadow-brand-glow-lg
transition-all duration-200
```

**右侧 sticky 卡片主 CTA（地点详情页）：**
```html
<button class="
  w-full px-6 py-3.5 rounded-full
  bg-gradient-to-r from-emerald-600 to-emerald-500
  hover:from-emerald-700 hover:to-emerald-600
  text-white font-medium
  shadow-brand-glow hover:shadow-brand-glow-lg
  transition-all duration-200 active:scale-[0.97]
">
  我要去这里
</button>
```

---

### F.9 排版层级（两页统一参照）

| 层级 | Class | 场景 |
|------|-------|------|
| 封面主标题 | `text-3xl sm:text-4xl font-bold text-white` | 封面区域地点/队伍名称 |
| 封面副标题 | `text-sm text-white/80` | 封面区域地点链接/标签 |
| 页面标题 | `text-2xl sm:text-3xl font-bold text-stone-900` | 内容区一级标题 |
| 卡片标题 | `text-lg font-semibold text-stone-900` | 卡片内标题 |
| 正文 | `text-sm text-stone-500 leading-relaxed` | 描述、介绍段落 |
| 辅助信息 | `text-xs text-stone-400` | 元数据、时间、统计 |
| 强调数字 | `text-3xl font-bold text-brand` | 统计卡数值 |
| 行内强调 | `font-semibold text-stone-700` | 行内关键信息 |

---

*Visual Designer 输出完成 | 版本 v1.0 | 2026-03-21*

---

# 地点详情页 & 队伍详情页 重构方向（Design Director 分析）

> 基于对 `location-detail-client.tsx`、`team-detail-client.tsx`、`locations-client.tsx`、`copy.ts`、`types.ts`、`tailwind.config.ts` 的深度代码阅读输出
> 生效日期：2026-03-21

---

## A. 现有问题诊断

### A.1 地点详情页（location-detail-client.tsx）

**结构与 UX 问题**
- 封面图高度偏小（`h-64/h-80/h-96`），视觉冲击力不足，无法传达山野沉浸感
- 图片透明度 `opacity-80` 使画面发灰，失去自然质感
- 「基本信息」卡片（难度/时长/位置）用 List 格式，信息密度低，无法快速扫视
- 「标签」作为独立卡片单独占一行，与「地点介绍」卡片割裂，造成冗余
- 「正在招募的队伍」区块标题纯功能性，缺乏情感召唤感
- 空状态（无队伍）仅一个小图标，无行动引导能量
- 右侧 sticky 卡片标题「参加活动」生硬，主 CTA 按钮 `bg-stone-900` 与品牌绿断裂
- 「其他推荐地点」缩略图 `w-14 h-14` 太小，无法建立视觉吸引
- 加载骨架屏用单色 `animate-pulse`，缺乏 shimmer 扫光效果
- 两处硬编码中文字符串（「地点不存在」「加载失败，请稍后重试」）未使用 copy.ts

**色彩与视觉问题**
- 整页 `bg-stone-50` + 卡片 `bg-white`，层次差仅靠 `border-stone-200`，平淡
- 队伍列表卡片 `bg-stone-50 border-stone-200`，与品牌绿完全断裂
- 难度徽章用旧版 `bg-emerald-100 text-emerald-700`，与列表页升级后的 `bg-white/90 backdrop-blur-sm` 风格不一致

---

### A.2 队伍详情页（team-detail-client.tsx）

**结构与 UX 问题**
- 封面地点链接（`bottom-16`）与队伍标题（`bottom-5`）距离过近，层次弱
- 信息卡片使用 `style={{ boxShadow: "..." }}` 内联样式，未使用设计系统 token
- 4 列数据网格（日期/集合/人数/进度）纯文字，「进度」列进度条 `max-w-[60px]` 太窄
- 「成员」区块同时有头像叠加（8个）+ 详细列表两种展示，视觉冗余
- 所有 `alert()` 和 `confirm()` 系统弹窗严重破坏视觉连贯性
- 移动端底部栏输入框和按钮 `py-2.5` 约 40px，低于 44px 最小点击目标
- `card-interactive` 类依赖自定义 CSS，不在 Tailwind 原生范围内

**色彩和视觉问题**
- 加入按钮、进度条用硬编码 `#249a87`/`#ff7a65`，未使用 CSS 变量
- 安全提示卡用内联 `rgba(255,122,101,0.06)` 内联色值
- 整体 token 使用（`text-brand`, `bg-card`）与地点详情页（`text-stone-*`, `bg-white`）不统一，两页视觉割裂

**文案问题**（已记录的硬编码中文，需移入 copy.ts）
- 「路线未定」「这是一支自由组队的队伍...」
- 「申请留言（可选，向队长介绍一下自己）」
- 「你是这支队伍的队长」「你已加入这支队伍」「申请待审核中...」
- 各状态说明文字（`team.status === "completed"` 时的提示等）

---

## B. 设计原则（GoMate「温暖伙伴」定位）

### B.1 情感化设计原则（5 条）

**① 山野质感优先**
封面图是最重要的情感载体。桌面端不低于 520px，不降透明度，仅底部柔和渐变保护文字。

**② 每个数字都有生命**
人数/名额不应冰冷呈现。用「还差 X 位伙伴就可以出发了」「就差你一个了」替代纯数字，让用户感受到被期待。

**③ 等待也是一种连接**
申请提交后用「队长确认后会通知你」建立期待感，减少不确定性焦虑。

**④ 错误不是终结**
满员队伍页应同时展示同地点其他招募中队伍，让探索冲动得以延续。

**⑤ 微动效传递情绪**
加入成功时应有庆祝感动效（scale bounce + CheckCircle fade-in）；内容滚动进入视口时触发 fade-up，自然涌现。

---

### B.2 视觉风格定义

- **主品牌色**：`emerald-600` / `emerald-700`，代表活力与自然
- **中性底色**：`stone-*` 系列，山石的稳重
- **暖调辅助**：`amber-*`，阳光与能量
- **警示色**：`warm`（`#ff7a65` → 应封装为 CSS token），紧迫感而非危险感

**圆角**：主 CTA 按钮用 `rounded-full`，卡片用 `rounded-2xl`，标签用 `rounded-full`

**阴影**：统一使用 `shadow-warm-*` 系列，避免默认冷灰阴影

---

### B.3 交互哲学

- **即时反馈**：所有按钮 80ms 内有视觉响应（`active:scale-95`）
- **减少弹窗**：用内联 Toast / ConfirmDialog 替代 `alert()` / `confirm()`
- **移动优先**：所有可点击元素最小 44×44px，底部栏充分利用 `safe-area-inset-bottom`
- **状态可见**：任何时刻用户清晰知道自己的状态（已加入/申请中/可申请/不可申请）

---

## C. 重构改造点清单

### C.1 地点详情页：8 个具体改造点

| # | 改造点 | 优先级 |
|---|--------|--------|
| 1 | 封面图高度提升至 `h-[360px] sm:h-[480px] lg:h-[560px]`，移除 `opacity-80`，渐变改为 `from-black/65 via-black/15 to-transparent` | P0 |
| 2 | 「基本信息」改为横向数据 Grid（4 列，含图标圆圈），使用 emerald 图标背景 | P1 |
| 3 | 「标签」并入「地点介绍」卡片底部，chip 样式与列表页一致 | P1 |
| 4 | 「正在招募的队伍」标题改为 `copy.locations.detailWaiting`（待文案确认），队伍卡片加进度条 | P1 |
| 5 | 空状态参考 `EmptyState` 组件风格，使用 float 动效图标 + 品牌色 CTA | P1 |
| 6 | 右侧 sticky 卡片主 CTA 改为 emerald 渐变背景 + `rounded-full` | P1 |
| 7 | 骨架屏从 `animate-pulse` 升级为 shimmer（使用 `skeleton` 类） | P2 |
| 8 | 所有硬编码中文字符串移入 copy.ts | P0 |

---

### C.2 队伍详情页：8 个具体改造点

| # | 改造点 | 优先级 |
|---|--------|--------|
| 1 | 封面区层次重建：封面高度 `h-[400px] sm:h-[520px]`，地点链接 `bottom-20`，标题 `bottom-6`，字号 `text-3xl sm:text-4xl` | P0 |
| 2 | 消除所有内联样式，改用 Tailwind token（`shadow-warm-md`，`bg-gradient-to-r from-emerald-600 to-emerald-500`） | P1 |
| 3 | 消除 `alert()` / `confirm()`，替换为 Toast（成功/错误提示）+ ConfirmDialog（退出/取消操作） | P0 |
| 4 | 进度条首次挂载动画（从 0 到实际值 300ms transition） | P2 |
| 5 | 成员列表：移除重复的头像叠加区，统一为详细列表；队长行高亮 `bg-emerald-50/60`；超 6 人折叠 | P1 |
| 6 | 安全提示卡替换内联 rgba，改用 Tailwind token | P1 |
| 7 | 移动端底部栏最小高度 44px，输入框 `min-h-[44px]`，按钮 `min-h-[44px]` | P1 |
| 8 | 所有硬编码中文字符串移入 copy.ts | P0 |

---

## D. 给各角色的任务指令

### D.1 给 Visual Designer 的指令

**核心任务：制定统一视觉规范，解决两页色彩不一致问题**

1. **封面规范**：两页封面高度差异（地点 560px / 队伍 520px），底部渐变 `from-black/65 via-black/15 to-transparent`
2. **卡片规范**：统一用 `bg-white rounded-2xl shadow-warm-sm border border-stone-100`；hover: `shadow-warm-md hover:-translate-y-0.5`
3. **进度条规范**：用 CSS 变量替代硬编码，高度 `h-2`，圆角 `rounded-full`，满员时用 warm token
4. **色彩 Token 清单**：梳理 `globals.css @theme` 中 CSS 变量，补齐 `--warm` 对应的 Tailwind utility class（如 `text-warm`、`bg-warm/6`、`border-warm/20`）
5. **Badge 规范升级**：地点详情页难度徽章从 `bg-emerald-100` 升级为 `bg-white/90 backdrop-blur-sm`（与列表页一致）

---

### D.2 给 Interaction Designer 的指令

**核心任务：设计关键操作节点的微交互，解决加入流程和弹窗问题**

1. **加入流程完整状态机**（5 种状态：can_join / pending / approved / leader / closed）
   - 每种状态的按钮样式、文案、图标
   - 移动端底部栏与桌面端侧边栏的视觉对应关系
   - 状态切换的过渡动效

2. **去除系统弹窗的替代方案**
   - Toast：底部 slide-up，2.5s 自动消失，success / error 两种变体
   - ConfirmDialog：移动端底部 sheet，桌面端小 popover，支持 ESC 关闭
   - 应用场景：「退出队伍」「取消申请」用 ConfirmDialog；「申请成功」「申请失败」用 Toast

3. **进度条首次加载动画**：延迟 100ms，从 0 → 实际值，duration 300ms

4. **成员列表折叠/展开**：`max-height` transition，chevron 旋转动效

5. **封面 Parallax（可选增强）**：滚动时封面图 0.3 ratio 速度上移；须 `prefers-reduced-motion` 降级

---

### D.3 给 UX Writer 的指令

**核心任务：将功能性冷硬文案升温，注入「山野同行」情感基调**

在 `copy.ts` 新增/修改以下 key：

**`locations` 模块新增：**
```
detailWaiting:     "有人在等你同行"
detailNoTeamsDesc: "还没有队伍出发，要不要你来召集第一批伙伴？"
detailNoTeamsBtn:  "我来召集伙伴"
detailParticipate: "我要去这里"
detailCreateTeam:  "召集伙伴出发"
detailBrowseTeams: "看看有没有合适的队伍"
detailSeasonsLabel:"最适合去的时节"
detailShareBtn:    "分享给好友"
```

**`teams` 模块修改/新增：**
```
spotsDesc:           "还差 {remaining} 位伙伴就可以出发"
spotsOneLeft:        "就差你一个，出发！"
joinPlaceholder:     "和队长打个招呼，介绍一下自己..."
youAreLeaderDesc:    "你发起了这支队伍，带领大家出发吧"
pendingDesc:         "申请已发出，队长确认后会通知你"
freeRouteTitle:      "路线灵活，边走边定"
freeRouteDesc:       "这支队伍的路线还没确定，大家可以在组建后一起商量最合适的走法"
membersSectionTitle: "一起出发的伙伴"
leaderSectionTitle:  "这次的领队"
safetyTip1（改写）:  "根据自身体能选择合适的路段，量力而行"
safetyTip2（改写）:  "出行前建议购买户外保险，为旅途增添保障"
safetyTip3（改写）:  "服从领队安排，不单独脱队，保持团队连接"
safetyTip4（改写）:  "关注天气预报，提前做好防晒、防雨、保暖准备"
```

**改写原则：**
- 避免「暂无」「未知」等消极词，改为积极引导表达
- 数字前后添加情感动词（「还差」「就差」「已有」「等待」）
- 安全提示改为建议语气（「建议」「可以」），而非命令语气

---

### D.4 给 Frontend Artisan 的指令

**地点详情页实现清单（按优先级）：**

1. 封面高度升级：`h-[360px] sm:h-[480px] lg:h-[560px]`，移除 `opacity-80`，渐变 from-black/65
2. 移除内联 `alert()`，使用 shadcn/ui Toast 或自实现 Toast hook
3. 信息数据网格：4 列，每列含 emerald 图标圆圈 + 大值 + 小标注
4. 队伍卡片样式：`bg-white border border-stone-100 rounded-2xl hover:shadow-warm-md`，加进度条
5. 右侧 sticky 主 CTA：`bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-full`
6. 骨架屏：`skeleton` 扫光类替代 `animate-pulse`
7. 所有硬编码中文 → copy.ts

**队伍详情页实现清单（按优先级）：**

1. 消除所有 `alert()` / `confirm()` → Toast + ConfirmDialog（shadcn/ui AlertDialog）
2. 消除所有 `style={{ ... }}` 内联样式 → Tailwind class
3. 进度条动画：`useState(0)` + `useEffect` 延迟 → `useState(fillRatio)`
4. 成员列表：移除头像叠加，队长行 `bg-emerald-50/60 border border-emerald-100 rounded-xl`，超 6 人折叠
5. 移动端底部栏：`min-h-[44px]` 修复点击目标
6. 封面层次：`bottom-20` 地点链接，`bottom-6` 标题，字号 `text-3xl sm:text-4xl`
7. 所有硬编码中文 → copy.ts

---

## E. 执行优先级总表

| 优先级 | 任务 | 负责角色 |
|--------|------|----------|
| P0 | 消除 `alert()/confirm()`，替换 Toast/Dialog | Frontend Artisan |
| P0 | 封面图高度与渐变规范 | Visual Designer + Frontend Artisan |
| P0 | 所有硬编码中文 → copy.ts | Frontend Artisan + UX Writer |
| P1 | copy.ts 文案全面升温 | UX Writer |
| P1 | 色彩 Token 统一（两页 CSS 变量对齐） | Visual Designer |
| P1 | 加入流程状态机微交互方案 | Interaction Designer |
| P1 | 卡片样式统一（去除内联样式） | Frontend Artisan |
| P1 | 成员列表优化（移除重复展示，加折叠） | Frontend Artisan |
| P2 | 进度条首次加载动画 | Frontend Artisan |
| P2 | 骨架屏 shimmer 升级 | Frontend Artisan |
| P3 | 图片画廊（地点详情） | Frontend Artisan |
| P3 | 封面视差滚动（可选增强） | Frontend Artisan |

---

*重构方向分析版本：v1.0 | 日期：2026-03-21 | Design Director 输出*

---

# 微交互与情感化体验方案（Interaction Designer 输出）

> 基于 `team-detail-client.tsx` 逻辑与 Design Director D.2 指令输出
> 生效日期：2026-03-21

---

## Section D.2 — 微交互规范（队伍详情页）

### D.2.1 加入流程完整状态机（5 种状态）

队伍详情页加入操作存在 5 种互斥状态，由以下布尔值决定：

```typescript
const isLeader  = currentUserId && team.leader?.id === currentUserId;
const isMember  = userMemberStatus === "approved";
const isPending = userMemberStatus === "pending";
const canJoin   = !isLeader && !isMember && !isPending
               && team.status === "recruiting"
               && team.currentMembers < team.maxMembers;
const isClosed  = !canJoin && !isLeader && !isMember && !isPending;
// isClosed 含：满员 / 已取消 / 已完成 / 未登录时 closed 展示
```

#### 5 种状态规范对照表

| 状态 | 标识符 | 按钮文案 key | 按钮样式 | 图标 | 桌面侧边栏 | 移动端底部栏 |
|------|--------|-------------|---------|------|-----------|------------|
| 可申请 | `canJoin` | `copy.teams.applyJoin` | `bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-full` | 无 / Loader2（提交中） | 显示留言框 + 申请按钮 + 进度条 | 输入框 + 申请按钮（flex row） |
| 申请中 | `isPending` | `copy.teams.pendingDesc` | — | `Loader2 animate-spin text-warning` | 隐藏操作卡，显示待审核提示 | 居中展示等待文案 |
| 已批准 | `isMember` | `copy.teams.memberDesc` | — | `CheckCircle text-brand` | 隐藏操作卡 | 左侧已加入提示 + 右侧「退出队伍」文字按钮 |
| 队长 | `isLeader` | `copy.teams.youAreLeaderDesc` | — | `CheckCircle text-brand` | 显示管理入口（如有） | 居中展示队长提示 |
| 已关闭 | `isClosed` | 状态文案（满员/取消/完成） | `bg-muted text-muted-foreground rounded-full cursor-not-allowed` | — | 不显示操作卡，仅安全提示 | 居中展示关闭原因文案 |

#### 状态切换过渡方案（fade + scale 组合）

```css
@keyframes fadeScaleIn {
  from {
    opacity: 0;
    transform: scale(0.97) translateY(4px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}
```

```tsx
// 用 key 强制重新挂载触发入场动画
<div
  key={currentState}
  className={cn(
    "animate-[fadeScaleIn_0.2s_ease_both]",
    "motion-reduce:animate-none"
  )}
>
  {/* 各状态 UI */}
</div>
```

---

### D.2.2 去除系统弹窗的替代方案

#### Toast 规范

**触发场景：**

| 操作 | 原实现 | 新实现 |
|------|--------|--------|
| `handleJoin` 成功 | 无提示（仅状态切换） | Toast success |
| `handleJoin` 失败 | `alert(data.error)` | Toast error |
| `handleLeave` 前确认 | `confirm("确定要退出队伍吗？")` | ConfirmDialog |
| `handleLeave` 成功 | 无提示 | Toast success |
| `handleLeave` 失败 | `alert(data.error)` | Toast error |

**Toast 样式规范：**

```tsx
// 容器：固定底部，移动端居中，桌面端右下角
className="fixed bottom-6 left-1/2 -translate-x-1/2 lg:left-auto lg:right-6 lg:translate-x-0 z-50"

// 动效：底部 slide-up
className="animate-[slide-up_0.25s_cubic-bezier(0.16,1,0.3,1)_both]"
// 消失：反向 slide-down（200ms）
className="animate-[slide-down_0.2s_ease-in_both]"

// success 变体（emerald）
"bg-white border border-emerald-200 shadow-lg shadow-emerald-900/10 rounded-2xl px-5 py-4 flex items-center gap-3"
// 图标：CheckCircle h-5 w-5 text-emerald-600

// error 变体（red/warm）
"bg-white border border-red-200 shadow-lg shadow-red-900/10 rounded-2xl px-5 py-4 flex items-center gap-3"
// 图标：AlertCircle h-5 w-5 text-red-500

// 文字：text-sm font-medium text-stone-800
// 自动消失：2500ms
```

**keyframes：**

```css
@keyframes slide-up {
  from { opacity: 0; transform: translateY(16px) translateX(-50%); }
  to   { opacity: 1; transform: translateY(0)    translateX(-50%); }
}
/* 桌面端无 -50% 偏移 */
@media (min-width: 1024px) {
  @keyframes slide-up {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
}
@keyframes slide-down {
  from { opacity: 1; transform: translateY(0); }
  to   { opacity: 0; transform: translateY(12px); }
}
```

**useToast Hook 接口：**

```typescript
interface ToastOptions {
  type: "success" | "error";
  message: string;
  duration?: number; // 默认 2500ms
}

function useToast() {
  const [toast, setToast] = useState<ToastOptions | null>(null);
  const show = (opts: ToastOptions) => {
    setToast(opts);
    setTimeout(() => setToast(null), opts.duration ?? 2500);
  };
  return { toast, show };
}
```

#### ConfirmDialog 规范（shadcn/ui AlertDialog）

**触发场景：** `handleLeave`（退出队伍）点击后显示

```tsx
<AlertDialog open={showLeaveConfirm} onOpenChange={setShowLeaveConfirm}>
  <AlertDialogContent className="rounded-2xl max-w-sm">
    <AlertDialogHeader>
      <AlertDialogTitle className="text-lg font-bold text-stone-900">
        {copy.teams.leaveConfirmTitle}
      </AlertDialogTitle>
      <AlertDialogDescription className="text-sm text-stone-500 leading-relaxed">
        {copy.teams.leaveConfirmDesc}
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter className="gap-2">
      <AlertDialogCancel className="rounded-xl border-stone-200 text-stone-600">
        {copy.common.cancel}
      </AlertDialogCancel>
      <AlertDialogAction
        onClick={handleLeave}
        className="rounded-xl bg-red-500 hover:bg-red-600 text-white transition-colors"
      >
        {copy.teams.leaveConfirmBtn}
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

**新增状态：** `const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);`

---

### D.2.3 进度条首次挂载动画

**方案：** `useState(0)` + `useEffect` 延迟 100ms → CSS `transition-[width] duration-300 ease-out`

```tsx
// 抽为独立组件复用（信息卡内 + 侧边栏操作卡内各用一次）
function AnimatedProgress({ ratio, isFull }: { ratio: number; isFull: boolean }) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setWidth(ratio), 100);
    return () => clearTimeout(t);
  }, [ratio]);

  return (
    <div className="h-2 bg-muted rounded-full overflow-hidden">
      <div
        className={cn(
          "h-full rounded-full",
          "transition-[width] duration-300 ease-out",
          "motion-reduce:transition-none",
          isFull
            ? "bg-warm"
            : "bg-gradient-to-r from-emerald-600 to-emerald-500"
        )}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
```

---

### D.2.4 成员列表折叠/展开动效

**规则：** 超过 6 人时折叠，`max-height` transition + chevron 旋转

```tsx
const COLLAPSE_THRESHOLD = 6;
const [membersExpanded, setMembersExpanded] = useState(false);
const shouldCollapse = team.members.length > COLLAPSE_THRESHOLD;

// 列表容器：max-height transition
<div className="relative">
  <div
    className={cn(
      "overflow-hidden",
      "transition-[max-height] duration-300 ease-in-out",
      "motion-reduce:transition-none",
      shouldCollapse && !membersExpanded ? "max-h-[300px]" : "max-h-[2000px]"
    )}
  >
    <div className="space-y-3">
      {team.members.map((member) => (
        <MemberRow key={member.id} member={member} isLeader={...} />
      ))}
    </div>
  </div>

  {/* 折叠状态底部渐变遮罩 */}
  {shouldCollapse && !membersExpanded && (
    <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent pointer-events-none" />
  )}
</div>

{/* 展开/收起按钮 */}
{shouldCollapse && (
  <button
    onClick={() => setMembersExpanded(!membersExpanded)}
    className="mt-3 w-full flex items-center justify-center gap-1.5 text-sm text-brand font-medium py-2 hover:text-emerald-700 transition-colors duration-150"
  >
    <span>
      {membersExpanded
        ? copy.teams.membersCollapse
        : copy.teams.membersExpand.replace("{count}", String(team.members.length))}
    </span>
    <ChevronDown
      className={cn(
        "h-4 w-4 transition-transform duration-200",
        "motion-reduce:transition-none",
        membersExpanded ? "rotate-180" : "rotate-0"
      )}
    />
  </button>
)}
```

---

### D.2.5 加入成功庆祝感动效（可选增强）

**触发时机：** `handleJoin` 成功后，状态切换为 `isPending`

**动效序列：**
1. 按钮 bounce（0–200ms）：`scale(1) → scale(1.05) → scale(0.98) → scale(1)`
2. CheckCircle 图标 fade-in（100–300ms）：从 `x: 8px` 归位 + 透明度 0→1

```css
@keyframes joinBounce {
  0%   { transform: scale(1); }
  40%  { transform: scale(1.05); }
  70%  { transform: scale(0.98); }
  100% { transform: scale(1); }
}

@keyframes checkFadeIn {
  from { opacity: 0; transform: translateX(8px); }
  to   { opacity: 1; transform: translateX(0); }
}
```

```tsx
{joinSuccess && (
  <div className={cn(
    "flex items-center justify-center gap-2 py-3 rounded-full",
    "bg-emerald-50 border border-emerald-200 text-emerald-700",
    "animate-[joinBounce_0.4s_ease_both] motion-reduce:animate-none"
  )}>
    <CheckCircle className={cn(
      "h-5 w-5 text-emerald-600",
      "animate-[checkFadeIn_0.3s_0.1s_ease_both] motion-reduce:animate-none"
    )} />
    <span className="text-sm font-medium">{copy.teams.joinSuccessDesc}</span>
  </div>
)}
```

---

### D.2.6 通用微交互规范补充

#### 按钮完整状态规范

| 状态 | Tailwind classes |
|------|-----------------|
| Default | `bg-emerald-600 text-white` |
| Hover | `hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-900/20` |
| Active | `active:scale-[0.97]` |
| Loading | `opacity-75 cursor-not-allowed`（+ `Loader2 animate-spin`） |
| Disabled | `opacity-50 cursor-not-allowed pointer-events-none` |
| Focus | `focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2` |

所有按钮统一：`transition-all duration-150 motion-reduce:transition-none`

#### 页面滚入动画（fade-up）

适用于 `-mt-12` 信息卡、成员区块、侧边栏队长卡：

```css
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

```
主信息卡：      animate-[fadeUp_0.35s_ease_both]
成员区块：      animate-[fadeUp_0.35s_0.1s_ease_both]
右侧侧边栏：    animate-[fadeUp_0.35s_0.15s_ease_both]
所有元素降级：  motion-reduce:animate-none
```

---

### D.2.7 copy.ts 新增 key 清单（交互相关）

在 `frontend/src/lib/copy.ts` 的 `teams` 模块中新增以下 key：

```typescript
// 加入流程状态文案
applyJoin:         "申请加入",
pendingDesc:       "申请已发出，队长确认后会通知你",
youAreLeaderDesc:  "你发起了这支队伍，带领大家出发吧",
memberDesc:        "你已加入这支队伍",

// 退出确认弹窗
leaveConfirmTitle: "确定要退出队伍吗？",
leaveConfirmDesc:  "退出后需要重新申请才能加入",
leaveConfirmBtn:   "确认退出",

// 加入成功
joinSuccessDesc:   "申请已提交，队长确认后通知你",
joinSuccessToast:  "申请已提交！队长确认后会通知你",
leaveSuccessToast: "已成功退出队伍",

// 成员折叠/展开
membersExpand:    "展开查看全部 {count} 位伙伴",
membersCollapse:  "收起",
```

---

### D.2.8 所有 keyframes 汇总（注册到 globals.css）

```css
/* 状态切换入场 */
@keyframes fadeScaleIn {
  from { opacity: 0; transform: scale(0.97) translateY(4px); }
  to   { opacity: 1; transform: scale(1)    translateY(0); }
}

/* Toast 出现 */
@keyframes slide-up {
  from { opacity: 0; transform: translateY(16px) translateX(-50%); }
  to   { opacity: 1; transform: translateY(0)    translateX(-50%); }
}
@media (min-width: 1024px) {
  @keyframes slide-up {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
}

/* Toast 消失 */
@keyframes slide-down {
  from { opacity: 1; transform: translateY(0); }
  to   { opacity: 0; transform: translateY(12px); }
}

/* 加入成功按钮弹跳 */
@keyframes joinBounce {
  0%   { transform: scale(1); }
  40%  { transform: scale(1.05); }
  70%  { transform: scale(0.98); }
  100% { transform: scale(1); }
}

/* CheckCircle 出现 */
@keyframes checkFadeIn {
  from { opacity: 0; transform: translateX(8px); }
  to   { opacity: 1; transform: translateX(0); }
}

/* 内容滚入 */
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

### D.2.9 无障碍要求汇总

所有动效组件必须处理 `prefers-reduced-motion`：

```css
/* globals.css 全局覆盖（推荐方式） */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

Tailwind 内联写法（逐元素保底）：

```
motion-reduce:transition-none
motion-reduce:animate-none
motion-reduce:hover:translate-y-0
motion-reduce:hover:translate-x-0
```

---

*微交互方案版本：v1.0 | 日期：2026-03-21 | Interaction Designer 输出*
