# Task List: admin-i18n-contract

状态：已批准（2026-08-25）

## Task 1: 建立稳定管理员错误原因解析合同

**Description:** 以测试驱动新增八个稳定 reason 的公开 union、运行时类型守卫和安全 payload 解析器。解析器只接受 `error.details.reason` 中的已知值，不能读取或返回服务端 message。

**Acceptance criteria:**

- [ ] 八个已批准 reason 由单一 `as const` 来源导出，类型从该来源推导。
- [ ] type guard 对所有已知值返回 true，对未知值和非字符串返回 false。
- [ ] 解析器对已知结构返回 reason，对未知、畸形、message-only payload 返回 null。

**Verification:**

- [ ] 先观察新增测试失败，再实现至通过。
- [ ] `pnpm vitest run --config vitest.config.ts src/lib/admin-i18n.test.ts`
- [ ] `pnpm type-check`

**Dependencies:** None

**Files likely touched:**

- `src/contracts/admin-i18n.ts`
- `src/lib/admin-i18n.ts`
- `src/lib/admin-i18n.test.ts`

**Estimated scope:** Medium

## Task 2: 补齐共享枚举的三语言资源

**Description:** 在三个 locale 的 `enums` namespace 中增加用户角色、账号状态、地点状态和季节的自然语言标签，保留现有活动类型来源。

**Acceptance criteria:**

- [ ] `zh-CN`、`en`、`ja` 拥有完全一致的新增 key。
- [ ] 文案符合已批准术语表，日文没有中日混写。
- [ ] 不移动或复制既有 `locationType.*` key。

**Verification:**

- [ ] `pnpm i18n:validate`
- [ ] 人工逐项对照规格术语表。

**Dependencies:** Task 1

**Files likely touched:**

- `public/locales/zh-CN/enums.json`
- `public/locales/en/enums.json`
- `public/locales/ja/enums.json`

**Estimated scope:** Medium

## Task 3: 建立编译期穷尽的枚举展示映射

**Description:** 先为所有公开角色、账号状态、地点状态和季节值编写失败测试，再运行 i18n 生成并用 `satisfies Record<Union, TranslationKey>` 实现穷尽映射。

**Acceptance criteria:**

- [ ] 每个公开枚举值映射到 Task 2 中存在的 `enums.*` key。
- [ ] 新增 union 值时，缺失映射会导致类型检查失败。
- [ ] 映射不提供原始字符串或兼容 fallback。

**Verification:**

- [ ] 先观察映射测试失败，再实现至通过。
- [ ] `pnpm i18n:build`
- [ ] `pnpm vitest run --config vitest.config.ts src/lib/admin-i18n.test.ts`
- [ ] `pnpm type-check`

**Dependencies:** Task 2

**Files likely touched:**

- `src/lib/admin-i18n.ts`
- `src/lib/admin-i18n.test.ts`
- `src/i18n/locales-data.ts`（生成）
- `src/i18n/types.ts`（生成）

**Estimated scope:** Medium

## Task 4: 补齐管理员操作错误的三语言资源

**Description:** 在三个 locale 的 `admin` namespace 中增加八个稳定 reason 对应的自然、操作导向错误文案，不暴露服务端诊断文本。

**Acceptance criteria:**

- [ ] 每个 reason 在三个 locale 中都有一一对应的 key。
- [ ] 文案告诉管理员发生了什么以及可采取的下一步。
- [ ] 三个 locale 的插值变量集合完全一致。

**Verification:**

- [ ] `pnpm i18n:validate`
- [ ] 人工核对中文、英文、日文语义一致性。

**Dependencies:** Task 1

**Files likely touched:**

- `public/locales/zh-CN/admin.json`
- `public/locales/en/admin.json`
- `public/locales/ja/admin.json`

**Estimated scope:** Medium

## Task 5: 建立安全的管理员错误 key 映射

**Description:** 以测试驱动将八个稳定 reason 穷尽映射到 Task 4 的 `admin` translation key，并证明未知 payload 只能进入调用方本地化 fallback。

**Acceptance criteria:**

- [ ] 每个稳定 reason 映射到正确的 `admin` key。
- [ ] 未知、畸形和 message-only payload 返回 null，不泄漏 message。
- [ ] reason union 扩展时，缺失映射会导致类型检查失败。

**Verification:**

- [ ] 先观察映射测试失败，再实现至通过。
- [ ] `pnpm i18n:build`
- [ ] `pnpm vitest run --config vitest.config.ts src/lib/admin-i18n.test.ts`
- [ ] `pnpm type-check`

**Dependencies:** Task 1, Task 4

**Files likely touched:**

- `src/lib/admin-i18n.ts`
- `src/lib/admin-i18n.test.ts`
- `src/i18n/locales-data.ts`（生成）
- `src/i18n/types.ts`（生成）

**Estimated scope:** Medium

## Checkpoint A: 展示合同

- [ ] Tasks 1–5 的聚焦测试全部通过。
- [ ] `pnpm i18n:build`
- [ ] `pnpm i18n:validate`
- [ ] `pnpm type-check`
- [ ] staged/diff 中没有手工编辑生成文件或无关 locale 改动。

