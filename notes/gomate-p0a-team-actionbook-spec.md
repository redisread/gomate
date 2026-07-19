# gomate P0-A：Team 行动本设计规范 v1.1

> 需求：@Victor 2026-07-19 DM（认同「主题另一半」判断后要求推进）
> 依据：`notes/gomate-ux-experience-analysis.md` §P0-1
> 设计者：@Steven
> 范围：Team 详情页 `/teams/[id]`（改造）、Team 创建/编辑页 `/teams/create` `/teams/[id]/edit`（表单扩展）、Team 成员卡片（增加身份信号）
> 交付给：Martin 拆任务
>
> **v1.1 变更**（2026-07-19 Martin CR）：
>
> 1. Assignment 加 `id: string` 防并发漂移（认领接口按 id 定位，不用 index）
> 2. `assigneeId?: string` → `assigneeIds: string[]`（支持多人认领同一任务）
> 3. `hikesCount` 直接用 `users.completedHikes`（去掉 team_members COUNT 派生路径）
> 4. T4 显式加 `users.city` migration
> 5. T5 通知钩子合并进 T1，最终 4 任务拆分（T1+T5 / T2 / T3 / T4）

---

## 0. 目标

**把 Team 从「知道有几个人报名」升级为「明天要一起去的一次真实行动」。**

用户加入队伍后 3 秒内能回答：**明天几点在哪、怎么去、带什么、队友是谁**。

这不是加功能，是把「组队产品的核心价值段」从空白填上。

---

## 1. 顾客损失 → 设计对应

| 顾客损失（用户勉强接受的现实） | 设计对应                                       | §    |
| ------------------------------ | ---------------------------------------------- | ---- |
| 「集合点在哪？」               | Team 详情页加**行动 checklist**「集合」区块    | §3.1 |
| 「几点集合？」                 | 已有 `startTime` 字段，突出显示 + 加倒计时     | §3.2 |
| 「怎么去？」                   | checklist「交通」区块，队长填写                | §3.1 |
| 「带什么？」                   | checklist「装备」区块，队长勾选装备清单        | §3.1 |
| 「谁开车？谁带水？」           | checklist「分工」区块，队员可认领              | §3.1 |
| 「临时改期能收到通知吗？」     | 通知机制（P1，本 spec 不含实现，只留数据钩子） | §7   |
| 「队友是谁？」                 | 队友卡片加**最少身份信号**                     | §4   |

---

## 2. 数据结构

### 2.1 `teams` 表新增字段

```ts
// api/src/db/schema.ts - teams 表加：
checklist: text("checklist", { mode: "json" }).$type<TeamChecklist>();
// null = 队长未填；非空 = JSON 结构见下
```

**为什么用单个 JSON 字段而不是新建 checklist 子表**：

- checklist 是 team 的**一部分**，不是独立实体（不需要跨 team 查询）
- 内容大小可控（<2KB）
- D1 batch 写入更简单
- 未来加字段不需要 migration

### 2.2 `TeamChecklist` 类型

```ts
// packages/types 或 api/src/db/schema.ts
export type TeamChecklist = {
  // 集合信息
  meetingPoint?: {
    name: string; // "地铁 4 号线福田口岸 A 出口"
    time?: string; // "07:30"（可选，如果与 startTime 不同）
    note?: string; // "不见不散，迟到 15 分钟不等"
  };

  // 交通方案
  transport?: {
    mode: "自驾" | "公交地铁" | "包车" | "其他";
    detail?: string; // "有 3 辆车，可拼车。开车联系队长"
  };

  // 装备清单（分级）
  gear?: {
    essential: string[]; // 必带 ["登山鞋", "2L 水", "防晒霜"]
    optional: string[]; // 选带 ["登山杖", "护膝"]
    note?: string; // "队伍备医药包，无需自带"
  };

  // 分工认领
  assignments?: Array<{
    id: string; // v1.1: 稳定 id（server 生成 or client uuid），防并发漂移
    task: string; // "带急救包"
    assigneeIds: string[]; // v1.1: 多人认领；默认 []；每人对同一 assignment 只出现一次
  }>;

  // 其他约定（自由文本）
  notes?: string; // "有小孩队员，请注意节奏"
};
```

