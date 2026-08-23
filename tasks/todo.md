# 管理员内容管理实施任务

## Task 1: 活动目录数据与 API

- [ ] 迁移四个内置类型并移除队伍固定枚举约束。
- [ ] 公开启用查询、管理员统计查询、增改启停均有合同测试。
- [ ] 验证：`pnpm test:server -- src/server/routes/activity-types.test.ts && pnpm db:check && pnpm type-check`

## Task 2: 活动目录 UI

- [ ] 响应式列表、创建、改名、排序和启停状态完整。
- [ ] 验证：聚焦组件测试与键盘检查。

## Task 3: 标签目录

- [ ] 引用计数、重命名、确认解除并删除的 API 与 UI 完成。
- [ ] 验证：标签服务端与组件测试。

## Task 4: 用户角色管理

- [ ] 列表/搜索和角色变更完成，自改及最后管理员保护通过竞争测试。
- [ ] 验证：用户管理服务端与组件测试。

## Checkpoint 1

- [ ] `pnpm lint && pnpm type-check && pnpm test:server && pnpm db:check`

## Task 5: 地点草稿与发布合同

- [ ] 草稿仅名称、介绍、地区必填；发布完整性与可选活动/标签通过测试。
- [ ] 验证：地点路由聚焦测试。

## Task 6: 快速草稿交互

- [ ] 管理员可在快速面板保存草稿并继续编辑，可选扩展不阻塞基本流程。
- [ ] 验证：组件测试和 Playwright 移动/桌面流程。

## Task 7: 地点管理生命周期

- [ ] 列表、全字段编辑、归档默认、永久删除引用保护完成。
- [ ] 验证：服务端、组件与 E2E。

## Checkpoint 2

- [ ] `pnpm test && pnpm test:server && pnpm build`

## Task 8: 队伍动态活动 API

- [ ] 必填启用活动，允许非推荐活动，拒绝停用/未知活动，历史可读。
- [ ] 验证：队伍路由测试。

## Task 9: 队伍创建与筛选 UI

- [ ] 推荐类型优先但展示所有启用项，筛选动态化。
- [ ] 验证：组件测试与关键 E2E。

## Task 10: 文档与交付

- [ ] 更新现行 docs、移除一次性规格/计划并完成评审。
- [ ] 验证：`pnpm i18n:build && pnpm i18n:validate && pnpm test:ci && pnpm test:e2e:ci && git diff --check`
- [ ] 推送现有分支并更新 PR #602，等待所有 required checks 通过。
