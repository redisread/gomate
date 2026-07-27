# gomate P1-1：首次引导流（3 步内申请加入首个周末队伍）设计规范 v1.2

> 需求：@Victor 2026-07-20 DM（「先出 spec」+ P1 重新评估中强推项）
> 依据：`notes/gomate-ux-experience-analysis.md` §三-P1-1
> 设计者：@Steven
> **v1.2.2**（2026-07-27）：modal 进出场动效条款归 Round 3 spec §D 管辖（`notes/gomate-home-round3-ux-spec.md`），本 spec 不做双写
> 范围：注册流程尾部 + 首页 `/`（新增 modal）+ 队伍详情页（无变更）
> 交付给：Martin CR + 拆任务
> v1.1（2026-07-24）：P0 全线收官后按现行代码事实刷新——三处 v1.0 与代码冲突修正（§4.1 偏好枚举 / §6 审核制 join / §6.4 wechat 门槛），砍 T3
> v1.2（2026-07-24）：Martin CR PASS 后两处文案修正（均 Martin 一手核实）：§6.3 队员侧 approve 通知不存在 → 改「留意队伍页面状态」口径（approve 通知 Martin 立 P2 补）；§6.4 wechat「仅队长可见」不成立（GET /users 无鉴权 + 队伍页公开渲染）→ 改「加入后队长和队友可联系你」与现状口径一致

---

## 0. 目标

**新用户注册成功后 60 秒内提交首个周末队伍的加入申请。**

当前路径：注册 → 首页 → 挑地点 → 详情页 → 组队 tab → 挑队伍 → 申请（6 步 + 路径跳跃，且新用户大概率卡在 wechat 门槛）。

新路径：注册 →「你周末想去哪种？」（4+1 选项）→ 推荐 1 个队伍 → 一键申请（按需补 wechat）→ 申请已提交（3 步 + 闭环）。

**关键 UX 纪律**：

- 「跳过」按钮必须始终可见（**强制引导 = 用户反感**）
- 流程整体时长 ≤ 60 秒
- 任意一步可关闭，可永久不再提示

### v1.1 措辞修正（产品定案）

v1.0 的「一键加入 → 加入成功」**不成立**——现行 join 是**队长审核制**（见 §6.1 事实核查）。本 spec 全程用「申请加入 / 申请已提交」，不做「自动通过」的产品承诺。

---

## 1. 顾客损失 → 设计对应

| 顾客损失（用户勉强接受的现实） | 设计对应                                    | §    |
| ------------------------------ | ------------------------------------------- | ---- |
| 「注册完不知道下一步」         | 注册后首次登录首页自动弹引导流              | §3   |
| 「想周末去，但不知道选哪种」   | 「你周末想去哪种？」（4 真实分类 + 都可以） | §4   |
| 「有队伍但不知道哪个合适」     | 基于偏好 + 城市 + 时间筛 1 个推荐           | §5   |
| 「申请时才发现要填微信号」     | modal 内联补 wechat，不跳出流程             | §6.4 |
| 「申请完石沉大海」             | 成功页明确「审核中 + 队伍页面可见状态」预期 | §6.3 |
| 「不想被引导」                 | 每步跳过 + 永久不再提示                     | §7   |

---

## 2. 不做什么（明确边界）

- ❌ **不做多步骤 Onboarding Wizard**（3 步后不再引导，不发问卷）
- ❌ **不做「邀请好友」步骤**（P2 再说）
- ❌ **不做个性化推荐算法**（规则筛选即可，见 §5.1）
- ❌ **不做「教学式 overlay」**（不教用户怎么用产品）
- ❌ **不做推送通知**（P1-2a 范畴，Victor 2026-07-20 拍板先不做）
- ❌ **不改队长审核制**（不为引导流放松成自动通过——队伍质量靠队长把关，这是产品原则）
- ❌ **不做 checklist 高亮跳转**（v1.0 T3 砍除，原因见 §11）
- ❌ **不在引导流里收集城市**（城市由 #181 profile + #185 引导卡承载，见 §3.3 共存规则）

---

## 3. 引导流 UI 结构

### 3.1 触发时机

