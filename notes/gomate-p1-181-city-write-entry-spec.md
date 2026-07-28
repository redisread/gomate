# gomate P1 #181 — city 写入入口 UX spec v1.1（定稿）
> **状态：已上线（2026-07-25 6e518f6）**

> **v1.1 变更**（Martin CR PASS msg=96374019 + 三方对齐）：
>
> - **D3 定案：users.city 存 cityId**（Jeff 地点维度增量论证 + Martin 杀手锏「一字段激活邻居+地点双维度」+ 零迁移成本）
> - §1.1 格式一致性护栏（Wen 防休眠 2.0 + Martin text() 无 FK 洞察）
> - T1 范围含 §3.4 默认 cityId（Martin 折进，D3 价值闭环，不拆 T2）

> 需求：Martin msg=30becd24 拍板（三层 fact-check 后立 P1 task #181）
> 依据：Wen D1 直查（users.city 全 NULL + 无写入入口）+ Jeff 源码核实 + Steven 价值曲线（city P1 优先）
> 设计者：@Steven
> 目标：激活 P0-D 本地圈子「邻居维度」—— 补 city 写入入口，让 neighborTeams 从「上线休眠」变「真实可命中」
> 交付给：Martin CR + 拆任务 → Jeff 实现
> 范围：`frontend/profile-edit`（城市选择器）+ `api/users`（PATCH 支持 city + GET 透出 city）+ 首页引导

---

## 0. 背景：为什么邻居维度休眠

P0-D 本地圈子有两个价值维度：

- **地点维度** `topLocations`：走 signal 数据（team_members/stories/activity_posts），等数据积累自然激活
- **邻居维度** `neighborTeams`：走 `users.city` 匹配（`local-circle.ts:326` `u.city = ${userCity}`）

**休眠根因**（一手核实）：

- `users.city` 列存在（schema.ts:33 `text("city")`），但 **staging + prod 全 NULL**（Wen D1 直查）
- **无写入入口**：`PATCH /users/update`（mutations.ts:24-46）处理 9 个字段但**不含 city**
- **GET 不透出**：`sanitizeUser`（utils.ts:12-31）返回 18 字段但**不含 city**
- → neighborTeams 对所有用户恒返空数组，T3 子区块永不渲染

**本 spec 补齐 3 环**：写入入口（城市选择器）+ API 透出（GET city）+ API 写入（PATCH city），激活邻居维度。

---

## 1. 关键设计决策 D3 — users.city 存 cityId 还是城市名？

**现状矛盾**：

- `CitySelect` 组件（city-select.tsx:14-19）`value=cityId, onChange(id)` —— 产出 **cityId**
- `users.city` = `text("city")`，neighbor query `u.city = ${userCity}` 纯字符串相等
- `locations.cityId`（schema.ts:140）= `references(cities.id)` FK

**决策：users.city 存 cityId**（首选），理由：

1. **与 CitySelect 天然对齐**（组件产出 cityId，直接存）
2. **可复用为 local-circle 默认 cityId**：登录用户进本地圈子，`?cityId=` 从 `user.city` 取（现在硬 fallback 深圳），登录用户看自己城市的圈子（地点维度也受益，不只邻居维度）
3. **neighbor query 不变**：`u.city = ${userCity}` 两边都是 cityId 字符串，相等成立
4. **未来可 join cities 表**取城市名展示（cityId → cities.name）

**Jeff 实现视角印证（msg=443796c7，D3 决定性理由）**：5. **地点维度增量只在存 cityId 时成立**：local-circle 地点查询是 `loc.city_id = ${cityId}`（local-circle.ts:181/187/240），user.city 必须 cityId 格式才能直接喂进去。**若存城市名则「默认 cityId 从 user.city 取」增量要加一层 name→id 反查** —— 这是存 cityId 比存名多出的决定性收益 6. **零存量迁移成本 = 趁现在锁格式**：存量 users.city 全 NULL（无脏数据），现在定 cityId 格式零迁移；一旦有用户写入就锁死格式，**D3 必须现在拍不能拖**

> **需 Martin 确认 D3**：users.city 存 cityId。若存城市名则 CitySelect onChange 要转 name + neighbor query 语义变 + 地点维度增量加 name→id 反查（本 spec 按存 cityId 写，Jeff 落码前 Martin 拍）

### 1.1 格式一致性护栏（Wen msg=cec02aea 防坑，防「休眠 2.0」）

D3 锁 cityId 格式后，**任何绕过 CitySelect 的 city 写入**（未来 admin 批量导入 / 数据迁移 / 脚本）**必须也存 cityId**，否则 `u.city = ${userCity}` 字符串相等失效 → 邻居维度**再次休眠**（休眠 2.0）。

**Jeff 实现时落 2 处注释护栏**：

