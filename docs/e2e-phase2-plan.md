# GoMate E2E Phase 2 方案

> 最后更新：2026-08-01
> 状态：**部分执行中**。P0（teams 覆盖）与 P2（CI 集成）已完成；P0 剩余 locations 覆盖、P1（browser-use 脚本扩展）未完成。

## 现状

- **Playwright 基础测试**：`e2e/auth.spec.ts`、`e2e/teams.spec.ts`、`e2e/team-applications.spec.ts`（#414 自构造 fixture）
- **v1 API 契约测试**：`e2e/v1-read-endpoints.spec.ts`、`e2e/v1-rate-limit.spec.ts`
- **browser-use 探索式测试**：`e2e/browser-use/home_smoke.py`
- **CI 集成**：`pr-validation.yml` 的 `e2e-tests` job 运行 `pnpm e2e:ci`（本地起 api + web 两个服务）
- **staging 测试**：`pnpm e2e:staging` 支持（`E2E_BASE_URL=https://staging.gomate.live`，`chromium-staging` project）
- 注：`e2e/home.spec.ts`、`e2e/staging-smoke.spec.ts` 已于 #486 清理（冗余覆盖），不再存在

## 目标

1. 扩展 Playwright 测试覆盖核心用户流程
2. 优化 browser-use 脚本，支持更多场景
3. 确保 E2E 在 CI 和本地都能稳定运行

## 实施计划

### 1. 扩展 Playwright 测试

新增测试文件：

- [x] `e2e/teams.spec.ts` — 队伍列表、创建队伍、加入队伍（已完成）
- [x] `e2e/team-applications.spec.ts` — 申请/审批（已完成）
- [ ] `e2e/locations.spec.ts` — 地点列表、地点详情、收藏（未开始）
- [ ] `e2e/profile.spec.ts` — 个人资料、编辑资料（未开始）
- [ ] `e2e/discover.spec.ts` — 记录/故事列表（未开始）

### 2. 优化 browser-use 脚本

- [ ] 新增 `e2e/browser-use/login_flow.py` — 登录流程验证（未开始）
- [ ] 新增 `e2e/browser-use/create_team.py` — 创建队伍流程（未开始）
- [ ] 统一脚本结构（BASE_URL、log、screenshot、assert）（未开始）

### 3. CI 集成优化

- [x] `pnpm e2e` 已在 GitHub Actions 的 PR checks 中运行（`pr-validation.yml` → `e2e-tests`）
- [ ] 视稳定性决定是否需要拆分/精简 job

### 4. 测试数据

- 使用 `pnpm db:reset` 生成的测试账号（`admin@test.com` / `test1234`）
- seed 数据包含 E2E 所需的各种状态（招募中、已满、已组建等）

## 优先级

P0: 扩展 Playwright 核心流程测试（teams 已完成，locations 待做）
P1: 优化 browser-use 脚本
P2: CI E2E 集成（已完成）

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
