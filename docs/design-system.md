# GoMate 前端设计系统

设计 token 与基础样式的事实来源是
[`src/styles/globals.css`](../src/styles/globals.css)；Tailwind 补充配置在
[`tailwind.config.ts`](../tailwind.config.ts)，共享组件在
[`src/components/ui/`](../src/components/ui/)。本文只记录稳定的使用约束。

## 视觉基础

- 采用温暖琥珀主色、沙米中性色和珊瑚强调色；颜色统一使用 OKLCH token。
- light/dark 主题通过 `:root`、`.dark` 与语义 token 映射，不在组件中维护第二套色值。
- 字体使用系统字体栈；网页 UI 不加载远程字体。
- 当前面向支持 OKLCH、`color-mix()` 和现代 CSS 的 evergreen 浏览器。

### 品牌图标

- GoMate 使用“同行足迹”品牌图标：琥珀色与奶油白的两枚并行鞋印，以温润的 3D clay 质感表达“发现地点，结伴出发”。PNG 使用 1:1 正方形画布与真实透明背景，保留主体比例与安全边距。
- 透明 PNG 原稿为 `docs/brand/gomate-icon.png`，生成提示词保存在同目录的 `gomate-icon-prompt.json`。各尺寸按原稿等比缩小，保留 alpha 通道与安全边距，不以重绘的 SVG 或通用 Mountain 图标代替品牌标识。
- 公共导航、移动菜单、页脚、认证页面和后台品牌入口统一使用 `src/components/brand-icon.tsx`，加载 128×128 的 `public/brand-icon.png`。与可见品牌文字相邻时，图片使用空 `alt`，避免重复朗读。业务功能中的山形图标仍遵循 Lucide 图标规范。
- 中英文 README 使用 512×512 的 `public/icon-512.png`；浏览器使用 `public/favicon-32x32.png` 和包含 16/32/48 三种尺寸的 `public/favicon.ico`；主屏幕图标为 180×180、使用暖白底色的 `public/apple-touch-icon.png`，其余 PNG 与 ICO 保留透明背景。修改原稿后同步导出所有尺寸，并更新 `BrandIcon` 与 `Layout.astro` 的版本参数以刷新缓存。
- 品牌资产保留固定色值，网页组件继续使用语义 token；图标不附带 hover 位移或循环动画。README 产品截图应随品牌变更更新为实际页面截图。

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
- 首页地图镜头与固定尺寸点位使用同一个 Motion 进度，避免 SVG 与合成层 HTML 过渡错帧。地点预览
  以 180ms 进入 / 160ms 退出淡化与 4px 位移衔接，旧内容退出交互与辅助技术；新选择取消
  旧动效并采用最新状态。首次恢复不播放进入动画；脚本动效同时响应 reduced-motion 及其切换。
  预览区保留小屏 160px / 宽屏 128px 最低高度，长文案允许增长；地图不超过宽屏视口高度的 60%。
- 地图采用静态点阵底纹与暖色省份填充；省界选中时描绘一次，点位选中时扩散一次光晕，均不循环。装饰层不接收指针、不进入辅助技术；点位保持 44px 命中区，浮动名称标签靠近点位并向地图内侧展开。低动态与首次 URL 恢复不播放描线或光晕。
- 地图预览复用统计 API 的封面 URL，仅为当前地点加载缩略图。图片区域固定尺寸，加载中、无封面或失败时显示装饰占位；按地点与 URL 重置图片状态，避免上一次选择的图片事件影响当前预览。名称、地区与详情链接始终可用，照片淡入不改变预览高度。

