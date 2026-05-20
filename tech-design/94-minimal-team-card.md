# Issue #94 极简活动卡片技术方案（修正版）

## 背景
产品方案评审已通过，P1 范围已对齐。本方案为纯前端改造，无 API 变更。

---

## P1 范围

### 交付物
1. 列表卡片信息层级统一（首页 + 地点页）
2. 进度条颜色分级（按 fillRatio）
3. 行动文案（按优先级规则）
4. 详情页队长基础信息卡（复用现有 LeaderCard，调整信息展示）
5. 详情页成员头像矩阵（复用现有 `MemberAvatarGrid`，展示前 8 个）

### 不做（P2）
- leaderStats 队长信任点统计
- 列表页成员头像堆叠
- API 变更

---

## 行动文案优先级（最终版）

```typescript
function getUrgencyLabel(team: Team, t: TFunction): string {
  const { status, currentMembers, maxMembers, date } = team;

  // 1. 终态（优先级最高，在防御之前）
  if (status === 'cancelled') return t('teams.statusCancelled');
  if (status === 'completed') return t('teams.statusEnded');

  // 2. 已满员
  if (status === 'full') return t('teams.statusFull');

  // 3. 已组建
  if (status === 'formed') return t('teams.statusFormed');

  // 防御：maxMembers <= 0 时显示「名额不限」
  if (maxMembers <= 0) return t('teams.unlimitedSpots'); // "名额不限"
  
  const fillRatio = currentMembers / maxMembers;

  // 4. 时间紧迫性（仅 recruiting 状态）
  const daysUntil = getDaysUntilStart(t, date).days;
  if (daysUntil === 0) return t('teams.departToday');
  if (daysUntil === 1) return t('teams.departTomorrow');
  if (isThisWeekendBeijing(date)) return t('teams.thisWeekend'); // 本周六/日

  // 5. 人数紧迫
  if (fillRatio >= 0.8) return t('teams.almostFull');

  // 6. 默认（remaining 非负约束）
  const remaining = Math.max(maxMembers - currentMembers, 0);
  return t('teams.spotsLeft', { count: remaining });
}
```

---

## 进度条颜色规则

| fillRatio | 状态 | 颜色 |
|-----------|------|------|
| cancelled/completed | 终态 | stone/neutral（禁用态） |
| < 50% | 充裕 | stone（中性） |
| 50-80% | 活跃 | amber（琥珀） |
| >= 80% | 紧迫 | red（红色） |
| full | 已满 | red + 脉冲动画 |

**注意**：终态队伍不按 fillRatio 染色，统一使用 neutral/disabled 样式。

---

## fillRatio 计算（防御性）

```typescript
function getFillRatio(current: number, max: number): number {
  if (max <= 0) return 0;
  return Math.min(Math.max(current / max, 0), 1); // clamp 到 0..1
}
```

---

## 时间判断（复用现有逻辑）

复用 `frontend/src/components/features/teams/constants.tsx` 中的 `getDaysUntilStart` 函数。

如需本周末判断，新增工具函数：

```typescript
// frontend/src/lib/date-utils.ts
/**
 * 判断目标日期是否是【当前周】的周六或周日
 * 按北京时间（UTC+8）计算
 */
export function isThisWeekendBeijing(dateStr: string): boolean {
  const targetDate = new Date(dateStr);
  const now = new Date();
  
  // 转换为北京时间
  const beijingOffset = 8 * 60 * 60 * 1000;
  const targetBeijing = new Date(targetDate.getTime() + beijingOffset);
  const nowBeijing = new Date(now.getTime() + beijingOffset);
  
  // 获取本周一的日期（北京时间）
  const dayOfWeek = nowBeijing.getUTCDay(); // 0=周日, 1=周一, ..., 6=周六
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // 周一到今天的偏移
  const thisMonday = new Date(nowBeijing);
  thisMonday.setUTCDate(nowBeijing.getUTCDate() + mondayOffset);
  thisMonday.setUTCHours(0, 0, 0, 0);
  
  // 本周六、周日的起始时间
  const thisSaturday = new Date(thisMonday);
  thisSaturday.setUTCDate(thisMonday.getUTCDate() + 5);
  const thisSunday = new Date(thisMonday);
  thisSunday.setUTCDate(thisMonday.getUTCDate() + 6);
  thisSunday.setUTCHours(23, 59, 59, 999);
  
  // 判断目标日期是否落在本周六/日
  const targetTime = targetBeijing.getTime();
  return targetTime >= thisSaturday.getTime() && targetTime <= thisSunday.getTime();
}
```

