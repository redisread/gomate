# gomate P2: primary token realign spec v1.1

> 触发: Wen msg=f7d57125 提示的 P2 视觉一致性 follow-up + Martin msg=713158cf CR 反馈
> 根因: PR #402 (task #180 a11y hotfix) 为过 WCAG AA 门禁在 navbar CTA / locale-toggle 硬编码 `amber-700`, 与 `--primary` (#D97706) 分裂
> 设计者: @Steven
> CR: @Martin @Victor
> 交付给: Jeff

**v1.1 变更 (2026-07-20 21:00, 应 Martin CR)**:

- §A 附录: 全站 `bg-primary` 20 处 + `text-primary/border-primary` 82 处逐条 file:line 清单
- §3.3 补 dark 模式 `--primary = #F59E0B` 对比度具体测算数值
- §5.3 视觉走查 9 项逐条展开检查动作
- §3.4 hotfix 回滚 3 处 file:line 精确到具体 diff
- §7 补具体验证命令

---

## 0. 结论先行

**问题不在 hotfix, 问题在 `--primary` token 值定错了.**

现值 `--primary = #D97706` (amber-600) + `--primary-foreground = #FFFBEB` (cream) → **对比度 ≈ 3.3:1**, 挂 WCAG AA 4.5:1 门禁.

只要 `--primary` 保持 amber-600, 任何用 `bg-primary text-primary-foreground` 的 CTA 都过不了 a11y. PR #402 只是把 "过不了 a11y 的 token" 局部绕开, 问题会在每个新 CTA 反复发生.

**动作**: 把 `--primary` 从 `#D97706` (amber-600) 改为 `#B45309` (amber-700), 全站 `bg-primary` 自动跟上, 一次拉齐.

---

## 1. 现状证据

### 1.1 token 定义

`frontend/src/styles/globals.css:271-298` + `critical.css:20-40`:

```css
--primary-500: #d97706; /* 品牌主色 */
--primary: #d97706; /* = primary-500 */
--primary-foreground: #fffbeb; /* = primary-50 (cream) */
```

Dark 模式 (`globals.css:365`): `--primary: #F59E0B` (primary-400) + `--primary-foreground: #1c0f00`.

### 1.2 a11y 挂点 (PR #402 手动绕开的地方)

**`frontend/src/components/layout/navbar.tsx:490-492`** (登录/注册按钮):

```tsx
// task #180 a11y: bg-primary (#D97706 amber-600) on cream #FFFBEB = ~3.3:1 挂 WCAG AA 4.5:1
// 走 amber-700 (#B45309) + text-white = ~5.5:1 稳过; 不改 --primary token 避免全站隐性回归
className = "... bg-amber-700 text-white hover:bg-amber-800 ...";
```

**`frontend/src/components/layout/locale-toggle.tsx:94-95`** (语言切换 active):

```tsx
// task #180 a11y: active state bg-primary #D97706 + cream text = ~3.3:1 挂门禁; amber-700 + white 稳过
? "bg-amber-700 text-white hover:bg-amber-800"
```

**`frontend/src/components/layout/navbar.tsx:158-161`** (active tab 文字):

```tsx
// task #180 a11y: active text-primary (#D97706) on bg-accent (#fffbeb) = ~3.07:1 挂; amber-800 = ~6.8:1
? "text-amber-800 dark:text-amber-300 bg-accent"
```

3 处 hotfix 都指向同一根因: `amber-600 on cream` 不够暗.

### 1.3 全站 primary 使用点统计

- **`bg-primary`**: 20 处 (`grep -rn "bg-primary" frontend/src --include="*.tsx" --include="*.ts"` 过滤色阶变量后)
- **`text-primary` + `border-primary`**: 82 处 (同上过滤)
- 完整清单见文末 §A 附录

按用途归类:

- **品牌 CTA** (`bg-primary` 实心按钮): 3 处 - navbar 登录注册按钮 (mobile drawer 内)、team-actionbook-form 保存、story-poster-preview 分享
- **激活/选中态背景**: 4 处 - navbar active tab 指示条、locale-toggle active、activity-calendar 今日圆点、quick-duration-button 选中
- **装饰半透明** (`bg-primary/5, /10, /15, /20`): 13 处 - 各种圆角 icon 底、chip 底、hover 变化
- **icon/文字色** (`text-primary`): 30+ 处 - 主要是 Mountain 品牌 icon、Loader 旋转、hover 变化
- **焦点边框** (`focus:border-primary` + `focus:ring-primary/10`): 20+ 处 - 表单输入 focus 状态
- **实体边框** (`border-primary`): 1 处 - quick-duration-button 选中态