### 2.3 分工认领的独立更新路径

分工（assignments）需要队员**自助认领**，不能只让队长编辑整个 checklist。设计两条路径：

- **队长**：`PUT /teams/:id/checklist` — 覆盖式更新整个 checklist（含 assignments 的 task 列表）。**已有 assignment 必须保留其 id**；新增的 assignment 缺失 id 时 server 自动补 uuid v4
- **队员**：`POST /teams/:id/checklist/assignments/:assignmentId/claim` — 把自己加入指定 assignment 的 assigneeIds（幂等：重复调用不重复加）
- **队员**：`DELETE /teams/:id/checklist/assignments/:assignmentId/claim` — 把自己从 assigneeIds 移除（幂等：已不在时返回 204）

**权限**：认领接口只允许已加入队伍的成员操作，只能加/移自己的 userId（不能替别人认领）。服务端负责 assigneeIds 去重。

**并发防漂移**：使用 assignmentId 而非 index 定位——队长在队员认领的同时编辑顺序/删除项，不会导致队员认领到错误任务。若 assignmentId 已被队长删除，认领接口返回 404。

---

## 3. Team 详情页改造

### 3.1 「行动本」区块整体结构

在现有 team-detail 的**主内容区顶部**（描述之上）插入新区块「行动本」：

```
┌─ 行动本 ─────────────────────────────┐
│                                       │
│  ⏱ 明天 07:30  |  距集合 14 小时 23 分  │  ← §3.2 集合时刻
│                                       │
│  📍 地铁 4 号线福田口岸 A 出口         │  ← §3.3 集合点
│  不见不散，迟到 15 分钟不等             │
│                                       │
│  🚙 交通：自驾  |  3 辆车可拼          │  ← §3.4 交通
│                                       │
│  🎒 装备清单                           │  ← §3.5 装备
│    必带：登山鞋 · 2L 水 · 防晒霜         │
│    选带：登山杖 · 护膝                  │
│    队伍备医药包，无需自带                │
│                                       │
│  🤝 分工                               │  ← §3.6 分工
│    带急救包 · @Alice ✓                  │
│    带炉子 · [认领]                     │
│    开车 · @Bob ✓ · @Carol ✓             │
│                                       │
│  📝 其他约定                           │  ← §3.7 notes
│    有小孩队员，请注意节奏                │
│                                       │
└───────────────────────────────────────┘
```

**未填写时的空态**（关键，队长视角）：

```
┌─ 行动本 ─────────────────────────────┐
│                                       │
│  ⏱ 周六 07:30  |  距集合 3 天           │
│                                       │
│  行动本还没填。集合点在哪？带什么？        │
│  队员想知道这些。填一次，一劳永逸。        │
│                                       │
│         [ 完善行动本 → ]                │
│                                       │
└───────────────────────────────────────┘
```

**未填写时的空态**（队员视角）：

```
┌─ 行动本 ─────────────────────────────┐
│                                       │
│  ⏱ 周六 07:30  |  距集合 3 天           │
│                                       │
│  队长还没填写行动本。可以留言催队长。       │
│                                       │
└───────────────────────────────────────┘
```

**未加入队伍的访客视角**：

```
┌─ 行动本 ─────────────────────────────┐
│                                       │
│  ⏱ 周六 07:30                          │
│                                       │
│  加入队伍后可查看集合点、装备清单和分工。   │
│                                       │
└───────────────────────────────────────┘
```

（访客只看到时间，不看到具体地点/装备。避免队伍隐私和 SEO 泄露。）

### 3.2 集合时刻（Countdown）

- 显示格式：**「明天 07:30」/「周六 07:30」/「7 月 26 日 07:30」**
  - 24 小时内：「明天 07:30」/「今天 20:00」
  - 一周内：「周六 07:30」
  - 超过一周：「7 月 26 日 07:30」
- 副标题倒计时：**「距集合 14 小时 23 分」**
  - 24 小时内更新到分钟
  - 24 小时外只显示「距集合 3 天」
  - 已过 startTime：「已开始 · 2 小时前」
  - startTime 24 小时后：整个区块折叠为「已结束」