- `schema.ts:33` users.city 列注释：`// 存 cityId（非城市名），与 local-circle neighbor query u.city=userCity 一致性依赖`
- `mutations.ts` PATCH city 白名单处注释：`// city = cityId（CitySelect 产出），格式一致性见 schema 注释`

这是「防休眠 2.0」的关键约束：格式一致性是 D3 的**隐藏契约**，靠注释显性化防未来踩坑。

---

## 2. 写入入口 UX 设计

### 2.1 入口位置：profile 编辑页

**复用现有 profile 编辑表单**（`profile-edit/profile-form-fields.tsx`），在「基本信息」区块（BasicInfoFields，nickname/bio 附近）加城市字段：

```
基本信息
├─ 昵称 [nickname input]
├─ 所在城市 [CitySelect ▾]   ← 新增
└─ 个人简介 [bio textarea]
```

- **复用 `CitySelect` 组件**（city-select.tsx，已有搜索 + 热门城市 + 键盘导航），不重造
- cities 数据源：`GET /cities`（cities.ts，已有 `?hot=true` 支持热门城市）—— profile 页加载时拉一次
- **非必填**：城市可留空（与现有 nickname/bio 非必填一致），留空 = 邻居维度对该用户不激活（现状降级正确）

### 2.2 交互：渐进式引导（不强制）

**不在 onboarding 强制设城市**（增加注册摩擦，违反渐进式原则）。改「看到价值再引导」：

1. **profile 编辑页**：城市选择器常驻，用户主动编辑资料时可设
2. **首页本地圈子模块轻引导**（登录 + 未设 city 用户）：
   - 地点维度正常显示（走 fallback cityId 深圳 or 后续默认城市）
   - 邻居子区块位置显示**轻提示卡**（非空态占位，是引导 CTA）：
     ```
     ┌─────────────────────────────────────┐
     │ 👋 设置你的城市，看看邻居在做什么      │
     │              [去设置 →]              │
     └─────────────────────────────────────┘
     ```
   - 点「去设置」→ 跳 profile 编辑页城市字段（可加 `?focus=city` 锚点）
   - **只对登录 + 未设 city 用户显示**；已设 city → 正常邻居子区块；匿名 → 不显示（匿名本就无邻居维度）

> **引导卡是 P1 增强，可拆子任务**：MVP 先做「profile 城市选择器 + API 透出/写入」激活链路，引导卡作为 #181 第二阶（先能设，再引导设）

### 2.3 降级（未设 city 用户）

- 本地圈子**地点维度正常显示**（topLocations 走 cityId，登录用户有 city 则用 user.city，否则 fallback 深圳）
- 邻居子区块：
  - MVP（无引导卡）：neighborTeams 空 → 子区块不渲染（现状，正确）
  - 引导阶段：显示引导卡替代空态
- **不做**：不强制、不弹窗打断、不在未设 city 时显示「暂无邻居」的错误感空态

---

## 3. API 改动点

### 3.1 `PATCH /users/update` 支持 city（mutations.ts）

```ts
// body 类型加 city
const body = await c.req.json<{ ...; city?: string; }>();
const { ...; city } = body;

// updateData 加 city
if (city !== undefined) updateData.city = city;  // city = cityId（D3）
```

- city 传 cityId（D3），`undefined` 不改，`null`/空串 = 清空城市
- 鉴权复用现有（只改自己资料）

### 3.2 `sanitizeUser` 透出 city（utils.ts）

```ts
return {
  ...,
  city: user.city,   // 新增，GET /users/me 等透出
  ...
};
```

- 前端 profile 编辑页加载时读 `user.city` 回填城市选择器
- 首页 use-local-circle hook 读 `user.city` 作默认 cityId（替代硬 fallback 深圳）

### 3.3 前端 use-profile-form PATCH payload 加 city

```ts
body: JSON.stringify({
  userId, nickname, image, bio, level, wechat, gender, birthday, extra,
  city: formData.city || null,   // 新增
}),
```

### 3.4 首页 use-local-circle 默认 cityId（可选增量）

登录用户 `user.city` 非空 → `?cityId=${user.city}`（看自己城市圈子）；未设 → fallback 深圳（现状）。

> 这一步让「设了城市」对**地点维度也生效**（不只邻居），价值更完整。可 #181 内做或拆子任务

---

## 4. i18n（gomate 三语）

新增 profile + 引导 keys（zh/en/ja，gomate 有 i18n 基础设施）：

```
profile.cityLabel = "所在城市" / "Your City" / "所在都市"
profile.cityPlaceholder = "选择你所在的城市" / "Select your city" / "都市を選択"
profile.cityHint = "设置后可在本地圈子看到你的邻居" / "See neighbors in your local circle" / "近所の仲間が見えます"
localCircle.setCityCta.title = "设置你的城市，看看邻居在做什么" / "Set your city to see what neighbors are up to" / "都市を設定してご近所さんを見る"
localCircle.setCityCta.button = "去设置 →" / "Set up →" / "設定する →"
```

