# gomate 故事模块设计规范（DS v2.0 统一）

> 需求：task #138（@Steven）
> 拆分：task #139（P0 DS v2.0 统一）、#140（P0 弹窗 a11y）、#141（P1 详情页层级）、#142（P1 移动端）、#143（P2 验证放宽）
> 范围：`/discover/[id]` 详情、`/discover/[id]/edit` 编辑、`/discover/create` 发布
> 设计者：@Steven · 2026-07-18 · v1.0
> 问题清单：`notes/gomate-story-pages-ux-analysis.md`

---

## 1. 目标

故事模块三个页面全部接入 GoMate Design System v2.0（`frontend/src/styles/globals.css`），消除 amber 渐变遗留视觉。改完用户从详情页点「编辑」不应感到跳到了另一个产品。

**只改视觉与 a11y，不改功能逻辑**（#143 的验证放宽除外）。

---

## 2. Token 映射表（旧值 → DS v2.0）

所有替换必须走 token / 语义类，禁止再写死 amber hex 或 Tailwind amber 色阶。

| 旧写法（编辑页/发布页）                                  | DS v2.0 替换                                                   | 说明                                        |
| -------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------- |
| `bg-gradient-to-b from-amber-50/30 to-white`（整页背景） | `bg-background`（`#faf8f5`）                                   | 禁止任何页面级渐变                          |
| `bg-amber-500` / `bg-amber-600`（主按钮、标签）          | `bg-primary`（`#D97706`，dark `#F59E0B`）                      | hover 用 `#B45309`（.btn-primary 已含）     |
| `text-amber-600` / `text-amber-700`                      | `text-primary` 或 `text-accent-foreground`（`#92400E`）        | 小字提示用 accent-foreground 保证对比度     |
| `bg-amber-50` / `bg-amber-100`（提示条、tag 底）         | `bg-accent`（`#FFFBEB`）或 `bg-secondary`（`#f2ede7`）         | 提示条用 bg-accent + text-accent-foreground |
| `rounded-xl`（卡片/输入框）                              | `rounded-lg`（16px，卡片）/ `rounded-md`（12px，按钮、输入框） | 见 §4 圆角规则                              |
| `focus:ring-amber-200`                                   | `focus:ring-ring`（`--ring: #D97706`）                         |                                             |
| `border-amber-200` 等                                    | `border-border`（`#e8e0d7`）                                   |                                             |
| 自定义阴影                                               | `shadow-card` / `shadow-card-hover` / `shadow-warm-sm`         | 禁止新造阴影值                              |

### 圆角规则（全模块统一）

| 元素                 | token           | 值     |
| -------------------- | --------------- | ------ |
| 按钮、输入框、select | `--radius-md`   | 12px   |
| 卡片、封面容器       | `--radius-lg`   | 16px   |
| 弹窗（dialog）       | `--radius-2xl`  | 24px   |
| 标签 pill、头像      | `--radius-full` | 9999px |
| 徽章内小圆点         | `--radius-xs`   | 4px    |

**禁用**：`rounded-xl`（20px 仅限大展示卡片，本模块不用）、任何写死 px 的圆角。

### 动效

- 交互反馈（按钮 hover/active、输入框 focus）：`--duration-fast`（150ms）
- 弹窗进出：`--duration-normal`（250ms）
- 按钮 active：`transform: scale(0.97)` + `--duration-instant`（80ms），沿用 `.btn-base`
- 禁止 spring/bounce 与 >400ms 的过渡

---

## 3. 页面级规范

### 3.1 编辑页 `/discover/[id]/edit`（task #139 主战场）

- **页面背景**：`bg-background`，删除 `bg-gradient-to-b from-amber-50/30 to-white`
- **sticky 保存栏**：`bg-card`（玻璃白 `rgba(255,255,255,0.85)`）+ `border-b border-border`，backdrop-blur 可保留
- **保存按钮**：`.btn-primary`（bg-primary + text-primary-foreground，hover `#B45309` + `shadow-glow`）
- **取消按钮**：`.btn-ghost` 或 `bg-secondary text-secondary-foreground`
- **草稿恢复横幅**：`bg-accent text-accent-foreground` + `border border-border` + `rounded-md`，不再用 amber-50 整块突兀横幅；按钮用 `.btn-primary` 小号
- **未保存提示**：移动端不得 `hidden`（见 §5 移动端）
- **输入框（标题/摘要/地点）**：`bg-card` + `border border-input` + `rounded-md` + `focus:ring-2 focus:ring-ring focus:border-transparent`
- **标签选择**：选中态 `bg-primary text-primary-foreground`，未选中 `bg-secondary text-secondary-foreground`，均 `rounded-full`
- **Vditor 编辑器容器**：`bg-card` + `border border-border` + `rounded-lg` + `shadow-card`
- **三态一致**：loading 骨架、草稿提示条、正常编辑态全部按上述 token（Wen 验收会逐态测）