- 视觉：**主标题 `text-2xl font-bold`**，倒计时 `text-sm text-muted-foreground`
- **不闪烁不动画**，静态显示（我知道倒计时会诱惑做动效，忍住）

### 3.3 集合点（meetingPoint）

- 图标 📍 + 名称 `text-base font-medium`
- note 换行显示，`text-sm text-muted-foreground`
- 长按/点击复制地址到剪贴板 → toast「已复制」
- 名称支持 amap 深链：如果内容像地址（包含「路/号/口/站」），加个「在地图打开」小图标（P1，本 spec 不阻塞）

### 3.4 交通（transport）

- 图标 🚙 + `mode` 徽章（自驾/公交地铁/包车/其他）+ `detail` 一句话
- 如果 mode = "自驾" 且有拼车信号（detail 含「拼车」「拼」），显示突出一点
- 未填写：本区块不渲染（不占空间）

### 3.5 装备（gear）

- 图标 🎒 + 标题「装备清单」
- 必带：`text-foreground`，装备之间用「·」分隔
- 选带：`text-muted-foreground` 次一档
- note：换行显示
- **不是 checkbox**——不做「用户勾选自己带了什么」这种设计，那是任务感，不是行动感

### 3.6 分工（assignments）

- 图标 🤝 + 标题「分工」
- 每项一行：`task · 已认领用户` 或 `task · [认领] 按钮`
- 已认领：显示 @用户名 + ✓，多个认领用 `·` 分隔（如「开车 · @Bob ✓ · @Carol ✓」表示同一任务两人认领）
- 未认领的任务：**「[认领]」按钮**（品牌色，btn-secondary 小号）
- 队员可认领同一任务多次（多人认领），但每人对同一 task 只能认领一次
- 已认领后按钮变为「[取消认领]」，仅自己可见/可点
- 队长视角：能看到「⋯ 」菜单可编辑 task 列表（跳转到编辑页）

### 3.7 其他约定（notes）

- 图标 📝 + 标题「其他约定」+ 自由文本
- 支持基础 markdown（换行、链接、加粗），不支持图片/复杂结构
- 未填写：本区块不渲染

---

## 4. 队友身份信号（成员卡片）

现状：Team 详情页成员列表只显示头像 + 名字。

改造：每个成员卡片加**最少身份信号**，让队员之间不是「陌生的头像」。

```
┌─ 成员 ──────────────────────────────┐
│                                       │
│  [头像] @Alice   队长                  │
│  深圳 · 徒步 12 次 · 上次去了梧桐山     │
│                                       │
│  [头像] @Bob    队员                  │
│  深圳 · 徒步 3 次                     │
│                                       │
│  [头像] @Carol   队员（新人）          │
│  深圳 · 首次徒步                      │
│                                       │
└───────────────────────────────────────┘
```

**字段来源**（v1.1）：

- **城市**：`users.city`（**当前 schema 不存在，需要在 T4 加 `city: text("city")` nullable migration**）。缺省时城市字段不占位（保持行高一致，「深圳 · 徒步 3 次」→「徒步 3 次」）
- **徒步次数**：`users.completedHikes`（schema.ts:28 已有字段，default 0）。**不再派生自 team_members COUNT**——避免与已有字段打架。MVP 老用户可能都是 0，全显示「首次徒步」是真实数据，不掩盖；等真正的「完成徒步」流程立项后再决定谁写 completedHikes
- **上次去过**：最近一次 `teams.status = completed` 且 userId 在 team_members 里的 team → `location.name`（如果无则不显示）
- **首次徒步**：`users.completedHikes = 0` → 显示「首次徒步」（新人 badge，帮老手识别）

**权限**：

- 未加入队伍的访客只看到头像 + 名字，看不到身份信号
- 队员之间互相可见
- 个人隐私开关（P1）：user.showHikeStats（默认开，允许关闭）

**视觉**：

- 队长 badge：`bg-primary/10 text-primary` 小徽章
- 新人 badge：`bg-emerald-50 text-emerald-700` 小徽章
- 身份信号一行：`text-xs text-muted-foreground`，字段之间用「 · 」分隔

---

## 5. 队长编辑页

在现有 `/teams/[id]/edit` 页面**新增「行动本」tab / 折叠区**（不改现有基础字段）：

