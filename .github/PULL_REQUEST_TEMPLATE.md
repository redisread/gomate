## 目的

<!-- 说明问题、为什么现在要改，以及用户或运维侧的预期结果；不要复述 diff。 -->

## 范围

- 包含：
- 不包含：
- 关联 Issue / Spec / ADR：

## 风险与兼容性

- 风险等级：<!-- 低 / 中 / 高。D1、bindings、route、认证、安全或生产写入通常为高风险。 -->
- 用户可见或 API 破坏性变更：<!-- 无；或列出 endpoint、字段、行为及迁移方式。 -->
- 主要失败模式与限制措施：

## 验证证据

<!-- 只勾选实际通过的项目并补充结果；计划执行或未运行的检查不得勾选。 -->

- [ ] `pnpm test:ci`
- [ ] `pnpm worker:types && pnpm worker:dry-run && pnpm worker:size`
- [ ] `pnpm audit --prod --audit-level high`（生产相关改动时）
- [ ] `pnpm test:e2e:ci`（涉及关键用户流程时）
- [ ] UI：桌面端、移动端、键盘、可访问名称和 i18n 已验证（涉及界面时）
- [ ] 其他自动或手动验证：
- [ ] Preview：PR 评论 URL、分支 alias、重新登录、私有读取和业务写入拦截已验证（涉及时）
- 未运行项及原因：

## Cloudflare 与数据影响

<!-- 勾选所有适用项；全部不涉及时只勾选“不涉及”。 -->

- [ ] 不涉及 Cloudflare 运行时或远程数据
- [ ] Worker 代码、Static Assets、兼容日期或 flags
- [ ] route、custom domain 或 Workers Builds 配置
- [ ] Preview URL、alias 或 Preview host/只读认证边界
- [ ] D1 schema、migration 或生产数据
- [ ] R2 bucket、对象或公开 URL
- [ ] bindings、变量、rate limit 或 secrets
- [ ] 认证、缓存、日志、trace 或隐私边界

精确目标、预期状态和影响范围：

### Worker 检查（适用时）

- [ ] 配置、bindings 与 `wrangler types` 生成类型一致；secret 值未进入代码、配置、日志或 artifact
- [ ] 不保存请求级全局可变状态；Promise 均被 `await`、返回或交给 `waitUntil()`
- [ ] 大型或未知大小的 body 使用流式处理；访问 Cloudflare 服务优先使用 binding
- [ ] 新日志可查询且不包含 body、headers、cookie、token、原始 email/IP 或用户资料

### D1 / R2 检查（适用时）

- migration / 对象范围：
- 全新本地 D1 重放结果：
- 当前与上一 Worker version 的 schema 兼容性：
- 数据或对象恢复方式：

## 发布、验证与回滚

<!-- 合并到 main 会触发 Workers Builds：先应用待执行 D1 migration，再部署 Worker。Worker 版本回滚不会恢复 D1/R2 状态。 -->

- 合并后的生产影响：
- 发布后 smoke：<!-- /api/health、SSR、关键只读 API、version/request ID 与脱敏日志。 -->
- Worker 回滚目标或停止发布方式：<!-- 仅写计划；生产恢复仍需精确目标、schema 兼容性与单独批准。 -->
- schema / 数据 / R2 无法随 Worker 回滚时的处理方式：
