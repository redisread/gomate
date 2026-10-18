# 依赖升级与 Starwind UI 迁移

## 范围与授权

用户要求将可兼容升级的组件升级到最新稳定版，引入最新 Starwind UI，并替换适用的现有 UI。用户已要求拆分并执行。基线为 `bf3dcc02`；不改变业务、同源 API、权限、国际化、品牌 token 或数据库 schema。

## 决策

- 以 npm latest 和官方文档为版本来源；TypeScript 7 被 Astro check / typescript-eslint 的 peer 范围阻挡，使用最新兼容的 6 系列并记录原因。
- Starwind CLI 3.4.0、Astro/React adapter 1.3.0；使用官方可编辑组件源，React island 内使用 React adapter，Astro 页面使用 Astro 源。
- 保留现有语义 token、国际化、移动端 16px 输入和 44px 目标、reduced-motion、焦点管理及 safe area。
- 先验证公共组件，再按用户路径迁移；不以简单改名冒充 Starwind 接入，不把业务表单和上传流程替换成没有等价行为的通用控件。
- Node 选择最新 LTS；类型与运行主版本对齐。构建平台变量只能经受保护流程同步。

## 顺序

1. 依赖兼容升级与工具链验证。
2. Starwind 安装、主题适配、基础控件验证。
3. 认证与资料表单迁移。
4. 地点、队伍与筛选迁移。
5. 后台与公共页面迁移。
6. 弹层、反馈、头像、加载状态适配及剩余使用点审计。
7. 全量验证、独立子代理审查、PR、CI、按风险判定合并及 smoke。

每个阶段结束运行针对性检查；最终完成条件为项目统一门禁、Worker 检查、生产依赖审计、E2E 以及桌面/移动/键盘/dark/reduced-motion 验证。任务细分见 todo.md。

## 风险

| 风险 | 对策 |
| --- | --- |
| 大版本工具链改变默认行为 | 分阶段验证，不降低断言或静默禁用规则 |
| Starwind DOM/事件差异 | 保持受控值、提交语义、焦点及可访问名称，行为测试 |
| 默认主题覆盖品牌 | 复用现有 token，不引入第二套色值 |
| Workers 构建与浏览器有差异 | 正式产物 Worker 测试、dry-run、size、E2E |

## 状态

依赖和 UI 迁移已实施，完整本地门禁与三轮独立审查已通过；后续 PR/受保护 CI/发布状态记录在 PR。Better Auth 的旧 issuer 列通过官方 additionalFields/create hook 保持兼容，不改 schema；决策与版本详见 docs/tech-stack-upgrade.md。