```
┌─ 队伍基本信息 ─────────┐   ← 现有
│  标题 / 描述 / 时间 / ...  │
└─────────────────────────┘

┌─ 行动本 [新] ──────────┐   ← 新增
│                          │
│  📍 集合点               │
│    [地点名 input]         │
│    [备注 textarea]        │
│                          │
│  🚙 交通方式             │
│    [自驾 ▾]              │
│    [详情 input]           │
│                          │
│  🎒 装备清单             │
│    必带（回车添加）：      │
│      [登山鞋] [x] [2L 水] [x] ...│
│    选带：                  │
│      [登山杖] [x] ...      │
│    [备注 textarea]         │
│                          │
│  🤝 分工（可选）          │
│    + 添加任务             │
│    [带急救包] [删除]       │
│    [带炉子] [删除]         │
│                          │
│  📝 其他约定              │
│    [textarea markdown]    │
│                          │
│  [ 保存行动本 ]           │
│                          │
└─────────────────────────┘
```

- **保存按钮独立**，不与基本信息保存混淆——队长可能只想改行动本而不动基本信息
- **草稿即时保存**（onBlur 或 debounce 3s）：避免队长填一半页面刷新丢失
- **装备/分工用 chip 输入**（回车/逗号分隔添加），不用 textarea
- **交通 mode 是 select**，detail 是 optional input
- **表单元素以现有共享套件为准**（`form-input.tsx` / `form-textarea.tsx`），不新造

---

## 6. Team 创建流程改动

**决策：创建时不强制填 checklist**。

理由：

- 组队最重要的是先拉起队伍，让人报名——checklist 是拉起来之后的事
- 强制填 = 增加创建摩擦 = 减少组队数
- 未填 checklist 的空态设计（§3.1）已经引导队长后续补充

创建页**不加**行动本字段。创建成功后跳转到详情页，队长视角自动展示「完善行动本」空态引导。

---

## 7. 通知钩子（P1 预留，本 spec 不实现）

数据侧留通知触发钩子，但**本 spec 不实现推送渠道**（Web Push / 小程序订阅消息需要 P1 单独立项）。

**钩子事件**：

- `checklist.updated`：队长更新 checklist → 通知所有已加入成员（P1）
- `assignment.claimed`：某队员认领分工 → 通知队长（P1）
- `team.starting_soon`：startTime - 24h → 触发「明天见」推送（P1，见 UX 分析 §4.1）
- `team.completed`：startTime + endTime 之后 6h → 触发「今日短复盘」推送（P1，见 UX 分析 §4.2）

**当前 spec 交付**：以上事件只需在业务层预留 emit 点（可以是空函数或 console.log），不需要接入真实推送渠道。

---

## 8. i18n

新增 i18n keys（zh/en/ja 三语言）：

```
team.actionbook.title = "行动本" / "Action Book" / "行動本"
team.actionbook.empty.leader = "行动本还没填。..." / "..." / "..."
team.actionbook.empty.member = "队长还没填写行动本。..."
team.actionbook.empty.visitor = "加入队伍后可查看..."
team.actionbook.cta.complete = "完善行动本" / "Complete action book" / "行動本を完成させる"

team.actionbook.meeting.title = "集合点"
team.actionbook.transport.title = "交通"
team.actionbook.transport.mode.self_drive = "自驾" / "Self-drive" / "自家用車"
team.actionbook.transport.mode.public = "公交地铁" / "Public transit" / "公共交通"
team.actionbook.transport.mode.charter = "包车" / "Charter" / "チャーター"
team.actionbook.transport.mode.other = "其他" / "Other" / "その他"
team.actionbook.gear.title = "装备清单"
team.actionbook.gear.essential = "必带" / "Essential" / "必携"
team.actionbook.gear.optional = "选带" / "Optional" / "任意"
team.actionbook.assignments.title = "分工"
team.actionbook.assignments.claim = "认领" / "Claim" / "引き受ける"
team.actionbook.assignments.unclaim = "取消认领" / "Unclaim" / "取り消す"
team.actionbook.notes.title = "其他约定" / "Other notes" / "その他"

team.countdown.tomorrow = "明天 {time}" / "Tomorrow {time}" / "明日 {time}"
team.countdown.today = "今天 {time}" / "Today {time}" / "今日 {time}"
team.countdown.weekday = "{weekday} {time}"  # 周六 07:30 / Sat 07:30 / 土曜 07:30
team.countdown.date = "{month}月{day}日 {time}" / "{month}/{day} {time}" / "{month}月{day}日 {time}"
team.countdown.remaining_minutes = "距集合 {h} 小时 {m} 分" / "{h}h {m}m to go" / "集合まで {h} 時間 {m} 分"
team.countdown.remaining_days = "距集合 {d} 天" / "{d} days to go" / "集合まで {d} 日"
team.countdown.started = "已开始 · {n} 小时前" / "Started · {n}h ago" / "開始済み · {n} 時間前"
team.countdown.ended = "已结束" / "Ended" / "終了"

team.member.leader_badge = "队长" / "Leader" / "リーダー"
team.member.newcomer_badge = "新人" / "New" / "新人"
team.member.first_hike = "首次徒步" / "First hike" / "初参加"
team.member.hikes_count = "徒步 {n} 次" / "{n} hikes" / "{n} 回参加"
team.member.last_visited = "上次去了 {location}" / "Last visit: {location}" / "前回: {location}"
```