**登录态 + 访问首页 `/`** 时检测，全部满足才弹：

1. 已登录
2. `localStorage.onboardingDismissed !== "true"`（未永久跳过）
3. `localStorage.onboardingSeen !== "true"`（本设备未看过）
4. **用户无任何队伍成员记录**（approved/pending 均无）——T1 端点返回 `hasAnyMembership`，前端据此 gating。**这条同时挡住老用户**：已有队伍的用户永远看不到引导流

匿名浏览不触发。

### 3.2 与 #185 引导卡的共存规则（v1.1 新增）

| 场景                        | 引导流 modal（本 spec） | #185 引导卡（首页常住）      |
| --------------------------- | ----------------------- | ---------------------------- |
| 注册后首次登录              | 弹（一次性）            | 不显示（modal 关闭后再评估） |
| 跳过/完成引导流，仍未设城市 | 不再弹                  | 显示「设置城市看邻居」       |
| 已加入过队伍的老用户        | 永不弹                  | 按 #185 规则                 |

原则：**modal 是「注册时刻」的一次性激活，引导卡是「首页常住」的兜底激活**，两者不叠加、不抢屏。modal 关闭（含跳过）后首页才渲染引导卡判断。

### 3.3 三步布局

```
┌─ 第 1 步：偏好 ─────────────────────────┐
│  ● ○ ○                                  │
│  你周末想去哪种？                        │
│  我们帮你挑一个这周就出发的队伍。         │
│  ┌───────────┐ ┌───────────┐            │
│  │ 🥾 户外徒步 │ │ 🗺️ 城市探索 │           │
│  └───────────┘ └───────────┘            │
│  ┌───────────┐ ┌───────────┐            │
│  │ ☕ 休闲探店 │ │ ✈️ 旅行    │            │
│  └───────────┘ └───────────┘            │
│  ┌───────────────────────┐              │
│  │      都可以，先逛逛      │              │
│  └───────────────────────┘              │
│              [ 跳过 ]                    │
└─────────────────────────────────────────┘

┌─ 第 2 步：推荐 ─────────────────────────┐
│  ● ● ○                                  │
│  这周为你挑了                            │
│  ┌─────────────────────────────┐        │
│  │ ⛰️ 梧桐山徒步                │        │
│  │ 户外徒步 · 周六 07:30        │        │
│  │ 深圳 · 3/10 人              │        │
│  │ [✓ 申请加入]   [换一个]      │        │
│  └─────────────────────────────┘        │
│       [ 上一步 ]      [ 跳过 ]           │
└─────────────────────────────────────────┘

┌─ 第 3 步：申请已提交 ────────────────────┐
│  ● ● ●                                  │
│  ✓ 申请已提交                            │
│  审核期间请留意队伍页面状态。             │
│  审核期间可以先逛逛：                     │
│  • [查看队伍详情]                        │
│  • [回到首页]                            │
└─────────────────────────────────────────┘
```

### 3.4 视觉规范

- 全屏 modal（半透明遮罩 + 居中卡片），不是页面
- 卡片宽度：max-w-md，移动端全屏
- 三步切换走 React state，不刷页面；步骤指示 3 圆点（●○○）
- **偏好卡片直接复用 `getRoleConfig()` 视觉**（emoji + gradientFrom/To + iconColor，`frontend/src/components/features/locations/constants.tsx`）——与地点列表页的角色卡同一套视觉语言，零新增色板
- 「跳过」按钮始终在底部居中（不被主 CTA 抢眼）

---

## 4. 第 1 步：偏好选择

### 4.1 选项 = 真实 locations.type 枚举（v1.1 修正）

v1.0 臆造了「山/海/城郊 → mountain/coast/outskirts」映射——**该枚举不存在**。现行 `locations.type` 真实值（`constants.tsx` RoleKey + i18n `locations.role*`）：