**注意：** "本周末"指当前周的周六和周日，不是任意未来的周末。

---

## i18n 文案（复用现有 key）

### 已有 key（复用）
```json
{
  "teams.statusCancelled": "已取消",
  "teams.statusEnded": "已结束",
  "teams.statusFull": "已满员",
  "teams.statusFormed": "已组建",
  "teams.departToday": "今天出发",
  "teams.departTomorrow": "明天出发",
  "teams.almostFull": "🔥 即将满员",
  "teams.spotsLeft": "仅剩 {count} 个名额！",
  "teams.thisWeekend": "本周末出发" // 需新增
}
```

### 新增 key
只在以下文件新增：
- `frontend/public/locales/zh-CN/teams.json`
- `frontend/public/locales/en/teams.json`
- `frontend/public/locales/ja/teams.json`

新增 key：
```json
{
  "thisWeekend": "本周末出发"
}
```

同步更新类型定义：`frontend/src/i18n/types.ts`

---

## 组件设计

### 组件目录（对齐现有结构）

```
frontend/src/components/features/teams/
├── shared/                          # 新增：共享子组件
│   ├── team-urgency-label.tsx       # 行动文案标签
│   ├── team-progress.tsx            # 进度条（带颜色分级）
│   ├── team-leader-mini.tsx         # 队长迷你卡片
│   └── index.ts                     # 统一导出
├── teams-ui.tsx                     # 修改：复用 shared 组件
├── teams-main.tsx                   # 无需修改
├── constants.tsx                    # 复用现有 getDaysUntilStart
└── ...

frontend/src/components/features/home/
├── home-team-card.tsx               # 修改：复用 shared 组件
└── ...

frontend/src/components/features/location-detail/
├── team-card.tsx                    # 修改：复用 shared 组件
└── ...

frontend/src/components/features/team-detail/
├── team-detail-sidebar.tsx          # 修改：LeaderCard 调整
├── team-detail-members.tsx          # 复用现有 MemberAvatarGrid
└── ...
```

### 1. TeamUrgencyLabel（shared/team-urgency-label.tsx）

```typescript
interface TeamUrgencyLabelProps {
  status: Team['status'];
  currentMembers: number;
  maxMembers: number;
  date: string;
  variant?: 'badge' | 'text';
}
```

### 2. TeamProgress（shared/team-progress.tsx）

```typescript
interface TeamProgressProps {
  current: number;
  max: number;
  status: Team['status']; // 新增：用于终态判断
  showLabel?: boolean;
  size?: 'sm' | 'md';
}
```

### 3. TeamLeaderMini（shared/team-leader-mini.tsx）

```typescript
interface TeamLeaderMiniProps {
  leader: Team['leader'];
  showLevel?: boolean;
  size?: 'sm' | 'md';
}
```

### 4. TeamCard 统一改造

**首页卡片**（`home-team-card.tsx`）：
- 使用 shared 子组件
- 保持现有封面图、状态标签
- 新增进度条颜色分级、行动文案

**地点页卡片**（`location-detail/team-card.tsx`）：
- 使用 shared 子组件
- 紧凑布局（无封面图）
- 新增进度条颜色分级、行动文案

**列表卡片**（`teams/teams-ui.tsx` 中的 `TeamCard`）：
- 复用 shared 子组件
- 保持现有布局，替换进度条和行动文案

---

## 详情页改造

### 队长基础信息卡

复用现有 `LeaderCard`（`team-detail-sidebar.tsx`），调整信息展示：
- 显示：头像、昵称、等级
- 不显示：历史带队次数（P2）

### 成员头像矩阵

**复用现有 `MemberAvatarGrid`**（`team-detail-members.tsx`）：
- 已展示前 8 个成员
- 已支持点击展开完整列表
- **无需新增组件**，保持现有实现

---

## 文件变更清单

### 新增文件
- `frontend/src/components/features/teams/shared/team-urgency-label.tsx`
- `frontend/src/components/features/teams/shared/team-progress.tsx`
- `frontend/src/components/features/teams/shared/team-leader-mini.tsx`
- `frontend/src/components/features/teams/shared/index.ts`
- `frontend/src/lib/date-utils.ts`（如需要 isThisWeekendBeijing）

### 修改文件
- `frontend/src/components/features/teams/teams-ui.tsx`
  - 修改 `MemberProgress` → 使用新的 `TeamProgress`
  - 新增 `TeamUrgencyLabel` 展示