### 3.2 发布页 `/discover/create`（task #139 同步）

- 与编辑页共用同一套表单样式，**禁止两套视觉**
- 遗留的 amber 自定义样式全部按 §2 映射表替换
- 表单验证反馈：错误文案 `text-destructive`（`#e53e3e`），输入框错误态 `border-destructive`

### 3.3 详情页 `/discover/[id]`（task #141，P1）

详情页已基本符合 DS v2.0，只做信息层级收敛：

- **byline 精简**：只保留「作者 · 日期 · 阅读时长」3 项；浏览量/点赞数下移到文章底部操作区
- **标题**：`text-2xl sm:text-3xl font-bold`（从 text-3xl/4xl/5xl 降档，`max-w-3xl` 容器下更克制）
- **摘要**：去掉 `border-l-2 border-primary/50 pl-4` 引用块样式，改 `text-muted-foreground text-lg leading-relaxed`
- **容器统一**：封面与正文统一 `max-w-3xl`（消除 max-w-5xl/max-w-3xl 跳跃）
- **eyebrow 标签**：去 `bg-primary/10 border-primary/20` 彩色 pill，改 `text-primary text-sm font-medium` 纯文字
- **删除按钮**：与编辑按钮视觉降级——改为 `text-destructive` 文字按钮或收进「更多」菜单，不与主操作并列同权重
- **分享入口去重**：只保留底部 StoryActions 一处

---

## 4. a11y 规范（task #140）

### 4.1 取消确认弹窗（对照 daily-book PR #67/#68 已验证模式）

- `role="alertdialog"` + `aria-modal="true"` + `aria-labelledby` 指向标题
- 打开：焦点移入弹窗第一个可交互元素
- Tab / Shift+Tab 在弹窗内循环 trap
- Esc 与「取消」按钮关闭，关闭后焦点还原到触发元素
- 注意 daily-book 的 visibility-transition 焦点时序坑：焦点转移用最多 5×50ms 重试（可复用 `src/scripts/modal-a11y.ts` 同款 helper）

### 4.2 其他

- 封面图删除按钮（×）加 `aria-label="删除封面图"`
- 地点搜索结果列表：`role="listbox"` + 选项 `role="option"` + 方向键导航 + `aria-activedescendant`
- 所有交互元素 `:focus-visible` 有 `2px var(--ring)` outline

---

## 5. 移动端规范（task #142，依赖 #139）

- 「基本信息」区（标题/摘要/封面/地点/标签）做成可折叠面板，默认展开标题+摘要，其余折叠；编辑器首屏可见
- 375px 视口：编辑器不被表单挤出首屏
- 「未保存修改」提示不得 `hidden sm:inline`——改为保存按钮上的状态点或按钮文案变化（如「保存\*」）
- sticky 保存栏在移动端保留，按钮宽度撑满可用区域
- 桌面端不折叠，保持现状布局

---

## 6. 发布页验证放宽（task #143，P2）

- 封面图改可选：无封面时详情页用 `bg-secondary` 占位 + 标题首字，不留破图
- 标签改可选：0 个标签可发布
- 若触及 API schema，PR body 必须披露契约变更（Martin CR 重点）

---

## 7. 验收标准（对齐 @Wen 清单）

**#139 DS v2.0 统一**

- [ ] getComputedStyle 实测：无 gradient 背景、无 rounded-xl、无 amber 色阶写死
- [ ] 颜色/字体/圆角全部落在 §2 token 内
- [ ] loading / 草稿提示条 / 正常编辑三态一致
- [ ] 双 locale（zh-CN + en）+ console 0 error（#418/#423/#425 hydration 不复发）

**#140 弹窗 a11y**

- [ ] role="alertdialog" + aria-modal 实测存在
- [ ] 焦点移入 → Tab/Shift+Tab trap → Esc 关闭 → 焦点还原

**#141 详情页层级**

- [ ] byline 仅作者/日期/阅读时长 3 个节点
- [ ] 双 locale + console 0 error

**#142 移动端**

- [ ] 375px：基本信息可折叠、编辑器首屏可见；桌面端不折叠

**#143 验证放宽**

- [ ] 空封面/空标签可发布；其他校验不放松；API 契约变更有披露

---

## 8. 不做（边界）

- 不改路由、不改数据 schema（除 #143 披露范围）
- 不引入新依赖
- 不动 Vditor 本身配置（只改容器样式）
- 不做 SSR 内容渲染改造（分析文档 P2 项，另立项）

---

_spec v1.0。核心：三个页面一套 DS v2.0 token，视觉零断裂。_
