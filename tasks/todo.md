# Task List: admin-platform

状态：Phase 3 已批准（2026-08-23），Phase 4 Checkpoint A 已完成，Task 3 待实施

规格：[SPEC-admin-platform.md](../SPEC-admin-platform.md)

计划：[tasks/plan.md](plan.md)

任何任务只有在自身验收条件、验证步骤和项目 Definition of Done 同时满足后才能勾选。

## Phase A: Authoritative API authorization

### Task 1: 共享管理员访问合同接入地点 API

**Description:** 先写失败测试，再新增 `resolveAdminAccess`、管理员错误类型和 Hono adapter，
以现有地点管理员读写路径作为首个真实消费者；移除 `locations/utils.ts` 中的权限实现副本，
保持现有 Location API 的 401/403 envelope 与业务行为。

**Acceptance criteria:**

- [x] 判别联合准确区分 `authorized`、`unauthenticated`、`forbidden`，并从当前 D1 用户行复核 active 状态和角色。
- [x] 地点管理员查询与写入都消费共享 adapter，不再从 location utils 自行解析管理员角色。
- [x] 无 session、普通用户、已撤权 session 和管理员路径均有先失败后通过的自动化断言。

**Verification:**

- [x] `pnpm exec vitest run --config vitest.server.config.ts src/server/lib/admin-access.test.ts src/server/routes/locations/utils.test.ts`
- [x] `pnpm lint`
- [x] `pnpm type-check`

**Dependencies:** None

**Files likely touched:**

- `src/server/lib/admin-access.ts`
- `src/server/lib/admin-access.test.ts`
- `src/server/routes/locations/utils.ts`
- `src/server/routes/locations/mutations.ts`
- `src/server/routes/locations/queries.ts`

**Estimated scope:** Medium, 5 files

### Task 2: 迁移标签与上传管理员 API

**Description:** 把标签创建和地点图片上传的管理员校验迁到共享 Hono adapter，删除各自的
角色查询副本；用一个聚焦的 consumer 回归测试锁定 endpoint 的 401、403 与管理员成功路径。

**Acceptance criteria:**

- [x] `POST /tags` 和管理员地点上传路径不再自行查询或信任客户端角色。
- [x] 两条路径保持现有成功响应和统一 401/403 error envelope。
- [x] Story 的 author-or-admin 语义未被顺手改写，diff 不包含无关权限重构。

**Verification:**

- [x] `pnpm exec vitest run --config vitest.server.config.ts src/server/routes/admin-access-consumers.test.ts`
- [x] `pnpm test:server`
- [x] `pnpm lint`

**Dependencies:** Task 1

**Files likely touched:**

- `src/server/routes/tags.ts`
- `src/server/routes/upload.ts`
- `src/server/routes/admin-access-consumers.test.ts`

**Estimated scope:** Medium, 3 files

## Checkpoint A: API authorization

- [x] Task 1–2 的 focused tests、`pnpm test:server`、lint、type-check 全部通过。
- [x] 当前所有纯管理员 API 都使用共享访问合同；401/403 envelope 未变化。
- [x] `git diff --check` 通过，且没有 schema、migration、依赖或无关文件变化。
- [x] 检查点通过前不开始页面授权工作。

## Phase B: Protected page path

### Task 3: 安全登录返回路径

**Description:** 先为合法与恶意样本编写测试，再建立默认拒绝的后台返回路径 validator；
登录成功只返回经过验证、以 `/admin` 开头的站内绝对路径，其他情况保持回首页。

**Acceptance criteria:**

- [ ] 合法 `/admin` 与嵌套后台路径可往返并保留安全 query；fragment 不进入服务端返回合同。
- [ ] 外部 URL、协议相对 URL、反斜杠、双重编码和非后台路径全部回退 `/`。
- [ ] 无 `returnTo` 的既有登录仍跳转首页，失败与 loading 行为不回归。

**Verification:**

