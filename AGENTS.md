# GoMate 代理入口

编码与交付约束维护在 [CODING_STANDARDS.md](CODING_STANDARDS.md)；`CLAUDE.md` 只指向本入口。

## 按任务读取

开始修改前读取[工作与文档](CODING_STANDARDS.md#工作与文档)，并按范围读取以下章节；跨范围任务读取所有命中项，以[验证门禁](CODING_STANDARDS.md#验证门禁)的适用检查通过为完成条件。

| 任务范围                             | 必读规范                                             |
| ------------------------------------ | ---------------------------------------------------- |
| 代码、运行时、配置、公开类型         | [架构与共享合同](CODING_STANDARDS.md#架构与共享合同) |
| 数据库、migration、存储              | [数据库与存储](CODING_STANDARDS.md#数据库与存储)     |
| 页面、组件、样式、locale             | [前端与国际化](CODING_STANDARDS.md#前端与国际化)     |
| API、认证、权限、批处理、日志        | [API 与认证](CODING_STANDARDS.md#api-与认证)         |
| worktree 初始化或启动                | [本地开发](docs/local-dev-worktrees.md)              |
| 创建或更新 PR、准备合并              | [PR 与合并](CODING_STANDARDS.md#pr-与合并)           |
| 生产配置、发布、资源变更、事故或回滚 | [生产变更规约](docs/prod-change-policy.md)           |

## 生产边界

- 生产写入只走受保护的 Cloudflare/Git 流程；禁止本机生产写命令、Dashboard/临时脚本替代发布和 admin bypass。生产 secrets 只在受保护环境提供，不进入仓库级 Actions secrets、日志、PR 或命令参数。
- 合并已审核 PR 到受保护的 `main` 即授权该提交发布；GitHub Actions 只对目标为 `main` 的 PR 执行 `validate`，Cloudflare Workers Builds 在 `main` 更新后完成最小生产构建、D1 migration 与部署，不追加 `push main` CI 或第二个人工发布步骤。
- 事故先恢复/保持 `WRITE_MODE=protected`，再按生产规约回滚到已验证 Worker version；旧 split Worker、route 和数据库不得重建为回滚手段。
