# GoMate 代理入口

编码与交付约束维护在 [CODING_STANDARDS.md](CODING_STANDARDS.md)；`CLAUDE.md` 只指向本入口。

## 按任务读取

修改代码前，必须阅读 [LESSONS.md](LESSONS.md)，了解最近合并的工作中出现过哪些错误，并将其中适用于本次改动的检查规则用于实现与验证。

开始修改前读取[工作与文档](CODING_STANDARDS.md#工作与文档)，并按范围读取以下章节；跨范围任务读取所有命中项，以[验证门禁](CODING_STANDARDS.md#验证门禁)的适用检查通过为完成条件。

| 任务范围                                 | 必读规范                                                 |
| ---------------------------------------- | -------------------------------------------------------- |
| 代码、运行时、配置、公开类型             | [架构与共享合同](CODING_STANDARDS.md#架构与共享合同)     |
| 流程设计、故障恢复、缓存、异步任务、性能 | [可靠性与性能设计](CODING_STANDARDS.md#可靠性与性能设计) |
| 数据库、migration、存储                  | [数据库与存储](CODING_STANDARDS.md#数据库与存储)         |
| 页面、组件、样式、locale                 | [前端与国际化](CODING_STANDARDS.md#前端与国际化)         |
| API、认证、权限、批处理、日志            | [API 与认证](CODING_STANDARDS.md#api-与认证)             |
| worktree 初始化或启动                    | [本地开发](docs/local-dev-worktrees.md)                  |
| 创建或更新 PR、准备合并                  | [PR 与合并](CODING_STANDARDS.md#pr-与合并)               |
| 生产配置、发布、资源变更、事故或回滚     | [生产变更规约](docs/prod-change-policy.md)               |

## 文档与规则维护

- 文档和规则可能错误或过时。每次修改前，以当前代码、配置、迁移和测试核对相关说明；涉及平台或依赖行为时，查阅与所用版本相符的最新官方文档与最佳实践。代码用于确认现状，改进方案需经过验证，不能把已有缺陷当作规范。
- 每次涉及模块行为变化、依赖升级或架构调整时同步复核相关文档；至少每月进行一次文档、规则与技术债巡检，在维护 PR 中记录范围、证据与未解决项。此要求是维护流程，不代表已经配置自动定时任务。
- 发现失效规则、错误示例、重复实现、废弃分支或缺少测试的复杂代码时，按风险与收益排序清理。相关且可验证的小范围问题随本次改动修复，较大重构单独安排并补充回归验证，避免借维护混入无关重写。
- 完成前确认受影响文档与代码一致、链接和命令有效，删除过时或重复说明；已有缺陷、未落实方案与当前事实分别标明，已合并工作中暴露的错误按 `LESSONS.md` 记录。

## 生产边界

- 生产写入只走受保护的 Cloudflare/Git 流程；禁止本机生产写命令、Dashboard/临时脚本替代发布和 admin bypass。生产 secrets 只在受保护环境提供，不进入仓库级 Actions secrets、日志、PR 或命令参数。
- 合并已审核 PR 到受保护的 `main` 即授权该提交发布；GitHub Actions 只对目标为 `main` 的 PR 执行 `validate`，Cloudflare Workers Builds 在 `main` 更新后完成最小生产构建、D1 migration 与部署，不追加 `push main` CI 或第二个人工发布步骤。
- 事故先恢复/保持 `WRITE_MODE=protected`，再按生产规约回滚到已验证 Worker version；旧 split Worker、route 和数据库不得重建为回滚手段。