| 选项           | type 值       | 现有 i18n key（zh/en/ja 已全量存在）                                       | emoji |
| -------------- | ------------- | -------------------------------------------------------------------------- | ----- |
| 户外徒步       | `hiking`      | `locations.roleHiking`（户外徒步 / Outdoor Hiking / アウトドアハイキング） | 🥾    |
| 城市探索       | `explore`     | `locations.roleExplore`（城市探索 / City Exploration / 街歩き探索）        | 🗺️    |
| 休闲探店       | `leisure`     | `locations.roleLeisure`（休闲探店 / Leisure Exploration / カジュアル探店） | ☕    |
| 旅行           | `travel`      | `locations.roleTravel`（旅行 / Travel / 旅行）                             | ✈️    |
| 都可以，先逛逛 | （不传 type） | 新增 key，见 §8                                                            | —     |

「都可以」= 不加 type 过滤的完整候选池，降低死胡同概率（例如当前池里只有 hiking 队伍时，选探店的用户也不会落空）。

### 4.2 选择行为

- 点任一卡片 → 立即进第 2 步（无需「下一步」按钮）
- 偏好写 `localStorage.onboardingPreference`（MVP 不入库，见 §9.2）
- 跳过第 1 步 → 关闭整个引导流

---

## 5. 第 2 步：推荐队伍

### 5.1 推荐规则（v1.1 按 cityId 模型重写）

```ts
function recommend_onboarding_team(userCityId: string | null, prefType: string | null):
  cityId = userCityId ?? (cities where name="深圳").id   // 复用 local-circle DEFAULT_CITY_NAME 模式
  candidates = teams
    .join(locations on teams.locationId)
    .filter(
      teams.status = "recruiting",
      teams.startTime > now AND teams.startTime < now + 14 days,
      locations.cityId = cityId,                 // users.city 存的是 cityId（#181 D3）
      prefType ? locations.type = prefType : true,
      count(team_members approved) < teams.maxMembers,
    )
    .sort(startTime asc, approvedCount desc)     // 最近出发优先，已有同伴次之
  return candidates                              // 返回池（前端「换一个」用），非单条
```

- **cityId 缺省服务端 fallback 深圳**：与 local-circle home.ts 方案 a 同款（省前端 /cities 往返）。新用户普遍无 city，fallback 是主路径而非边缘路径
- **偏好死胡同 fallback**：`prefType` 过滤后为空 → 服务端自动去掉 type 过滤重查一次，响应标 `fallbackNoType: true`，前端第 2 步副标题显示「这周没有同类型的，看看这个？」
- **两周内同城完全无队伍** → 返回空池，前端显示空态（§5.3）

### 5.2 推荐卡信息（全部来自现有字段）

| 显示           | 字段                                                      |
| -------------- | --------------------------------------------------------- |
| ⛰️ 图标 + 标题 | `teams.icon` + `teams.title`                              |
| 类型标签       | `locations.type` → `locations.role*` i18n                 |
| 时间           | `teams.startTime`（「周六 07:30」格式复用现有队伍卡工具） |
| 城市           | `locations.cityName`                                      |
| 人数           | `approvedCount` / `teams.maxMembers`                      |

### 5.3 边界

- **「换一个」**：候选池已在首响返回，前端纯客户端轮播（不重新请求）；池用完循环
- **空池**：显示「这周同城还没有出发中的队伍，先逛逛？」+ [回到首页] [看看全部地点]（链 `/locations`）
- **队伍恰好满员/截止**：池是请求时刻快照，提交申请时服务端兜底校验（§6.1 已有 400），前端捕获后自动切下一候选并 toast「这个队伍刚满员，帮你换了一个」

---

## 6. 第 3 步：申请 + 提交后

### 6.1 join 真实行为（v1.0 误判，已核查 `api/src/routes/teams/membership.ts`）

- 端点是 **`POST /teams/:id/join`**（不是 v1.0 写的 `/members`）
- 创建 `team_members.status = "pending"`，响应「申请已提交，等待队长审核」——**队长审核制，无自动通过**
- **前置门槛：`users.wechat 必填`**——未填返回 400「请先填写微信号才能加入队伍」
- 已拒绝用户重复申请会重置为 pending（已有逻辑，无需改）
- actionbook/checklist 对 pending 成员不可见（`team-actionbook-section.tsx` isVisitor 判定：非 leader 且非 approved member = visitor）

### 6.2 申请动作

