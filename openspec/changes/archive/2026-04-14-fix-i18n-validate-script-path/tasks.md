## 1. 修复脚本路径

- [x] 1.1 修正 `frontend/package.json` 中 `i18n:validate` 路径：`../../scripts/` → `../scripts/`
- [x] 1.2 修正 `frontend/package.json` 中 `i18n:gen-types` 路径：`../../scripts/` → `../scripts/`

## 2. 验证修复

- [x] 2.1 本地执行 `pnpm --filter @gomate/frontend i18n:validate` 确认通过
- [x] 2.2 本地执行 `pnpm --filter @gomate/frontend i18n:gen-types` 确认通过
