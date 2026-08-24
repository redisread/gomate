# Implementation Plan: admin-i18n-contract

状态：已批准（2026-08-25）

## Overview

本计划只实现能力地图中的 `admin-i18n-contract` 模块：建立共享枚举的三语言展示合同、管理员错误原因合同和安全的客户端错误 key 选择边界，并让用户、标签、地点管理路由返回已批准的稳定原因。逐页文案修复、后台语言切换和浏览器验收属于后续模块，不在本计划中实现。

## Architecture Decisions

- `src/contracts/admin-i18n.ts` 是稳定管理员错误原因的公开合同，提供只接受已知 lowercase snake_case 值的类型守卫；不把服务端诊断消息变成展示合同。
- `src/lib/admin-i18n.ts` 是展示边界：枚举值通过 `satisfies Record<Union, TranslationKey>` 映射，错误 payload 只解析 `error.details.reason` 并返回已知翻译 key 或 `null`。
- `enums` namespace 保存跨页面复用的角色、账号状态、地点状态、季节和活动类型；`admin` namespace 保存后台操作失败文案。
- 现有通用 `apiPost/apiPatch` 仍保持通用行为。本模块不加入后台特例；后续 `admin-copy-experience` 组件将读取原始错误 payload，再使用本模块提供的安全选择器和本地化 fallback。
- 服务器只给已批准的冲突/校验分支增加 `details.reason`，保留 HTTP 状态、顶层 `error.code` 和诊断 `message`。已有 `details` 数据必须合并，不能覆盖。
- 不修改数据库、迁移、依赖、认证、权限判定或生产配置。

## Dependency Graph

```text
稳定 reason union 与 type guard
        │
        ├── 管理员错误 key 映射与三语言资源
        │       └── 用户 / 标签 / 地点路由 reason
        │
公开枚举 union
        └── 枚举 key 映射与三语言资源

以上合同与路由行为
        └── API / 前端现行文档与全量验证
```

## Implementation Sequence

### Phase 1: Presentation contract

1. 用测试驱动建立稳定管理员 reason union、运行时 type guard，以及只读取 `error.details.reason` 的安全解析器。
2. 为角色、账号状态、地点状态和季节补齐三语言 `enums` key，并建立对公开 union 编译期穷尽的映射。
3. 为八个管理员操作原因补齐三语言 `admin` key，建立 reason-to-key 映射并验证未知、畸形和仅含 message 的 payload 不泄漏服务端文本。

### Checkpoint: Contract

- 聚焦单元测试通过。
- `pnpm i18n:build`、`pnpm i18n:validate` 和 `pnpm type-check` 通过。
- 三个 locale 的 key 和插值参数完全一致。

### Phase 2: Server reason providers

4. 用户权限路由为“修改自身角色”和“撤销最后一名正常管理员”返回精确 reason，并以现有路由测试锁定状态码、顶层 code 和 reason。
5. 标签路由为创建冲突和更新冲突返回精确 reason，并补充相同合同测试；已有幂等创建成功语义不变。
6. 地点路由为地区无效、图片域名不允许、并发变更和引用阻止永久删除返回精确 reason，并覆盖创建、更新、归档/删除相关分支。

### Checkpoint: Providers

- 用户、标签、地点的聚焦 server tests 通过。
- 所有原有授权、竞争保护、引用保护和状态码行为保持不变。
- reason 只出现在 `error.details.reason`，日志仍不记录请求体或错误消息。

### Phase 3: Documentation and final verification

7. 在 `docs/backend-api.md` 记录管理员 reason 合同，在 `docs/frontend-pages.md` 记录枚举与管理员错误的展示边界；不新增长期 spec 文档。
8. 运行模块聚焦测试、API 最低门禁和统一 Worker 全量门禁，检查 diff、生成文件、秘密和无关改动。

### Checkpoint: Module complete

- 规格的全部成功标准有测试或命令证据。
- `git diff --check` 通过，未出现数据库、迁移、依赖或生产配置变化。
- 具备进入 `admin-copy-experience` 规格阶段的稳定提供方合同。

## Verification Commands

```bash
pnpm vitest run --config vitest.config.ts src/lib/admin-i18n.test.ts
pnpm vitest run --config vitest.server.config.ts \
  src/server/routes/admin-users.test.ts \
  src/server/routes/tags-management.test.ts \
  src/server/routes/admin-access-consumers.test.ts
pnpm i18n:build
pnpm i18n:validate
pnpm lint
pnpm type-check
pnpm test
pnpm test:server
pnpm db:check
pnpm build
git diff --check
```

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| 错误 `details` 已承载校验或引用数据 | 中 | 只合并 `{ reason }`，为保留既有 details/引用字段补回归断言 |
| 通用 API helper 丢弃结构化错误 | 中 | 本模块保持 helper 不变；后续管理员组件使用原始响应与安全选择器，不扩大通用接口影响面 |
| 枚举新增后映射遗漏 | 中 | `satisfies Record<PublicUnion, TranslationKey>` 与类型检查共同阻断 |
| 三语言 key 或插值漂移 | 中 | i18n build/validate 加单元测试验证 key 与插值一致 |
| 路由竞争分支难以稳定复现 | 中 | 复用现有 D1 mock，在最终条件写失败路径上断言响应合同，不弱化竞争保护 |
| 诊断 message 被误当作 UI 文案 | 高 | 解析器测试覆盖 message-only payload，并规定只返回已知 key 或 `null` |

## Rollback Boundary

该模块无数据迁移或持久化副作用。若需回退，可在单一代码 PR 中移除新增 reason metadata、映射和 locale key；现有 HTTP 状态、顶层错误 code 和数据库内容均不需要恢复。

## Parallelization

合同和 locale key 必须先完成。其后用户、标签和地点的 reason provider 相互独立，但它们共享同一合同文件；在当前单代理流程中按顺序实现，避免并行编辑冲突。

## Open Questions

无。任务级文件与逐项验收标准将在本计划批准后进入 Phase 3 编写。