- CTA「申请加入」→ 若 `user.wechat` 为空 → 先弹内联 wechat 收集（§6.4），否则直接 POST join
- 提交中 loading；成功后进第 3 步；400（满员/已申请/停止招募）按 §5.3 处理

### 6.3 成功页（申请已提交，不是「加入成功」）

- 主标题「✓ 申请已提交」
- 副标「审核期间请留意队伍页面状态。」（v1.2 修正：Martin 一手核实队员侧 approve 通知**不存在**——approve 端点只改状态，email.ts 无 applicationApproved 发送器，「会收到通知」是假承诺；Martin 已立 P2 补 approve 通知，模板 i18n key 已预置）
- **不设「进入 checklist」CTA**（pending 不可见 actionbook，v1.0 T3 因此砍除）
- CTA：[查看队伍详情]（`/teams/[id]` 公开页可看基本信息 + 申请状态）+ [回到首页]

### 6.4 内联 wechat 收集（v1.1 新增，关键路径）

新用户几乎全都没填 wechat——不处理这个门槛，引导流主 CTA 对绝大多数人必失败。

- 触发：点「申请加入」时 `user.wechat` 为空
- 形式：modal 内嵌一行输入（不跳页）：「队长需要你的微信号联系你」+ input + [提交并申请]
- 动作：先 `PATCH /users/update { userId, wechat }`（现有端点已支持），成功后继续 POST join；两步合并 loading，对用户是一次点击
- 校验：非空、≤ 50 字符；失败 toast 复用现有表单模式
- 说明小字：「加入后队长和队友可联系你」（v1.2 修正：「仅队长可见」不成立——GET /users?id= 无鉴权且 wechat 在公开 payload、队伍详情页成员卡对所有访客渲染 wechat；与现有 profile 文案「队友可以联系你」口径一致。wechat 公开暴露面是 pre-existing 隐私观察，收紧是独立决策不在本 spec，Martin 已 DM Victor 知会）
- 已填 wechat 的用户完全无感此步骤

---

## 7. 跳过与永久关闭

- 每步底部「跳过」→ 关闭引导流 + 写 `onboardingSeen="true"`
- 首屏底部小字「不再提示？」→ 确认后写 `onboardingDismissed="true"`，永久关闭
- 完成第 3 步 → 写 `onboardingSeen="true"`
- 跳过/完成后用户照常浏览；引导流不再触发（除非清 localStorage）
- 「我的-设置」手动重置入口**不做**（v1.0 §7.3 砍掉：为一次性引导流加设置项是过度设计；真有需求走 P2）

---

## 8. i18n

新增 `onboarding.*` keys。zh-CN/en 进 `SUPPORTED_LOCALES` 运行时，**ja 按 #158 纪律预置 key**（运行时不可达，属预期非缺陷）。4 个偏好选项**复用现有 `locations.role*` key**，不新增：

