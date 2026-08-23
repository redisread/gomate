# Implementation Plan: admin-platform

状态：Phase 2 已批准（2026-08-23）

规格：[SPEC-admin-platform.md](../SPEC-admin-platform.md)

## Overview

本计划为 GoMate 建立共享管理员访问合同、统一 `/admin/*` SSR guard、独立响应式后台壳层，
以及可由后续 `location-workflow` 注入内容的快速操作容器。实施不改变数据库 schema、不增加
HTTP endpoint 或依赖，也不实现地点、标签、活动类型和用户管理 CRUD。

任务清单记录在 [`tasks/todo.md`](todo.md)。

## Dependency Graph

```text
authoritative admin access contract
  ├─→ Hono admin adapter → existing admin API consumers
  └─→ Astro admin guard → safe login return path
                            └─→ AdminLayout + /admin home
                                  ├─→ existing location admin pages
                                  └─→ responsive quick-action container
                                        └─→ public Navbar admin mount

all runtime slices → E2E + current-state docs + full quality gate
```

依赖方向保持单向：业务模块消费 `admin-platform`；`admin-platform` 不导入地点、标签、活动类型
或用户管理组件。快速操作容器接受 `children`，但不知道消费者的数据和保存行为。

## Architecture Decisions

1. **一个权威访问解析器。** `resolveAdminAccess(env, headers)` 负责 active session 与当前 D1
   role 复核；Astro 和 Hono 只做协议适配，避免复制权限逻辑。
2. **SSR guard 在内容渲染前执行。** middleware 识别有无 locale 前缀的 `/admin` 路径；
   未认证跳转登录，普通用户直接得到 403，客户端隐藏按钮不参与授权。
3. **返回路径默认拒绝。** 只允许站内、以 `/admin` 开头的绝对路径；登录成功时再次验证，
   非法值回退 `/`，避免开放重定向。
4. **后台壳层以 Astro 为主。** `AdminLayout.astro` 提供文档结构、landmark、desktop shell
   和 content slot；只有移动抽屉与快速操作 overlay 使用 React island。
5. **导航是静态配置。** 只有真实可用的路由进入导航，不建设运行时插件/注册系统，也不展示
   占位模块。
6. **快速操作表现与业务分离。** 共享组件复用现有 Modal/focus 模式，负责 Dialog/Sheet、
   焦点、滚动与 safe-area；地点表单延迟到 `location-workflow`，并在打开前不加载。
7. **文档只保留当前状态。** 完成后更新现行 `docs/frontend-pages.md`、`docs/backend-api.md`
   和必要的 `docs/design-system.md`，不把执行过程复制进去。

## Vertical Slices

### Slice 1: Authoritative admin access for an existing API path

先以现有地点管理员 API 为纵向消费者，建立访问判别联合、当前 D1 角色复核和统一 401/403
adapter。测试覆盖无 session、非 active 账户、普通用户、管理员和 session/数据库角色不一致。
随后把地点路由从 `locations/utils.ts` 的私有实现迁到共享合同，保持原有错误 envelope。

产出价值：至少一条真实管理员 API 路径从请求到最终授权完整工作，而不是先堆一套未使用基础设施。

### Slice 2: Remaining current admin API consumers

将标签创建和地点上传接入同一 Hono adapter，删除各自的角色查询副本。针对既有 endpoint
补充/保持 401、403 和成功路径测试；Story 的 author-or-admin 语义不属于纯管理员 endpoint，
本模块不顺手改写。

产出价值：当前所有纯管理员写路径使用单一权限事实来源。

### Checkpoint A: API authorization

```bash
pnpm exec vitest run --config vitest.server.config.ts src/server/lib/admin-access.test.ts
pnpm test:server
pnpm lint
pnpm type-check
```

检查：不存在纯管理员 endpoint 的复制角色查询；错误响应仍符合现有 envelope；未修改 schema。

### Slice 3: SSR admin guard and safe login return

把共享访问解析器接入 Astro middleware，并扩展类型化 locals。先覆盖 `/admin`、嵌套路径和
全部 locale 前缀，再实现未认证 302、普通用户 403、`private, no-store` 和安全 `returnTo`。
登录组件仅在服务端/客户端验证通过时返回后台路径；保留现有普通登录回首页行为。

产出价值：访客、普通用户和管理员从 URL 到登录返回形成一条可自动验证的完整页面路径。

### Slice 4: Responsive admin shell and live navigation

新增 `AdminLayout.astro`、`/admin` 首页和移动导航交互，复用现有主题、locale 与语义 token。
后台只显示真实存在的入口；桌面侧栏在内容不再容纳时折叠为移动顶部栏/抽屉。中英日文案
同步构建并验证。当前地点创建/编辑页迁入壳层，但不改变表单业务行为。

产出价值：管理员可以在受保护路由内完成后台导航，普通用户无法得到后台 HTML。

### Checkpoint B: Protected admin shell

```bash
pnpm i18n:build
pnpm i18n:validate
pnpm exec vitest run --config vitest.config.ts src/components/admin/admin-navigation.test.tsx
pnpm test
pnpm build
```

检查：`/admin` 无死链接或占位项；现有地点表单仍可进入；SSR/CSR 首屏无 hydration mismatch。

### Slice 5: Accessible quick-action container and Navbar mount