- `frontend/src/components/features/teams/shared/index.ts`
  - 导出新增子组件
- `frontend/src/components/features/home/home-team-card.tsx`
  - 复用 shared 子组件
- `frontend/src/components/features/location-detail/team-card.tsx`
  - 复用 shared 子组件
- `frontend/src/components/features/team-detail/team-detail-sidebar.tsx`
  - 调整 LeaderCard 信息展示
- `frontend/public/locales/zh-CN/teams.json`
  - 新增 `"thisWeekend": "本周末出发"`
- `frontend/public/locales/en/teams.json`
  - 新增 `"thisWeekend": "This Weekend"`
- `frontend/public/locales/ja/teams.json`
  - 新增 `"thisWeekend": "今週末出発"`
- `frontend/src/i18n/types.ts`
  - 同步新增 key 类型

### 无需修改
- `frontend/src/components/features/team-detail/team-detail-members.tsx`
  - 已有 `MemberAvatarGrid`，直接复用

---

## 验收标准

### 功能验收
- [ ] 列表卡片展示：封面图、队长头像、地点、日期、进度条、行动文案
- [ ] 行动文案按优先级规则显示正确（终态 → 满员 → 已组建 → 时间 → fillRatio → 默认）
- [ ] 进度条颜色按 fillRatio 分级显示（终态为 neutral）
- [ ] 终态队伍进度条显示为禁用样式
- [ ] 详情页队长基础信息卡显示正常
- [ ] 详情页成员头像矩阵复用现有组件，展示前 8 个

### 视觉验收
- [ ] 长标题场景卡片高度稳定（`min-h` + `line-clamp`）
- [ ] 无封面图场景（地点页）布局正常
- [ ] 移动端无文字挤压、按钮遮挡
- [ ] 暗色模式正常显示
- [ ] 进度条动画流畅

### 边界测试
- [ ] 所有状态（recruiting/full/formed/completed/cancelled）显示正确
- [ ] fillRatio 边界值（0%、50%、80%、100%）显示正确
- [ ] maxMembers=0 时 fillRatio 不报错
- [ ] 本周末判断（周五、周六、周日、跨时区）准确

### i18n 验收
- [ ] 中文、英文、日文三语言文案完整
- [ ] 类型定义同步更新

---

## 开发计划

1. 创建 `shared/` 目录和子组件（TeamUrgencyLabel、TeamProgress、TeamLeaderMini）
2. 修改 `teams/teams-ui.tsx`，替换进度条和行动文案
3. 修改 `home/home-team-card.tsx`，复用 shared 组件
4. 修改 `location-detail/team-card.tsx`，复用 shared 组件
5. 调整 `team-detail-sidebar.tsx` LeaderCard 信息展示
6. 补充 i18n 文案（3 语言）
7. 本地验证 + Code Review

---

## 风险评估

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| 卡片高度变化导致布局跳动 | 中 | 中 | 固定最小高度，长标题用 `line-clamp` 截断 |
| maxMembers=0 导致 fillRatio 除零 | 低 | 中 | 防御性编程，max<=0 时返回 0 |
| 本周末判断时区问题 | 低 | 低 | 统一使用北京时间（UTC+8） |
| 暗色模式颜色对比度不足 | 低 | 低 | 视觉走查，必要时调整 |
| 三语言 i18n 遗漏 | 中 | 低 | 验收清单检查 |

---

## 技术方案评审记录

**评审人：** @Martin
**评审结论：** 方向通过，需修正 7 个实现细节
**修正内容：**
1. ✅ i18n 路径修正为 `frontend/public/locales/{zh-CN,en,ja}/teams.json`
2. ✅ 组件目录对齐现有结构 `frontend/src/components/features/teams/shared/`
3. ✅ 详情页成员矩阵复用现有 `MemberAvatarGrid`，不新增组件
4. ✅ 时间判断复用现有 `getDaysUntilStart`，新增 `isThisWeekendBeijing` 工具函数
5. ✅ fillRatio 添加防御（max<=0 时返回 0，clamp 到 0..1）
6. ✅ 终态进度条明确为 neutral/disabled，不按 fillRatio 染色
7. ✅ 验收标准补充长标题、无封面、maxMembers=0、三语言等边界

**评审人：** @Steven
**评审结论：** 产品角度确认 ✅

---

**开发准备：** 等待 @jiahong-wu 确认后拉开发群（带上 QA @Wen）
**预计开发时间：** 2-3 天