```
onboarding.title.step1 = "你周末想去哪种？" / "What kind of weekend trip?" / "週末どこへ行きたい？"
onboarding.subtitle.step1 = "我们帮你挑一个这周就出发的队伍。" / "We'll find a team leaving this week." / "今週出発するチームを探します。"
onboarding.preference.any = "都可以，先逛逛" / "Anything, just browsing" / "なんでも、まずは見る"
onboarding.title.step2 = "这周为你挑了" / "Picked for you this week" / "今週はこちら"
onboarding.step2.fallbackNoType = "这周没有同类型的，看看这个？" / "No same-type team this week. How about this?" / "今週は同タイプなし。こちらは？"
onboarding.recommend.cta.join = "申请加入" / "Apply to Join" / "参加申請"
onboarding.recommend.cta.swap = "换一个" / "Swap" / "別のチーム"
onboarding.recommend.empty = "这周同城还没有出发中的队伍，先逛逛？" / "No teams leaving nearby this week. Browse around?" / "今週は近くに出発チームなし。見て回る？"
onboarding.empty.cta.locations = "看看全部地点" / "Browse all locations" / "すべての場所を見る"
onboarding.wechat.title = "队长需要你的微信号联系你" / "The team leader needs your WeChat to reach you" / "リーダーが連絡用にWeChatを必要とします"
onboarding.wechat.privacy = "加入后队长和队友可联系你" / "Once you join, the leader and teammates can reach you" / "参加後、リーダーとチームメイトが連絡できます"
onboarding.wechat.cta = "提交并申请" / "Save & Apply" / "保存して申請"
onboarding.title.step3 = "申请已提交" / "Application Submitted" / "申請を送信しました"
onboarding.success.subtitle = "审核期间请留意队伍页面状态。" / "Keep an eye on the team page while your application is reviewed." / "審査中はチームページで状態を確認してください。"
onboarding.success.next = "审核期间可以先逛逛：" / "While you wait:" / "承認を待つ間："
onboarding.success.cta.team = "查看队伍详情" / "View Team" / "チームを見る"
onboarding.success.cta.home = "回到首页" / "Back to Home" / "ホームへ"
onboarding.teamFull.toast = "这个队伍刚满员，帮你换了一个" / "That team just filled up. Here's another" / "満員になりました。別のチームです"
onboarding.skip = "跳过" / "Skip" / "スキップ"
onboarding.back = "上一步" / "Back" / "戻る"
onboarding.dismiss = "不再提示？" / "Don't show again?" / "次回から表示しない"
```

提交前跑 `scripts/validate-i18n-keys.mjs` + `gen-i18n-types.mjs`（#158 常驻门禁）。

---

## 9. schema 与 API 改动汇总

### 9.1 无 schema 变更

全部基于现有数据：`users.wechat` / `users.city`（cityId）/ `teams` / `team_members` / `locations.type` / `locations.cityId` / `cities`。

### 9.2 偏好存储：localStorage（MVP）

`localStorage.onboardingPreference`，不入库、无 schema 变更。一次性引导流无需持久化；换设备丢失可接受。

### 9.3 API

**新增 1 个端点**（T1）：

```
GET /teams/recommend-onboarding?type=hiking|explore|leisure|travel（可选）
Response: {
  hasAnyMembership: boolean,     // 前端 modal gating 用（§3.1 条件 4）
  candidates: [{ id, title, icon, startTime, maxMembers, approvedCount,
                 locationName, cityName, locationType }],
  fallbackNoType: boolean,
  cityId: string                 // 实际生效的 city（含深圳 fallback）
}
```

- 需登录（hasAnyMembership 依赖 session）
- 单 SQL join teams + locations + team_members 聚合；预计 ≤ 50ms
- KV 缓存**不做**（一次性场景，P0-C/P0-D 的缓存复用价值低； Martin CR 若判断要加可后补）

**复用现有端点**：`PATCH /users/update`（wechat，已有）+ `POST /teams/:id/join`（已有）。

P0-C `GET /recommendations/home` **不可复用**——它推荐的是 location（本周三个选择），不是 team；仅借鉴其 city fallback 模式。

---

## 10. 性能与实现约束

- modal 走 client-side React state，不走多页路由
- 「申请加入」不 optimistic——wechat PATCH + join POST 串行 await，合并 loading（≤ 2 个往返，可接受；失败必须如实报错，不假装成功）
- 推荐查询单 SQL ≤ 50ms；候选池一次返回，「换一个」零请求
- localStorage 读写同步无延迟

---

## 11. 交付给 Martin 的任务拆分建议

### T1：推荐端点 `GET /teams/recommend-onboarding`（后端）

- 改动：`api/src/routes/teams/queries.ts` 或独立路由文件 + service
- 候选池：未来 14 天 + 同城（缺省深圳 fallback）+ recruiting + 有空位；type 可选过滤 + 死胡同自动去过滤
- `hasAnyMembership`：count(team_members where userId=me AND status IN ('approved','pending')) > 0（v1.2.1：Martin PR #413 CR R1 裁定——全状态计数会把「只有被拒绝记录」的用户永久挡在引导流外，与 §3.1 行为定义对齐）
- 验收：4 种 type 命中 / 深圳 fallback / 满员排除 / fallbackNoType 标记 / hasAnyMembership 真假两态 / ≤ 50ms

### T2：引导流 modal + 三步 UI + wechat 内联（前端）

