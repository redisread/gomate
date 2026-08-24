# Implementation Plan: admin-copy-experience

状态：已批准（2026-08-25，用户授权连续完成全部阶段）

## Overview

从共享展示合同向外迁移全部管理员消费者：先修复资源与 SSR 标题，再迁移结构化错误和枚举，最后接入语言切换并执行三语言组件/浏览器检查。

## Architecture Decisions

- 后台请求继续使用同源 `fetchAPI`；需要展示失败时读取原始 JSON，再交给 `adminActionErrorKey`。
- `LocaleToggle` 复用现有路径前缀与 cookie 行为，不建立第二套 locale 状态。
- 共享 domain 值由 `enums` namespace 所有，后台流程 copy 由 `admin` 所有。
- 只修复文本与轻量入口布局，不改后台信息架构。

## Dependency Order

`locale copy/SSR titles` → `safe errors and enum consumers` → `locale switcher` → `component and browser verification`

## Risks and Mitigations

| Risk | Mitigation |
|---|---|
| `apiPost/apiPatch` 丢弃结构化 payload | 管理员消费者迁移到 `fetchAPI`，不改通用 helper |
| locale 切换丢失管理员路径 | 复用并测试 `LocaleToggle` 的 locale 前缀替换 |
| namespace 迁移导致 island 缺 key | 同步 declare/load namespaces，并运行 i18n coverage gate |
| PR #610 新增状态操作文案遗漏 | 以当前主线文件和三语言运行时路径为审计清单 |

## Checkpoints

1. SSR 标题与三语言资源通过 i18n build/validate。
2. 组件测试证明错误 message 隔离和枚举本地化。
3. 语言切换、三语言关键路径和全量构建通过。

## Rollback Boundary

纯前端与 locale 资源变更；无数据回滚。可按文案、消费者、切换入口三个原子提交独立回退。
