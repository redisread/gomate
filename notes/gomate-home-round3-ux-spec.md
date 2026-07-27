# gomate 首页体验优化 Round 3 spec v1.0

> 立项：2026-07-27 Victor（msg=4e13c2a7）拍板 Round 3 范围——**A 做 / B 砍 / C 做 / D 做**（候选方案 msg=533e3f0b）
> 作者：@Steven｜CR：@Martin｜实现：@Jeff / @Bob
> 前置：首页极简（#190/#191 done）+ city 个性化（#192-#195/#198 done）已收官，本 spec 是纯增量
> **v1.1 变更（2026-07-27 Martin CR msg=8ae95f84 PASS + 3 修订）**：
> ① R1 §A.1「文字链」→「复用近期队伍 viewAll 同款**按钮结构**」（事实纠正：teams 实物是 border rounded-2xl 按钮非裸文字链）
> ② R2 §C 补快取闪烁门控（fetch <150ms 时跳过骨架直接 fade-in）
> ③ R3 §D marker 写入延迟到出场动画完成回调（与 #185 共存条款对齐）
> 事实基线（一手核实 origin/main @ 0652ae3）：
> - 探索地点区块无出口（`home-locations-section.tsx` 全文无链接）；近期队伍有 viewAll → /teams（`home-teams-section.tsx:55-57`）
> - `common.viewAll` i18n key 三语已存在（zh「查看全部」/ en「View All」/ ja「すべて表示」），A 零新 key
> - `/locations` 页**已支持 `?cityId=` 参数**（`pages/locations/index.astro:30` 透传 listQuery；`locations-hero.tsx` 有 CitySelect）
> - 换一批现状：`handleRefresh` 旧卡停留 + 图标 spin → setState 瞬时硬切（`home-recommendations-section.tsx:80-97`）
> - onboarding modal 现状：`return null` 条件渲染零过渡（`onboarding-modal.tsx:62/90/195`，`fixed inset-0 z-50 bg-black/50`）

---

## 0. 一句话

**补一个出口，加两处过渡。** 探索地点 6 卡不再是浏览死胡同；换一批与 onboarding modal 从「瞬时硬切」升级为过渡动效。全部 CSS 原生、零新依赖、零 schema 变更、零 token 变更。

## A. 探索地点「查看全部」出口

### A.1 行为

- 6 卡 grid（桌面）/ 紧凑卡列表（移动端）**之后**加居中「查看全部」入口，**复用近期队伍 viewAll 同款按钮结构**（`home-teams-section.tsx:54-61`：border rounded-2xl px-7 py-3.5 + ArrowRight 图标 + `common.viewAll` 文案——v1.1 R1 事实纠正：实物是带边框按钮，非裸文字链）
- 实现建议（Martin CR 附带）：用单个 `<a>` 挂 button 的类名即可，视觉完全一致且避免 `<a><button>` 嵌套非法 HTML（teams 现状为历史遗留，本 spec 不强制改它）
- 链接目标：
  - 用户已设 city 且本区块 city chip 正在显示（与 `showCityChip` 同条件）→ `/locations?cityId={userCity}`（个性化在导航后不中断；/locations 已原生支持，一手核实）
  - 其余情况（匿名 / 未设 city / fallback 态）→ 裸 `/locations`
- 样式：与近期队伍 viewAll **逐项一致**（按钮结构 / 字号 / 颜色 / 间距节奏），不发明第二种出口样式
- i18n：复用 `common.viewAll`（三语已存在，零新 key）

### A.2 明确不在本轮（范围收敛记录）

- ~~hero 搜索 `window.location` 整页跳 → 客户端路由~~：gomate 是 Astro MPA，`window.location` 是正常形态；软导航需引入 Astro View Transitions，属架构决策非 XS。**降级为 P2 backlog 条目**，不在本 spec 派生任务

## C. 换一批过渡（transitions.dev `skeleton-loader-and-reveal`）

### C.1 现状问题

点击换一批 → 旧卡停留 + 按钮图标转圈 → 数据到达后 setState **瞬时硬切**。等待感与突变感叠加，是首页唯一「卡一下」的交互。

### C.2 目标流

```
点击换一批
→ 旧卡容器 opacity 1→0（150ms ease-out）
→ 骨架 pulse（复用现有 skeleton 结构与 data-testid）
→ 数据 ready
→ 新卡 opacity 0→1（200ms ease-out）
```

**快取门控（v1.1 R2）**：fetch 命中 KV cache 时可能 <150ms 返回，fade-out 未完数据已就绪——此时骨架会闪一帧，比现状硬切更糟。状态机门控规则：**fade-out 完成时若数据已 ready → 跳过骨架直接 fade-in；仅当数据未 ready 才进骨架态**。骨架是「等待的可视化」，无等待则无骨架。

### C.3 实现约束

- 状态机加中间态（如 `switching`），不破坏现有 `loading/ready/error` 三态语义
- 骨架**复用现有 skeleton JSX 与 `data-testid`**（`recommendation-card-skeleton` 等），现有测试断言零改动
- 失败路径口径不变：旧卡 fade 回 opacity 1 + 现状 console 错误提示（不引入新错误 UI）
- 移动端横滑容器同效；新卡入场后 snap 滚动位置重置到首张（`scrollTo({left: 0})`，瞬时非平滑）
- `prefers-reduced-motion`：全部瞬时，行为与现状完全一致
- 纯 CSS transition/keyframes，不引入 JS 动画库