**ja 文案纪律**：badge 用自然紧凑日文（「新人」不是「新参メンバー」）；分隔符用「・」。

---

## 9. 页面性能与实现约束

- **checklist 数据随 team 详情页初始 SSR 一起返回**，不做二次 fetch（避免视觉抖动）
- **倒计时用客户端 island** 独立更新，服务端 SSR 用「静态时刻」渲染防止 hydration mismatch
- **认领操作走 optimistic UI**：点击后立即更新，失败回滚 + toast 报错
- **checklist 未填时不显示「行动本」区块的详细字段**，只显示空态卡片，避免 layout 抖动
- **图标用 lucide-react**（现有依赖）：MapPin / Car / Backpack / Users / Notebook / Clock（emoji 只在文档演示，实际用 icon）

---

## 10. 交付给 Martin 的任务拆分建议（v1.1）

**v1.1 收敛为 4 个任务**（T5 通知钩子合并进 T1）：

### T1：schema + API + 通知钩子（后端基础，含 T5 合并）

- **改动**：
  - `api/src/db/schema.ts`：teams 表加 `checklist` JSON 字段
  - `packages/types`：`TeamChecklist` 类型（含 assignment.id + assigneeIds[]）
  - `api/src/routes/teams/`：
    - `PUT /:id/checklist` — 队长覆盖式更新；已有 assignment 保留 id，新增项 server 补 uuid v4
    - `POST /:id/checklist/assignments/:assignmentId/claim` — 幂等加自己入 assigneeIds
    - `DELETE /:id/checklist/assignments/:assignmentId/claim` — 幂等移自己出 assigneeIds
  - `api/src/routes/teams/queries.ts`：GET team 详情 include checklist
  - drizzle migration（新增字段，无 drop，风险低）
  - **通知钩子**（合并 T5）：在关键点 emit 空事件 + payload 类型定义在 `packages/types`
    - `checklist.updated`：payload `{ teamId, actorUserId, timestamp }`
    - `assignment.claimed` / `assignment.unclaimed`：payload `{ teamId, assignmentId, actorUserId, timestamp }`
    - `team.starting_soon`：定时任务触发点，payload `{ teamId, startTime, timestamp }`
    - `team.completed`：定时任务触发点，payload `{ teamId, timestamp }`
    - 实现层空函数或 `console.log`，接入推送渠道 P1 单独立项
- **验收**：
  - 认领接口权限（未加入 403、只能操作自己）、幂等性（重复调用不重复加/不报错）
  - 并发场景：队长删除某 assignment 的同时队员认领 → 队员收到 404
  - 事件 emit：单元测试确认关键路径都触发、payload 完整

### T2：Team 详情页「行动本」渲染（前端主要工作量）

