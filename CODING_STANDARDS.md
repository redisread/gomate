# GoMate 编码规范

本文件维护编码约束与验证要求；任务入口由 [AGENTS.md](AGENTS.md) 按修改范围指向对应章节。架构决策与接口合同保留在现行 `docs/` 文档，代码、配置、迁移与测试是可执行事实来源。

## 编码原则

### 关于角色

来自《程序员修炼之道》
关于程序员：
理解身为一名程序员到底意味着什么，编程关涉诸事——尽量减少未来的痛苦，让队友更轻松，做错事情后能够重新振作起来，养成良好的习惯，以及理解工具集。

### 遵循 《代码整洁之道》 的要求编写代码
- 写优雅和高效的代码。代码逻辑应当直截了当，叫缺陷难以隐藏；尽量减少依赖关系，使之便于维护；依据某种分层战略完善错误处理代码；性能调至最优，省得引诱别人做没规矩的优化，搞出一堆混乱来。整洁的代码只做好一件事。
- 尽量使用可复用的组件，减少重复的代码
- 简单代码，依其重要顺序：
  - 能通过所有测试；
  - 没有重复代码；
  - 体现系统中的全部设计理念；
  - 包括尽量少的实体，比如类、方法、函数等。

## 工作与文档

- 修改前检查 `git status` 和现有实现，保留用户及其他 worktree 的改动。
- 使用 `package.json` 声明的 Node 版本与 pnpm；lockfile 只由 pnpm 维护。
- 事实优先级：可执行代码/配置/迁移与测试 → `AGENTS.md` 与本文件 → `docs/` 现行文档 → README。
- 设计或行为变化在同一 PR 更新对应现行文档；长期架构决策写入其决策/约束段。一次性计划、已完成方案和已上线功能 spec 只从 Git 历史查阅，不留在工作树。

## PR 与合并

- 分支默认使用 `codex/` 前缀；合并前检查 staged diff 中的秘密、生成物和无关文件。
- 创建或更新 PR 前读取并遵循 [PR 模板](.github/PULL_REQUEST_TEMPLATE.md)。标题与正文默认中文（可保留 `feat:`、`fix:` 等类型前缀），用户指定其他语言时遵从用户。
- 正文保留模板结构，不以通用 `Summary` / `Verification` 替换；验证项只勾选实际通过的检查。

## 架构与共享合同

- 页面与 API 运行于同一 Worker，开发与生产复用同一 API 实现；入口配置见[本地开发文档](docs/local-dev-worktrees.md)。
- 页面、SSR、认证 Cookie 和 API 同源；浏览器 API 固定使用 `/api/*`，不引入独立 API origin、CORS 或前后端双进程。
- 跨端公开类型统一放在 `src/contracts/`；不要维护前后端 DTO 的兼容副本。
- 使用共享 DTO 和当前 schema 字段，不增加旧字段、旧响应 envelope 或旧分页参数别名。

## 数据库与存储

- schema、journal、snapshot 与有序 migration 链必须同步。
- 所有 DDL 只通过 migration；不得手工对生产 D1 执行 DDL。
- 多语句原子写使用 D1 `batch()` 与条件 DML；不要使用 `db.transaction()` 或裸 `BEGIN`/`COMMIT`。
- JSON 列在 Drizzle 使用 `mode: "json"`，业务层只传对象/数组，不增加字符串兼容层。
- 稳定参考数据通过 migration 管理；测试用户和可变 demo 数据不得进入生产迁移。具体迁移职责见[数据库文档](docs/database.md#迁移与发布阶段)。
- 不得复用已退役资源；新增资源必须经过架构与生产变更评审。

数据库关系与存储决策见[数据库文档](docs/database.md)。

## 前端与国际化

- 用户可见文案全部走 i18n；namespace 必须保持完整。locale 改动按[验证门禁](#验证门禁)执行。
- Astro 负责 SSR/页面边界，React island 只承载需要客户端状态的交互；不要把纯展示无理由改成 client component。
- SSR 调用 API 使用进程内 dispatcher，浏览器调用使用同源 `/api`；不得从 Worker 内 self-fetch 生产域名。
- UI 改动遵循 [设计系统](docs/design-system.md)，并验证键盘、可访问名称、移动端和 reduced-motion。

## API 与认证

- 新增/修改路由遵循 `src/server/app.ts` 和现有 `routes/` 边界；错误使用统一 API error/envelope，列表使用有界 limit 与 opaque cursor。
- 权限与跨表不变量必须在最终写语句中复核，不能只依赖先查后写；关键批处理需覆盖竞争与回滚测试。
- 认证只接受同源受控入口。邮箱验证和密码重置 token 只经 URL fragment 到页面，再以同源 POST body 提交；不得把 token 放进 path/query、日志或数据库明文。
- 日志事件名必须是稳定的 lowercase snake_case 字面量；禁止记录 body、headers、cookie、token、secret、原始 email/IP、用户资料或 Error message/stack/cause。

## 验证门禁

行为改动必须有能先失败后通过的测试；纯文档改动至少验证链接、格式、引用和受影响的静态门禁。按修改范围运行所有适用门禁，重叠命令只需执行一次。

locale 改动：`pnpm i18n:build`、`pnpm i18n:validate`、`pnpm type-check`。

统一 Worker 改动：`pnpm i18n:build`、`pnpm test:ci`。`test:ci` 的检查组成以 [package.json](package.json) 为准；它不包含 `i18n:build`，不能省略生成步骤。

API 改动最低门禁：`pnpm lint`、`pnpm type-check`、`pnpm test:server`、`pnpm db:check`。涉及实际 SQL、原子性或竞争时，按 [审查规范](REVIEW.md#验证必须能够暴露对应错误)补充隔离 Workers/D1 验证。

生产配置、资源或发布变更的附加门禁按[生产变更规约](docs/prod-change-policy.md)执行。
