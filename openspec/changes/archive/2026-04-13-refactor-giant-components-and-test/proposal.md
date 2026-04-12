## Why

项目当前存在 8 个超过 600 行的巨型前端组件（最大 1904 行），严重违反单一职责原则，导致修改困难、容易引入回归 bug。同时测试覆盖率极低（后端 ~20%、前端 ~5%），CI 流水线缺少测试门禁，生产环境变量配置不完整导致地图等功能可能 500。这三个问题相互关联：不拆分组件就无法有效写测试，没有测试就无法安全重构，没有环境变量配置生产功能就不完整。

## What Changes

- **8 个巨型组件全量拆分**：每个组件拆分为 8-15 个子组件 + 自定义 Hook，单文件不超过 200 行
- **测试覆盖率提升**：后端补充 upload/pois/admin 集成测试，前端补充认证流程和 API 层测试，CI 增加覆盖率门禁（后端 >60%）
- **生产环境变量补全**：修复 AMAP_SERVER_KEY 缺失导致的 500 错误，添加 R2 配置强校验
- **CI/CD 流水线增强**：API 部署前增加测试步骤，前端部署前增加测试步骤
- **ESLint 配置引入**：统一代码风格，pre-commit 自动检查

## Capabilities

### New Capabilities
- `component-modularity`: 前端组件拆分规范，定义子组件提取策略、自定义 Hook 模式、文件大小上限
- `test-coverage`: 测试覆盖率要求，包括后端集成测试补充、前端核心测试、CI 覆盖率门禁
- `env-validation`: 生产环境变量校验，包括缺失配置的错误提示和 CI 预检
- `ci-quality-gates`: CI/CD 质量门禁，包括测试、lint、类型检查的流水线编排
- `code-style-linting`: ESLint 配置和规则，统一的代码风格检查

### Modified Capabilities
- (无现有 spec 需要修改)

## Impact

**受影响文件（预估）：**
- 8 个巨型组件文件 → 拆分为 80+ 个子组件和 Hook 文件
- `api/src/__tests__/` → 新增 10+ 个测试文件
- `frontend/src/__tests__/` → 新增 5+ 个测试文件
- `.github/workflows/*.yml` → 3 个 CI 文件增强
- 新增 ESLint 配置文件（`.eslintrc`、`.prettierrc` 等）

**行为变化：**
- 组件拆分不改变任何 UI 行为，纯内部重构
- 测试新增不影响现有测试
- 环境变量缺失时返回明确错误（替代之前的静默 fallback 或 500）
- CI 流水线增加测试步骤，可能导致之前能通过的 PR 因测试失败被拦截