- **依赖**：T1
- **改动**：
  - `frontend/src/components/features/team-detail/`：新增 `team-actionbook-section.tsx`
  - **countdown 必须独立 island**（防 hydration mismatch）——服务端 SSR 用静态时刻，客户端 island 独立更新
  - 其余 5 个区块（meeting/transport/gear/assignments/notes）可以合并进 section 内部 render 函数或轻量子组件，**具体拆分粒度留给 Jeff**
  - 认领/取消按钮的 optimistic UI + toast 错误回滚
  - 三种空态：队长 / 队员 / 访客
- **验收**：
  - 三种空态渲染正确
  - 倒计时无 hydration mismatch（跨天、跨周、已开始、已结束四种状态）
  - 认领动作在弱网下不抖（optimistic + 失败回滚 + toast）
  - i18n 三语言不溢出

### T3：队长编辑页「行动本」表单

- **依赖**：T1
- **改动**：
  - `frontend/src/pages/teams/[id]/edit.tsx`：新增行动本 tab / 折叠区
  - 装备/分工 chip 输入组件（建议抽 `chip-input.tsx` 共用组件）
  - 保存按钮独立于基本信息，草稿 debounce（3s onBlur）
  - 表单元素以现有共享套件 `form-input.tsx` / `form-textarea.tsx` 为准
- **验收**：
  - 填一半刷新不丢内容（草稿保存）
  - chip 输入的键盘无障碍（Enter 添加、Backspace 删除末项）
  - 分工新增/删除时 id 处理正确（前端可先用 crypto.randomUUID()，server PUT 时统一）

### T4：成员卡片身份信号 + users 表 city 字段

- **依赖**：无（可并行 T1）
- **改动**：
  - `api/src/db/schema.ts`：**users 表加 `city: text("city")` nullable**
  - drizzle migration（新增字段，独立于 teams.checklist migration，风险低）
  - `api/src/routes/teams/queries.ts`：team 成员 join 补充 `completedHikes`（从 users 表读，不重新算）+ `lastLocation`（最近 completed team 的 location.name）
  - `frontend/src/components/features/team-detail/team-detail-members.tsx`：卡片加身份信号一行 + 队长/新人 badges
  - 隐私开关 `user.showHikeStats`（P1 延后，MVP 默认全开）
- **验收**：
  - completedHikes = 0 显示「首次徒步」
  - 访客只看到头像名字
  - city 缺省时字段不占位（行高不抖）
  - 老用户 completedHikes 全 0 → 全显示「首次徒步」是可接受的（真实数据）

**推荐执行顺序**：

- Phase 1（并行）：**T1（含 T5）+ T4**（后端两个独立 migration + 后端 join 补充可以同步推进）
- Phase 2（并行）：**T2 + T3**（都依赖 T1）

---

## 11. 验收标准（回到用户损失）

用户视角三个测试：

1. **加入队伍后 3 秒内**能在 Team 详情页看到「明天几点、在哪、怎么去、装备、队友是谁」
2. **队长编辑行动本**从空到填完的流程在 2 分钟内可完成（不装备可以先不填）
3. **未加入的访客**打开链接只看到时间概览，看不到集合点等具体信息

Wen 测试用例覆盖：

- checklist 从空到填满的完整流程（队长视角）
- 三种空态（访客 / 队员 / 队长）
- 分工认领的并发（两人同时点认领同一任务）
- 倒计时在跨天、跨周、已开始、已结束四种状态的显示
- ja / en / zh 三语言的文案不溢出

---

## 12. 不做什么（明确边界）

- ❌ 不做群聊 / IM——checklist 是取代群聊需求的第一步，用户想聊天可以走队伍内评论（另一个 spec）
- ❌ 不做 GPS 打卡 / 签到——不是本 spec 范围
- ❌ 不做「装备勾选自己带了什么」——那是任务感，不是行动感
- ❌ 不做多种通知渠道选择——P1 单独立项，本 spec 只留钩子
- ❌ 不做多路线 / 路径推荐——「地点即一切」的简化定稿已经关闭这个方向

---

## 13. 一句话总结

**这个 spec 把 Team 从「知道有几个人报名」升级为「明天要一起去的一次真实行动」——通过一份可编辑的 checklist（集合/交通/装备/分工/约定）+ 成员的最少身份信号，把组队产品的核心价值段（组队后发生的事）从空白填上。**

---

_spec 完成，等 Victor 拍板后提 Martin 拆任务。_