- CitySelect 内部 i18n 已有（cityHotCities/citySearchPlaceholder，locales-data 已存）

---

## 5. 文件改动汇总

### 5.1 后端（api）

- `routes/users/mutations.ts` — PATCH 支持 city 字段
- `routes/users/utils.ts` — sanitizeUser 透出 city
- （无 schema 改动，users.city 列已存在）

### 5.2 前端（frontend）

- `components/features/profile-edit/profile-form-fields.tsx` — BasicInfoFields 加 CitySelect
- `components/features/profile-edit/use-profile-form.ts` — formData 加 city + PATCH payload + 回填
- `components/features/home/local-circle/use-local-circle.ts` — 默认 cityId 从 user.city 取（可选增量）
- `components/features/home/local-circle/home-local-circle-section.tsx` — 引导卡（第二阶，可拆）
- `i18n/locales-data.ts` + `types.ts` — §4 keys

### 5.3 依赖

- CitySelect 组件（已有，复用）
- GET /cities（已有）

---

## 6. 交付给 Jeff 的任务拆分建议

> **Martin CR 拍板 (msg=96374019)**：§3.4「use-local-circle 默认 cityId」折进 T1（不拆 T2）—— 这是 D3 存 cityId 的核心价值兑现（地点维度个性化），拆到 T2 会「设了城市但地点维度还看深圳」割裂。改动小（use-local-circle 一处），T1 闭环「设城市 → 邻居 + 地点双维度都个性化」。

### T1（#181 主体）：city 写入 + 透出 + profile 城市选择器 + 默认 cityId

- 后端：PATCH city（mutations.ts 白名单加 city + 护栏注释）+ sanitizeUser 透出 city
- 前端：profile 城市选择器（CitySelect 复用）+ 回填 + PATCH payload
- **§3.4 use-local-circle 默认 cityId**：登录用户 `?cityId=${user.city}`（地点维度也个性化，D3 价值闭环）
- schema.ts:33 users.city 列护栏注释（防休眠 2.0）
- **验收**：设城市 → GET /users/me 返 city → 刷新回填 → neighborTeams 命中 + 地点维度切自己城市
- 工作量：**S 1-2 天**

### T2（#181 第二阶，纯 UX 增强）：首页引导卡

- 未设 city 登录用户首页引导卡「设置城市看邻居」+ 点击跳 profile
- 工作量：**XS-S 4-8h**

---

## 7. 验收标准（Wen 端到端，msg=cec02aea 锚点）

1. profile 编辑页城市选择器渲染（CitySelect 搜索 + 热门城市）
2. 设城市 → PATCH /users/update 200 → D1 users.city 写入 **cityId 格式**（如深圳 `bzP28N9PIhLhe5n41CUuG`，非城市名，非 NULL）
3. GET /users/me 返回含 city 字段（当前 sanitizeUser 18 字段不含 city）
4. 刷新 profile → 城市选择器回填正确
5. **格式一致性（关键，防休眠 2.0）**：写入存 CitySelect 产出的 cityId → neighbor query `u.city = userCity` 两边 cityId → 命中。**造 2 个 users.city=同一 cityId 的用户 + 都参加的 approved team → neighborTeams 命中**（当前恒空 → 有数据显示子区块）
6. **邻居维度激活端到端**：同城 users.city + approved team member + recruiting team → 登录用户首页 neighborTeams 子区块显示「你的邻居参加了这些队伍」+ formatNeighbor 正确
7. **地点维度增量**（若采默认 cityId 从 user.city 取）：设 city≠深圳 用户 → 首页本地圈子切自己城市（非固定深圳 fallback）
8. 清空城市（留空）→ users.city NULL → 子区块不渲染 + 地点维度 fallback 深圳（降级正确）
9. 引导卡（第二阶）：未设 city 登录用户显示 CTA，点击跳 profile
10. i18n 三语
11. **数据造法**：Wen 用真实 curl PATCH 设 wen-qa city + 造第二 QA 用户同 cityId + 建 approved team 端到端（真实写入→查询链路，非 mock）

---

## 8. 一句话总结

**#181 用「profile 城市选择器（复用 CitySelect）+ PATCH/GET city + 渐进式引导」补齐 users.city 写入链路，把 P0-D 邻居维度从「上线休眠」激活为「真实可命中」——1 个入口激活整个差异化卖点，S 1-2 天。核心决策 D3：users.city 存 cityId（对齐 CitySelect + 复用为 local-circle 默认城市）。**

---

_spec v1.1 定稿（2026-07-22，Martin CR PASS + D3 cityId 定案 + Wen 护栏 + T1 含 §3.4）。先 grep + read 三处现状（users API / CitySelect / profile 表单）再写，零臆测。三方对齐：Steven spec + Jeff 实现印证 + Wen 验收锚点。Jeff claim #181 开工 T1（含 §3.4 默认 cityId）+ T2（引导卡）。_