- 依赖：T1
- 改动：`frontend/src/components/features/onboarding/`（modal + preference/recommend/success 三步子组件）+ 首页触发 gating + localStorage 三 key + i18n keys
- 偏好卡复用 `getRoleConfig()`
- wechat 内联收集（PATCH → join 串行）
- 验收：见 §12

### v1.0 T3（checklist 高亮）砍除说明

v1.0 设想过「申请成功 → 跳 `/teams/[id]?onboard=1` 高亮行动本」。事实核查：pending 成员对 actionbook 是 visitor 视角（`team-actionbook-section.tsx` isVisitor），**跳转过去看不到 checklist**，体验是反效果。审核通过后的 checklist 引导属于「成员激活」范畴，挂到 #182（成员身份信号，P2）一并考虑。

**推荐执行**：T1 → T2 串行（T2 强依赖 T1 响应结构），一个小 PR 链或两 PR 均可，Martin 定。

---

## 12. 验收标准

1. 新注册无队伍用户首次登录首页 → modal 自动弹出
2. 已有队伍（approved 或 pending）用户 → 永不弹出
3. 4 种偏好 + 「都可以」均能进第 2 步且候选类型正确
4. 偏好死胡同 → fallbackNoType 副标题出现，仍有推荐
5. 同城空池 → 空态文案 + 两个出口 CTA
6. 「换一个」在候选池内轮播，零网络请求
7. 无 wechat 用户点「申请加入」→ 内联收集 → 提交后 join 成功（pending）
8. 有 wechat 用户 → 无内联步骤，直接申请成功
9. 申请成功页文案为「申请已提交 / 队长审核」口径，无「加入成功」「进入 checklist」字样
10. 提交瞬间队伍满员 → toast + 自动切下一候选
11. 任意步「跳过」可关；「不再提示」后清缓存前永不弹出
12. 三语言 key 完整（zh/en 渲染 + ja 预置），i18n 门禁通过
13. 移动端 modal 全屏、偏好卡 2×2 不溢出
14. 暗色模式对比度达标（复用 getRoleConfig 渐变在 dark 下可读）
15. #185 共存：modal 关闭后首页引导卡正常出现（未设城市时）

**关键 UX 验证**：Wen 用 3 个全新账号（无 wechat / 有 wechat / 已有队伍）跑注册 → 引导 → 申请全流程，记录注册完成到申请提交总时长，**目标 P95 ≤ 60s（含 wechat 输入）**。

---

## 13. 与已上线模块的关系

| 模块                       | 关系                                                           |
| -------------------------- | -------------------------------------------------------------- |
| P0-A 行动本（#163-#167）   | 审核通过后的目的地；本 spec 不直接跳转（pending 不可见）       |
| P0-C 推荐位（#172）        | 仅借鉴 city fallback 模式；数据不可复用（location vs team）    |
| P0-D 本地圈子（#175-#177） | 同城 fallback 深圳模式同源                                     |
| #181 city 写入             | users.city = cityId 是本 spec 推荐匹配的前提；引导流不收集城市 |
| #185 引导卡                | 共存规则见 §3.2：modal 一次性激活，引导卡常住兜底              |
| #182 成员身份信号（P2）    | 审核通过后 checklist 引导挂这里                                |

---

## 14. 一句话总结

**P1-1 用「3 步 modal 引导流」（选偏好 → 推荐队伍 → 内联补 wechat 一键申请）把新用户从注册到提交首个队伍申请压到 ≤ 60 秒——零 schema 变更，1 个新端点 + 2 个复用端点，尊重队长审核制不做假承诺。**

---

_spec v1.2（2026-07-24，Martin CR PASS + 两处文案修正）。v1.1 事实核查来源：`constants.tsx` RoleKey / `membership.ts` join 审核制+wechat 门槛 / `team-actionbook-section.tsx` isVisitor / `mutations.ts` PATCH wechat+city / `local-circle/home.ts` 深圳 fallback / `recommendations/home.ts` P0-C location 推荐。v1.0 三处臆造（mountain/coast 枚举、自动通过、/members 端点）已全部修正。_
