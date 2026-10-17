# GoMate 编码规范

本文件维护编码约束与验证要求；任务入口由 [AGENTS.md](AGENTS.md) 按修改范围指向对应章节。架构决策与接口合同保留在现行 `docs/` 文档，代码、配置、迁移与测试是可执行事实来源。

## 工作与文档

- 修改前检查 `git status` 和现有实现，保留用户及其他 worktree 的改动。
- 使用 `package.json` 声明的 Node 版本与 pnpm；lockfile 只由 pnpm 维护。
- 多 worktree 首次初始化、后续启动按 [本地开发文档](docs/local-dev-worktrees.md)执行。
- 事实优先级：可执行代码/配置/迁移与测试 → `AGENTS.md` 与本文件 → `docs/` 现行文档 → README。
- 设计或行为变化在同一 PR 更新对应现行文档；长期架构决策写入其决策/约束段。一次性计划、已完成方案和已上线功能 spec 只从 Git 历史查阅，不留在工作树。

| 变更或查询范围           | 现行来源                                         |
| ------------------------ | ------------------------------------------------ |
| 项目启动、常用命令       | [开发与部署](docs/development-and-deployment.md) |
| API 合同与 API 行为变化  | [API 文档](docs/backend-api.md)                  |
| 数据库关系、决策与约束   | [数据库文档](docs/database.md)                   |
| 页面、SSR 与客户端运行时 | [前端页面](docs/frontend-pages.md)               |
| UI 设计                  | [设计系统](docs/design-system.md)                |

## PR 与合并

- 分支默认使用 `codex/` 前缀；合并前检查 staged diff 中的秘密、生成物和无关文件。
- 创建或更新 PR 前读取并遵循 [PR 模板](.github/PULL_REQUEST_TEMPLATE.md)。标题与正文默认中文（可保留 `feat:`、`fix:` 等类型前缀），用户指定其他语言时遵从用户。
- 正文保留模板结构，不以通用 `Summary` / `Verification` 替换；验证项只勾选实际通过的检查。

## 架构与共享合同

- 正式 Worker 使用 Astro 官方 Hono pipeline，开发入口为保留 HMR 使用 Astro 默认入口；二者复用同一个 Hono app，不形成第二套 API。
- 页面、SSR、认证 Cookie 和 API 同源；浏览器 API 固定使用 `/api/*`，不引入独立 API origin、CORS 或前后端双进程。
- 跨端公开类型统一放在 `src/contracts/`；不要维护前后端 DTO 的兼容副本。
- 使用共享 DTO 和当前 schema 字段，不增加旧字段、旧响应 envelope 或旧分页参数别名。

## 可靠性与性能设计

设计所有流程时都要检查故障路径和幂等性。以下是实现与评审要求；具体方案需注明当前状态、适用条件和验证证据，不能把计划采用的能力写成已经上线。

### 故障恢复与幂等性

- 覆盖超时、依赖不可用、重复提交、并发执行、部分成功与进程中断；定义可重试错误、重试上限与退避、降级结果和人工介入条件。
- 写操作采用稳定的业务键或幂等键、唯一约束及条件写入；相同请求重试不得重复产生业务副作用。结果未知时先查询或对账，再决定是否重放；按钮禁用不能替代服务端幂等保证。
- 跨 D1、R2、邮件等系统的操作明确提交边界、补偿与恢复路径。自动纠正必须有界、可观测、可重复执行，并遵守 `WRITE_MODE` 和权限边界；失败超过预算时告警并保留恢复线索。
- 验证重复请求、并发竞争、提交后响应丢失、部分成功后重启等适用场景。将事故中的复现方式与防回归规则沉淀到 `LESSONS.md`，持续改进恢复能力。

### 路由元数据与 Workers KV

- 对读多写少、非敏感且允许延迟生效的关键路由元数据，优先评估使用 Workers KV 保存可重建的分发副本，减少缓存未命中时对业务 D1 数据库的查询。静态代码路由无需为此新增远程查询。
- 明确权威来源、键与版本、更新/失效机制、可接受陈旧窗口，以及缺失、超时和损坏时的有界回源或安全降级。KV 冷读仍可能访问其中央存储，不能承诺所有缓存未命中都无需远程读取。
- KV 是最终一致的，空值查询也可能被缓存；需要立即生效的授权、会话撤销、精确计数及安全路由判断不能以 KV 为唯一依据。以命中率、D1 回源率和尾延迟验证收益。
- 当前项目尚未配置 KV binding。本原则是后续选型依据；引入时必须同步运行时、资源配置、测试、数据库与生产文档，并按生产变更规约执行，不复用已退役资源。