- [ ] `pnpm exec vitest run --config vitest.config.ts src/lib/admin-return-path.test.ts src/components/features/login-return.test.tsx`
- [ ] `pnpm test`
- [ ] `pnpm type-check`

**Dependencies:** Checkpoint A

**Files likely touched:**

- `src/lib/admin-return-path.ts`
- `src/lib/admin-return-path.test.ts`
- `src/components/features/login-client.tsx`
- `src/components/features/login-return.test.tsx`

**Estimated scope:** Medium, 4 files

### Task 4: `/admin/*` SSR guard 与 403 页面

**Description:** 扩展类型化 Astro locals，并在 middleware 中对无前缀和全部 locale 前缀的
`/admin` 请求调用共享访问解析器；在渲染后台内容前完成 302/403/authorized 分支和 no-store header。

**Acceptance criteria:**

- [ ] 访客得到携带安全 `returnTo` 的 302，active 普通用户得到真实 HTTP 403，管理员进入后续页面管线。
- [ ] `/admin`、嵌套路径和所有支持 locale 的等价行为一致，不产生 rewrite/redirect 循环。
- [ ] `Astro.locals.admin` 只暴露规格允许的最小字段；管理员与 403 响应均为 `private, no-store`。

**Verification:**

- [ ] `pnpm exec vitest run --config vitest.config.ts src/__tests__/middleware.test.ts`
- [ ] `pnpm test`
- [ ] `pnpm build`

**Dependencies:** Task 1, Task 3

**Files likely touched:**

- `src/env.d.ts`
- `src/middleware.ts`
- `src/__tests__/middleware.test.ts`
- `src/pages/403.astro`

**Estimated scope:** Medium, 4 files

## Checkpoint B: Page authorization

- [ ] Task 3–4 focused tests、unit suite 和 production build 通过。
- [ ] 恶意 `returnTo`、locale 绕过、旧角色授权和非管理员 HTML 泄露用例均被自动化覆盖。
- [ ] 浏览器手动确认访客、普通用户、管理员三条 `/admin` 路径。
- [ ] 检查点通过前不创建后台壳层。

## Phase C: Responsive admin shell

### Task 5: 后台 i18n 合同

**Description:** 为后台首页、导航、无权限页面和快速操作容器补齐中英日文案，生成 locale 数据
和类型；只增加本模块真实界面会消费的文案，不预写用户、标签、活动类型等未来模块内容。

**Acceptance criteria:**

- [ ] 三种 locale 具有相同 key topology，且文案允许换行与长字符串增长。
- [ ] 新增 key 只覆盖 `/admin` 壳层、当前地点入口、403 和快速操作容器，不包含未来模块占位文案。
- [ ] 生成文件只由项目脚本产生，没有手工修改或无关 locale churn。

**Verification:**

- [ ] `pnpm i18n:build`
- [ ] `pnpm i18n:gen-types`
- [ ] `pnpm i18n:validate`
- [ ] `pnpm type-check`

**Dependencies:** Checkpoint B

**Files likely touched:**

- `public/locales/zh-CN/admin.json`
- `public/locales/en/admin.json`
- `public/locales/ja/admin.json`
- `src/i18n/locales-data.ts` (generated)
- `src/i18n/types.ts` (generated)

**Estimated scope:** Medium, 5 files

### Task 6: `AdminLayout`、后台首页与响应式导航

**Description:** 以 Astro 壳层承载页面结构，以小型 React island 承载移动抽屉；桌面侧栏、
移动顶部栏、模块入口和返回前台形成一条可用路径，并复用现有主题、locale 和设计 token。

**Acceptance criteria:**

- [ ] 管理员访问 `/admin` 得到一个 `<h1>`、清晰 landmarks、当前路由状态和无死链接的真实入口。
- [ ] 内容不能继续容纳时切换为移动抽屉；320px、长文案和 200% zoom 下操作不被裁切。
- [ ] 抽屉具有可访问名称、44×44 目标、Escape/焦点恢复和 reduced-motion 行为测试。