## Task 6: 为用户权限冲突提供稳定 reason

**Description:** 先扩展路由测试，再为管理员修改自身角色和撤销最后一名正常管理员两个 409 分支附加精确 reason。

**Acceptance criteria:**

- [ ] 自身角色变更返回 `admin_self_role_change`。
- [ ] 最后一名正常管理员撤销返回 `admin_last_active_revoke`。
- [ ] HTTP 409、顶层 `CONFLICT` 和现有权限/幂等语义不变。

**Verification:**

- [ ] 先观察新增响应断言失败，再实现至通过。
- [ ] `pnpm vitest run --config vitest.server.config.ts src/server/routes/admin-users.test.ts`

**Dependencies:** Task 1

**Files likely touched:**

- `src/server/routes/admin-users.ts`
- `src/server/routes/admin-users.test.ts`

**Estimated scope:** Small

## Task 7: 为标签冲突提供稳定 reason

**Description:** 先扩展标签管理路由测试，再为标签创建冲突和更新冲突附加精确 reason，同时保留同名标签幂等创建成功行为。

**Acceptance criteria:**

- [ ] 非幂等创建冲突返回 `tag_already_exists`。
- [ ] 更新冲突返回 `tag_update_conflict`。
- [ ] HTTP 状态、顶层 code、引用分离和幂等语义不变。

**Verification:**

- [ ] 先观察新增响应断言失败，再实现至通过。
- [ ] `pnpm vitest run --config vitest.server.config.ts src/server/routes/tags-management.test.ts`

**Dependencies:** Task 1

**Files likely touched:**

- `src/server/routes/tags.ts`
- `src/server/routes/tags-management.test.ts`

**Estimated scope:** Small

## Task 8: 为地点校验与冲突提供稳定 reason

**Description:** 先扩展现有地点管理路由测试，再为地区无效、图片域名不允许、并发变更和引用阻止永久删除分支附加精确 reason。

**Acceptance criteria:**

- [ ] 地区校验失败返回 `location_invalid_region`，图片域名失败返回 `location_image_host_disallowed`。
- [ ] 更新、归档或永久删除竞争失败返回 `location_changed_concurrently`。
- [ ] 引用阻止永久删除返回 `location_has_references`，且原有 `references` 数据仍保留。

**Verification:**

- [ ] 先观察新增响应断言失败，再实现至通过。
- [ ] `pnpm vitest run --config vitest.server.config.ts src/server/routes/admin-access-consumers.test.ts`

**Dependencies:** Task 1

**Files likely touched:**

- `src/server/routes/locations/mutations.ts`
- `src/server/routes/admin-access-consumers.test.ts`

**Estimated scope:** Medium

## Checkpoint B: 服务端提供方

- [ ] Tasks 6–8 的聚焦 server tests 全部通过。
- [ ] `pnpm test:server`
- [ ] `pnpm db:check`
- [ ] HTTP 状态、顶层 code、权限与竞争保护没有回归。

## Task 9: 更新现行 API 与前端边界文档

**Description:** 将稳定 reason 列表、message 隔离规则、枚举展示边界和 namespace 所有权写入现行文档，不新增重复的长期 spec。

**Acceptance criteria:**

- [ ] API 文档列出八个 reason、响应位置及兼容 fallback 规则。
- [ ] 前端文档规定管理员 UI 不展示服务端 message 或原始枚举值。
- [ ] 文档明确业务内容不翻译且本模块无数据库变化。

**Verification:**

- [ ] `rg -n "admin_self_role_change|error.details.reason|server message|原始枚举" docs/backend-api.md docs/frontend-pages.md`
- [ ] `git diff --check`

**Dependencies:** Tasks 3, 5, 6, 7, 8

**Files likely touched:**

- `docs/backend-api.md`
- `docs/frontend-pages.md`

**Estimated scope:** Small

## Task 10: 完成模块级全量验证

**Description:** 运行规格中的聚焦门禁、API 门禁和统一 Worker 门禁，审查最终 diff，确认模块达到进入下一能力规格阶段的条件。

**Acceptance criteria:**

- [ ] 规格中的全部成功标准有测试或命令证据。
- [ ] 无数据库、迁移、依赖、认证或生产配置变化。
- [ ] 无秘密、无关文件、手工生成物或未解释的测试跳过。

**Verification:**

- [ ] `pnpm i18n:build`
- [ ] `pnpm i18n:validate`
- [ ] `pnpm lint`
- [ ] `pnpm type-check`
- [ ] `pnpm test`
- [ ] `pnpm test:server`
- [ ] `pnpm db:check`
- [ ] `pnpm build`
- [ ] `git diff --check`

**Dependencies:** Task 9

**Files likely touched:** None expected beyond generated i18n outputs already tracked in Tasks 3 and 5

**Estimated scope:** Small

## Checkpoint C: admin-i18n-contract complete

- [ ] Tasks 1–10 全部完成并逐项勾选。
- [ ] 最终 diff 与批准规格和计划一致。
- [ ] `admin-copy-experience` 可以只消费稳定 enum key 与管理员错误 key，不解析服务端 message。