## D. onboarding modal 进出场（transitions.dev `modal-scale`）

### D.1 目标

- **进场**：overlay fade-in 150ms + panel `scale(0.95)→1` + fade-in 200ms ease-out——mount keyframes 实现，零结构改动
- **出场**：反向（fade + scale→0.97，150ms），动画结束后再 unmount（closed 分支延迟 ~200ms 置 null）
- **三步切换不动**：步内内容切换保持瞬时——流程效率优先，不为动效拖慢任务流（取舍原则 #1）
- **marker 写入时机（v1.1 R3）**：`markOnboardingSeen` / `markOnboardingDismissed` 现状在**点击瞬间**写 localStorage（L83/L169），必须**延迟到出场动画完成回调**再写——否则 modal 还在淡出时 #185 引导卡评估已触发，与残影 modal 叠屏。三个关闭路径（skip / dismiss / step3 完成）统一走延迟写入
- `prefers-reduced-motion`：进出场均瞬时（reduced-motion 下 marker 写入无延迟窗口，点击即写=动画即完成）
- 与 #185 引导卡共存规则（modal 关闭后才评估引导卡）不回归——关闭判定时机以「动画完成、modal 实际卸载、marker 已写」三点同时成立为准

### D.2 P1-1 spec 联动

`notes/gomate-p1-1-onboarding-spec.md` 加 v1.2.2 修订指针一行：modal 进出场动效条款归 Round 3 spec §D 管辖（单一事实源，避免两份 spec 双写动效）。

## 5. 验收标准

1. A：桌面 grid 后 + 移动端紧凑卡列表后均可见「查看全部」按钮（border rounded-2xl 结构）；点击跳 /locations（chip 显示中的登录用户链接带 cityId）；样式与近期队伍 viewAll 逐项一致；三语渲染
2. C：点击换一批可观察到 fade-out → skeleton → fade-in 完整序列；**快 fetch（<150ms）路径跳过骨架直接 fade-in，无骨架闪烁**；现有 data-testid 断言全绿；reduced-motion 下瞬时；fetch 失败旧卡复原
3. D：modal 进场 scale+fade / 出场反向可观察；三步切换瞬时；reduced-motion 瞬时；**marker 在出场动画完成后才写 localStorage，退出动画期间 #185 引导卡不触发**；关闭后 #185 引导卡评估时机不回归
4. 通用：暗色模式不破版；i18n 门禁三语通过；首屏 LCP 不劣化（纯 CSS 增量）

## 6. 任务拆分建议

| 任务 | 内容 | 工作量 |
|---|---|---|
| T1 | A 探索地点「查看全部」出口（含 cityId 透传条件） | XS |
| T2 | C 换一批过渡（状态机中间态 + 双端容器动效） | XS-S |
| T3 | D onboarding modal 进出场 + P1-1 spec v1.2.2 指针 | XS |

三任务文件零交叠（locations-section / recommendations-section / onboarding-modal），可全并行；也可一个 PR 三 commit。

## 7. Out of scope

- **B 搜索历史**（Victor 2026-07-27 拍板砍）
- 客户端路由 / Astro View Transitions（P2 架构决策，§A.2）
- onboarding modal 内容 / 逻辑 / 文案任何改动
- 任何 token / 暗色配色 / 卡片样式变更
- 近期队伍区块（已有出口，不动）

## 8. 风险与回滚

- **风险 1**：C 的中间态与现有 error/空态分支交互出边界 bug → 验收 #2 失败路径强制覆盖；回滚 = 删中间态恢复瞬时硬切（单 commit revert）
- **风险 2**：D 的延迟 unmount 影响 #185 引导卡评估时机 → 验收 #3 共存条款强制覆盖；回滚 = 撤出场动画保留进场
- 三任务相互独立，任一可单独 revert 不影响其他两项

---

_v1.0 2026-07-27 @Steven。事实基线全部一手 grep（viewAll 三语 key / /locations cityId 支持 / handleRefresh 硬切 / modal 条件渲染零过渡）。范围 = Victor msg=4e13c2a7 拍板 A/C/D；B 砍；A 附带客户端路由项降级 P2（§A.2）。动效引用 transitions.dev `skeleton-loader-and-reveal` / `modal-scale`，按 Victor 2026-07-26 拍板的取舍原则执行（命名即规格、CSS 原生、装饰归零）。_

_v1.1 2026-07-27 @Steven。Martin CR msg=8ae95f84 PASS + 3 修订全接受：R1 §A 出口 = viewAll 同款按钮结构（实物核实 border rounded-2xl px-7 py-3.5 + ArrowRight，单 `<a>` 挂 button 类名实现）；R2 §C 快取门控（fade-out 完成时数据已 ready 跳骨架直接 fade-in）；R3 §D marker 写入延迟到出场动画完成回调（三关闭路径统一，防 #185 引导卡与残影 modal 叠屏）。验收 #1/#2/#3 同步更新。_
