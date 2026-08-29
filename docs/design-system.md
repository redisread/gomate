# GoMate 前端设计系统

设计 token 与基础样式的事实来源是
[`src/styles/globals.css`](../src/styles/globals.css)；Tailwind 补充配置在
[`tailwind.config.ts`](../tailwind.config.ts)，共享组件在
[`src/components/ui/`](../src/components/ui/)。本文只记录稳定的使用约束。

## 视觉基础

- 采用温暖琥珀主色、沙米中性色和珊瑚强调色；颜色统一使用 OKLCH token。
- light/dark 主题通过 `:root`、`.dark` 与语义 token 映射，不在组件中维护第二套色值。
- 字体使用系统字体栈；网页 UI 不加载远程字体。服务端分享海报的 R2 字体属于 API 媒体实现，不属于网页字体系统。
- 当前面向支持 OKLCH、`color-mix()` 和现代 CSS 的 evergreen 浏览器。

## Token 使用

组件按语义角色选择 token：

- 基础：`background`、`foreground`、`card`、`popover`、`primary`、`secondary`、`muted`、`accent`、`destructive`、`border`、`input`、`ring`。
- 业务：`brand`、`warm`、`success`、`warning` 及其 `foreground` / `subtle` 变体。
- 层级：`shadow-card`、`shadow-card-hover`、`shadow-warm-*`、`shadow-glow` 与统一圆角 scale。

约束：

- 优先使用 Tailwind 语义 utility，例如 `bg-primary`、`text-muted-foreground`。
- 需要动态 inline style、渐变或 `backdropFilter` 时仍引用 `var(--token)`，不写 hex、rgba 或 OKLCH 字面量。
- 半透明优先使用 `bg-primary/10`；inline style 使用
  `color-mix(in oklab, var(--primary) 10%, transparent)`。
- 不因两个 token 当前色值相同就混用角色；token 的职责比具体色值稳定。

## 排版

- 页面渲染路径只有一个 `<h1>`，后续层级使用 `<h2>` / `<h3>`，不要用字号代替语义。
- 优先使用 `text-page-h1`、`text-section-h2`、`text-card-h3` 和既有 Tailwind scale，避免任意 `text-[Npx]`。
- 标题使用 `text-wrap: balance`，长文正文使用 `text-wrap: pretty`；相关 base 样式已在 `globals.css` 定义。
- 截断内容必须仍可访问完整文本；可用 `title`、展开控件或可访问说明，不能只留下视觉省略号。
- `<input>`、`<textarea>` 和可编辑控件在移动端 computed font size 不得小于 16px，避免 iOS 聚焦缩放。
- 数字排版优先使用高层属性，例如 `font-variant-numeric: tabular-nums`，不直接堆叠底层 OpenType tags。

## 交互与动效

- 常规点击反馈使用 `active:scale-[0.96]`；高频操作避免夸张位移或缩放。
- hover 放大只用于页面主要 CTA，不用于导航、标签页、列表项或重复社交操作。
- 禁止 `transition-all`；只声明会变化的属性，例如 `transition-colors`、
  `transition-transform` 或明确的 property list。
- Lucide 图标默认 `strokeWidth={2}`，只在与更粗视觉语言配对时调整。
- 使用现有 shadow token，不创建临时 `shadow-[...]` 色值。
- 新动效必须尊重 `prefers-reduced-motion`；reduced-motion 下移除非必要移动、循环和视差。

## 布局与响应式

- 先保证小屏单列与自然阅读顺序，再通过现有 `sm` / `md` / `lg` 断点增强。
- 登录后的个人主页将头像、姓名、等级、简介和基础属性保留在同一个 Profile Header；统计入口在所有支持宽度保持三列紧凑布局，避免在移动端把活动内容推离首屏。
- 账户型页面只在正文保留当前任务的主要操作；退出等低频账户操作收进全局用户菜单，不在页面正文重复。完整营销 Footer 不用于这类短流程页面。
- 固定底部操作条必须考虑 safe area，不遮挡表单、Toast 或浏览器控件。
- 列表筛选按业务维度分组时，地区与热门城市位于内容标签之前；热门城市快捷项使用
  `aria-pressed` 表达选中态，横向滚动区域不能改变键盘顺序。
- 详情页同时存在主次操作时，桌面端主 CTA 放在信息区，次要详情链接降低视觉权重；移动端
  使用底部固定主操作栏时，正文不再重复渲染同等级主 CTA。
- 弹窗、抽屉和菜单必须有可访问名称、焦点管理、Escape 关闭和焦点恢复。
- 交互目标至少 44×44 CSS px；键盘焦点不得只依赖颜色变化。
- 页面优先使用 Astro SSR，只有需要客户端状态的交互才建立 React island。

### 后台壳层与快速操作

- 后台以 `AdminLayout` 为唯一页面壳层：桌面在 leading edge 保留固定侧栏，`lg` 以下改用
  移动顶部栏和抽屉，主内容保持最少 16px inline margin，页面仍只有一个 `<h1>`。
- 后台导航只展示真实可达的静态路由，当前项使用 `aria-current="page"`；移动抽屉提供可访问
  名称、44×44 触发目标、Escape 关闭和关闭后焦点恢复。
- `AdminQuickAction` 只负责表现层：宽布局居中为 Dialog，窄布局贴底为 Bottom Sheet；业务
  内容通过 `children` 注入。标题固定可达，内容区域独立滚动，底部计算 safe area。
- 快速地点录入把名称、介绍和地区保持在首层并直接提交草稿；封面、推荐活动类型与标签放入
  原生可展开区域。成功态明确说明“已保存为草稿”，并提供继续完善全部字段的单一主操作。
- 快速操作打开时锁定 body 滚动并使背景 `inert`，Tab/Shift+Tab 圈定在弹层内；关闭时先清理
  `inert` 和滚动状态，再恢复原触发器焦点。所有位移动效遵守 reduced-motion。

### 分享海报预设

- 分享选择器使用原生 radio group，三列卡片在 320px 视口仍保持至少 44px 高；预设名称和说明
  始终可见，不能只依靠色条区分当前选择。
- 网页选择器继续使用语义色 token；服务端 Satori 海报的独立色板与版式定义集中在
  `src/server/templates/share-image/poster-presets.ts`，不得反向导入网页 CSS。
- `dusk` 保留黄昏户外层级，`ridge` 使用更紧凑的冷色信息层级，`journal` 使用纸张暖色、
  内嵌封面和低圆角。Location 与 Team 共享色彩主题，但各自保留内容专用版式。

## 可访问性与内容

- 正文和控件文字达到 WCAG 2 AA 对比度：普通文本至少 4.5:1，大文本至少 3:1。
- 状态不能只靠颜色表达；同时提供文本、图标或结构语义。
- 用户可见文案全部走完整 i18n namespace，不在组件内硬编码替代翻译。
- 图片提供与上下文匹配的 `alt`；纯装饰图使用空 `alt` 或隐藏于辅助技术。
- loading、空态、错误与重试状态都必须可理解、可操作，且不改变页面标题层级。

## 验证

UI 变更至少检查键盘、可访问名称、移动端、dark mode 和 reduced-motion，并运行：

```bash
pnpm i18n:build
pnpm i18n:validate
pnpm lint
pnpm type-check
pnpm test
pnpm build
```
