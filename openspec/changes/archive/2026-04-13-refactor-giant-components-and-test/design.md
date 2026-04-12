## Context

GoMate 前端使用 Astro + React Islands 架构，每个页面功能集中在一个 "client" 组件中（`client:load`）。这种模式在项目初期快速迭代有效，但随着功能增加，8 个组件超过 600 行，最大的 `location-edit-client.tsx` 达到 1904 行。

**当前组件行数分布：**
```
location-edit-client.tsx          1904  ████████████████████
team-detail-partiful.tsx          1572  ████████████████
my-teams-client.tsx               1357  █████████████
home-client.tsx                   1223  ████████████
location-detail-main-content.tsx  1027  ██████████
locations-client.tsx               936  █████████
teams-client.tsx                   827  ████████
profile-edit-client.tsx            667  ██████
```

**测试现状：**
- 后端：6 个测试文件，覆盖率 ~20%
- 前端：3 个测试文件，覆盖率 ~5%
- CI：API 部署无测试，前端部署只有 type-check + build

**环境变量现状：**
- `AMAP_SERVER_KEY` 在 wrangler.toml 中为空
- R2_PUBLIC_URL 无强校验
- CORS_ALLOWED_ORIGINS 已配置（上一轮优化完成）

## Goals / Non-Goals

**Goals:**
- 所有前端组件文件不超过 200 行
- 后端测试覆盖率 >60%，前端 >40%
- CI 流水线包含测试门禁，测试失败阻止部署
- 生产环境变量缺失时返回明确错误，不静默失败
- 统一代码风格（ESLint + Prettier）

**Non-Goals:**
- 不改变任何 UI 行为和用户交互（纯重构）
- 不引入新的 UI 组件库或设计系统
- 不改变数据库 schema 或 API 接口
- 不修改移动端 Flutter 代码
- 不引入重型测试框架（保持 vitest）

## Decisions

### 1. 组件拆分策略：按功能区域拆分 + 自定义 Hook

**选择**：每个巨型组件拆分为三个层次：
- **子组件**：纯 UI 组件，只负责渲染和事件传递（如 `LocationFormBasicFields`、`TeamMemberList`）
- **自定义 Hook**：状态管理和业务逻辑（如 `useLocationForm`、`useTeamMembers`）
- **主组件**：组装层，组合子组件和 Hook（保持 <50 行）

**理由**：
- 子组件可以独立测试（渲染测试）
- Hook 可以独立测试（逻辑测试，无需 DOM）
- 主组件变为薄组装层，降低集成风险

**替代方案**：
- 按文件拆分但不提取 Hook → 状态逻辑仍然耦合
- 全部拆为独立组件 → 过度碎片化，prop drilling 严重

### 2. 测试策略：后端集成测试优先，前端从 API 层开始

**选择**：
- 后端：补充 `upload.ts`、`pois.ts`、`admin.ts` 的集成测试（使用已有的 `createTestEnv` 模式）
- 前端：从 `api.ts` 单元测试开始（mock fetch），再到组件渲染测试
- CI：`pnpm test` 作为部署前置条件

**理由**：
- 后端集成测试 ROI 最高，覆盖核心业务逻辑
- 前端 API 层测试投入产出比优于组件渲染测试
- vitest 已配置，不需要引入新工具

### 3. ESLint 使用 Flat Config (eslint.config.js)

**选择**：ESLint 9.x + Flat Config + TypeScript 插件

**理由**：
- 项目使用 TypeScript 5，ESLint 9 兼容性更好
- Flat Config 是未来标准，避免后续迁移
- 不需要 `.eslintrc` 的层级嵌套（项目结构简单）

### 4. 环境变量校验：运行时 + 构建时双层校验

**选择**：
- 运行时：路由入口检查必需环境变量，缺失返回 500 + 明确错误信息
- 构建时：CI 流水线中增加环境变量预检步骤

**理由**：
- 运行时校验防止遗漏配置
- 构建时校验在部署前发现问题

## Risks / Trade-offs

| 风险 | 缓解措施 |
|------|---------|
| 8 个组件同时拆分，改动量大，可能引入回归 | 逐组件拆分，每拆完一个验证 type-check + 手动测试 |
| 子组件提取过程中 props 接口不一致 | 先定义 TypeScript 接口，再提取组件 |
| 新增测试依赖现有 mock 基础设施，可能需要改造 | 复用已有的 `createTestEnv` 和 `AbstractTest` 模式 |
| CI 增加测试步骤可能延长流水线时间 | 测试并行执行，后端/前端分开 |
| ESLint 规则可能和现有代码冲突 | 初始规则设为 warning，逐步收紧 |
| 组件拆分后文件数量大幅增加（~80 个新文件） | 按功能域组织目录结构，避免 flat 文件列表 |