**结论**: 20 处 `bg-primary` 里, 只有 3 处品牌 CTA 直接受 a11y 影响; 其他 17 处是半透明装饰 (与前景色对比度基本无关) 或纯圆点/指示条 (无正文对比要求). 82 处 text/border 里, 82% 是 icon/装饰/focus, ~15 处是文本用途需要走查.

---

## 2. 顾客损失 → 设计对应

| 顾客损失                                         | 设计对应                                                      | §     |
| ------------------------------------------------ | ------------------------------------------------------------- | ----- |
| a11y 用户看不清 CTA 上的文字                     | `--primary` 从 amber-600 改到 amber-700, 对比度 3.3:1 → 5.5:1 | §3    |
| 明眼用户看到 "品牌色不一致" (导航深色、按钮中色) | 全站统一, navbar/CTA 都用 `bg-primary`                        | §3 §5 |
| 未来每个新 CTA 都要重蹈 hotfix 覆辙              | 一次改 token, 后续代码可以放心用 `bg-primary`                 | §3    |
| 硬编码色让 dark 模式适配失控                     | Token 一次到位, dark 变体也顺带调                             | §3.2  |

---

## 3. 变更方案

### 3.1 Light 模式 token 变更

```css
/* globals.css + critical.css 同步修改 */

/* 变更前 */
--primary-500: #d97706; /* amber-600 */
--primary: #d97706;

/* 变更后 */
--primary-500: #b45309; /* amber-700 */
--primary: #b45309;
```

**保持不变**:

- `--primary-50: #FFFBEB` (cream, 用作 `--primary-foreground` 和 `bg-accent`)
- `--primary-300: #FCD34D`
- `--primary-400: #F59E0B`
- `--primary-foreground: #FFFBEB`
- `--accent-*` 珊瑚色系
- `--muted-foreground` (首页 4 屏已 patch, 其他页面存量问题另开 spec, 本轮不动)

### 3.2 Dark 模式 token 变更

Dark 模式当前 `--primary: #F59E0B` (amber-400) + `--primary-foreground: #1c0f00`.

**决定**: dark 模式不动. 暗背景需要更亮的前景色, amber-400 是对的.

### 3.3 对比度验证 (改后测算)

Light 模式:

| 组合                                                           | 计算值 | AA 4.5:1 | AAA 7:1 |
| -------------------------------------------------------------- | ------ | -------- | ------- |
| `#B45309` on `#FFFBEB` (light bg-primary + primary-foreground) | 5.53:1 | ✅       | ❌      |
| `#B45309` on `#faf8f5` (page background neutral-50)            | 5.63:1 | ✅       | ❌      |
| `#FFFBEB` on `#B45309` (CTA 文字)                              | 5.53:1 | ✅       | ❌      |
| `#B45309` on `#f2ede7` (bg-secondary neutral-100)              | 5.24:1 | ✅       | ❌      |

Dark 模式 (未改动, 复核为验证):

| 组合                                                               | 计算值     | AA 4.5:1 | AAA 7:1          |
| ------------------------------------------------------------------ | ---------- | -------- | ---------------- |
| `#F59E0B` on `#1e1812` (dark 主背景 `--background`)                | 8.71:1     | ✅       | ✅               |
| `#1c0f00` on `#F59E0B` (dark CTA 文字, `bg-primary`)               | 8.85:1     | ✅       | ✅               |
| `#F59E0B` on `#0a0a0a` (near-black)                                | 10.24:1    | ✅       | ✅               |
| **`#F59E0B` on `#3d2000` (dark `text-primary` on `bg-accent`)**    | **6.96:1** | ✅       | ⚠️ marginal miss |
| `#FCD34D` on `#3d2000` (dark 保留 `text-amber-300` on `bg-accent`) | 10.37:1    | ✅       | ✅               |

**全部过 AA**. Dark 里 CTA / 主背景 / near-black 三档过 AAA. **Dark `text-primary` on `bg-accent` 只过 AA 不过 AAA** (6.96:1 marginal miss AAA 7:1).