**Verification:**

- [ ] `pnpm exec vitest run --config vitest.config.ts src/components/admin/admin-navigation.test.tsx`
- [ ] `pnpm test`
- [ ] `pnpm build`
- [ ] 手动检查 320px、断点附近和 1440px 布局

**Dependencies:** Task 4, Task 5

**Files likely touched:**

- `src/layouts/AdminLayout.astro`
- `src/components/admin/admin-navigation.tsx`
- `src/components/admin/admin-navigation.test.tsx`
- `src/pages/admin/index.astro`

**Estimated scope:** Medium, 4 files

### Task 7: 现有地点管理页面迁入后台壳层

**Description:** 将当前地点新建和编辑 Astro 页面接入统一 `AdminLayout`，移除仅靠客户端跳转
承担权限保护的页面边界；不修改地点表单字段、验证、保存、草稿或删除行为。

**Acceptance criteria:**

- [ ] 两个页面共享后台导航、标题层级和 SSR 管理员上下文。
- [ ] 非管理员在 React/location bundle 执行前已被 SSR guard 阻止。
- [ ] 地点表单现有创建、编辑和懒加载行为保持不变。

**Verification:**

- [ ] `pnpm build`
- [ ] `pnpm test`
- [ ] 管理员手动打开 `/admin/locations/new` 和一个 `/admin/locations/:id/edit`

**Dependencies:** Task 6

**Files likely touched:**

- `src/pages/admin/locations/new.astro`
- `src/pages/admin/locations/[id]/edit.astro`

**Estimated scope:** Small, 2 files

## Checkpoint C: Protected admin shell

- [ ] Task 5–7 的 i18n、component tests、unit suite 和 build 全部通过。
- [ ] `/admin`、地点新建和编辑页面无死链接、无 hydration mismatch、无非管理员内容泄露。
- [ ] 桌面、移动、长文案、dark theme、reduced-motion 和 200% zoom 手动检查通过。
- [ ] 检查点通过前不挂接公共 Navbar 快速操作能力。

## Phase D: Quick action infrastructure

### Task 8: 可访问的快速操作 Dialog/Sheet 容器

**Description:** 基于现有 Modal/focus 模式建立业务无关的 `AdminQuickAction`，消费者通过
`children` 注入内容；容器根据可用宽度呈现 Dialog 或 Bottom Sheet，负责焦点、滚动和 safe-area。

**Acceptance criteria:**

- [ ] 宽布局为 Dialog、窄布局为 Bottom Sheet，标题和操作区在软键盘/滚动条件下保持可达。
- [ ] 初始焦点、Tab 圈定、Escape、backdrop、关闭后焦点恢复、inert 和 scroll cleanup 均有测试。
- [ ] 组件不导入地点、标签、活动类型或保存逻辑，也不建设运行时注册系统。

**Verification:**

- [ ] `pnpm exec vitest run --config vitest.config.ts src/components/admin/admin-quick-action.test.tsx`
- [ ] `pnpm test`
- [ ] `pnpm type-check`

**Dependencies:** Task 5, Task 6

**Files likely touched:**

- `src/components/admin/admin-quick-action.tsx`
- `src/components/admin/admin-quick-action.test.tsx`
- `src/components/ui/modal.tsx` (仅在现有合同确有缺口时)

**Estimated scope:** Medium, 2–3 files

### Task 9: 公共 Navbar 管理员入口与 lazy mount

**Description:** 修复 Navbar 丢弃 `/users/me.role` 导致管理员入口不可达的问题，把后台链接指向
真实 `/admin`；提供只有管理员授权态才调用的快速操作 render boundary，消费者缺席时不展示空入口。

**Acceptance criteria:**

- [ ] loading、访客、普通用户均不闪现管理员入口；管理员可见真实 `/admin` 链接。
- [ ] 快速操作 renderer 只在管理员态调用，未提供消费者时不显示空按钮。
- [ ] 初始公共页面不静态导入或下载地点完整表单 bundle。

