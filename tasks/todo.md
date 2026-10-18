# Astro 升级任务

## Task 1：同步基线
说明：从最新 main 建立升级分支并核对当前配置、版本与升级说明。
- [x] 用户审阅批准 plan.md；重新读取 main 上变动的项目约束。
- [x] 确认目标稳定版、peer 依赖、Node 要求及 React v7 转换链兼容。
验证：git status、git diff HEAD..origin/main、pnpm view；读取目标版本 changelog。
依赖：无。文件：tasks/plan.md、tasks/todo.md。规模：小。

## Task 2：升级官方依赖
说明：升级 Astro、Cloudflare adapter、React integration，修复必要兼容问题。
- [ ] package.json 和 pnpm-lock.yaml 一致，保持 React 18。
- [ ] 类型、构建、真实 Worker 入口通过；无无关依赖升级。
验证：pnpm install --frozen-lockfile、pnpm type-check、pnpm build、pnpm test:worker:run。
依赖：Task 1。文件：package.json、pnpm-lock.yaml；必要时 astro.config.mjs、src/worker.ts。规模：中。

## Task 2b：对齐 adapter 必需工具链
说明：首次 astro sync 暴露 Wrangler peer 不兼容，升级配套 Vite 8.3.4、Cloudflare Vite 插件 1.64.0、Wrangler 4.151.1。
- [x] pnpm peers check 无冲突；锁文件冻结安装通过。
- [ ] 重新生成 Worker types，通过构建、dry-run 和 size 检查。
验证：pnpm type-check、pnpm worker:types、pnpm worker:dry-run、pnpm worker:size。
依赖：Task 2。文件：package.json、pnpm-lock.yaml、wrangler.jsonc、src/server/worker-configuration.d.ts。规模：中。

## 检查点：依赖兼容
- [ ] 检查 lockfile diff、peer warnings、Worker bundle；失败时先定位再继续。

## Task 3：回归验证与文档
说明：验证现有业务边界并更新受影响的现行文档。
- [ ] 完整本地门禁通过，隔离 D1 下浏览器核心流程通过。
- [ ] 双语、分享元数据、React 交互和认证保护无回归；行为修复有失败到通过证据。
- [ ] 文档与实际工具链、运行模型一致。
验证：pnpm i18n:build、pnpm test:ci、pnpm worker:types、pnpm worker:dry-run、pnpm worker:size、pnpm audit --prod --audit-level high；隔离 GOMATE_LOCAL_STATE 初始化后 pnpm test:e2e:ci。
依赖：Task 2。文件：docs/development-and-deployment.md、必要的现有回归测试（最多 3 个）。规模：中。

## 检查点：可交付
- [ ] 所有适用门禁通过，审查生成类型、秘密及无关产物。

## Task 4：独立审查与 PR
说明：执行仓库要求的子代理 CR，并按模板创建中文 PR。
- [ ] 子代理独立审查，无未解决阻断问题。
- [ ] PR 关联任务，记录真实验证证据；受保护 CI 通过后按风险决定合并或要求人工审查。
验证：审查报告、PR checks、head SHA、无 admin bypass。
依赖：Task 3。文件：PR 正文、任务状态。规模：小。

## Task 5：发布只读核验
说明：若合并，验证 Workers Builds 与实际服务版本。
- [ ] 精确提交的部署完成，health/SSR/API 使用同一目标版本。
- [ ] 记录未验证权限/认证部分，异常时停止推广；一次性计划按规范清理。
验证：构建状态、生产只读 HTTP、version ID、公开 API 和不存在路由。
依赖：Task 4 成功合并。文件：交付记录。规模：小。
