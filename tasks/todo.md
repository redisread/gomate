# Task List: admin-i18n-guardrails

状态：已批准（2026-08-25，用户授权连续完成全部阶段）

## Task 1: 静态门禁 TDD

- [x] 用 fixture 覆盖硬编码标题/文案、无效 key、旧 key、原始枚举和不安全错误 helper。
- [x] 实现可测试的后台源码扫描器并验证当前仓库正向通过。

## Task 2: 默认质量门禁

- [x] 将专项扫描接入 `pnpm i18n:validate`。
- [x] 保持现有 locale parity、namespace coverage 和类型生成行为。

## Task 3: 三语言 Chromium 冒烟

- [x] 验证中文、英文、日文后台 shell 与语言入口。
- [x] 验证 locale 前缀导航和新增地点活动类型术语。
- [x] 验证关键路径无页面错误和横向溢出。

## Task 4: 长期文档与最终门禁

- [x] 更新 `docs/frontend-pages.md`。
- [ ] 运行完整质量门禁和代码审查。
- [ ] 删除临时任务文档后创建 PR。
