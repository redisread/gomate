# Task List: admin-copy-experience

状态：已批准（2026-08-25，用户授权连续完成全部阶段）

## Task 1: 修复 SSR 标题与三语言语义

- [ ] 测试先锁定新增/编辑页标题 key 与术语。
- [ ] 修复 `formLocationType`、日文警告示例及相关三语言 copy。
- [ ] 验证：`pnpm i18n:build && pnpm i18n:gen-types && pnpm i18n:validate`。

## Task 2: 迁移管理员错误展示

- [ ] 测试证明已知 reason 本地化、未知 message 使用 fallback。
- [ ] 用户、标签、地点、快速草稿不再展示异常或服务端 message。
- [ ] 验证：admin management 聚焦组件测试。

## Task 3: 迁移原始枚举与季节展示

- [ ] 用户角色/状态、地点状态通过共享 `enums` key 展示。
- [ ] 地点编辑预览与相关共享季节展示不再输出 `spring` 等标识。
- [ ] 验证：组件测试与 `pnpm type-check`。

## Task 4: 接入后台语言切换

- [ ] 桌面侧栏和移动后台头部均可访问语言切换。
- [ ] 可访问名称、触控尺寸和路径保留通过测试。
- [ ] 验证：admin navigation/locale toggle 组件测试。

## Task 5: 三语言运行时验收

- [ ] `zh-CN`、`en`、`ja` 后台首页、列表、新增/编辑入口关键文案正确。
- [ ] 页面无控制台错误，关键链接和 locale 切换正确。
- [ ] 全量前端门禁通过。
