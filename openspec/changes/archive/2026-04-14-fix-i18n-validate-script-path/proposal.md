## Why

CI 流水线中 `i18n:validate` 步骤因脚本路径错误而失败。`frontend/package.json` 中的脚本路径使用了 `../../scripts/`，但 `frontend/` 的父目录就是仓库根目录，正确路径应为 `../scripts/`。`i18n:gen-types` 同样存在此问题。

## What Changes

- 修正 `frontend/package.json` 中 `i18n:validate` 脚本路径：`../../scripts/` → `../scripts/`
- 修正 `frontend/package.json` 中 `i18n:gen-types` 脚本路径：`../../scripts/` → `../scripts/`

## Capabilities

### New Capabilities
<!-- 无新增能力 -->

### Modified Capabilities
<!-- 无修改能力 -->

## Impact

- `frontend/package.json`：两个脚本路径修正
- CI 流水线 `frontend-deploy.yml`：无需修改，路径修复后自动恢复