- 地点照片卡片参考 [Ice lollies 示例](https://motion.dev/examples/react-gallery-ice-lollies)，以现有免费 Motion 的拖动、变换和退出动画实现横向 3:2 叠卡；滑动旋转甩出并由下一张补位，首尾循环，不自动播放。背景与控件使用系统语义颜色，不随照片取色，也不加入大背景文字；图片首次以轻微缩放归位，后续大图切换仅交叉淡化。图片解码失败保留当前展示并提供重试，减少动态效果即时生效。

### 故障与恢复体验

- 流程设计同时覆盖超时、离线、部分成功、结果未知与重试；保留可恢复的输入和上下文，明确显示失败、处理中或已完成，不把响应丢失直接解释为提交失败。
- 写操作在重试前按服务端合同确认状态，并复用同一次操作的幂等身份；最终一致的流程说明延迟与完成状态，恢复后与服务端事实对齐。
- 重试、取消和重新查询必须可通过键盘操作，状态变化对辅助技术可感知；自动重试有次数上限，耗尽后提供明确下一步。技术约束遵循[可靠性与性能设计](../CODING_STANDARDS.md#可靠性与性能设计)。

## 布局与响应式

- 先保证小屏单列与自然阅读顺序，再通过现有 `sm` / `md` / `lg` 断点增强。
- 登录后的个人主页将头像、姓名、等级、简介和基础属性保留在同一个 Profile Header；统计入口在所有支持宽度保持三列紧凑布局，避免在移动端把活动内容推离首屏。
- 账户型页面只在正文保留当前任务的主要操作；退出等低频账户操作收进全局用户菜单，不在页面正文重复。完整营销 Footer 不用于这类短流程页面。
- 固定底部操作条必须考虑 safe area，不遮挡表单、Toast 或浏览器控件。
- 地点筛选使用统一城市单选组，城市在兴趣之前；未选项以浅底色降低视觉重量，选中项使用
  琥珀语义 token 和勾选标记，快捷项以 `aria-pressed` 表达选中态。勾选标记预留空间，
  不因选中改变按钮宽度；清除入口与结果更新状态预留位置，不随筛选新增一行。
  地点筛选页在内容就绪后直接展示，避免逐段延迟入场。
- 城市与兴趣收纳于浅底描边面板，标签使用紧凑圆角矩形与统一的 44px 最小点击高度；
  勾选位嵌入标签内边距，避免额外撑宽。两组之间使用细分隔线，说明与清除操作固定在面板底栏。
- 地点筛选在 `sm` 以下将城市和兴趣各收纳为一条横滑行，边缘渐隐提示剩余选项，“更多城市”
  保持可见；`sm` 以上自然展示全部快捷项。横滑不改变键盘顺序，也不触发页面纵向滚动。
- “更多城市”复用 Modal：桌面使用锚定浮层，手机使用底部面板；均提供搜索、方向键/Enter
  选择、Escape 关闭、焦点圈定与恢复。搜索输入在移动端不小于 16px，底部面板考虑 safe area。
- 详情页同时存在主次操作时，桌面端主 CTA 放在信息区，次要详情链接降低视觉权重；移动端
  使用底部固定主操作栏时，正文不再重复渲染同等级主 CTA。
- 关于页使用单一公共导航与 Footer，并由 Astro SSR 输出全部正文；信息顺序固定为品牌定位、
  产品能力、社区原则、安全边界和联系行动。首屏只保留“探索地点”一个品牌色主操作，
  “寻找队伍”作为次操作，正文不展示未经数据支持的用户量、地点数或响应时效。
- 弹窗、抽屉和菜单必须有可访问名称、焦点管理、Escape 关闭和焦点恢复。
- 交互目标至少 44×44 CSS px；键盘焦点不得只依赖颜色变化。
- 页面优先使用 Astro SSR，只有需要客户端状态的交互才建立 React island。

### 后台壳层与快速操作

- 后台以 `AdminLayout` 为唯一页面壳层：桌面在 leading edge 保留固定侧栏，`lg` 以下改用
  移动顶部栏和抽屉，主内容保持最少 16px inline margin，页面仍只有一个 `<h1>`。
- 后台导航只展示真实可达的静态路由，当前项使用 `aria-current="page"`；移动抽屉提供可访问
  名称、44×44 触发目标、Escape 关闭和关闭后焦点恢复。
- `AdminQuickActionDialog` 只负责表现层：宽布局居中为 Dialog，窄布局贴底为 Bottom Sheet；业务
  内容通过 `children` 注入。标题固定可达，内容区域独立滚动，底部计算 safe area。
- 快速地点录入把名称、介绍和地区保持在首层并直接提交草稿；封面、推荐活动类型与标签放入
  原生可展开区域。成功态明确说明“已保存为草稿”，并提供继续完善全部字段的单一主操作。
- 快速操作打开时锁定 body 滚动并使背景 `inert`，Tab/Shift+Tab 圈定在弹层内；关闭时先清理
  `inert` 和滚动状态，再恢复原触发器焦点。所有位移动效遵守 reduced-motion。

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

### 地点详情：旅行手记

- 先呈现目的地吸引力，再展示出行信息与同行队伍。桌面首屏将相纸叠卡与地点名称、特色标签并排；手机保持照片、名称、信息、队伍的自然顺序。标题与正文共享 `max-w-6xl` 对齐边缘。
- 沙米底色以留白分组，珊瑚浅底用于照片舞台和同行邀请，琥珀用于主要操作。静态标签不模拟可点击控件；出行信息使用独立浅色卡片，队伍以日期票券结构展示。
- 桌面组队入口留在侧栏，移动端从内容就绪起显示带安全区的底部操作栏；正文不重复发起队伍按钮。浏览队伍次操作跳到本页队伍区，队伍区提供完整列表入口。
- 保留现有照片拖动与大图动效；其余交互使用短暂颜色反馈和轻微按压，减少动态效果时关闭按压位移。正文直接展示，不逐段延迟入场。

### 队伍详情：出发邀请卡

- 队名与状态先于封面；移动端将日期、时间、地点和名额放在封面前，桌面封面与出发信息并排。
  日期采用浅暖底票券与虚线分区，足迹仅作装饰；状态同时提供文字，不依赖色彩。
- 名额进度与主要操作集中在出发信息区。未加入者桌面使用卡内操作，手机仅使用固定底栏；
  底栏包含 safe area，并按实际高度为正文和 Toast 预留空间，适应英文换行与缩放；
  加入后底栏消失时，Toast 仍保留底部安全区距离。
- 队员与队长的集合信息提前到出发卡，队员退出为次要操作，队长成团为主要管理操作。
  身份、成团、退出及移除条件沿用业务合同；终态展示真实状态，不制造剩余名额紧迫感。
- 完整介绍放在正文，随后为集合信息、参与要求；同行伙伴在宽屏并排、小屏顺序阅读，显示头像与昵称，
  超过八人使用有展开状态的按钮。图片本身不暗示点击，地点详情使用明确链接。
- 页面不做分段延迟入场；交互沿用 CSS 过渡，进度变化在 reduced-motion 下直接更新。

## 公共页脚

- 公共页脚采用旅行明信片构图：品牌与三组真实导航在上，版权和返回顶部衔接，山湖步道与同行者插画在下。文字不嵌入图片，原有联系和社交入口在手机与桌面均可用。
- 使用一套响应式 DOM：窄屏品牌在前、导航两列，`sm` 起导航三列，`md` 起品牌与导航并排；不根据客户端窗口宽度替换组件。
- `--footer-paper`、`--footer-ink`、`--footer-muted` 是页脚专用语义色，浅色为暖纸与深蓝，深色为暗蓝与暖白。插画保持装饰语义、预留高度、懒加载，不添加视差或循环动画。
- 原创插画发布在 `public/images/footer-landscape.webp`（1920×640，约 211 KiB）及 `footer-landscape-small.webp`（960×320，约 64 KiB）；生成工具为 imagegen，主题为山野、湖泊、步道和三位同行者，未使用参考截图的图像资产。
- 微信联系方式使用共享 Modal，支持焦点圈定、Escape 与关闭后焦点恢复；剪贴板不可用时选中微信号供手动复制。返回顶部在 reduced-motion 下使用即时滚动。
- 图片尺寸与加载行为参考 [MDN img](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/img)，滚动偏好参考 [MDN scrollTo](https://developer.mozilla.org/en-US/docs/Web/API/Window/scrollTo)。

## Starwind UI

- 使用 Starwind UI CLI 3.4.0 内置 registry 2.2.0 的可编辑 Styled 源，以及 `@starwind-ui/astro` / `@starwind-ui/react` 1.3.0。各组件源版本记录于 `starwind.config.json`，上游 MIT 许可保留在 `src/components/starwind/LICENSE`。
- Astro 页面从 `src/components/starwind/` 导入；React Islands 从 `src/components/starwind-react/` 导入，不额外创建渲染根。
- 现有 `globals.css` 仍为唯一品牌 token 来源；Starwind 的 outline/error/info 等语义映射到 ring/destructive/primary。使用前阅读上游 [Astro + React 文档](https://starwind.dev/docs/frameworks/astro-react/)。
- 源码允许本地适配：移除 `transition-all`，保留移动端输入 16px、reduced-motion、原生表单值和显式提交类型。Button 的 plain/inherit 变体承接现有业务布局；按钮与链接的 ref/event 类型分别约束。
- 更新组件前检查本地源差异，不直接运行 overwrite 覆盖品牌与可访问性适配。CLI 对当前 Astro 配置的识别有限，本次从同版本官方内置 registry 手动安装，未改动 Astro 的 Worker 集成。

- 公共 Modal 使用 Starwind Dialog primitive 管理原生 dialog、Escape 与滚动锁；外层保留背景 inert、初始/返回焦点和原布局。调用方不再独立控制滚动锁。
- 图库通过 `usePresence` 显式管理退出清理；退出中切换 reduced-motion 时直接释放旧卡片，重新进入时恢复位置和透明度。浏览器测试覆盖原生动画中断、切回及失败重试。

- 密码框带 44px 显隐按钮时为右侧按钮和 inset 留足输入内边距；使用 Card 表达横向行时显式指定 `flex-row`。Checkbox 在 reduced-motion 下直接呈现完整勾选图标，不能只取消父级动画。

## 地点多图上传的状态所有权

- `MultiImageUpload` 保持受控图片数组；`useImageUploadQueue` 管理在途任务、容量预留、进度与错误。传输及响应解析仍由 `lib/location-image-upload` 负责，UI 不复制传输逻辑。
- 每次完成向最新的受控值追加，连续完成在 React 重渲染前也串行推进图片数组；父级删除或替换图片后，旧回调不得恢复旧值。连续选择文件需同步预留容量，失败释放名额并保留可清除错误。
- 卸载后忽略上传完成和进度回调，不再写回表单；这不等于撤销已经开始的远程上传，也不自动删除 R2 对象。对象生命周期策略不属于 UI 状态清理。

### 相册退出生命周期

封面卡片以 `usePresence` 管理退出完成：滑出、旋转和淡出由同一 effect 启停，正常淡出完成后释放卡片；切换减少动态效果时停止尚未完成的动画并直接释放退出卡片。当前卡片不因偏好变化重建，保留焦点；重新进入的卡片使旧完成回调失效。不能通过极短退出时长保证取消后的动画完成回调一定到达。验证同时覆盖真实浏览器中的原生动画取消、反向切回以及动态偏好切换。参考 [Motion 手动 presence](https://motion.dev/docs/react-animate-presence#manual-usage)。
