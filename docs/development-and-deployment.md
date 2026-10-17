# 开发与部署

[返回项目介绍](../README.zh-CN.md)

## 快速开始

使用 Node.js **22.23.3**（见 [.node-version](../.node-version)）和 pnpm **11.19.0**（见 [package.json](../package.json)）。

**1 · 获取代码并安装依赖。**

```bash
git clone https://github.com/redisread/gomate.git
cd gomate
pnpm install
```

**2 · 初始化本地环境。**

```bash
cp .dev.vars.example .dev.vars
pnpm init:worktree
```

初始化脚本会使用 `.dev.vars`，生成多语言数据，并向本地 D1 应用待执行的 migration。示例认证密钥仅供本地开发；发送邮件需要配置 `RESEND_API_KEY`，测试 Google 登录需要配置 `GOOGLE_CLIENT_ID` 和 `GOOGLE_CLIENT_SECRET`，这些集成本地均可选。凭据不要提交到 Git。

**3 · 检查环境并启动。**

```bash
pnpm env:check
pnpm dev
```

打开 [localhost:5432](http://localhost:5432)。页面、认证与 `/api/*` 共用一个 Worker 和同一个 origin。

多个 checkout 并行开发或端口被占用时，使用 `pnpm dev:wt` 自动选择空闲端口。不同 worktree 默认共享本地 D1/R2 状态；需要隔离时，将 `GOMATE_LOCAL_STATE` 设置为独立的绝对路径。初始化方式和 OAuth 端口要求见[本地开发文档](local-dev-worktrees.md)。

## 本地开发

| 命令               | 用途                                           |
| ------------------ | ---------------------------------------------- |
| `pnpm dev`         | 在 5432 端口启动本地开发                       |
| `pnpm dev:wt`      | 自动选择空闲端口并启动                         |
| `pnpm env:check`   | 检查 Node、pnpm、本地 secrets、Wrangler 与端口 |
| `pnpm lint`        | 执行 ESLint 检查                               |
| `pnpm type-check`  | 生成 Worker 类型并检查 TypeScript              |
| `pnpm test`        | 运行前端与共享逻辑单元测试                     |
| `pnpm test:server` | 运行服务端测试                                 |
| `pnpm test:ci`     | 执行 CI 使用的应用验证门禁                     |
| `pnpm build`       | 构建生产 Worker                                |
| `pnpm test:e2e`    | 使用构建后的本地 Worker 运行 Playwright        |

**浏览器测试。** 首次安装 Chromium，准备本地数据后运行：

```bash
pnpm exec playwright install chromium
pnpm db:reset
pnpm test:e2e
```

`pnpm db:reset` 会删除并重建目标本地 D1 数据库，再加载参考与 seed 数据；执行前先停止所有共享该数据库的开发进程。用户由测试独立注册。浏览器测试使用本地资源，CI 使用隔离的 D1 数据库。

CI 模式使用 `pnpm test:e2e:ci`；交互式调试使用 `pnpm exec playwright test --ui --project=chromium`。

<details>
<summary>本地管理员与故障排查</summary>

本地注册账号后，可提升为管理员以访问地点与 Region 管理功能：

```bash
pnpm db:promote-admin --email admin@test.com
```

脚本仅修改本地 D1，传入 `--env` 或 `--yes` 会被拒绝。生产权限变更必须使用受保护环境并经过显式审批。

启动或测试异常时，先运行 `pnpm env:check`：

| 问题                    | 处理方式                                                      |
| ----------------------- | ------------------------------------------------------------- |
| 5432 端口被占用         | 停止占用进程，或使用 `pnpm dev:wt`                            |
| 缺少 `.dev.vars`        | 复制 `.dev.vars.example` 并配置本地值                         |
| 本地 D1 未初始化        | 运行 `pnpm init:worktree`；仅在需要重置时使用 `pnpm db:reset` |
| 缺少 Chromium           | 运行 `pnpm exec playwright install chromium`                  |
| Cloudflare 命令要求认证 | 运行 `pnpm exec wrangler login`                               |

如果问题仍然存在，请[提交 Issue](https://github.com/redisread/gomate/issues)，附上复现步骤与脱敏后的诊断输出。

</details>

## 部署

目标为 `main` 的 PR 由 GitHub Actions 执行应用验证、Worker bundle 检查和隔离本地 D1 的浏览器测试。已审核 PR 合并到受保护的 `main` 后，Cloudflare Workers Builds 通过 `pnpm deploy:production` 完成生产构建、D1 migration 与部署。

其他分支由 Cloudflare Git 集成运行 `pnpm deploy:preview`，上传同一 Worker 的 Preview version，并生成稳定的分支 alias。Preview 共用生产 D1/R2，通过 `WRITE_MODE=protected` 拒绝业务写入；仅在合法 Preview 域名上允许登录、退出与创建认证 session。`PREVIEW_HOST_SUFFIX` 保留在 production vars 中。

生产写入必须走受保护的 Git/Cloudflare 流程，禁止从本机或临时脚本写入生产 Worker、D1、R2、secret 或 route。具体要求见[生产变更规约](prod-change-policy.md)。
