# Astro 最新稳定版升级计划

## 范围与证据（2026-10-18）

工作树起点 `3bf7185f`，干净、detached HEAD；读取远端后发现落后 main 9 个提交。
实施前从最新 main 创建 `codex/astro-7-4`，保留本计划并重新核对差异。

npm registry 当前稳定版本：Astro 7.4.0、Cloudflare adapter 14.4.0、React integration 7.1.0。
当前锁定 Astro 7.3.7、Cloudflare adapter 14.3.4；React integration 声明 ^6.0.4。
Cloudflare 14.4.0 要求 Astro ^7.4.0；React integration 7.1.0 支持 React 18，移除了 babel 配置。
项目使用 react() 默认配置，无 babel 定制；保持 React 18。当前 Node 24.19.0 满足项目 >=22.23.3。

参考对话只展示研究请求和研究启动说明，研究应用显示 Failed to fetch template，无法读取完整报告。
不能把未读报告中的功能假定为已确认需求。本次保持产品行为，仅升级框架与官方集成及必要兼容修复。

来源：
- https://chatgpt.com/share/6ad4afce-a3ec-8321-9d34-df7f7a6b0806
- https://astro.build/blog/
- https://docs.astro.build/en/guides/integrations-guide/react/
- npm：`pnpm view astro version`、`pnpm view @astrojs/cloudflare version`、`pnpm view @astrojs/react version` 及目标版本 peerDependencies/engines。

## 架构决策

- 保持单 Worker / 同源 Hono API / Astro SSR / React islands、manual i18n 和 Better Auth D1 session。
- 保留 es-module-lexer Worker 兼容处理，除非目标版本源码与真实 workerd 测试证明可删除。
- 不引入实验性缓存、3D 库、页面切换方案、React 主版本升级或新 Cloudflare 资源。
- lockfile 仅由 pnpm 更新；不批量升级无关依赖。
- 开发使用默认 adapter 入口保留 HMR，正式构建继续 Hono pipeline。

## 顺序与检查点

1. 基线同步和版本兼容性核验。
2. 官方依赖升级，检查构建、类型和运行时兼容。
3. 完整门禁和隔离本地浏览器回归，更新现行文档。
4. 独立子代理审查、修复、创建 PR；依 CR 风险与受保护 CI 决定合并。
5. 若合并，核对 Workers Builds 精确提交、版本及生产只读 smoke。

任务验收与命令见 todo.md。第 2、3 步后分别设检查点。

## 风险与控制

| 风险 | 控制 |
| --- | --- |
| React integration 主版本更换转换链 | 官方升级说明、SSR 和 hydration 浏览器回归，不启用 React Compiler |
| Cloudflare adapter 与自定义 Hono 入口不兼容 | build、真实 workerd、SSR/404/API 边界检查 |
| 升级影响 i18n 和分享元数据 | bilingual、link-preview、teams 浏览器覆盖 |
| 多 worktree 共享 D1 | GOMATE_LOCAL_STATE 指向本工作树隔离路径，只操作本地数据 |
| 分支基线过旧 | 实施前基于最新 main，重新读取变动规范与配置 |

## 发布边界

目标为现有 gomate Worker / gomate.live；不修改 D1 migration、R2、bindings、secrets、route。
只通过审核 PR 合并到受保护 main 触发 Workers Builds，不执行本机生产写命令。
生产核对 /api/health、SSR、公开读取、404 和 version header。认证会话未测时明确注明。
如部署异常，停止后续发布；回滚仅经单独授权及受保护流程，目标需为本次升级前已验证且 schema 兼容的 Worker version。

## 当前状态

用户于 2026-10-18 批准计划。已从 bd56fe5e 创建 codex/astro-7-4，正在运行升级前 pnpm test:ci 基线。官方 React v7 改用 Oxc，项目未配置 babel，也不启用可选 React Compiler。
完成后按仓库规范把长期结论并入现行 docs；一次性计划不长期留在工作树。

## 兼容性核验更新

首次升级后 astro sync 确认失败：adapter 14.4.0 拉取 Cloudflare Vite 插件 1.64.0，后者要求 Wrangler ^4.151.0。同步必要工具链到 Vite 8.3.4、插件 1.64.0、Wrangler 4.151.1；生成 Worker types。显式关闭新版默认 source map 上传，保持原发布行为。基线 test:ci 通过（323/243/16）。

## 执行结果

本地升级前后 test:ci 通过（323 前端/243 服务端/16 Worker）。目标 audit/peers/type一致性/dry-run/size 全通过，77 Chromium 回归通过。开发启动发现既有代理自动后台与临时配置生命周期冲突；新增回归先失败后通过，传入 --ignore-lock 后真实页面/API/HMR/SIGTERM停止与配置清理通过。独立审查两轮均无阻塞。后续交付状态由 PR/CI 与对话记录；计划按仓库规约从最终树删除，历史保留。
