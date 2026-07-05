# GoMate E2E Phase 2 方案

## 现状

- **Playwright 基础测试**：`e2e/auth.spec.ts`、`e2e/home.spec.ts`、`e2e/staging-smoke.spec.ts`
- **browser-use 探索式测试**：`e2e/browser-use/home_smoke.py`
- **CI 集成**：`pnpm e2e` 在 PR checks 中运行
- **staging 测试**：`pnpm e2e:staging` 支持

## 目标

1. 扩展 Playwright 测试覆盖核心用户流程
2. 优化 browser-use 脚本，支持更多场景
3. 确保 E2E 在 CI 和本地都能稳定运行

## 实施计划

### 1. 扩展 Playwright 测试

新增测试文件：

- `e2e/locations.spec.ts` — 地点列表、地点详情、收藏
- `e2e/teams.spec.ts` — 队伍列表、创建队伍、加入队伍
- `e2e/profile.spec.ts` — 个人资料、编辑资料
- `e2e/discover.spec.ts` — 记录/故事列表（如有）

### 2. 优化 browser-use 脚本

- 新增 `e2e/browser-use/login_flow.py` — 登录流程验证
- 新增 `e2e/browser-use/create_team.py` — 创建队伍流程
- 统一脚本结构（BASE_URL、log、screenshot、assert）

### 3. CI 集成优化

- 确保 `pnpm e2e` 在 GitHub Actions 中稳定运行
- 考虑添加 E2E 到 PR checks（当前只有 API/Frontend checks）

### 4. 测试数据

- 使用 `pnpm db:reset` 生成的测试账号（`admin@test.com` / `test1234`）
- 确保 seed 数据包含 E2E 所需的各种状态（招募中、已满、已组建等）

## 优先级

P0: 扩展 Playwright 核心流程测试（locations、teams）
P1: 优化 browser-use 脚本
P2: CI E2E 集成

## 使用方式

```bash
# 本地开发服务器 + E2E
pnpm dev:fresh  # 终端 1
pnpm e2e        # 终端 2

# 仅跑特定测试
pnpm e2e --grep "locations"

# Staging E2E
pnpm e2e:staging

# browser-use 探索式测试
pnpm e2e:browser-use
```