**Verification:**

- [ ] `pnpm exec vitest run --config vitest.config.ts src/__tests__/navbar-auth-state.test.tsx`
- [ ] `pnpm test`
- [ ] `pnpm build`

**Dependencies:** Task 8

**Files likely touched:**

- `src/components/layout/navbar.tsx`
- `src/__tests__/navbar-auth-state.test.tsx`

**Estimated scope:** Small, 2 files

## Checkpoint D: Quick action infrastructure

- [ ] Task 8–9 的组件测试、unit suite、type-check 和 build 全部通过。
- [ ] 键盘、触屏、Escape、焦点恢复、safe-area、reduced-motion 手动检查通过。
- [ ] 构建产物或浏览器网络证据证明打开前不加载地点表单 bundle。
- [ ] 检查点通过前不进入最终 E2E 与文档验收。

## Phase E: Runtime proof and handoff

### Task 10: 管理员 E2E 与现行文档

**Description:** 用本地专用 fixture 注册并通过现有 local-only 脚本提升管理员，覆盖访客登录返回、
普通用户 403、管理员导航、移动抽屉和快速 overlay；同步更新三个现行文档，只写已验证的当前行为。

**Acceptance criteria:**

- [ ] Chromium E2E 覆盖三种身份、locale 后台路径、320px/1440px/200% zoom 和焦点恢复。
- [ ] E2E 管理员提升仅作用于临时本地 D1，不暴露 email、token 或生产写路径。
- [ ] frontend/API/design-system 文档与实际路由、授权和布局一致，不复制执行历史或未来占位模块。

**Verification:**

- [ ] `pnpm exec playwright test e2e/admin-platform.spec.ts --project=chromium`
- [ ] `pnpm i18n:validate`
- [ ] Markdown 链接、格式和 `git diff --check` 通过

**Dependencies:** Checkpoint D

**Files likely touched:**

- `e2e/admin-platform.spec.ts`
- `e2e/fixtures.ts`
- `docs/frontend-pages.md`
- `docs/backend-api.md`
- `docs/design-system.md` (仅当实现形成新稳定模式)

**Estimated scope:** Medium, 4–5 files

### Task 11: 完整门禁、规格验收与变更审查

**Description:** 执行全部项目门禁、依赖审计和运行时复核，逐项映射 spec Success Criteria 与
Definition of Done；只在所有证据成立后更新计划状态，不提交、推送、创建 PR 或部署。

**Acceptance criteria:**

- [ ] `SPEC-admin-platform.md` 10 条 Success Criteria 和所有 checkpoint 都有可定位证据。
- [ ] 完整门禁通过，依赖审计没有未缓解的 reachable high/critical，diff 无秘密、生成物遗漏或无关改动。
- [ ] capability map、spec、plan、todo 和现行 docs 状态一致，明确下一模块为 `activity-catalog`。

**Verification:**

- [ ] `pnpm i18n:build && pnpm i18n:validate`
- [ ] `pnpm lint && pnpm type-check`
- [ ] `pnpm test && pnpm test:server && pnpm build`
- [ ] `pnpm audit --audit-level high`
- [ ] `git diff --check && git status --short`

**Dependencies:** Task 10

**Files likely touched:**

- `CAPABILITY-MAP-admin-content-management.md`
- `SPEC-admin-platform.md`
- `tasks/plan.md`
- `tasks/todo.md`

**Estimated scope:** Small, verification plus 4 status documents

## Checkpoint E: Phase 3 ready for implementation

- [ ] 用户明确批准本任务清单。
- [ ] 每项任务均有验收、验证、依赖、文件范围和大小估计。
- [ ] 没有任务超过约 5 个主要文件；没有未声明的 schema、依赖、CI 或生产变更。
- [ ] 批准后才进入 Phase 4，并按 Task 1 顺序使用 incremental implementation 与 TDD。