建立可注入 `children` 的响应式快速操作组件：宽布局为 Dialog，窄布局为 Bottom Sheet，
复用现有 focus trap/inert 机制并补齐初始焦点、Escape、焦点恢复、滚动锁与 safe-area 测试。
修正公共 Navbar 使用 `/users/me.role` 判断管理员的现有断层，并提供后续地点表单的 lazy mount；
在消费者不存在时不展示空入口，也不加载地点表单 bundle。

产出价值：后台基础模块可独立证明 overlay 和管理员可见性合同，后续地点模块只注入表单。

### Slice 6: Runtime verification and current-state documentation

新增浏览器场景覆盖访客登录返回、普通用户 403、管理员后台导航、移动抽屉、Dialog/Sheet、
键盘焦点、320px/1440px/200% zoom 和按需加载。更新现行前端、API 与必要设计系统文档，
最后执行项目完整门禁和 diff/秘密/生成物检查。

产出价值：规格成功标准得到运行时证据，文档与当前实现一致。

### Checkpoint C: Module complete

```bash
pnpm exec playwright test e2e/admin-platform.spec.ts --project=chromium
pnpm i18n:build
pnpm i18n:validate
pnpm lint
pnpm type-check
pnpm test
pnpm test:server
pnpm build
pnpm audit --audit-level high
git diff --check
```

检查：逐项核对 `SPEC-admin-platform.md` Success Criteria 与 Definition of Done；审核 staged diff、
秘密、生成物和无关文件。没有用户明确授权时不提交、推送、创建 PR 或部署。

## Proposed Task Units

Phase 3 将把上述切片细化为以下单会话任务，每项保持约 1–5 个主要源文件；生成的 i18n 文件
和现行文档在对应任务中明确列出，不藏在“顺手更新”里。

1. 共享管理员访问合同与地点 API 消费者。
2. 标签、上传管理员 API 迁移与回归测试。
3. SSR guard、locals 与 middleware 授权测试。
4. 登录安全返回路径与登录回归测试。
5. 后台 i18n 文案和静态导航合同。
6. `AdminLayout`、`/admin` 首页与响应式导航。
7. 现有地点管理页面迁入后台壳层。
8. 快速操作 Dialog/Sheet 容器与交互测试。
9. 公共 Navbar 管理员入口与 lazy mount 合同。
10. 管理员 E2E、响应式/可访问性验证和现行文档。
11. 完整质量门禁、规格验收与变更审查。

## Sequential vs. Parallel

必须顺序执行：

- 共享访问合同 → API consumer 迁移。
- 共享访问合同 → middleware guard → 登录返回路径 → 后台页面。
- 后台壳层/快速容器 → Navbar mount → E2E。
- 行为稳定 → current-state docs 与最终验收。

在依赖满足后可并行准备但必须协调共享文件：

- 后台导航 UI 与快速操作容器可分别实现；二者不能同时修改同一测试或 locale 文件。
- API consumer 迁移与后台视觉组件可并行，但 middleware/`src/env.d.ts` 由 SSR guard 单独拥有。
- 文档证据收集可与 E2E 用例设计并行，最终文字只描述已验证行为。

## Verification Checkpoints

| Checkpoint           | Gate                                                | Stop condition                                          |
| -------------------- | --------------------------------------------------- | ------------------------------------------------------- |
| A: API authorization | shared/server focused tests, lint, type-check       | 任一管理员 endpoint 仍复制角色查询，或 401/403 合同变化 |
| B: protected shell   | i18n, component tests, unit suite, build            | locale 路由可绕过、非管理员得到后台 HTML、存在死链接    |
| C: module complete   | Chromium E2E, all project gates, audit, diff review | 任一 Success Criterion/DoD 无证据，或出现无关改动       |

每个 checkpoint 都保持可回退：本模块无 D1 migration；回滚相应代码与文档即可恢复现状，
不会修改生产数据、binding、route/domain 或 secret。

## Risks and Mitigations

| Risk                                                    | Impact | Mitigation                                                                   |
| ------------------------------------------------------- | ------ | ---------------------------------------------------------------------------- |
| locale rewrite 与 `/admin` guard 顺序错误造成绕过或循环 | High   | 对无前缀及所有支持 locale 先写 middleware 测试；以解析后的 page segment 判断 |
| `returnTo` 形成开放重定向或编码绕过                     | High   | 默认拒绝 allowlist validator；服务端生成且登录成功前再次验证恶意样本         |
| session 内旧角色导致撤权后仍可访问                      | High   | 每个受保护请求查询当前 D1 用户行，不缓存授权结果                             |
| 权限迁移改变既有 API 错误 envelope                      | High   | 先锁定 401/403 contract tests，再逐 endpoint 迁移 adapter                    |
| middleware 使 `/admin` 页面额外查询 D1                  | Medium | 只保护 `/admin` 前缀；查询仅选择最小角色/显示字段，不引入跨请求缓存          |
| 后台壳层与现有地点全屏表单布局冲突                      | Medium | 单独迁移页面并做视觉回归；不在本模块改写表单内部                             |
| Navbar 初始 bundle 被地点表单拖大                       | Medium | 只挂 lazy consumer boundary；浏览器网络/构建产物验证打开前不下载             |
| Dialog/Sheet 在软键盘、zoom 或 safe-area 下遮挡操作     | Medium | 组件级焦点测试 + 320px、200% zoom 和移动 viewport E2E                        |
| 三语言生成文件造成大范围噪声                            | Low    | 只编辑 `admin`/`nav` source JSON，运行官方 build 并审查生成 diff             |

## Open Questions

无。计划若需要改变已批准规格、capability map、auth 语义或新增 schema/依赖，先停止并重新审批。
