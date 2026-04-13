## Context

`frontend/package.json` 中定义了两个 i18n 相关脚本：
- `i18n:validate`: 运行 `node ../../scripts/validate-i18n-keys.mjs`
- `i18n:gen-types`: 运行 `node ../../scripts/gen-i18n-types.mjs`

路径 `../../scripts/` 从 `frontend/` 目录向上两级，超出了仓库根目录。正确路径应为 `../scripts/`（`frontend/` 的父目录即为仓库根目录，`scripts/` 位于根目录下）。

CI 报错：`Cannot find module '/home/runner/work/gomate/scripts/validate-i18n-keys.mjs'`

## Goals / Non-Goals

**Goals:**
- 修正脚本路径使 CI 流水线正常执行

**Non-Goals:**
- 不修改脚本本身的逻辑
- 不改变 CI 流水线结构

## Decisions

直接使用相对路径 `../scripts/` 而非绝对路径或 `$INIT_CWD`，因为：
- `pnpm --filter` 在 monorepo 中会在包目录下执行脚本，`../` 始终指向仓库根目录
- 简单直接，无需额外环境变量

## Risks / Trade-offs

- **风险**: 无。路径修正为确定性修复，不影响其他环境。