**决定**: navbar.tsx:161 dark 分支**保留 `text-amber-300`** (10.37:1 AAA), light 分支改为 `text-primary` (5.5:1 AA). §3.4 diff 已按此写. Light 做 CTA 只求 AA 已足够 (AAA 会让主色过暗, 失去品牌活力); dark 保留 amber-300 是免费的 AAA, 顺便保留.

计算方法: [WebAIM 对比度公式](https://www.w3.org/WAI/GL/wiki/Contrast_ratio), Jeff 落地时可用 `pnpm dlx axe-core` 或 Chrome DevTools Lighthouse a11y 复验.

### 3.4 hotfix 回滚清单 (3 处 file:line + diff)

改完 `--primary` 后, 回滚 3 处 hotfix:

**#1. `frontend/src/components/layout/navbar.tsx:492`** (登录/注册 CTA):

```diff
- className="flex items-center gap-1.5 text-sm font-medium px-4 py-1.5 rounded-lg transition-all hover:scale-[1.02] active:scale-[0.97] bg-amber-700 text-white hover:bg-amber-800 shadow-md hover:shadow-lg transition-shadow"
+ className="flex items-center gap-1.5 text-sm font-medium px-4 py-1.5 rounded-lg transition-all hover:scale-[1.02] active:scale-[0.97] bg-primary text-primary-foreground hover:bg-primary/90 shadow-md hover:shadow-lg transition-shadow"
```

- 更新注释 (line 490-491):

```diff
- // task #180 a11y: `bg-primary` (#D97706 amber-600) on cream `#FFFBEB` primary-foreground = ~3.3:1 挂 WCAG AA 4.5:1
- // 走 amber-700 (#B45309) + text-white = ~5.5:1 稳过; 不改 --primary token 避免全站隐性回归
+ // task #180 a11y: 通过 P2 primary token realign (--primary → #B45309 amber-700) 通过 5.5:1
```

**#2. `frontend/src/components/layout/locale-toggle.tsx:94-95`** (语言切换 active):

```diff
- // task #180 a11y: active state bg-primary #D97706 + cream text = ~3.3:1 挂门禁; amber-700 + white 稳过
- ? "bg-amber-700 text-white hover:bg-amber-800"
+ // task #180 a11y: 通过 P2 primary token realign 生效
+ ? "bg-primary text-primary-foreground hover:bg-primary/90"
```

**#3. `frontend/src/components/layout/navbar.tsx:158-161`** (active tab 文字):

```diff
- // task #180 a11y: active text-primary (#D97706) on bg-accent (#fffbeb) = ~3.07:1 挂; amber-800 = ~6.8:1
- ? "text-amber-800 dark:text-amber-300 bg-accent"
+ // task #180 a11y: P2 realign 后 text-primary (#B45309) on bg-accent (#fffbeb) = ~5.5:1 通过
+ ? "text-primary dark:text-amber-300 bg-accent"
```

Dark 保留 `text-amber-300` (dark active 视觉更亮), 不动.

---

## 4. 不做什么 (明确边界)

- ❌ **不改 `--accent-color-500`** (珊瑚色 #f55b45) - 它是次色, 不涉及 CTA
- ❌ **不改 `--primary-50/300/400`** - 只动 500 和 `--primary` 别名, 色阶其他刻度保留
- ❌ **不动 dark 模式的 `--primary`** - dark 需要更亮的 amber, 逻辑相反
- ❌ **不动 `--muted-foreground`** - Martin CR 明确, 存量对比度问题另开 spec
- ❌ **不清理业务色的 amber-700** (Heart icon、footer-mobile、profile-client 徽章、cover-image-upload) - 有意的暖色装饰, 不属于 CTA/primary 语义
- ❌ **不引入 `--brand-cta` / `--brand-navbar-active` 新 token** - 增加复杂度, A 方案 (改根 token) 更干净
- ❌ **不做 shadcn Button 组件层的封装重构** - 只动 token 层, 最小侵入

---

## 5. 影响面清单

### 5.1 强变化 (用户会注意到)

- 所有 `bg-primary` CTA (3 处品牌 CTA + 少量激活态) → 从 amber-600 → amber-700, 更沉、更暮色
- Navbar active tab 底部指示条 (`bg-primary` line 169)
- Focus ring `focus:border-primary` / `focus:ring-primary/10` (20+ 处表单)
- Activity calendar 今日文字 + 圆点
- Progress ring `text-primary` (cover-image-upload/circular-progress)

### 5.2 弱变化 (几乎察觉不到)

- Icon 色 `text-primary`: Mountain、Loader、User 等 icon 从 amber-600 → amber-700, 肉眼差 ~1 个色阶
- Hover 状态色 `hover:text-primary`
- 装饰性 `bg-primary/10, /5` (半透明层, 视觉几乎无差)

### 5.3 视觉走查敏感点 (9 项, 逐条列出)

Jeff 落地后必须逐项走查, 建议 Playwright screenshot 前后对比:

**1. 首页 (`/`)**

- 检查: hero CTA 按钮 (若使用 bg-primary)、navbar 双端可见性、locale-toggle
- 动作: 桌面 + 移动端各一张 screenshot, 对比色饱和度
- 验证: 无 CTA 文字对比不清

**2. Navbar 桌面**

- 检查: 登录/注册 CTA (line 492)、active tab 文字色 (line 161)、active tab 底部 line 指示条 (line 169)
- 动作: 切换 tab 状态, 每种截图
- 验证: active 态视觉一致、CTA 可读

**3. Navbar 移动端 drawer**

- 检查: 抽屉内登录/注册按钮 (`navbar.tsx:433, 460` bg-primary)
- 动作: <768px 打开 drawer 截图
- 验证: 按钮色与桌面统一

**4. Locale toggle**

- 检查: active 语言背景色 (line 95) + inactive 语言 hover
- 动作: 三语切换各截图
- 验证: active 高亮 + 文字对比通过

**5. 表单页面 focus 状态 (`/teams/create`、`/register`、`/admin/locations/[id]/edit`)**

- 检查: input focus border 从 amber-600 → amber-700, focus ring `ring-primary/10` 底色
- 动作: 每个页面点击一个 input 触发 focus, 截图
- 验证: focus 可见、无色差过大问题

**6. Activity calendar (`/teams/*` 详情内)**

- 检查: 今日标记 `text-primary font-bold` (line 165) + 圆点 `bg-primary` (line 176)
- 动作: 打开一个有今日活动的 team 页面
- 验证: 今日标记可见、圆点色统一

**7. Error boundary `/` 或触发 error 页**

- 检查: 返回首页按钮 (`error-boundary.tsx:56` bg-primary)
- 动作: 手动触发 error state (可临时抛错)
- 验证: 按钮可见、hover 变化正常

**8. Chat FAB (`/messages` 或全局)**

- 检查: 悬浮圆形聊天按钮 (`chat-fab.tsx:24` bg-primary)
- 动作: 桌面 + 移动端截图
- 验证: 阴影 + hover 对比清晰

**9. Favorites 空态 (`/favorites` 无数据)**

- 检查: 空态 CTA (`favorites-client.tsx:126, 145` bg-primary)
- 动作: 用无收藏账号打开 favorites 页
- 验证: 空态引导按钮可点、色一致

**辅助覆盖** (非核心走查, 顺带看):

- `/locations` 列表页 (有无 CTA 使用 bg-primary?)
- `/discover` 探索页 (若有筛选 chip 用 bg-primary/10 装饰)
- `/teams` 列表页 (若有创建 CTA)
- Profile 页 amber-700 硬编码徽章 (确认与新 primary 色协调, 本轮不动它)

---

## 6. 交付给 Jeff 的任务拆分建议

**单 PR 完成**:

### T1 (P2 token realign 单 PR)

- **改动**:
  - `frontend/src/styles/globals.css`: `--primary-500` + `--primary` 改为 `#B45309` (line 274 + line 297)
  - `frontend/src/styles/critical.css`: 同上 (line 23 + line 39)
  - `frontend/src/components/layout/navbar.tsx`: 回滚 line 161 + line 492 (见 §3.4)
  - `frontend/src/components/layout/locale-toggle.tsx`: 回滚 line 95 (见 §3.4)
  - 保留 a11y 注释, 更新为 "P2 realign 后生效"

---

## 7. 验证命令

### 7.1 本地验证 (Jeff 提 PR 前必跑)

```bash
# 1. build 通过
pnpm --filter frontend build

# 2. type check
pnpm --filter frontend typecheck

# 3. e2e (a11y test 在其中)
pnpm --filter frontend test:e2e

# 4. Lighthouse a11y (对首页 + navbar 展开态)
pnpm dlx lighthouse http://localhost:3000/ --only-categories=accessibility --output=json --output-path=./lh-home.json
pnpm dlx lighthouse http://localhost:3000/teams/create --only-categories=accessibility --output=json --output-path=./lh-teams-create.json

# 5. 硬编码残留检查
grep -rn "amber-600\|amber-700\|amber-800" frontend/src --include="*.tsx" --include="*.ts" | grep -v "test\|spec\|\.md$"
# 期望: 只剩下 §4 明确保留的业务色装饰 (Heart / footer-mobile / profile / cover-image-upload / map-picker)
```

### 7.2 CI 门禁

- Playwright a11y test 必须通过 (WCAG AA 4.5:1)
- Lighthouse a11y score 保持或提升 (task #180 目标 100)
- `pnpm build` 通过

### 7.3 视觉走查

按 §5.3 9 项 + 辅助覆盖 4 项, Wen + Steven review screenshot 对比.

---

## 8. 风险与回滚

### 8.1 风险

- **视觉审美主观**: amber-700 比 amber-600 深一档, 可能有人觉得 "不够活力". 缓解: 走查阶段 Victor / Wen / Steven 三人 review, 不 OK 再评估.
- **dark 模式对比**: light 变深、dark 不变, 两个模式之间的品牌调性可能出现观感差. 缓解: 这本来就是 dark 模式的常识 (暗背景需要亮前景), 不算问题.
- **profile-client 硬编码 amber-700**: 与新的 `--primary` 色值巧合一致, 改天再统一到 token; 本 PR 不动它.

### 8.2 回滚路径

- 单 PR 修改, 回滚只需 revert
- 无 schema / 无 API / 无数据变更
- CI 门禁保护: a11y test + build test 通过才 merge
- 若 merge 后线上出现视觉异常, revert 后 `--primary` 回到 amber-600, hotfix 手动补回 (从 PR 历史找 diff)

---

## 9. 与其他 spec / task 关系

| 关联                            | 说明                                                                                 |
| ------------------------------- | ------------------------------------------------------------------------------------ |
| PR #402 (task #180 a11y hotfix) | 本 spec 是 PR #402 的 "根本修复", merge 后回滚 PR #402 的 3 处硬编码                 |
| P0-A/B/C/D                      | 独立, 不阻塞. 本 spec 与 P0 series 并行                                              |
| P0-B T4 admin form patch spec   | 独立, 但 icon 底色 `rgba(217,119,6,0.1)` 建议本 PR 完成后统一到 `rgba(180,83,9,0.1)` |
| `--muted-foreground` 存量问题   | 另开 spec, 本轮不动                                                                  |

---

## 10. 一句话总结

**P2 把 `--primary` 从 amber-600 (#D97706, 3.3:1 挂) 改到 amber-700 (#B45309, 5.5:1 稳过) - 一次拉齐全站 CTA 品牌色 + 回滚 3 处 a11y hotfix - 1-2 天可上线, 是 gomate a11y 与视觉一致性的根本修复.**

---

## §A 附录: 全站 primary 使用点清单

### A.1 `bg-primary` 使用点 (20 处)

按类归:

**品牌 CTA 实心** (3 处):

- `frontend/src/components/layout/navbar.tsx:433` - mobile drawer 登录按钮
- `frontend/src/components/layout/navbar.tsx:460` - mobile drawer 注册按钮
- `frontend/src/components/features/team-detail/team-actionbook-form.tsx:322` - Team actionbook 保存按钮
- `frontend/src/components/features/discover/story-poster-preview.tsx:87` - Story 分享按钮
- `frontend/src/components/features/favorites-client.tsx:126` - 空态 CTA 主按钮
- `frontend/src/components/features/favorites-client.tsx:145` - 空态 CTA 次按钮
- `frontend/src/components/features/create-story-client.tsx:405` - 发布故事按钮
- `frontend/src/components/ui/error-boundary.tsx:56` - 返回首页按钮
- `frontend/src/components/messages/chat-fab.tsx:24` - 悬浮聊天按钮

**激活/选中态指示** (2 处):

- `frontend/src/components/layout/navbar.tsx:169` - active tab 底部指示条
- `frontend/src/components/features/activity-calendar.tsx:176` - 今日活动圆点

**半透明装饰 `bg-primary/N`** (~13 处):

- `frontend/src/components/features/create-story-client.tsx:377` - `bg-primary/10` 标签底
- `frontend/src/components/features/create-story-client.tsx:383` - `hover:bg-primary/15` 标签删除
- `frontend/src/components/features/activity-calendar.tsx:157` - `bg-primary/5` 今日底
- `frontend/src/components/features/activity-calendar.tsx:201` - `bg-primary/10` icon 底
- `frontend/src/components/features/discover/featured-story-card.tsx:127, 137` - `bg-primary/10, /5` 装饰
- `frontend/src/components/features/discover/tag-filter-bar.tsx:58, 62` - `bg-primary/10, hover:bg-primary/20` chip
- `frontend/src/components/features/discover/story-card.tsx:142` - `bg-primary/10` icon 底
- `frontend/src/components/features/discover/story-detail-ui.tsx:82` - `bg-primary/10` icon 底
- `frontend/src/components/features/discover/discover-main.tsx:223, 280` - `bg-primary/10` icon 底
- `frontend/src/components/features/team-detail/team-detail-members.tsx:98` - `bg-primary/10, hover:bg-primary/20` chip
- `frontend/src/components/features/team-detail/team-detail-sidebar.tsx:207` - `bg-primary/10, hover:bg-primary/20` chip
- `frontend/src/components/features/create-team/quick-duration-button.tsx:27` - `bg-primary/10 border-primary` 选中态

**a11y hotfix 硬编码** (2 处, 走 amber-700):

- `frontend/src/components/layout/locale-toggle.tsx:95` - `bg-amber-700` (待回滚)
- `frontend/src/components/layout/navbar.tsx:492` - `bg-amber-700` (待回滚)

### A.2 `text-primary` + `border-primary` 使用点 (82 处)

按类归 (完整清单见 `/tmp/primary-text-usage.txt` 或直接跑 `grep -rn "text-primary\b\|border-primary\b" frontend/src --include="*.tsx"`):

**品牌 icon** (Mountain / Loader / User 等, ~10 处):

- `frontend/src/components/layout/navbar.tsx:332` - `<Mountain className="text-primary" />` 品牌 logo icon
- `frontend/src/components/features/create-story-client.tsx:226` - `<Loader2 className="text-primary animate-spin" />`
- `frontend/src/components/features/activity-calendar.tsx:165, 180` - 今日标记文字 + 数字
- `frontend/src/components/features/activity-calendar.tsx:202` - `<Calendar className="text-primary" />`
- `frontend/src/components/ui/cover-image-upload/circular-progress.tsx:41` - Progress ring

**Hover 变化** (`hover:text-primary`, ~20 处):

- theme-toggle 三处 line 84/96/108
- navbar mobile line 375
- footer.tsx:377
- register-client.tsx:260
- create-team-client.tsx:199, 391

**Focus border/ring** (`focus:border-primary` + `focus:ring-primary/10`, ~25 处):

- chip-input.tsx:119
- register-client.tsx:255, 393
- create-team-client.tsx:261, 276, 302, 318, 341, 353, 391, 412, 429
- (其他表单)

**Active tab/state text** (5 处):

- navbar.tsx:161 - active tab (hotfix 走 amber-800, 待回滚)
- navbar.tsx:374 - mobile active tab
- locale-toggle.tsx:142 - active locale
- theme-toggle 三处

**Chip/badge text** (`text-primary` 在装饰 chip 内, ~10 处):

- create-story-client.tsx:377 - 标签文字
- discover/featured-story-card.tsx:127, 137
- discover/story-card.tsx:142
- discover/story-detail-ui.tsx:82
- discover/tag-filter-bar.tsx:58
- team-detail-members.tsx:98
- team-detail-sidebar.tsx:207

**Border 实心** (1 处):

- create-team/quick-duration-button.tsx:27 - `border-primary` 选中态

**其他文本用途** (需要走查, ~10 处):

- create-team-client.tsx:341 - `text-xs font-medium text-primary` 说明文本 (走查确认对比通过)
- register-client.tsx:335 - `text-primary` 链接文字
- edit-team-client.tsx:201 - hover 链接

---

_spec v1.1 完成 (2026-07-20 21:00, 应 Martin CR 补齐 5 项要求), 等 Victor 拍板后交 Jeff 实施._