### 数据库聚合预计算

- 对真实负载中昂贵、可容忍一定延迟的聚合，优先评估在数据库中定期或增量预计算，让用户请求读取有索引的汇总结果，避免反复扫描大表；先用查询计划与扫描行数确认瓶颈。
- 定义统计口径、刷新频率、数据水位与允许延迟；更新采用幂等写入，处理任务重叠、漏跑、删除和修正数据，并提供重算、对账及失败告警。
- 后台计算也需有界分批，避免将请求压力变成定时尖峰；过期汇总要有明确展示和降级策略。权限、队伍名额等即时约束仍由权威写路径校验，不能使用延迟聚合替代。

### 最终一致性与队列

- 对无需强一致性的通知、派生数据更新或耗时处理，优先评估最终一致性与队列以隔离故障、削峰和提高可用性；明确用户能看到的延迟、处理中状态与完成条件。
- 消费者按至少一次投递和可能乱序设计，以稳定事件 ID 去重、版本或条件写入防止旧事件覆盖新状态，并配置重试预算、死信处理、积压监测及安全重放。
- 明确数据库提交与消息投递之间的失败窗口；需要可靠投递时使用与业务写入原子保存的 outbox 或等价机制，并在投递和消费两端验证恢复与去重。
- 当前项目尚未配置 Queues binding；采用队列前补齐生产/Preview 隔离、写保护、数据保留与恢复方案。强一致性业务不因接入队列而放松最终写入约束。

### 真实工作负载与优化

- 对性能敏感改动，用生产访问特征构造脱敏或合成负载：覆盖数据规模与分布、读写比例、热点、并发、突发、冷/热缓存和依赖失败，避免只压测空库或单一路径。
- 测试前确定吞吐、p95/p99 延迟、错误率和资源/成本预算；记录 D1 查询耗时与扫描行数、Worker CPU、缓存命中率及队列延迟等适用指标，保留版本、环境和数据规模以便复现。
- 按实测瓶颈的影响排序，先优化最主要的低效路径，再用同一负载比较前后结果，同时验证正确性与故障恢复；不以平均延迟或直觉作为唯一依据。
- 默认使用隔离且有代表性的测试环境；共享生产数据的 Preview 不用于写入压测。生产负载测试须遵守生产变更规约，明确范围、限流、停止阈值与恢复方案。

平台语义核对于 2026-10-17；后续相关修改需重新核对官方文档：
[Workers KV 一致性与缓存](https://developers.cloudflare.com/kv/concepts/how-kv-works/)、
[Queues 投递保证](https://developers.cloudflare.com/queues/reference/delivery-guarantees/)、
[Queues 工作方式与顺序](https://developers.cloudflare.com/queues/reference/how-queues-works/)。

## 数据库与存储

- schema、journal、snapshot 与有序 migration 链必须同步。
- 所有 DDL 只通过 migration；不得手工对生产 D1 执行 DDL。
- 多语句原子写使用 D1 `batch()` 与条件 DML；不要使用 `db.transaction()` 或裸 `BEGIN`/`COMMIT`。
- JSON 列在 Drizzle 使用 `mode: "json"`，业务层只传对象/数组，不增加字符串兼容层。
- 稳定 Region、Location、Tag 参考数据由 `0001_reference_data.sql` 管理；`0003_import_v2_catalog.sql` 只保留已退役 v2 的公开地区与地点目录。测试用户和可变 demo 数据不得进入 migration。
- 不得重新引入已退役的 Worker、KV、域名或旧 binding。

当前运行时不依赖 KV；后续路由元数据选型按[可靠性与性能设计](#可靠性与性能设计)执行。关系、决策与约束见 [数据库文档](docs/database.md)。

## 前端与国际化

- 用户可见文案全部走 i18n；namespace 必须保持完整（例如 `content.discover.*`）。locale 改动按[验证门禁](#验证门禁)执行。
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

统一 Worker 改动最低门禁：

```bash
pnpm i18n:build
pnpm i18n:validate
pnpm lint
pnpm type-check
pnpm test
pnpm test:server
pnpm build
```

API 改动最低门禁：

```bash
pnpm lint
pnpm type-check
pnpm test:server
pnpm db:check
```
